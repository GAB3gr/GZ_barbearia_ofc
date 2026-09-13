const API_URL = "https://gz-barbearia-ofc-2.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "index") {
        iniciarIndex();
    }

    if (page === "dashboard") {
        iniciarDashboard();
    }

    if (page === "cliente") {
        iniciarCliente();
    }

    configurarTema();
    configurarSair();
});

// ============================================================
// FUNÇÕES GERAIS
// ============================================================

async function request(url, options = {}) {
    const resposta = await fetch(`${API_URL}${url}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    let dados = null;

    try {
        dados = await resposta.json();
    } catch {
        dados = null;
    }

    if (!resposta.ok) {
        throw new Error(
            dados?.erro ||
            dados?.error ||
            `Erro ${resposta.status}`
        );
    }

    return dados;
}

function formatarData(data) {
    if (!data) return "";

    const partes = String(data)
        .split("T")[0]
        .split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function limparElemento(elemento) {
    if (elemento) {
        elemento.innerHTML = "";
    }
}

function criarLinhaVazia(
    tbody,
    colunas,
    mensagem = "Nenhum registro encontrado."
) {
    tbody.innerHTML = `
        <tr>
            <td colspan="${colunas}" style="text-align:center;">
                ${mensagem}
            </td>
        </tr>
    `;
}

function escaparHTML(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatarPreco(valor) {
    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function caminhoImagem(imagem) {
    if (!imagem) return "";

    const nome = String(imagem)
        .replace(/^.*[\\\/]/, "")
        .trim();

    if (!nome) return "";

    return `/frontend/imagens/${encodeURIComponent(nome)}`;
}

function normalizarTipo(tipo) {
    return String(tipo || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// ============================================================
// LOGIN
// ============================================================

function iniciarIndex() {
    const formLogin = document.getElementById("form-login");

    if (!formLogin) return;

    formLogin.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email")?.value.trim();
        const senha = document.getElementById("senha")?.value;

        if (!email || !senha) {
            alert("Preencha todos os campos.");
            return;
        }

        try {
            const usuario = await request("/usuarios/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    senha
                })
            });

            localStorage.setItem(
                "usuario",
                JSON.stringify(usuario)
            );

            if (usuario.nome) {
                localStorage.setItem("nome", usuario.nome);
            }

            if (usuario.tipo) {
                localStorage.setItem("tipo", usuario.tipo);
            }

            if (usuario.email) {
                localStorage.setItem("email", usuario.email);
            }

            if (usuario.telefone) {
                localStorage.setItem(
                    "telefone",
                    usuario.telefone
                );
            }

            if (
                usuario.tipo === "adm" ||
                usuario.tipo === "admin" ||
                usuario.tipo === "administrador"
            ) {
                window.location.href =
                    "/frontend/admin/dashboard.html";
            } else {
                window.location.href =
                    "/frontend/user/cliente.html";
            }

        } catch (erro) {
            console.error("Erro no login:", erro);

            alert(
                erro.message ||
                "Erro ao realizar login."
            );
        }
    });
}

// ============================================================
// SAIR
// ============================================================

function sair() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("nome");
    localStorage.removeItem("tipo");
    localStorage.removeItem("email");
    localStorage.removeItem("telefone");

    window.location.href = "/frontend/login.html";
}

function configurarSair() {
    const botoesSair = document.querySelectorAll(
        "#btn-sair, #sair, .btn-sair, [data-action='sair']"
    );

    botoesSair.forEach((botao) => {
        botao.addEventListener("click", (event) => {
            event.preventDefault();
            sair();
        });
    });
}

// ============================================================
// DASHBOARD
// ============================================================

function iniciarDashboard() {
    carregarClientesDashboard();
    carregarFuncionariosDashboard();
    carregarServicosDashboard();
    configurarFormularioAgendamentos();
    carregarAgendamentos();
    carregarSelectsAgendamento();
}

// ============================================================
// CLIENTES - DASHBOARD
// ============================================================

async function carregarClientesDashboard() {
    const tabela = document.getElementById("lista-clientes");

    if (!tabela) return;

    try {
        const clientes = await request("/clientes");

        limparElemento(tabela);

        if (!clientes || clientes.length === 0) {
            criarLinhaVazia(tabela, 5);
            return;
        }

        clientes.forEach((cliente) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${cliente.id_clientes}</td>

                <td>
                    ${escaparHTML(cliente.nome)}
                </td>

                <td>
                    ${escaparHTML(cliente.email)}
                </td>

                <td>
                    ${escaparHTML(cliente.telefone)}
                </td>

                <td>
                    <button
                        type="button"
                        onclick="editarCliente(${cliente.id_clientes})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onclick="excluirCliente(${cliente.id_clientes})"
                    >
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar clientes:",
            erro
        );

        criarLinhaVazia(
            tabela,
            5,
            "Erro ao carregar clientes."
        );
    }
}

// ============================================================
// FUNCIONÁRIOS
// ============================================================

async function carregarFuncionariosDashboard() {
    const tabela =
        document.getElementById("lista-funcionarios");

    if (!tabela) return;

    try {
        const funcionarios =
            await request("/funcionarios");

        limparElemento(tabela);

        if (!funcionarios || funcionarios.length === 0) {
            criarLinhaVazia(tabela, 4);
            return;
        }

        funcionarios.forEach((funcionario) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>
                    ${funcionario.id_funcionarios}
                </td>

                <td>
                    ${escaparHTML(funcionario.nome)}
                </td>

                <td>
                    ${escaparHTML(
                        funcionario.telefone || ""
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        onclick="editarFuncionario(${funcionario.id_funcionarios})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onclick="excluirFuncionario(${funcionario.id_funcionarios})"
                    >
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar funcionários:",
            erro
        );

        criarLinhaVazia(
            tabela,
            4,
            "Erro ao carregar funcionários."
        );
    }
}

// ============================================================
// SERVIÇOS
// ============================================================

async function carregarServicosDashboard() {
    const tabela =
        document.getElementById("lista-servicos");

    if (!tabela) return;

    try {
        const servicos = await request("/servicos");

        limparElemento(tabela);

        if (!servicos || servicos.length === 0) {
            criarLinhaVazia(tabela, 6);
            return;
        }

        servicos.forEach((servico) => {
            const tipo =
                escaparHTML(servico.tipo);

            const imagem =
                escaparHTML(servico.imagem);

            const preco =
                formatarPreco(servico.preco);

            const tr =
                document.createElement("tr");

            tr.innerHTML = `
                <td>
                    ${servico.id_servico}
                </td>

                <td>
                    ${tipo}
                </td>

                <td>
                    ${
                        imagem
                            ? `
                                <img
                                    src="${caminhoImagem(imagem)}"
                                    alt="${tipo}"
                                    style="
                                        width:70px;
                                        height:50px;
                                        object-fit:cover;
                                        border-radius:8px;
                                    "
                                    onerror="
                                        this.style.display='none'
                                    "
                                >
                            `
                            : "Sem imagem"
                    }
                </td>

                <td>
                    ${preco}
                </td>

                <td>
                    ${
                        normalizarTipo(
                            servico.tipo
                        ).includes("barba")
                            ? "Barba"
                            : "Corte"
                    }
                </td>

                <td>
                    <button
                        type="button"
                        onclick="editarServico(${servico.id_servico})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onclick="excluirServico(${servico.id_servico})"
                    >
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar serviços:",
            erro
        );

        criarLinhaVazia(
            tabela,
            6,
            "Erro ao carregar serviços."
        );
    }
}

