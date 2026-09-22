const express = require("express");
const router = express.Router();
const db = require("./db");

// =====================================================
// FUNÇÃO PADRÃO PARA ERROS
// =====================================================

const erro500 = (res, error) => {
    console.error(error);

    res.status(500).json({
        erro: error.message
    });
};

// =====================================================
// FUNÇÕES GENÉRICAS
// =====================================================

const listar = (tabela) => async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM ${tabela}`);
        res.json(result.rows);
    } catch (error) {
        erro500(res, error);
    }
};

const criar = (tabela, campos) => async (req, res) => {
    try {
        const valores = campos.map(campo => req.body[campo]);

        const placeholders = valores
            .map((_, index) => `$${index + 1}`)
            .join(",");

        const result = await db.query(
            `
            INSERT INTO ${tabela} (${campos.join(",")})
            VALUES (${placeholders})
            RETURNING *
            `,
            valores
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        erro500(res, error);
    }
};

const atualizar = (tabela, campos, chave) => async (req, res) => {
    try {
        const valores = campos.map(campo => req.body[campo]);

        const sets = campos
            .map((campo, index) => `${campo} = $${index + 1}`)
            .join(",");

        valores.push(req.params.id);

        const result = await db.query(
            `
            UPDATE ${tabela}
            SET ${sets}
            WHERE ${chave} = $${valores.length}
            RETURNING *
            `,
            valores
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                erro: "Registro não encontrado"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        erro500(res, error);
    }
};

const remover = (tabela, chave) => async (req, res) => {
    try {
        const result = await db.query(
            `
            DELETE FROM ${tabela}
            WHERE ${chave} = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                erro: "Registro não encontrado"
            });
        }

        res.json({
            mensagem: "Registro removido com sucesso"
        });

    } catch (error) {
        erro500(res, error);
    }
};

// =====================================================
// CLIENTES
// =====================================================

router.get("/clientes", listar("clientes"));

router.post(
    "/clientes",
    criar("clientes", [
        "nome",
        "email",
        "senha",
        "telefone"
    ])
);

router.put(
    "/clientes/:id",
    atualizar(
        "clientes",
        [
            "nome",
            "email",
            "senha",
            "telefone"
        ],
        "id_clientes"
    )
);

router.delete(
    "/clientes/:id",
    remover("clientes", "id_clientes")
);

// =====================================================
// FUNCIONÁRIOS
// =====================================================

router.get("/funcionarios", listar("funcionarios"));

router.post(
    "/funcionarios",
    criar("funcionarios", [
        "nome",
        "email",
        "senha"
    ])
);

router.put(
    "/funcionarios/:id",
    atualizar(
        "funcionarios",
        [
            "nome",
            "email",
            "senha"
        ],
        "id_funcionarios"
    )
);

router.delete(
    "/funcionarios/:id",
    remover("funcionarios", "id_funcionarios")
);

// =====================================================
// SERVIÇOS
// =====================================================

router.get("/servicos", listar("servico"));

router.post(
    "/servicos",
    criar("servico", [
        "tipo",
        "preco",
        "imagem"
    ])
);

router.put(
    "/servicos/:id",
    atualizar(
        "servico",
        [
            "tipo",
            "preco",
            "imagem"
        ],
        "id_servico"
    )
);

router.delete(
    "/servicos/:id",
    remover("servico", "id_servico")
);

