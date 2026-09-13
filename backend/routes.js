const express = require("express");
const router = express.Router();
const db = require("./db");


// ======================================================
// FUNÇÃO DE ERRO
// ======================================================

const erro500 = (res, error) => {
    console.error(error);

    res.status(500).json({
        erro: error.message || "Erro interno do servidor"
    });
};


// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

async function listar(res, tabela) {
    try {
        const result = await db.query(
            `SELECT * FROM ${tabela}`
        );

        res.json(result.rows);

    } catch (error) {
        erro500(res, error);
    }
}


async function criar(req, res, tabela, campos) {
    try {

        const valores = campos.map(
            campo => req.body[campo]
        );

        if (
            valores.some(
                valor =>
                    valor === undefined ||
                    valor === null ||
                    valor === ""
            )
        ) {
            return res.status(400).json({
                erro: "Preencha todos os campos"
            });
        }

        const parametros = campos
            .map((_, index) => `$${index + 1}`)
            .join(", ");

        const sql = `
            INSERT INTO ${tabela}
            (${campos.join(", ")})
            VALUES (${parametros})
            RETURNING *
        `;

        const result = await db.query(
            sql,
            valores
        );

        const registro = result.rows[0];

        const id =
            registro.id_clientes ??
            registro.id_funcionarios ??
            registro.id_servico ??
            registro.id_usuario ??
            registro.id_agendamentos;

        res.status(201).json({
            mensagem: "Criado com sucesso",
            id,
            registro
        });

    } catch (error) {
        erro500(res, error);
    }
}


async function atualizar(
    req,
    res,
    tabela,
    idCampo,
    campos
) {
    try {

        const { id } = req.params;

        const valores = campos.map(
            campo => req.body[campo]
        );

        if (
            valores.some(
                valor =>
                    valor === undefined ||
                    valor === null ||
                    valor === ""
            )
        ) {
            return res.status(400).json({
                erro: "Preencha todos os campos"
            });
        }

        const sets = campos
            .map(
                (campo, index) =>
                    `${campo} = $${index + 1}`
            )
            .join(", ");

        const sql = `
            UPDATE ${tabela}
            SET ${sets}
            WHERE ${idCampo} = $${campos.length + 1}
            RETURNING *
        `;

        const result = await db.query(
            sql,
            [...valores, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                erro: "Registro não encontrado"
            });
        }

        res.json({
            mensagem: "Atualizado com sucesso",
            registro: result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
}


async function remover(
    req,
    res,
    tabela,
    idCampo,
    nome = "Registro"
) {
    try {

        const { id } = req.params;

        const result = await db.query(
            `
            DELETE FROM ${tabela}
            WHERE ${idCampo} = $1
            `,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                erro: `${nome} não encontrado`
            });
        }

        res.json({
            mensagem: `${nome} removido com sucesso`
        });

    } catch (error) {

        console.error(error);

        // Erro de chave estrangeira
        if (error.code === "23503") {
            return res.status(409).json({
                erro:
                    `Não é possível excluir este registro porque ele está sendo utilizado em outro cadastro.`
            });
        }

        erro500(res, error);
    }
}


// ======================================================
// CLIENTES
// ======================================================

router.get("/clientes", async (req, res) => {
    try {

        const result = await db.query(`
            SELECT *
            FROM clientes
            ORDER BY id_clientes
        `);

        res.json(result.rows);

    } catch (error) {
        erro500(res, error);
    }
});