// ============================================================
// AGENDAMENTOS - DASHBOARD
// ============================================================

async function carregarAgendamentos() {
    const tabela =
        document.getElementById("lista-agendamentos");

    if (!tabela) return;

    try {
        const agendamentos =
            await request("/agendamentos");

        limparElemento(tabela);

        if (!agendamentos || agendamentos.length === 0) {
            criarLinhaVazia(tabela, 8);
            return;
        }

        agendamentos.forEach((item) => {
            const tr =
                document.createElement("tr");

            const servicoPrincipal =
                item.servico ||
                item.nome_servico ||
                item.tipo ||
                "Serviço";

            const barba =
                item.servico_barba ||
                item.barba ||
                "";

            const servicosTexto = barba
                ? `${escaparHTML(servicoPrincipal)} + ${escaparHTML(barba)}`
                : escaparHTML(servicoPrincipal);

            const statusPagamento =
                item.status_pagamento ||
                "pendente";

            tr.innerHTML = `
                <td>
                    ${item.id_agendamentos}
                </td>

                <td>
                    ${formatarData(item.data)}
                </td>

                <td>
                    ${escaparHTML(item.horario || "")}
                </td>

                <td>
                    ${escaparHTML(
                        item.cliente ||
                        item.nome_cliente ||
                        ""
                    )}
                </td>

                <td>
                    ${servicosTexto}
                </td>

                <td>
                    ${escaparHTML(
                        item.funcionario ||
                        item.nome_funcionario ||
                        ""
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        item.metodo_pagamento || ""
                    )}

                    <br>

                    <small>
                        ${escaparHTML(statusPagamento)}
                    </small>
                </td>

                <td>
                    <button
                        type="button"
                        onclick="editarAgendamento(${item.id_agendamentos})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onclick="excluirAgendamento(${item.id_agendamentos})"
                    >
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar agendamentos:",
            erro
        );

        criarLinhaVazia(
            tabela,
            8,
            "Erro ao carregar agendamentos."
        );
    }
}

// ============================================================
// SELECTS / SERVIÇOS
// ============================================================

async function carregarSelectsAgendamento() {
    const selectFuncionario =
        document.getElementById(
            "agendamento-funcionario"
        );

    const selectCorte =
        document.getElementById(
            "agendamento-corte"
        );

    const selectBarba =
        document.getElementById(
            "agendamento-barba"
        );

    if (
        !selectFuncionario &&
        !selectCorte &&
        !selectBarba
    ) {
        return;
    }

    try {
        const [funcionarios, servicos] =
            await Promise.all([
                request("/funcionarios"),
                request("/servicos")
            ]);

        if (selectFuncionario) {
            selectFuncionario.innerHTML = `
                <option value="">
                    Selecione o funcionário
                </option>
            `;

            funcionarios.forEach((funcionario) => {
                const option =
                    document.createElement("option");

                option.value =
                    funcionario.id_funcionarios;

                option.textContent =
                    funcionario.nome;

                selectFuncionario.appendChild(option);
            });
        }

        const cortes = [];
        const barbas = [];

        servicos.forEach((servico) => {
            const tipo =
                normalizarTipo(servico.tipo);

            if (tipo.includes("barba")) {
                barbas.push(servico);
            } else {
                cortes.push(servico);
            }
        });

        if (selectCorte) {
            selectCorte.innerHTML = `
                <option value="">
                    Selecione o corte
                </option>
            `;

            cortes.forEach((servico) => {
                const option =
                    document.createElement("option");

                option.value =
                    servico.id_servico;

                option.textContent =
                    `${servico.tipo} - ${formatarPreco(servico.preco)}`;

                selectCorte.appendChild(option);
            });
        }

        if (selectBarba) {
            selectBarba.innerHTML = `
                <option value="">
                    Nenhuma barba
                </option>
            `;

            barbas.forEach((servico) => {
                const option =
                    document.createElement("option");

                option.value =
                    servico.id_servico;

                option.textContent =
                    `${servico.tipo} - ${formatarPreco(servico.preco)}`;

                selectBarba.appendChild(option);
            });
        }

        renderizarCardsServicos(
            document.getElementById(
                "lista-cortes-cliente"
            ),
            cortes,
            "corte"
        );

        renderizarCardsServicos(
            document.getElementById(
                "lista-barbas-cliente"
            ),
            barbas,
            "barba"
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar selects:",
            erro
        );
    }
}

// ============================================================
// CARDS DE SERVIÇOS
// ============================================================

function renderizarCardsServicos(
    container,
    servicos,
    tipo
) {
    if (!container) return;

    limparElemento(container);

    if (!servicos || servicos.length === 0) {
        container.innerHTML = `
            <p style="text-align:center;">
                Nenhum serviço disponível.
            </p>
        `;

        return;
    }

    servicos.forEach((servico) => {
        const card =
            document.createElement("div");

        card.className = "card-servico";

        card.dataset.id =
            servico.id_servico;

        card.dataset.tipo =
            tipo;

        const imagem =
            caminhoImagem(servico.imagem);

        card.innerHTML = `
            ${
                imagem
                    ? `
                        <img
                            src="${imagem}"
                            alt="${escaparHTML(servico.tipo)}"
                            onerror="
                                this.style.display='none'
                            "
                        >
                    `
                    : `
                        <div
                            style="
                                height:170px;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                background:#ddd;
                            "
                        >
                            Sem imagem
                        </div>
                    `
            }

            <div class="card-servico-info">
                <div class="card-servico-nome">
                    ${escaparHTML(servico.tipo)}
                </div>

                <div class="card-servico-preco">
                    ${formatarPreco(servico.preco)}
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            selecionarServico(
                servico.id_servico,
                tipo
            );
        });

        container.appendChild(card);
    });

    if (tipo === "barba") {
        const cardNenhuma =
            document.createElement("div");

        cardNenhuma.className =
            "card-servico card-nenhuma-barba";

        cardNenhuma.dataset.id = "";

        cardNenhuma.dataset.tipo = "barba";

        cardNenhuma.innerHTML = `
            <div
                style="
                    height:170px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:3rem;
                "
            >
                ✕
            </div>

            <div class="card-servico-info">
                <div class="card-servico-nome">
                    Nenhuma barba
                </div>

                <div class="card-servico-preco">
                    Grátis
                </div>
            </div>
        `;

        cardNenhuma.addEventListener(
            "click",
            selecionarNenhumaBarba
        );

        container.appendChild(cardNenhuma);
    }
}