// =====================================================
// AGENDAMENTOS - LISTAR
// =====================================================

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
                a.valor,
                a.metodo_pagamento,
                a.status_pagamento,

                c.nome AS cliente,
                s.tipo AS servico,
                sb.tipo AS barba,
                f.nome AS funcionario

            FROM agendamentos a

            INNER JOIN clientes c
                ON a.clientes_id_clientes = c.id_clientes

            INNER JOIN servico s
                ON a.servico_id_servico = s.id_servico

            LEFT JOIN servico sb
                ON a.servico_barba_id_servico = sb.id_servico

            INNER JOIN funcionarios f
                ON a.funcionarios_id_funcionarios = f.id_funcionarios

            ORDER BY a.data, a.horario
        `);

        res.json(result.rows);

    } catch (error) {
        erro500(res, error);
    }
});

// =====================================================
// AGENDAMENTOS - VERIFICAR HORÁRIO
// =====================================================

router.get("/agendamentos/verificar", async (req, res) => {
    try {
        const {
            data,
            horario,
            funcionarios_id_funcionarios
        } = req.query;

        if (!data || !horario || !funcionarios_id_funcionarios) {
            return res.status(400).json({
                erro: "Data, horário e funcionário são obrigatórios"
            });
        }

        const result = await db.query(
            `
            SELECT *
            FROM agendamentos
            WHERE data = $1
            AND horario = $2
            AND funcionarios_id_funcionarios = $3
            `,
            [
                data,
                horario,
                funcionarios_id_funcionarios
            ]
        );

        res.json({
            disponivel: result.rows.length === 0,
            agendamentos: result.rows
        });

    } catch (error) {
        erro500(res, error);
    }
});

// =====================================================
// AGENDAMENTOS - CRIAR
// =====================================================

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

        // ---------------------------------------------
        // VALIDAÇÃO DOS CAMPOS
        // ---------------------------------------------

        if (
            !data ||
            !horario ||
            !clientes_id_clientes ||
            !servico_id_servico ||
            !funcionarios_id_funcionarios
        ) {
            return res.status(400).json({
                erro: "Preencha todos os campos obrigatórios"
            });
        }

        // ---------------------------------------------
        // VALIDAR DATA
        // ---------------------------------------------

        const dataObj = new Date(`${data}T00:00:00`);

        if (isNaN(dataObj.getTime())) {
            return res.status(400).json({
                erro: "Data inválida"
            });
        }

        // Domingo
        if (dataObj.getDay() === 0) {
            return res.status(400).json({
                erro: "A barbearia não funciona aos domingos"
            });
        }

        // ---------------------------------------------
        // VALIDAR HORÁRIO
        // ---------------------------------------------

        const horarioRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!horarioRegex.test(horario)) {
            return res.status(400).json({
                erro: "Horário inválido"
            });
        }

        const [hora, minuto] = horario.split(":").map(Number);

        const minutosDoDia = hora * 60 + minuto;

        const inicioManha = 7 * 60;
        const fimManha = 11 * 60 + 30;

        const inicioTarde = 13 * 60;
        const fimTarde = 19 * 60;

        const horarioValido =
            (
                minutosDoDia >= inicioManha &&
                minutosDoDia <= fimManha
            ) ||
            (
                minutosDoDia >= inicioTarde &&
                minutosDoDia <= fimTarde
            );

        if (!horarioValido) {
            return res.status(400).json({
                erro: "Horário fora do funcionamento da barbearia"
            });
        }

        // ---------------------------------------------
        // VERIFICAR CLIENTE
        // ---------------------------------------------

        const cliente = await db.query(
            `
            SELECT *
            FROM clientes
            WHERE id_clientes = $1
            `,
            [clientes_id_clientes]
        );

        if (cliente.rows.length === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado"
            });
        }

        // ---------------------------------------------
        // VERIFICAR FUNCIONÁRIO
        // ---------------------------------------------

        const funcionario = await db.query(
            `
            SELECT *
            FROM funcionarios
            WHERE id_funcionarios = $1
            `,
            [funcionarios_id_funcionarios]
        );

        if (funcionario.rows.length === 0) {
            return res.status(404).json({
                erro: "Funcionário não encontrado"
            });
        }

        // ---------------------------------------------
        // BUSCAR SERVIÇO PRINCIPAL
        // ---------------------------------------------

        const servico = await db.query(
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

        if (servico.rows.length === 0) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }

        const precoCorte = Number(servico.rows[0].preco);

        // ---------------------------------------------
        // SERVIÇO DE BARBA
        // ---------------------------------------------

        let precoBarba = 0;

        if (servico_barba_id_servico) {

            const barba = await db.query(
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
                    erro: "Serviço de barba não encontrado"
                });
            }

            const tipoBarba = barba.rows[0].tipo.toLowerCase();

            if (!tipoBarba.includes("barba")) {
                return res.status(400).json({
                    erro: "O serviço selecionado para barba não é um serviço de barba"
                });
            }

            precoBarba = Number(barba.rows[0].preco);
        }

        // ---------------------------------------------
        // CALCULAR PREÇO TOTAL
        // ---------------------------------------------

        const preco = precoCorte + precoBarba;

        // ---------------------------------------------
        // VERIFICAR CONFLITO DE HORÁRIO
        // ---------------------------------------------

        const conflito = await db.query(
            `
            SELECT *
            FROM agendamentos
            WHERE data = $1
            AND horario = $2
            AND funcionarios_id_funcionarios = $3
            `,
            [
                data,
                horario,
                funcionarios_id_funcionarios
            ]
        );

        if (conflito.rows.length > 0) {
            return res.status(409).json({
                erro: "Este funcionário já possui um agendamento neste horário"
            });
        }

        // ---------------------------------------------
        // INSERIR AGENDAMENTO
        // ---------------------------------------------

        const result = await db.query(
            `
            INSERT INTO agendamentos
            (
                data,
                horario,
                clientes_id_clientes,
                servico_id_servico,
                servico_barba_id_servico,
                funcionarios_id_funcionarios,
                valor,
                metodo_pagamento,
                status_pagamento
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            `,
            [
                data,
                horario,
                clientes_id_clientes,
                servico_id_servico,
                servico_barba_id_servico || null,
                funcionarios_id_funcionarios,
                preco,
                metodo_pagamento || null,
                status_pagamento || "pendente"
            ]
        );

        res.status(201).json({
            mensagem: "Agendamento criado com sucesso",
            agendamento: result.rows[0],
            preco,
            preco_corte: precoCorte,
            preco_barba: precoBarba,
            metodo_pagamento: metodo_pagamento || null,
            status_pagamento: status_pagamento || "pendente"
        });

    } catch (error) {
        erro500(res, error);
    }
});

// =====================================================
// AGENDAMENTOS - ATUALIZAR
// =====================================================

router.put("/agendamentos/:id", async (req, res) => {
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

        // ---------------------------------------------
        // VALIDAÇÃO
        // ---------------------------------------------

        if (
            !data ||
            !horario ||
            !clientes_id_clientes ||
            !servico_id_servico ||
            !funcionarios_id_funcionarios
        ) {
            return res.status(400).json({
                erro: "Preencha todos os campos obrigatórios"
            });
        }

        // ---------------------------------------------
        // VALIDAR DATA
        // ---------------------------------------------

        const dataObj = new Date(`${data}T00:00:00`);

        if (isNaN(dataObj.getTime())) {
            return res.status(400).json({
                erro: "Data inválida"
            });
        }

        if (dataObj.getDay() === 0) {
            return res.status(400).json({
                erro: "A barbearia não funciona aos domingos"
            });
        }

        // ---------------------------------------------
        // VALIDAR HORÁRIO
        // ---------------------------------------------

        const horarioRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!horarioRegex.test(horario)) {
            return res.status(400).json({
                erro: "Horário inválido"
            });
        }

        const [hora, minuto] = horario.split(":").map(Number);

        const minutosDoDia = hora * 60 + minuto;

        const inicioManha = 7 * 60;
        const fimManha = 11 * 60 + 30;

        const inicioTarde = 13 * 60;
        const fimTarde = 19 * 60;

        const horarioValido =
            (
                minutosDoDia >= inicioManha &&
                minutosDoDia <= fimManha
            ) ||
            (
                minutosDoDia >= inicioTarde &&
                minutosDoDia <= fimTarde
            );

        if (!horarioValido) {
            return res.status(400).json({
                erro: "Horário fora do funcionamento da barbearia"
            });
        }

        // ---------------------------------------------
        // VERIFICAR CLIENTE
        // ---------------------------------------------

        const cliente = await db.query(
            `
            SELECT *
            FROM clientes
            WHERE id_clientes = $1
            `,
            [clientes_id_clientes]
        );

        if (cliente.rows.length === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado"
            });
        }

        // ---------------------------------------------
        // VERIFICAR FUNCIONÁRIO
        // ---------------------------------------------

        const funcionario = await db.query(
            `
            SELECT *
            FROM funcionarios
            WHERE id_funcionarios = $1
            `,
            [funcionarios_id_funcionarios]
        );

        if (funcionario.rows.length === 0) {
            return res.status(404).json({
                erro: "Funcionário não encontrado"
            });
        }

        // ---------------------------------------------
        // BUSCAR SERVIÇO PRINCIPAL
        // ---------------------------------------------

        const servico = await db.query(
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

        if (servico.rows.length === 0) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }

        const precoCorte = Number(servico.rows[0].preco);

        // ---------------------------------------------
        // SERVIÇO DE BARBA
        // ---------------------------------------------

        let precoBarba = 0;

        if (servico_barba_id_servico) {

            const barba = await db.query(
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
                    erro: "Serviço de barba não encontrado"
                });
            }

            const tipoBarba = barba.rows[0].tipo.toLowerCase();

            if (!tipoBarba.includes("barba")) {
                return res.status(400).json({
                    erro: "O serviço selecionado para barba não é um serviço de barba"
                });
            }

            precoBarba = Number(barba.rows[0].preco);
        }

        // ---------------------------------------------
        // CALCULAR PREÇO TOTAL
        // ---------------------------------------------

        const preco = precoCorte + precoBarba;

        // ---------------------------------------------
        // VERIFICAR CONFLITO
        // ---------------------------------------------

        const conflito = await db.query(
            `
            SELECT *
            FROM agendamentos
            WHERE data = $1
            AND horario = $2
            AND funcionarios_id_funcionarios = $3
            AND id_agendamentos != $4
            `,
            [
                data,
                horario,
                funcionarios_id_funcionarios,
                req.params.id
            ]
        );

        if (conflito.rows.length > 0) {
            return res.status(409).json({
                erro: "Este funcionário já possui um agendamento neste horário"
            });
        }

        // ---------------------------------------------
        // ATUALIZAR AGENDAMENTO
        // ---------------------------------------------

        const result = await db.query(
            `
            UPDATE agendamentos
            SET
                data = $1,
                horario = $2,
                clientes_id_clientes = $3,
                servico_id_servico = $4,
                servico_barba_id_servico = $5,
                funcionarios_id_funcionarios = $6,
                valor = $7,
                metodo_pagamento = $8,
                status_pagamento = $9
            WHERE id_agendamentos = $10
            RETURNING *
            `,
            [
                data,
                horario,
                clientes_id_clientes,
                servico_id_servico,
                servico_barba_id_servico || null,
                funcionarios_id_funcionarios,
                preco,
                metodo_pagamento || null,
                status_pagamento || "pendente",
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                erro: "Agendamento não encontrado"
            });
        }

        res.json({
            mensagem: "Agendamento atualizado com sucesso",
            agendamento: result.rows[0],
            preco,
            preco_corte: precoCorte,
            preco_barba: precoBarba,
            metodo_pagamento: metodo_pagamento || null,
            status_pagamento: status_pagamento || "pendente"
        });

    } catch (error) {
        erro500(res, error);
    }
});

// =====================================================
// AGENDAMENTOS - DELETAR
// =====================================================

router.delete(
    "/agendamentos/:id",
    remover("agendamentos", "id_agendamentos")
);

// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            senha
        } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "Email e senha são obrigatórios"
            });
        }

        // ---------------------------------------------
        // TENTAR LOGIN COMO CLIENTE
        // ---------------------------------------------

        const cliente = await db.query(
            `
            SELECT *
            FROM clientes
            WHERE email = $1
            AND senha = $2
            `,
            [
                email,
                senha
            ]
        );

        if (cliente.rows.length > 0) {
            return res.json({
                mensagem: "Login realizado com sucesso",
                tipo: "cliente",
                usuario: cliente.rows[0]
            });
        }

        // ---------------------------------------------
        // TENTAR LOGIN COMO FUNCIONÁRIO
        // ---------------------------------------------

        const funcionario = await db.query(
            `
            SELECT *
            FROM funcionarios
            WHERE email = $1
            AND senha = $2
            `,
            [
                email,
                senha
            ]
        );

        if (funcionario.rows.length > 0) {
            return res.json({
                mensagem: "Login realizado com sucesso",
                tipo: "adm",
                usuario: funcionario.rows[0]
            });
        }

        // ---------------------------------------------
        // LOGIN INVÁLIDO
        // ---------------------------------------------

        return res.status(401).json({
            erro: "Email ou senha incorretos"
        });

    } catch (error) {
        erro500(res, error);
    }
});

// =====================================================
// EXPORTAR ROTAS
// =====================================================

module.exports = router;