router.post("/clientes", async (req, res) => {

    try {

        const {
            nome,
            telefone
        } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({
                erro: "Nome e telefone são obrigatórios"
            });
        }

        const existente = await db.query(
            `
            SELECT *
            FROM clientes
            WHERE telefone = $1
            `,
            [telefone]
        );

        if (existente.rows.length > 0) {
            return res.status(409).json({
                erro: "Já existe um cliente com esse telefone"
            });
        }

        const result = await db.query(
            `
            INSERT INTO clientes
            (nome, telefone)
            VALUES ($1, $2)
            RETURNING *
            `,
            [
                nome.trim(),
                telefone.trim()
            ]
        );

        res.status(201).json({
            mensagem: "Cliente criado com sucesso",
            id_clientes:
                result.rows[0].id_clientes,
            cliente: result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


router.put("/clientes/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            nome,
            telefone
        } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({
                erro: "Nome e telefone são obrigatórios"
            });
        }

        const result = await db.query(
            `
            UPDATE clientes
            SET
                nome = $1,
                telefone = $2
            WHERE id_clientes = $3
            RETURNING *
            `,
            [
                nome.trim(),
                telefone.trim(),
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado"
            });
        }

        res.json({
            mensagem: "Cliente atualizado com sucesso",
            cliente: result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


router.delete("/clientes/:id", (req, res) =>
    remover(
        req,
        res,
        "clientes",
        "id_clientes",
        "Cliente"
    )
);


// ======================================================
// FUNCIONÁRIOS
// ======================================================

router.get("/funcionarios", async (req, res) => {

    try {

        const result = await db.query(`
            SELECT *
            FROM funcionarios
            ORDER BY id_funcionarios
        `);

        res.json(result.rows);

    } catch (error) {
        erro500(res, error);
    }
});


router.post("/funcionarios", async (req, res) => {

    try {

        const {
            nome,
            telefone
        } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({
                erro: "Nome e telefone são obrigatórios"
            });
        }

        const result = await db.query(
            `
            INSERT INTO funcionarios
            (nome, telefone)
            VALUES ($1, $2)
            RETURNING *
            `,
            [
                nome.trim(),
                telefone.trim()
            ]
        );

        res.status(201).json({
            mensagem:
                "Funcionário criado com sucesso",

            id_funcionarios:
                result.rows[0].id_funcionarios,

            funcionario:
                result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


router.put("/funcionarios/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            nome,
            telefone
        } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({
                erro: "Nome e telefone são obrigatórios"
            });
        }

        const result = await db.query(
            `
            UPDATE funcionarios
            SET
                nome = $1,
                telefone = $2
            WHERE id_funcionarios = $3
            RETURNING *
            `,
            [
                nome.trim(),
                telefone.trim(),
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                erro: "Funcionário não encontrado"
            });
        }

        res.json({
            mensagem:
                "Funcionário atualizado com sucesso",

            funcionario:
                result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


router.delete("/funcionarios/:id", (req, res) =>
    remover(
        req,
        res,
        "funcionarios",
        "id_funcionarios",
        "Funcionário"
    )
);


// ======================================================
// SERVIÇOS
// ======================================================

router.get("/servicos", async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                id_servico,
                tipo,
                imagem,
                preco
            FROM servico
            ORDER BY id_servico
        `);

        const servicos = result.rows.map(servico => {

            const texto =
                String(servico.tipo || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

            let categoria = "Corte";

            if (texto.includes("barba")) {
                categoria = "Barba";
            }

            return {
                ...servico,
                categoria
            };
        });

        res.json(servicos);

    } catch (error) {
        erro500(res, error);
    }
});


// ------------------------------------------------------
// CRIAR SERVIÇO
// ------------------------------------------------------

router.post("/servicos", async (req, res) => {

    try {

        const {
            tipo,
            imagem,
            preco
        } = req.body;

        if (!tipo) {
            return res.status(400).json({
                erro: "Informe o nome do serviço"
            });
        }

        if (
            preco === undefined ||
            preco === null ||
            preco === ""
        ) {
            return res.status(400).json({
                erro: "Informe o preço do serviço"
            });
        }

        const precoNumero =
            Number(preco);

        if (
            Number.isNaN(precoNumero) ||
            precoNumero < 0
        ) {
            return res.status(400).json({
                erro: "Preço inválido"
            });
        }

        const result = await db.query(
            `
            INSERT INTO servico
            (
                tipo,
                imagem,
                preco
            )
            VALUES
            ($1, $2, $3)
            RETURNING *
            `,
            [
                tipo.trim(),
                imagem
                    ? imagem.trim()
                    : null,
                precoNumero
            ]
        );

        res.status(201).json({
            mensagem:
                "Serviço criado com sucesso",

            id_servico:
                result.rows[0].id_servico,

            servico:
                result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


// ------------------------------------------------------
// EDITAR SERVIÇO
// ------------------------------------------------------

router.put("/servicos/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            tipo,
            imagem,
            preco
        } = req.body;

        if (!tipo) {
            return res.status(400).json({
                erro: "Informe o nome do serviço"
            });
        }

        if (
            preco === undefined ||
            preco === null ||
            preco === ""
        ) {
            return res.status(400).json({
                erro: "Informe o preço do serviço"
            });
        }

        const precoNumero =
            Number(preco);

        if (
            Number.isNaN(precoNumero) ||
            precoNumero < 0
        ) {
            return res.status(400).json({
                erro: "Preço inválido"
            });
        }

        const result = await db.query(
            `
            UPDATE servico
            SET
                tipo = $1,
                imagem = $2,
                preco = $3
            WHERE id_servico = $4
            RETURNING *
            `,
            [
                tipo.trim(),
                imagem
                    ? imagem.trim()
                    : null,
                precoNumero,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }

        res.json({
            mensagem:
                "Serviço atualizado com sucesso",

            servico:
                result.rows[0]
        });

    } catch (error) {
        erro500(res, error);
    }
});


router.delete("/servicos/:id", (req, res) =>
    remover(
        req,
        res,
        "servico",
        "id_servico",
        "Serviço"
    )
);


// ======================================================
// AGENDAMENTOS - LISTAR
// ======================================================

router.get("/agendamentos", async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                a.id_agendamentos,
                a.data,
                a.horario,

                a.clientes_id_clientes,

                a.servico_id_servico,
                a.servico_barba_id_servico,

                a.funcionarios_id_funcionarios,

                a.preco,

                a.metodo_pagamento,
                a.status_pagamento,

                c.nome AS cliente,

                s.tipo AS servico,

                sb.tipo AS barba,

                f.nome AS funcionario

            FROM agendamentos a

            INNER JOIN clientes c
                ON
                    a.clientes_id_clientes =
                    c.id_clientes

            INNER JOIN servico s
                ON
                    a.servico_id_servico =
                    s.id_servico

            LEFT JOIN servico sb
                ON
                    a.servico_barba_id_servico =
                    sb.id_servico

            INNER JOIN funcionarios f
                ON
                    a.funcionarios_id_funcionarios =
                    f.id_funcionarios

            ORDER BY
                a.data,
                a.horario
        `);

        res.json(result.rows);

    } catch (error) {
        erro500(res, error);
    }
});


// ======================================================
// DISPONIBILIDADE
// ======================================================

router.get("/disponibilidade", async (req, res) => {

    try {

        const {
            data,
            funcionarioId,
            agendamentoId
        } = req.query;

        if (!data || !funcionarioId) {
            return res.status(400).json({
                erro:
                    "Informe data e funcionarioId"
            });
        }

        let sql = `
            SELECT
                id_agendamentos,
                horario
            FROM agendamentos
            WHERE
                data = $1
                AND funcionarios_id_funcionarios = $2
        `;

        const parametros = [
            data,
            funcionarioId
        ];

        if (agendamentoId) {

            sql += `
                AND id_agendamentos <> $3
            `;

            parametros.push(
                agendamentoId
            );
        }

        sql += `
            ORDER BY horario
        `;

        const result =
            await db.query(
                sql,
                parametros
            );

        res.json(
            result.rows
        );

    } catch (error) {
        erro500(res, error);
    }
});


// ======================================================
// CRIAR AGENDAMENTO
// ======================================================

router.post("/agendamentos", async (req, res) => {

    try {

        const {
            data,
            horario,
            clientes_id_clientes,
            servico_id_servico,
            servico_barba_id_servico,
            funcionarios_id_funcionarios,
            metodo_pagamento,
            status_pagamento
        } = req.body;


        // --------------------------------------------------
        // CAMPOS OBRIGATÓRIOS
        // --------------------------------------------------

        if (
            !data ||
            !horario ||
            !clientes_id_clientes ||
            !servico_id_servico ||
            !funcionarios_id_funcionarios
        ) {

            return res.status(400).json({
                erro:
                    "Preencha todos os campos obrigatórios"
            });
        }


        // --------------------------------------------------
        // VALIDAR DATA
        // --------------------------------------------------

        const dataObj =
            new Date(`${data}T00:00:00`);

        if (Number.isNaN(dataObj.getTime())) {

            return res.status(400).json({
                erro: "Data inválida"
            });
        }


        // --------------------------------------------------
        // NÃO PERMITIR DOMINGO
        // --------------------------------------------------

        if (dataObj.getDay() === 0) {

            return res.status(400).json({
                erro:
                    "A barbearia não funciona aos domingos"
            });
        }


        // --------------------------------------------------
        // VALIDAR HORÁRIO
        // --------------------------------------------------

        const horarioRegex =
            /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!horarioRegex.test(horario)) {

            return res.status(400).json({
                erro: "Horário inválido"
            });
        }

        const [hora, minuto] =
            horario
                .split(":")
                .map(Number);

        const minutosDoDia =
            hora * 60 + minuto;


        const manhaInicio =
            7 * 60;

        const manhaFim =
            11 * 60 + 30;

        const tardeInicio =
            13 * 60;

        const tardeFim =
            19 * 60;


        const horarioValido =
            (
                minutosDoDia >= manhaInicio &&
                minutosDoDia <= manhaFim
            ) ||
            (
                minutosDoDia >= tardeInicio &&
                minutosDoDia <= tardeFim
            );


        if (!horarioValido) {

            return res.status(400).json({
                erro:
                    "O horário deve estar entre 07:00–11:30 ou 13:00–19:00"
            });
        }


        // --------------------------------------------------
        // VERIFICAR CLIENTE
        // --------------------------------------------------

        const cliente =
            await db.query(
                `
                SELECT id_clientes
                FROM clientes
                WHERE id_clientes = $1
                `,
                [clientes_id_clientes]
            );

        if (cliente.rows.length === 0) {

            return res.status(404).json({
                erro:
                    "Cliente não encontrado"
            });
        }


        // --------------------------------------------------
        // VERIFICAR FUNCIONÁRIO
        // --------------------------------------------------

        const funcionario =
            await db.query(
                `
                SELECT id_funcionarios
                FROM funcionarios
                WHERE id_funcionarios = $1
                `,
                [funcionarios_id_funcionarios]
            );

        if (funcionario.rows.length === 0) {

            return res.status(404).json({
                erro:
                    "Funcionário não encontrado"
            });
        }


        // --------------------------------------------------
        // BUSCAR CORTE
        // --------------------------------------------------

        const corte =
            await db.query(
                `
                SELECT
                    id_servico,
                    tipo,
                    preco
                FROM servico
                WHERE id_servico = $1
                `,
                [servico_id_servico]
            );


        if (corte.rows.length === 0) {

            return res.status(404).json({
                erro:
                    "Serviço de corte não encontrado"
            });
        }


        const tipoCorte =
            String(
                corte.rows[0].tipo || ""
            )
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();


        if (tipoCorte.includes("barba")) {

            return res.status(400).json({
                erro:
                    "O serviço selecionado para corte é uma barba"
            });
        }


        const precoCorte =
            Number(
                corte.rows[0].preco
            ) || 0;


        // --------------------------------------------------
        // BUSCAR BARBA
        // --------------------------------------------------

        let precoBarba = 0;


        if (servico_barba_id_servico) {

            if (
                Number(servico_barba_id_servico) ===
                Number(servico_id_servico)
            ) {

                return res.status(400).json({
                    erro:
                        "O corte e a barba não podem ser o mesmo serviço"
                });
            }


            const barba =
                await db.query(
                    `
                    SELECT
                        id_servico,
                        tipo,
                        preco
                    FROM servico
                    WHERE id_servico = $1
                    `,
                    [servico_barba_id_servico]
                );


            if (barba.rows.length === 0) {

                return res.status(404).json({
                    erro:
                        "Serviço de barba não encontrado"
                });
            }


            const tipoBarba =
                String(
                    barba.rows[0].tipo || ""
                )
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();


            if (!tipoBarba.includes("barba")) {

                return res.status(400).json({
                    erro:
                        "O serviço selecionado para barba não é uma barba"
                });
            }


            precoBarba =
                Number(
                    barba.rows[0].preco
                ) || 0;
        }


        // --------------------------------------------------
        // PREÇO TOTAL
        // --------------------------------------------------

        const preco =
            precoCorte + precoBarba;


        // --------------------------------------------------
        // CONFLITO DE HORÁRIO
        // --------------------------------------------------

        const existe =
            await db.query(
                `
                SELECT
                    id_agendamentos
                FROM agendamentos

                WHERE
                    data = $1

                    AND horario = $2

                    AND funcionarios_id_funcionarios = $3
                `,
                [
                    data,
                    horario,
                    funcionarios_id_funcionarios
                ]
            );


        if (existe.rows.length > 0) {

            return res.status(409).json({
                erro:
                    "Esse funcionário já possui agendamento nesse dia e horário"
            });
        }


        // --------------------------------------------------
        // CRIAR
        // --------------------------------------------------

        const result =
            await db.query(
                `
                INSERT INTO agendamentos
                (
                    data,
                    horario,

                    clientes_id_clientes,

                    servico_id_servico,
                    servico_barba_id_servico,

                    funcionarios_id_funcionarios,

                    preco,

                    metodo_pagamento,
                    status_pagamento
                )

                VALUES
                (
                    $1,
                    $2,

                    $3,

                    $4,
                    $5,

                    $6,

                    $7,

                    $8,
                    $9
                )

                RETURNING *
                `,
                [
                    data,
                    horario,

                    clientes_id_clientes,

                    servico_id_servico,

                    servico_barba_id_servico
                        ? Number(
                            servico_barba_id_servico
                        )
                        : null,

                    funcionarios_id_funcionarios,

                    preco,

                    metodo_pagamento || null,

                    status_pagamento ||
                        "pendente"
                ]
            );


        // --------------------------------------------------
        // RESPOSTA
        // --------------------------------------------------

        res.status(201).json({

            mensagem:
                "Agendamento criado com sucesso",

            agendamento:
                result.rows[0],

            preco,

            preco_corte:
                precoCorte,

            preco_barba:
                precoBarba,

            metodo_pagamento:
                metodo_pagamento || null,

            status_pagamento:
                status_pagamento ||
                "pendente"
        });


    } catch (error) {

        console.error(
            "Erro ao criar agendamento:",
            error
        );

        erro500(
            res,
            error
        );
    }
});


// ======================================================
// ATUALIZAR AGENDAMENTO
// ======================================================

router.put("/agendamentos/:id", async (req, res) => {

    try {

        const { id } =
            req.params;


        const {
            data,
            horario,
            clientes_id_clientes,
            servico_id_servico,
            servico_barba_id_servico,
            funcionarios_id_funcionarios,
            metodo_pagamento,
            status_pagamento
        } = req.body;


        // --------------------------------------------------
        // CAMPOS
        // --------------------------------------------------

        if (
            !data ||
            !horario ||
            !clientes_id_clientes ||
            !servico_id_servico ||
            !funcionarios_id_funcionarios
        ) {

            return res.status(400).json({
                erro:
                    "Preencha todos os campos obrigatórios"
            });
        }


        // --------------------------------------------------
        // VERIFICAR EXISTÊNCIA
        // --------------------------------------------------

        const agendamento =
            await db.query(
                `
                SELECT *
                FROM agendamentos
                WHERE id_agendamentos = $1
                `,
                [id]
            );


        if (agendamento.rows.length === 0) {

            return res.status(404).json({
                erro:
                    "Agendamento não encontrado"
            });
        }


        // --------------------------------------------------
        // DATA
        // --------------------------------------------------

        const dataObj =
            new Date(`${data}T00:00:00`);

        if (Number.isNaN(dataObj.getTime())) {

            return res.status(400).json({
                erro: "Data inválida"
            });
        }


        if (dataObj.getDay() === 0) {

            return res.status(400).json({
                erro:
                    "A barbearia não funciona aos domingos"
            });
        }


        // --------------------------------------------------
        // HORÁRIO
        // --------------------------------------------------

        const horarioRegex =
            /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!horarioRegex.test(horario)) {

            return res.status(400).json({
                erro: "Horário inválido"
            });
        }


        const [hora, minuto] =
            horario
                .split(":")
                .map(Number);


        const minutosDoDia =
            hora * 60 + minuto;


        const horarioValido =
            (
                minutosDoDia >= 7 * 60 &&
                minutosDoDia <= 11 * 60 + 30
            ) ||
            (
                minutosDoDia >= 13 * 60 &&
                minutosDoDia <= 19 * 60
            );


        if (!horarioValido) {

            return res.status(400).json({
                erro:
                    "O horário deve estar entre 07:00–11:30 ou 13:00–19:00"
            });
        }


        // --------------------------------------------------
        // CORTE
        // --------------------------------------------------

        const corte =
            await db.query(
                `
                SELECT
                    id_servico,
                    tipo,
                    preco
                FROM servico
                WHERE id_servico = $1
                `,
                [servico_id_servico]
            );


        if (corte.rows.length === 0) {

            return res.status(404).json({
                erro:
                    "Serviço de corte não encontrado"
            });
        }


        const tipoCorte =
            String(
                corte.rows[0].tipo || ""
            )
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();


        if (tipoCorte.includes("barba")) {

            return res.status(400).json({
                erro:
                    "O serviço selecionado para corte é uma barba"
            });
        }


        const precoCorte =
            Number(
                corte.rows[0].preco
            ) || 0;


        // --------------------------------------------------
        // BARBA
        // --------------------------------------------------

        let precoBarba = 0;


        if (servico_barba_id_servico) {

            if (
                Number(servico_barba_id_servico) ===
                Number(servico_id_servico)
            ) {

                return res.status(400).json({
                    erro:
                        "O corte e a barba não podem ser o mesmo serviço"
                });
            }


            const barba =
                await db.query(
                    `
                    SELECT
                        id_servico,
                        tipo,
                        preco
                    FROM servico
                    WHERE id_servico = $1
                    `,
                    [servico_barba_id_servico]
                );


            if (barba.rows.length === 0) {

                return res.status(404).json({
                    erro:
                        "Serviço de barba não encontrado"
                });
            }


            const tipoBarba =
                String(
                    barba.rows[0].tipo || ""
                )
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();


            if (!tipoBarba.includes("barba")) {

                return res.status(400).json({
                    erro:
                        "O serviço selecionado para barba não é uma barba"
                });
            }


            precoBarba =
                Number(
                    barba.rows[0].preco
                ) || 0;
        }


        // --------------------------------------------------
        // TOTAL
        // --------------------------------------------------

        const preco =
            precoCorte + precoBarba;


        // --------------------------------------------------
        // CONFLITO
        // --------------------------------------------------

        const conflito =
            await db.query(
                `
                SELECT
                    id_agendamentos
                FROM agendamentos

                WHERE
                    data = $1

                    AND horario = $2

                    AND funcionarios_id_funcionarios = $3

                    AND id_agendamentos <> $4
                `,
                [
                    data,
                    horario,
                    funcionarios_id_funcionarios,
                    id
                ]
            );


        if (conflito.rows.length > 0) {

            return res.status(409).json({
                erro:
                    "Esse funcionário já possui agendamento nesse dia e horário"
            });
        }


        // --------------------------------------------------
        // ATUALIZAR
        // --------------------------------------------------

        const result =
            await db.query(
                `
                UPDATE agendamentos

                SET

                    data = $1,
                    horario = $2,

                    clientes_id_clientes = $3,

                    servico_id_servico = $4,
                    servico_barba_id_servico = $5,

                    funcionarios_id_funcionarios = $6,

                    preco = $7,

                    metodo_pagamento = $8,
                    status_pagamento = $9

                WHERE
                    id_agendamentos = $10

                RETURNING *
                `,
                [
                    data,
                    horario,

                    clientes_id_clientes,

                    servico_id_servico,

                    servico_barba_id_servico
                        ? Number(
                            servico_barba_id_servico
                        )
                        : null,

                    funcionarios_id_funcionarios,

                    preco,

                    metodo_pagamento || null,

                    status_pagamento ||
                        "pendente",

                    id
                ]
            );


        res.json({

            mensagem:
                "Agendamento atualizado com sucesso",

            agendamento:
                result.rows[0],

            preco,

            preco_corte:
                precoCorte,

            preco_barba:
                precoBarba
        });


    } catch (error) {

        console.error(
            "Erro ao atualizar agendamento:",
            error
        );

        erro500(
            res,
            error
        );
    }
});


// ======================================================
// REMOVER AGENDAMENTO
// ======================================================

router.delete(
    "/agendamentos/:id",
    async (req, res) => {

        try {

            const { id } =
                req.params;


            const result =
                await db.query(
                    `
                    DELETE FROM agendamentos

                    WHERE
                        id_agendamentos = $1

                    RETURNING id_agendamentos
                    `,
                    [id]
                );


            if (result.rowCount === 0) {

                return res.status(404).json({
                    erro:
                        "Agendamento não encontrado"
                });
            }


            res.json({

                mensagem:
                    "Agendamento removido com sucesso",

                id_agendamentos:
                    result.rows[0]
                        .id_agendamentos
            });


        } catch (error) {

            console.error(
                "Erro ao remover agendamento:",
                error
            );

            erro500(
                res,
                error
            );
        }
    }
);


// ======================================================
// EXPORTAR
// ======================================================

module.exports = router;