// ============================================================
// SELECIONAR SERVIÇO
// ============================================================

function selecionarServico(idServico, tipo) {
    const id = String(idServico);

    if (tipo === "corte") {
        const select =
            document.getElementById(
                "agendamento-corte"
            );

        if (select) {
            select.value = id;
        }

        document
            .querySelectorAll(
                "#lista-cortes-cliente .card-servico"
            )
            .forEach((card) => {
                card.classList.toggle(
                    "selecionado",
                    String(card.dataset.id) === id
                );
            });

        return;
    }

    if (tipo === "barba") {
        const select =
            document.getElementById(
                "agendamento-barba"
            );

        if (select) {
            select.value = id;
        }

        document
            .querySelectorAll(
                "#lista-barbas-cliente .card-servico"
            )
            .forEach((card) => {
                card.classList.toggle(
                    "selecionado",
                    String(card.dataset.id) === id
                );
            });
    }
}

// ============================================================
// NENHUMA BARBA
// ============================================================

function selecionarNenhumaBarba() {
    const select =
        document.getElementById(
            "agendamento-barba"
        );

    if (select) {
        select.value = "";
    }

    document
        .querySelectorAll(
            "#lista-barbas-cliente .card-servico"
        )
        .forEach((card) => {
            card.classList.remove(
                "selecionado"
            );
        });

    const nenhuma =
        document.querySelector(
            "#lista-barbas-cliente .card-nenhuma-barba"
        );

    if (nenhuma) {
        nenhuma.classList.add(
            "selecionado"
        );
    }
}

// ============================================================
// FORMULÁRIO DE AGENDAMENTO
// ============================================================

function configurarFormularioAgendamentos() {
    const form =
        document.getElementById(
            "form-agendamento"
        );

    const btnAgendar =
        document.getElementById(
            "btn-agendar"
        );

    const btnCancelar =
        document.getElementById(
            "cancelar-agendamento"
        );

    if (form) {
        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();
                salvarAgendamento(event);
            }
        );
    } else if (btnAgendar) {
        btnAgendar.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                salvarAgendamento(event);
            }
        );
    }

    if (btnCancelar) {
        btnCancelar.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                resetarFormularioAgendamento();
            }
        );
    }
}

// ============================================================
// SALVAR AGENDAMENTO
// ============================================================

async function salvarAgendamento(event) {
    if (event) {
        event.preventDefault();
    }

    const id =
        document.getElementById(
            "agendamento-id"
        )?.value;

    const data =
        document.getElementById(
            "agendamento-data"
        )?.value;

    const horario =
        document.getElementById(
            "agendamento-horario"
        )?.value;

    const servico_id_servico =
        document.getElementById(
            "agendamento-corte"
        )?.value;

    const servico_barba_id_servico =
        document.getElementById(
            "agendamento-barba"
        )?.value;

    const funcionarios_id_funcionarios =
        document.getElementById(
            "agendamento-funcionario"
        )?.value;

    const metodo_pagamento =
        document.getElementById(
            "agendamento-pagamento"
        )?.value;

    if (!data) {
        alert("Selecione uma data.");
        return;
    }

    if (!horario) {
        alert("Selecione um horário.");
        return;
    }

    if (!servico_id_servico) {
        alert("Selecione um corte.");
        return;
    }

    if (!funcionarios_id_funcionarios) {
        alert("Selecione um funcionário.");
        return;
    }

    if (!metodo_pagamento) {
        alert(
            "Selecione a forma de pagamento."
        );
        return;
    }

    // Horário usando minutos corretamente
    const [hora, minuto] =
        horario.split(":").map(Number);

    const minutosDoDia =
        hora * 60 + minuto;

    const inicioManha = 7 * 60;
    const fimManha = 11 * 60 + 30;

    const inicioTarde = 13 * 60;
    const fimTarde = 19 * 60;

    const dentroManha =
        minutosDoDia >= inicioManha &&
        minutosDoDia <= fimManha;

    const dentroTarde =
        minutosDoDia >= inicioTarde &&
        minutosDoDia <= fimTarde;

    if (!dentroManha && !dentroTarde) {
        alert(
            "O horário deve estar entre 07:00–11:30 ou 13:00–19:00."
        );

        return;
    }

    const dataSelecionada =
        new Date(`${data}T00:00:00`);

    if (dataSelecionada.getDay() === 0) {
        alert(
            "A barbearia não funciona aos domingos."
        );

        return;
    }

    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    if (dataSelecionada < hoje) {
        alert(
            "Não é possível agendar uma data passada."
        );

        return;
    }

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem(
                "usuario"
            )
        );
    } catch {
        usuario = null;
    }

    const nomeLocal =
        localStorage.getItem("nome") ||
        usuario?.nome;

    const telefoneLocal =
        localStorage.getItem("telefone") ||
        usuario?.telefone;

    if (!nomeLocal && !telefoneLocal) {
        alert(
            "Não foi possível identificar o cliente."
        );

        return;
    }

    let cliente;

    try {
        const clientes =
            await request("/clientes");

        cliente = clientes.find((c) => {
            const mesmoNome =
                nomeLocal &&
                String(c.nome)
                    .trim()
                    .toLowerCase() ===
                String(nomeLocal)
                    .trim()
                    .toLowerCase();

            const mesmoTelefone =
                telefoneLocal &&
                String(c.telefone)
                    .replace(/\D/g, "") ===
                String(telefoneLocal)
                    .replace(/\D/g, "");

            return mesmoTelefone || mesmoNome;
        });

    } catch (erro) {
        console.error(
            "Erro ao buscar cliente:",
            erro
        );

        alert(
            "Não foi possível identificar seu cadastro."
        );

        return;
    }

    if (!cliente) {
        alert(
            "Cliente não encontrado. Faça o cadastro novamente."
        );

        return;
    }

    const payload = {
        data,
        horario,

        clientes_id_clientes:
            cliente.id_clientes,

        servico_id_servico:
            Number(servico_id_servico),

        servico_barba_id_servico:
            servico_barba_id_servico
                ? Number(
                    servico_barba_id_servico
                )
                : null,

        funcionarios_id_funcionarios:
            Number(
                funcionarios_id_funcionarios
            ),

        metodo_pagamento,

        status_pagamento: "pendente"
    };

    try {
        if (id) {
            await request(
                `/agendamentos/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

            alert(
                "Agendamento atualizado com sucesso!"
            );

        } else {
            await request(
                "/agendamentos",
                {
                    method: "POST",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

            alert(
                "Agendamento realizado com sucesso!"
            );
        }

        resetarFormularioAgendamento();

        await carregarAgendamentos();

        await carregarAgendamentosCliente();

    } catch (erro) {
        console.error(
            "Erro ao salvar agendamento:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao salvar agendamento."
        );
    }
}

// ============================================================
// EDITAR AGENDAMENTO
// ============================================================

async function editarAgendamento(id) {
    try {
        const agendamentos =
            await request("/agendamentos");

        const agendamento =
            agendamentos.find(
                (item) =>
                    Number(
                        item.id_agendamentos
                    ) === Number(id)
            );

        if (!agendamento) {
            alert(
                "Agendamento não encontrado."
            );

            return;
        }

        const campoId =
            document.getElementById(
                "agendamento-id"
            );

        const campoData =
            document.getElementById(
                "agendamento-data"
            );

        const campoHorario =
            document.getElementById(
                "agendamento-horario"
            );

        const campoCorte =
            document.getElementById(
                "agendamento-corte"
            );

        const campoBarba =
            document.getElementById(
                "agendamento-barba"
            );

        const campoFuncionario =
            document.getElementById(
                "agendamento-funcionario"
            );

        const campoPagamento =
            document.getElementById(
                "agendamento-pagamento"
            );

        if (campoId) {
            campoId.value =
                agendamento.id_agendamentos;
        }

        if (campoData) {
            campoData.value =
                String(
                    agendamento.data
                ).split("T")[0];
        }

        if (campoHorario) {
            campoHorario.value =
                String(
                    agendamento.horario
                ).slice(0, 5);
        }

        if (campoCorte) {
            campoCorte.value =
                agendamento.servico_id_servico ||
                "";
        }

        if (campoBarba) {
            campoBarba.value =
                agendamento.servico_barba_id_servico ||
                "";
        }

        if (campoFuncionario) {
            campoFuncionario.value =
                agendamento.funcionarios_id_funcionarios ||
                "";
        }

        if (campoPagamento) {
            campoPagamento.value =
                agendamento.metodo_pagamento ||
                "";
        }

        document
            .querySelectorAll(".card-servico")
            .forEach((card) => {
                card.classList.remove(
                    "selecionado"
                );
            });

        if (
            agendamento.servico_id_servico
        ) {
            const cardCorte =
                document.querySelector(
                    `#lista-cortes-cliente .card-servico[data-id="${agendamento.servico_id_servico}"]`
                );

            if (cardCorte) {
                cardCorte.classList.add(
                    "selecionado"
                );
            }
        }

        if (
            agendamento.servico_barba_id_servico
        ) {
            const cardBarba =
                document.querySelector(
                    `#lista-barbas-cliente .card-servico[data-id="${agendamento.servico_barba_id_servico}"]`
                );

            if (cardBarba) {
                cardBarba.classList.add(
                    "selecionado"
                );
            }
        } else {
            selecionarNenhumaBarba();
        }

        const botao =
            document.getElementById(
                "btn-agendar"
            );

        if (botao) {
            botao.textContent =
                "Atualizar agendamento";
        }

        const formulario =
            document.getElementById(
                "form-agendamento"
            );

        if (formulario) {
            formulario.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

    } catch (erro) {
        console.error(
            "Erro ao editar agendamento:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao carregar agendamento."
        );
    }
}

// ============================================================
// EXCLUIR AGENDAMENTO
// ============================================================

async function excluirAgendamento(id) {
    const confirmar =
        confirm(
            "Tem certeza que deseja cancelar este agendamento?"
        );

    if (!confirmar) return;

    try {
        await request(
            `/agendamentos/${id}`,
            {
                method: "DELETE"
            }
        );

        alert(
            "Agendamento cancelado com sucesso!"
        );

        await carregarAgendamentos();

        await carregarAgendamentosCliente();

    } catch (erro) {
        console.error(
            "Erro ao excluir agendamento:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao cancelar agendamento."
        );
    }
}

// ============================================================
// RESETAR FORMULÁRIO
// ============================================================

function resetarFormularioAgendamento() {
    const id =
        document.getElementById(
            "agendamento-id"
        );

    const data =
        document.getElementById(
            "agendamento-data"
        );

    const horario =
        document.getElementById(
            "agendamento-horario"
        );

    const corte =
        document.getElementById(
            "agendamento-corte"
        );

    const barba =
        document.getElementById(
            "agendamento-barba"
        );

    const funcionario =
        document.getElementById(
            "agendamento-funcionario"
        );

    const pagamento =
        document.getElementById(
            "agendamento-pagamento"
        );

    if (id) id.value = "";
    if (data) data.value = "";
    if (horario) horario.value = "";
    if (corte) corte.value = "";
    if (barba) barba.value = "";
    if (funcionario) funcionario.value = "";
    if (pagamento) pagamento.value = "";

    document
        .querySelectorAll(".card-servico")
        .forEach((card) => {
            card.classList.remove(
                "selecionado"
            );
        });

    selecionarNenhumaBarba();

    const btn =
        document.getElementById(
            "btn-agendar"
        );

    if (btn) {
        btn.textContent = "Agendar";
    }
}

// ============================================================
// DISPONIBILIDADE
// ============================================================

async function verificarDisponibilidade() {
    const data =
        document.getElementById(
            "agendamento-data"
        )?.value;

    const funcionarioId =
        document.getElementById(
            "agendamento-funcionario"
        )?.value;

    const lista =
        document.getElementById(
            "lista-disponibilidade"
        );

    if (!lista) return;

    if (!data || !funcionarioId) {
        alert(
            "Selecione a data e o funcionário."
        );

        return;
    }

    try {
        const resposta =
            await request(
                `/disponibilidade?data=${encodeURIComponent(
                    data
                )}&funcionarioId=${encodeURIComponent(
                    funcionarioId
                )}`
            );

        limparElemento(lista);

        if (
            !resposta ||
            !resposta.length
        ) {
            lista.innerHTML =
                "<p>Nenhum horário encontrado.</p>";

            return;
        }

        resposta.forEach((horario) => {
            const botao =
                document.createElement(
                    "button"
                );

            botao.type = "button";

            botao.textContent =
                typeof horario === "string"
                    ? horario
                    : horario.horario;

            botao.addEventListener(
                "click",
                () => {
                    const campo =
                        document.getElementById(
                            "agendamento-horario"
                        );

                    if (campo) {
                        campo.value =
                            botao.textContent;
                    }
                }
            );

            lista.appendChild(botao);
        });

    } catch (erro) {
        console.error(
            "Erro ao verificar disponibilidade:",
            erro
        );

        lista.innerHTML =
            "<p>Erro ao verificar disponibilidade.</p>";
    }
}

// ============================================================
// AGENDAMENTOS DO CLIENTE
// ============================================================

async function carregarAgendamentosCliente() {
    const tabela =
        document.getElementById(
            "lista-agendamentos"
        );

    if (!tabela) return;

    try {
        const clientes =
            await request("/clientes");

        let usuario = null;

        try {
            usuario = JSON.parse(
                localStorage.getItem(
                    "usuario"
                ) || "null"
            );
        } catch {
            usuario = null;
        }

        const nome =
            localStorage.getItem("nome") ||
            usuario?.nome;

        const telefone =
            localStorage.getItem("telefone") ||
            usuario?.telefone;

        const cliente =
            clientes.find((c) => {
                const mesmoNome =
                    nome &&
                    String(c.nome)
                        .trim()
                        .toLowerCase() ===
                    String(nome)
                        .trim()
                        .toLowerCase();

                const mesmoTelefone =
                    telefone &&
                    String(c.telefone)
                        .replace(/\D/g, "") ===
                    String(telefone)
                        .replace(/\D/g, "");

                return (
                    mesmoTelefone ||
                    mesmoNome
                );
            });

        if (!cliente) {
            criarLinhaVazia(
                tabela,
                7,
                "Nenhum agendamento encontrado."
            );

            return;
        }

        const agendamentos =
            await request("/agendamentos");

        const meusAgendamentos =
            agendamentos.filter(
                (item) =>
                    Number(
                        item.clientes_id_clientes
                    ) ===
                    Number(
                        cliente.id_clientes
                    )
            );

        limparElemento(tabela);

        if (!meusAgendamentos.length) {
            criarLinhaVazia(
                tabela,
                7,
                "Você ainda não possui agendamentos."
            );

            return;
        }

        meusAgendamentos.forEach((item) => {
            const tr =
                document.createElement("tr");

            const servico =
                item.servico ||
                item.nome_servico ||
                item.tipo ||
                "Serviço";

            const barba =
                item.servico_barba ||
                item.barba ||
                "";

            const textoServico =
                barba
                    ? `${escaparHTML(servico)} + ${escaparHTML(barba)}`
                    : escaparHTML(servico);

            tr.innerHTML = `
                <td>
                    ${formatarData(item.data)}
                </td>

                <td>
                    ${escaparHTML(
                        String(
                            item.horario || ""
                        ).slice(0, 5)
                    )}
                </td>

                <td>
                    ${textoServico}
                </td>

                <td>
                    ${escaparHTML(
                        item.funcionario ||
                        item.nome_funcionario ||
                        ""
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        item.metodo_pagamento ||
                        ""
                    )}
                </td>

                <td>
                    ${escaparHTML(
                        item.status_pagamento ||
                        "pendente"
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        onclick="editarAgendamento(${item.id_agendamentos})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onclick="excluirAgendamento(${item.id_agendamentos})"
                    >
                        Cancelar
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar agendamentos do cliente:",
            erro
        );

        criarLinhaVazia(
            tabela,
            7,
            "Erro ao carregar seus agendamentos."
        );
    }
}

// ============================================================
// CLIENTE
// ============================================================

function iniciarCliente() {
    // CARREGA OS AGENDAMENTOS DO CLIENTE
    carregarAgendamentosCliente();

    // CARREGA FUNCIONÁRIOS E SERVIÇOS
    carregarSelectsAgendamento();

    // IMPORTANTE:
    // antes essa função não era chamada no cliente
    configurarFormularioAgendamentos();

    const btnDisponibilidade =
        document.getElementById(
            "verificar-disponibilidade"
        );

    if (btnDisponibilidade) {
        btnDisponibilidade.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                verificarDisponibilidade();
            }
        );
    }
}

// ============================================================
// CRUD CLIENTES
// ============================================================

async function excluirCliente(id) {
    if (
        !confirm(
            "Tem certeza que deseja excluir este cliente?"
        )
    ) {
        return;
    }

    try {
        await request(
            `/clientes/${id}`,
            {
                method: "DELETE"
            }
        );

        alert(
            "Cliente excluído com sucesso!"
        );

        carregarClientesDashboard();

    } catch (erro) {
        console.error(
            "Erro ao excluir cliente:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao excluir cliente."
        );
    }
}

function editarCliente(id) {
    alert(
        `Edição do cliente ${id} será adicionada ao formulário do dashboard.`
    );
}

// ============================================================
// CRUD FUNCIONÁRIOS
// ============================================================

async function excluirFuncionario(id) {
    if (
        !confirm(
            "Tem certeza que deseja excluir este funcionário?"
        )
    ) {
        return;
    }

    try {
        await request(
            `/funcionarios/${id}`,
            {
                method: "DELETE"
            }
        );

        alert(
            "Funcionário excluído com sucesso!"
        );

        carregarFuncionariosDashboard();
        carregarSelectsAgendamento();

    } catch (erro) {
        console.error(
            "Erro ao excluir funcionário:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao excluir funcionário."
        );
    }
}

function editarFuncionario(id) {
    alert(
        `Edição do funcionário ${id} será adicionada ao formulário do dashboard.`
    );
}

// ============================================================
// CRUD SERVIÇOS
// ============================================================

async function excluirServico(id) {
    if (
        !confirm(
            "Tem certeza que deseja excluir este serviço?"
        )
    ) {
        return;
    }

    try {
        await request(
            `/servicos/${id}`,
            {
                method: "DELETE"
            }
        );

        alert(
            "Serviço excluído com sucesso!"
        );

        carregarServicosDashboard();
        carregarSelectsAgendamento();

    } catch (erro) {
        console.error(
            "Erro ao excluir serviço:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao excluir serviço."
        );
    }
}

function editarServico(id) {
    alert(
        `Edição do serviço ${id} será adicionada ao formulário do dashboard.`
    );
}

// ============================================================
// TEMA
// ============================================================

function configurarTema() {
    const botoesTema =
        document.querySelectorAll(
            "#toggle-tema, #btn-tema, .btn-tema"
        );

    if (!botoesTema.length) return;

    const temaSalvo =
        localStorage.getItem("tema");

    if (temaSalvo === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }

    function atualizarIcone() {
        const escuro =
            document.body.classList.contains(
                "dark"
            );

        botoesTema.forEach((botao) => {
            botao.textContent =
                escuro ? "☀️" : "🌙";

            botao.setAttribute(
                "aria-label",
                escuro
                    ? "Ativar modo claro"
                    : "Ativar modo escuro"
            );

            botao.setAttribute(
                "title",
                escuro
                    ? "Modo claro"
                    : "Modo escuro"
            );
        });
    }

    atualizarIcone();

    botoesTema.forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                const escuro =
                    document.body.classList.toggle(
                        "dark"
                    );

                localStorage.setItem(
                    "tema",
                    escuro
                        ? "dark"
                        : "light"
                );

                atualizarIcone();
            }
        );
    });
}

// ============================================================
// EXPOR FUNÇÕES PARA O HTML
// ============================================================

window.editarCliente =
    editarCliente;

window.excluirCliente =
    excluirCliente;

window.editarFuncionario =
    editarFuncionario;

window.excluirFuncionario =
    excluirFuncionario;

window.editarServico =
    editarServico;

window.excluirServico =
    excluirServico;

window.editarAgendamento =
    editarAgendamento;

window.excluirAgendamento =
    excluirAgendamento;

window.selecionarServico =
    selecionarServico;

window.selecionarNenhumaBarba =
    selecionarNenhumaBarba;

window.salvarAgendamento =
    salvarAgendamento;

window.resetarFormularioAgendamento =
    resetarFormularioAgendamento;

window.verificarDisponibilidade =
    verificarDisponibilidade;

window.sair =
    sair;