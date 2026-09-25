// ============================================================
// GZ BARBEARIA - APLICAÇÃO
// ============================================================

const API_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://localhost:3000"
        : "https://gz-barbearia-ofc-2.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    configurarTema();
    configurarSair();

    if (page === "dashboard") iniciarDashboard();
    if (page === "cliente") iniciarCliente();
    if (page === "relatorio") iniciarRelatorio();
});

// ============================================================
// API / UTILITÁRIOS
// ============================================================

async function request(url, options = {}) {
    const config = {
        ...options,
        headers: {
            ...(options.body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        }
    };

    let resposta;

    try {
        resposta = await fetch(`${API_URL}${url}`, config);
    } catch (erro) {
        throw new Error(
            `Não foi possível conectar ao servidor. Verifique se o backend está online.`
        );
    }

    let dados = null;

    try {
        dados = await resposta.json();
    } catch (_) {}

    if (!resposta.ok) {
        throw new Error(
            dados?.erro ||
            dados?.error ||
            `Erro ${resposta.status}`
        );
    }

    return dados;
}

function escaparHTML(valor) {
    if (valor === null || valor === undefined) return "";

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizarTipo(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function formatarData(data) {
    if (!data) return "";

    const texto = String(data).split("T")[0];
    const partes = texto.split("-");

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : texto;
}

function formatarPreco(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        })
        : "R$ 0,00";
}

function criarLinhaVazia(tbody, colunas, mensagem) {
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="${colunas}" style="text-align:center;">
                ${escaparHTML(mensagem || "Nenhum registro encontrado.")}
            </td>
        </tr>
    `;
}

function limparElemento(elemento) {
    if (elemento) elemento.innerHTML = "";
}

function caminhoImagem(imagem) {
    const nome = String(imagem || "")
        .replace(/^.*[\\\/]/, "")
        .trim();

    return nome
        ? `/frontend/Imagens/${encodeURIComponent(nome)}`
        : "";
}

function usuarioAtual() {
    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (_) {
        return null;
    }
}

function idClienteAtual() {
    const usuario = usuarioAtual();
    return (
        Number(localStorage.getItem("id_cliente")) ||
        Number(usuario?.id_cliente) ||
        null
    );
}

function isAdmin() {
    const tipo = normalizarTipo(
        localStorage.getItem("tipo") || usuarioAtual()?.tipo
    );

    return ["adm", "admin", "administrador"].includes(tipo);
}

// ============================================================
// SAIR
// ============================================================

function sair() {
    [
        "usuario",
        "nome",
        "tipo",
        "email",
        "telefone",
        "id_usuario",
        "id_cliente",
        "logado"
    ].forEach((chave) => localStorage.removeItem(chave));

    window.location.href = "/frontend/login.html";
}

function configurarSair() {
    document.querySelectorAll(
        "#btn-sair, #btnSair, #sair, .btn-sair, [data-action='sair']"
    ).forEach((botao) => {
        botao.addEventListener("click", (event) => {
            event.preventDefault();
            sair();
        });
    });
}

// ============================================================
// DASHBOARD
// ============================================================

async function iniciarDashboard() {
    garantirSelectClienteAdmin();
    adicionarBotoesCRUDAdmin();
    configurarFormularioServico();
    configurarFormularioAgendamentos();

    await Promise.allSettled([
        carregarClientesDashboard(),
        carregarFuncionariosDashboard(),
        carregarServicosDashboard(),
        carregarAgendamentos(),
        carregarSelectsAgendamento()
    ]);
}

function garantirSelectClienteAdmin() {
    if (!isAdmin()) return;

    if (document.getElementById("agendamento-cliente")) return;

    const grid = document.querySelector(
        "#form-agendamento .form-grid"
    );

    if (!grid) return;

    const campo = document.createElement("div");
    campo.className = "campo";

    campo.innerHTML = `
        <label for="agendamento-cliente">Cliente</label>
        <select id="agendamento-cliente">
            <option value="">Selecione o cliente</option>
        </select>
    `;

    grid.insertBefore(campo, grid.firstElementChild);
}

function adicionarBotoesCRUDAdmin() {
    if (!isAdmin()) return;

    const secoes = document.querySelectorAll(
        ".card-painel .titulo-secao"
    );

    if (secoes[0] && !secoes[0].querySelector("[data-novo-cliente]")) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-secundario";
        botao.dataset.novoCliente = "1";
        botao.textContent = "Novo cliente";
        botao.addEventListener("click", criarClienteAdmin);
        secoes[0].appendChild(botao);
    }

    if (secoes[1] && !secoes[1].querySelector("[data-novo-funcionario]")) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-secundario";
        botao.dataset.novoFuncionario = "1";
        botao.textContent = "Novo funcionário";
        botao.addEventListener("click", criarFuncionarioAdmin);
        secoes[1].appendChild(botao);
    }
}

// ============================================================
// CLIENTES
// ============================================================

async function carregarClientesDashboard() {
    const tabela = document.getElementById("lista-clientes");
    if (!tabela) return;

    try {
        const clientes = await request("/clientes");
        limparElemento(tabela);

        if (!clientes?.length) {
            criarLinhaVazia(tabela, 5, "Nenhum cliente cadastrado.");
            return;
        }

        clientes.forEach((cliente) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${cliente.id_clientes}</td>
                <td>${escaparHTML(cliente.nome)}</td>
                <td>${escaparHTML(cliente.email || "—")}</td>
                <td>${escaparHTML(cliente.telefone || "—")}</td>
                <td>
                    <button type="button"
                        onclick="editarCliente(${cliente.id_clientes})">
                        Editar
                    </button>
                    <button type="button"
                        onclick="excluirCliente(${cliente.id_clientes})">
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
        criarLinhaVazia(tabela, 5, erro.message);
    }
}

async function criarClienteAdmin() {
    const nome = prompt("Nome do cliente:");
    if (nome === null) return;

    const telefone = prompt("Telefone do cliente:");
    if (telefone === null) return;

    if (!nome.trim() || !telefone.trim()) {
        alert("Nome e telefone são obrigatórios.");
        return;
    }

    try {
        await request("/clientes", {
            method: "POST",
            body: JSON.stringify({
                nome: nome.trim(),
                telefone: telefone.trim()
            })
        });

        alert("Cliente cadastrado com sucesso.");
        await carregarClientesDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

async function editarCliente(id) {
    try {
        const clientes = await request("/clientes");
        const cliente = clientes.find(
            (item) => Number(item.id_clientes) === Number(id)
        );

        if (!cliente) {
            alert("Cliente não encontrado.");
            return;
        }

        const nome = prompt("Nome:", cliente.nome);
        if (nome === null) return;

        const telefone = prompt(
            "Telefone:",
            cliente.telefone || ""
        );
        if (telefone === null) return;

        await request(`/clientes/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                nome: nome.trim(),
                telefone: telefone.trim()
            })
        });

        alert("Cliente atualizado com sucesso.");
        await carregarClientesDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirCliente(id) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
        await request(`/clientes/${id}`, { method: "DELETE" });
        alert("Cliente excluído com sucesso.");
        await carregarClientesDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

// ============================================================
// FUNCIONÁRIOS
// ============================================================

async function carregarFuncionariosDashboard() {
    const tabela = document.getElementById("lista-funcionarios");
    if (!tabela) return;

    try {
        const funcionarios = await request("/funcionarios");
        limparElemento(tabela);

        if (!funcionarios?.length) {
            criarLinhaVazia(tabela, 4, "Nenhum funcionário cadastrado.");
            return;
        }

        funcionarios.forEach((funcionario) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${funcionario.id_funcionarios}</td>
                <td>${escaparHTML(funcionario.nome)}</td>
                <td>${escaparHTML(funcionario.telefone || "—")}</td>
                <td>
                    <button type="button"
                        onclick="editarFuncionario(${funcionario.id_funcionarios})">
                        Editar
                    </button>
                    <button type="button"
                        onclick="excluirFuncionario(${funcionario.id_funcionarios})">
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
        criarLinhaVazia(tabela, 4, erro.message);
    }
}

async function criarFuncionarioAdmin() {
    const nome = prompt("Nome do funcionário:");
    if (nome === null) return;

    const telefone = prompt("Telefone do funcionário:");
    if (telefone === null) return;

    if (!nome.trim() || !telefone.trim()) {
        alert("Nome e telefone são obrigatórios.");
        return;
    }

    try {
        await request("/funcionarios", {
            method: "POST",
            body: JSON.stringify({
                nome: nome.trim(),
                telefone: telefone.trim()
            })
        });

        alert("Funcionário cadastrado com sucesso.");
        await carregarFuncionariosDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

async function editarFuncionario(id) {
    try {
        const funcionarios = await request("/funcionarios");
        const funcionario = funcionarios.find(
            (item) => Number(item.id_funcionarios) === Number(id)
        );

        if (!funcionario) {
            alert("Funcionário não encontrado.");
            return;
        }

        const nome = prompt("Nome:", funcionario.nome);
        if (nome === null) return;

        const telefone = prompt(
            "Telefone:",
            funcionario.telefone || ""
        );
        if (telefone === null) return;

        await request(`/funcionarios/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                nome: nome.trim(),
                telefone: telefone.trim()
            })
        });

        alert("Funcionário atualizado com sucesso.");
        await carregarFuncionariosDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirFuncionario(id) {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

    try {
        await request(`/funcionarios/${id}`, { method: "DELETE" });
        alert("Funcionário excluído com sucesso.");
        await carregarFuncionariosDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

// ============================================================
// SERVIÇOS
// ============================================================

async function carregarServicosDashboard() {
    const tabela = document.getElementById("lista-servicos");
    if (!tabela) return;

    try {
        const servicos = await request("/servicos");
        limparElemento(tabela);

        if (!servicos?.length) {
            criarLinhaVazia(tabela, 6, "Nenhum serviço cadastrado.");
            return;
        }

        servicos.forEach((servico) => {
            const tr = document.createElement("tr");
            const imagem = caminhoImagem(servico.imagem);

            tr.innerHTML = `
                <td>${servico.id_servico}</td>
                <td>${escaparHTML(servico.tipo)}</td>
                <td>
                    ${
                        imagem
                            ? `<img src="${imagem}"
                                alt="${escaparHTML(servico.tipo)}"
                                style="width:70px;height:50px;object-fit:cover;border-radius:8px;"
                                onerror="this.style.display='none'">`
                            : "Sem imagem"
                    }
                </td>
                <td>${formatarPreco(servico.preco)}</td>
                <td>${servico.categoria || (
                    normalizarTipo(servico.tipo).includes("barba")
                        ? "Barba"
                        : "Corte"
                )}</td>
                <td>
                    <button type="button"
                        onclick="editarServico(${servico.id_servico})">
                        Editar
                    </button>
                    <button type="button"
                        onclick="excluirServico(${servico.id_servico})">
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
        criarLinhaVazia(tabela, 6, erro.message);
    }
}

function configurarFormularioServico() {
    const form = document.getElementById("form-servico");
    if (!form || form.dataset.configurado) return;

    form.dataset.configurado = "1";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = document.getElementById("servico-id")?.value || "";
        const tipo = document.getElementById("servico-tipo")?.value.trim();
        const categoria = document.getElementById("servico-categoria")?.value;
        const preco = document.getElementById("servico-preco")?.value;
        const imagem = document.getElementById("servico-imagem")?.value.trim();

        if (!tipo || !categoria || preco === "") {
            alert("Preencha nome, categoria e preço.");
            return;
        }

        let nomeFinal = tipo;

        // O backend identifica a categoria pelo nome.
        if (categoria === "Barba" && !normalizarTipo(nomeFinal).includes("barba")) {
            nomeFinal = `${nomeFinal} - Barba`;
        }

        if (categoria === "Corte" && normalizarTipo(nomeFinal).includes("barba")) {
            alert("Para categoria Corte, o nome do serviço não pode ser de barba.");
            return;
        }

        try {
            await request(
                id ? `/servicos/${id}` : "/servicos",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify({
                        tipo: nomeFinal,
                        imagem: imagem || null,
                        preco: Number(preco)
                    })
                }
            );

            alert(
                id
                    ? "Serviço atualizado com sucesso."
                    : "Serviço cadastrado com sucesso."
            );

            resetarFormularioServico();
            await carregarServicosDashboard();
            await carregarSelectsAgendamento();
        } catch (erro) {
            alert(erro.message);
        }
    });

    document
        .getElementById("cancelar-servico")
        ?.addEventListener("click", resetarFormularioServico);
}

async function editarServico(id) {
    try {
        const servicos = await request("/servicos");
        const servico = servicos.find(
            (item) => Number(item.id_servico) === Number(id)
        );

        if (!servico) {
            alert("Serviço não encontrado.");
            return;
        }

        document.getElementById("servico-id")?.remove();

        const form = document.getElementById("form-servico");
        if (!form) return;

        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.id = "servico-id";
        hidden.value = servico.id_servico;
        form.appendChild(hidden);

        const nome = String(servico.tipo || "").replace(/\s*-\s*barba\s*$/i, "");

        document.getElementById("servico-tipo").value = nome;
        document.getElementById("servico-categoria").value =
            servico.categoria ||
            (normalizarTipo(servico.tipo).includes("barba") ? "Barba" : "Corte");
        document.getElementById("servico-preco").value = servico.preco;
        document.getElementById("servico-imagem").value = servico.imagem || "";

        const botao = form.querySelector("button[type='submit']");
        if (botao) botao.textContent = "Atualizar serviço";

        const cancelar = document.getElementById("cancelar-servico");
        if (cancelar) cancelar.style.display = "inline-block";

        form.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
        alert(erro.message);
    }
}

function resetarFormularioServico() {
    const form = document.getElementById("form-servico");
    if (!form) return;

    form.reset();
    document.getElementById("servico-id")?.remove();

    const botao = form.querySelector("button[type='submit']");
    if (botao) botao.textContent = "Cadastrar serviço";

    const cancelar = document.getElementById("cancelar-servico");
    if (cancelar) cancelar.style.display = "none";
}

async function excluirServico(id) {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
        await request(`/servicos/${id}`, { method: "DELETE" });
        alert("Serviço excluído com sucesso.");
        await carregarServicosDashboard();
        await carregarSelectsAgendamento();
    } catch (erro) {
        alert(erro.message);
    }
}

// ============================================================
// AGENDAMENTOS
// ============================================================

async function carregarAgendamentos() {
    const tabela = document.getElementById("lista-agendamentos");
    if (!tabela) return;

    try {
        const agendamentos = await request("/agendamentos");
        limparElemento(tabela);

        if (!agendamentos?.length) {
            criarLinhaVazia(tabela, 8, "Nenhum agendamento encontrado.");
            return;
        }

        agendamentos.forEach((item) => {
            const tr = document.createElement("tr");
            const servico = item.barba
                ? `${item.servico} + ${item.barba}`
                : item.servico;

            tr.innerHTML = `
                <td>${item.id_agendamentos}</td>
                <td>${formatarData(item.data)}</td>
                <td>${escaparHTML(String(item.horario || "").slice(0, 5))}</td>
                <td>${escaparHTML(item.cliente || "")}</td>
                <td>${escaparHTML(servico || "")}</td>
                <td>${escaparHTML(item.funcionario || "")}</td>
                <td>
                    ${escaparHTML(item.metodo_pagamento || "—")}
                    <br>
                    <small>${escaparHTML(item.status_pagamento || "pendente")}</small>
                </td>
                <td>
                    <button type="button"
                        onclick="editarAgendamento(${item.id_agendamentos})">
                        Editar
                    </button>
                    <button type="button"
                        onclick="excluirAgendamento(${item.id_agendamentos})">
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
        criarLinhaVazia(tabela, 8, erro.message);
    }
}

async function carregarSelectsAgendamento() {
    const funcionarioSelect =
        document.getElementById("agendamento-funcionario");
    const corteSelect =
        document.getElementById("agendamento-corte");
    const barbaSelect =
        document.getElementById("agendamento-barba");
    const clienteSelect =
        document.getElementById("agendamento-cliente");

    if (!funcionarioSelect && !corteSelect && !barbaSelect && !clienteSelect) {
        return;
    }

    try {
        const chamadas = [
            request("/funcionarios"),
            request("/servicos")
        ];

        if (clienteSelect) chamadas.push(request("/clientes"));

        const [funcionarios, servicos, clientes] = await Promise.all(chamadas);

        if (funcionarioSelect) {
            funcionarioSelect.innerHTML =
                `<option value="">Selecione o funcionário</option>`;

            funcionarios.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id_funcionarios;
                option.textContent = item.nome;
                funcionarioSelect.appendChild(option);
            });
        }

        const cortes = servicos.filter(
            (item) => !normalizarTipo(item.tipo).includes("barba")
        );

        const barbas = servicos.filter(
            (item) => normalizarTipo(item.tipo).includes("barba")
        );

        if (corteSelect) {
            corteSelect.innerHTML =
                `<option value="">Selecione um corte</option>`;

            cortes.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id_servico;
                option.textContent =
                    `${item.tipo} — ${formatarPreco(item.preco)}`;
                corteSelect.appendChild(option);
            });
        }

        if (barbaSelect) {
            barbaSelect.innerHTML =
                `<option value="">Nenhuma barba</option>`;

            barbas.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id_servico;
                option.textContent =
                    `${item.tipo} — ${formatarPreco(item.preco)}`;
                barbaSelect.appendChild(option);
            });
        }

        renderizarCardsServicos(cortes, "corte");
        renderizarCardsServicos(barbas, "barba");

        if (clienteSelect && clientes) {
            clienteSelect.innerHTML =
                `<option value="">Selecione o cliente</option>`;

            clientes.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id_clientes;
                option.textContent =
                    `${item.nome} — ${item.telefone || "sem telefone"}`;
                clienteSelect.appendChild(option);
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar selects:", erro);
    }
}

function renderizarCardsServicos(servicos, tipo) {
    const container = document.getElementById(
        tipo === "corte"
            ? "lista-cortes-cliente"
            : "lista-barbas-cliente"
    );

    if (!container) return;

    container.innerHTML = "";

    if (!servicos.length) {
        container.innerHTML =
            `<p class="mensagem-vazia">Nenhum serviço disponível.</p>`;
        return;
    }

    servicos.forEach((servico) => {
        const card = document.createElement("div");
        card.className = "card-servico";
        card.dataset.id = servico.id_servico;
        card.dataset.tipo = tipo;

        const imagem = caminhoImagem(servico.imagem);

        card.innerHTML = `
            ${
                imagem
                    ? `<img src="${imagem}" alt="${escaparHTML(servico.tipo)}"
                            style="width:100%;height:170px;object-fit:cover;"
                            onerror="this.style.display='none'">`
                    : `<div style="height:170px;display:flex;align-items:center;justify-content:center;font-size:3rem;">✂️</div>`
            }
            <div class="card-servico-info">
                <div class="card-servico-nome">${escaparHTML(servico.tipo)}</div>
                <div class="card-servico-preco">${formatarPreco(servico.preco)}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            selecionarServico(servico.id_servico, tipo);
        });

        container.appendChild(card);
    });

    if (tipo === "barba") {
        const card = document.createElement("div");
        card.className = "card-servico card-nenhuma-barba";
        card.dataset.id = "";

        card.innerHTML = `
            <div style="height:170px;display:flex;align-items:center;justify-content:center;font-size:3rem;">
                ✕
            </div>
            <div class="card-servico-info">
                <div class="card-servico-nome">Nenhuma barba</div>
                <div class="card-servico-preco">Grátis</div>
            </div>
        `;

        card.addEventListener("click", selecionarNenhumaBarba);
        container.appendChild(card);
    }
}

function selecionarServico(idServico, tipo) {
    const id = String(idServico);

    const select = document.getElementById(
        tipo === "corte"
            ? "agendamento-corte"
            : "agendamento-barba"
    );

    if (select) select.value = id;

    document.querySelectorAll(
        tipo === "corte"
            ? "#lista-cortes-cliente .card-servico"
            : "#lista-barbas-cliente .card-servico"
    ).forEach((card) => {
        card.classList.toggle(
            "selecionado",
            String(card.dataset.id) === id
        );
    });
}

function selecionarNenhumaBarba() {
    const select = document.getElementById("agendamento-barba");
    if (select) select.value = "";

    document.querySelectorAll(
        "#lista-barbas-cliente .card-servico"
    ).forEach((card) => card.classList.remove("selecionado"));

    document.querySelector(
        "#lista-barbas-cliente .card-nenhuma-barba"
    )?.classList.add("selecionado");
}

function configurarFormularioAgendamentos() {
    const form = document.getElementById("form-agendamento");
    const btn = document.getElementById("btn-agendar");
    const cancelar = document.getElementById("cancelar-agendamento");

    if (form && !form.dataset.configurado) {
        form.dataset.configurado = "1";

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            salvarAgendamento();
        });
    }

    if (!form && btn && !btn.dataset.configurado) {
        btn.dataset.configurado = "1";
        btn.addEventListener("click", salvarAgendamento);
    }

    if (cancelar && !cancelar.dataset.configurado) {
        cancelar.dataset.configurado = "1";
        cancelar.addEventListener("click", (event) => {
            event.preventDefault();
            resetarFormularioAgendamento();
        });
    }

    const disponibilidade =
        document.getElementById("verificar-disponibilidade");

    if (disponibilidade && !disponibilidade.dataset.configurado) {
        disponibilidade.dataset.configurado = "1";
        disponibilidade.addEventListener("click", (event) => {
            event.preventDefault();
            verificarDisponibilidade();
        });
    }
}

function validarDataHorario(data, horario) {
    const dataObj = new Date(`${data}T00:00:00`);

    if (Number.isNaN(dataObj.getTime())) {
        throw new Error("Data inválida.");
    }

    if (dataObj.getDay() === 0) {
        throw new Error("A barbearia não funciona aos domingos.");
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataObj < hoje) {
        throw new Error("Não é possível agendar uma data passada.");
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
        throw new Error("Horário inválido.");
    }

    const [hora, minuto] = horario.split(":").map(Number);
    const minutos = hora * 60 + minuto;

    const valido =
        (minutos >= 420 && minutos <= 690) ||
        (minutos >= 780 && minutos <= 1140);

    if (!valido) {
        throw new Error(
            "O horário deve estar entre 07:00–11:30 ou 13:00–19:00."
        );
    }
}

async function obterClienteParaAgendamento() {
    const selectCliente =
        document.getElementById("agendamento-cliente");

    if (isAdmin() && selectCliente) {
        const id = Number(selectCliente.value);
        if (!id) throw new Error("Selecione o cliente.");
        return id;
    }

    const id = idClienteAtual();
    if (id) return id;

    const nome =
        localStorage.getItem("nome") ||
        usuarioAtual()?.nome;

    const telefone =
        localStorage.getItem("telefone") ||
        usuarioAtual()?.telefone;

    if (!nome && !telefone) {
        throw new Error("Não foi possível identificar o cliente.");
    }

    const clientes = await request("/clientes");

    const cliente = clientes.find((item) => {
        const mesmoTelefone =
            telefone &&
            String(item.telefone || "").replace(/\D/g, "") ===
            String(telefone || "").replace(/\D/g, "");

        const mesmoNome =
            nome &&
            String(item.nome || "").trim().toLowerCase() ===
            String(nome).trim().toLowerCase();

        return mesmoTelefone || mesmoNome;
    });

    if (!cliente) {
        throw new Error("Cliente não encontrado.");
    }

    localStorage.setItem("id_cliente", cliente.id_clientes);
    return cliente.id_clientes;
}

async function salvarAgendamento() {
    const id = document.getElementById("agendamento-id")?.value || "";
    const data = document.getElementById("agendamento-data")?.value;
    const horario = document.getElementById("agendamento-horario")?.value;
    const corte = document.getElementById("agendamento-corte")?.value;
    const barba = document.getElementById("agendamento-barba")?.value || null;
    const funcionario =
        document.getElementById("agendamento-funcionario")?.value;
    const pagamento =
        document.getElementById("agendamento-pagamento")?.value;

    try {
        if (!data) throw new Error("Selecione uma data.");
        if (!horario) throw new Error("Selecione um horário.");
        if (!corte) throw new Error("Selecione um corte.");
        if (!funcionario) throw new Error("Selecione um funcionário.");
        if (!pagamento) throw new Error("Selecione a forma de pagamento.");

        validarDataHorario(data, horario);

        const cliente = await obterClienteParaAgendamento();

        const payload = {
            data,
            horario,
            clientes_id_clientes: Number(cliente),
            servico_id_servico: Number(corte),
            servico_barba_id_servico: barba ? Number(barba) : null,
            funcionarios_id_funcionarios: Number(funcionario),
            metodo_pagamento: pagamento,
            status_pagamento: "pendente"
        };

        await request(
            id ? `/agendamentos/${id}` : "/agendamentos",
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(payload)
            }
        );

        alert(
            id
                ? "Agendamento atualizado com sucesso!"
                : "Agendamento realizado com sucesso!"
        );

        resetarFormularioAgendamento();
        await carregarAgendamentos();
        await carregarAgendamentosCliente();
    } catch (erro) {
        console.error(erro);
        alert(erro.message || "Erro ao salvar agendamento.");
    }
}

async function editarAgendamento(id) {
    try {
        const agendamentos = await request("/agendamentos");
        const item = agendamentos.find(
            (agendamento) =>
                Number(agendamento.id_agendamentos) === Number(id)
        );

        if (!item) throw new Error("Agendamento não encontrado.");

        document.getElementById("agendamento-id").value =
            item.id_agendamentos;
        document.getElementById("agendamento-data").value =
            String(item.data).split("T")[0];
        document.getElementById("agendamento-horario").value =
            String(item.horario).slice(0, 5);
        document.getElementById("agendamento-corte").value =
            item.servico_id_servico || "";
        document.getElementById("agendamento-barba").value =
            item.servico_barba_id_servico || "";
        document.getElementById("agendamento-funcionario").value =
            item.funcionarios_id_funcionarios || "";
        document.getElementById("agendamento-pagamento").value =
            item.metodo_pagamento || "";

        const clienteSelect =
            document.getElementById("agendamento-cliente");

        if (clienteSelect) {
            clienteSelect.value = item.clientes_id_clientes || "";
        }

        selecionarServico(item.servico_id_servico, "corte");

        if (item.servico_barba_id_servico) {
            selecionarServico(item.servico_barba_id_servico, "barba");
        } else {
            selecionarNenhumaBarba();
        }

        const botao = document.getElementById("btn-agendar");
        if (botao) botao.textContent = "Atualizar agendamento";

        const cancelar = document.getElementById("cancelar-agendamento");
        if (cancelar) cancelar.style.display = "inline-block";

        document
            .getElementById("form-agendamento")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirAgendamento(id) {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    try {
        await request(`/agendamentos/${id}`, { method: "DELETE" });
        alert("Agendamento cancelado com sucesso.");
        await carregarAgendamentos();
        await carregarAgendamentosCliente();
    } catch (erro) {
        alert(erro.message);
    }
}

function resetarFormularioAgendamento() {
    const form = document.getElementById("form-agendamento");
    if (form) form.reset();

    ["agendamento-id"].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });

    document.querySelectorAll(".card-servico").forEach(
        (card) => card.classList.remove("selecionado")
    );

    selecionarNenhumaBarba();

    const botao = document.getElementById("btn-agendar");
    if (botao) botao.textContent = "Agendar";

    const cancelar = document.getElementById("cancelar-agendamento");
    if (cancelar) cancelar.style.display = "none";
}

// ============================================================
// DISPONIBILIDADE
// ============================================================

async function verificarDisponibilidade() {
    const data = document.getElementById("agendamento-data")?.value;
    const funcionarioId =
        document.getElementById("agendamento-funcionario")?.value;
    const lista = document.getElementById("lista-disponibilidade");

    if (!lista) return;

    if (!data || !funcionarioId) {
        alert("Selecione a data e o funcionário.");
        return;
    }

    try {
        const agendamentoId =
            document.getElementById("agendamento-id")?.value || "";

        const ocupados = await request(
            `/disponibilidade?data=${encodeURIComponent(data)}` +
            `&funcionarioId=${encodeURIComponent(funcionarioId)}` +
            (agendamentoId
                ? `&agendamentoId=${encodeURIComponent(agendamentoId)}`
                : "")
        );

        const ocupadosSet = new Set(
            (ocupados || []).map(
                (item) => String(item.horario).slice(0, 5)
            )
        );

        const horarios = [];

        for (let minutos = 420; minutos <= 690; minutos += 30) {
            horarios.push(minutos);
        }

        for (let minutos = 780; minutos <= 1140; minutos += 30) {
            horarios.push(minutos);
        }

        lista.innerHTML = `
            <p><strong>Verde:</strong> disponível &nbsp; <strong>Vermelho:</strong> ocupado</p>
            <div class="lista-horarios-gerada"></div>
        `;

        const area = lista.querySelector(".lista-horarios-gerada");

        horarios.forEach((minutos) => {
            const h = String(Math.floor(minutos / 60)).padStart(2, "0");
            const m = String(minutos % 60).padStart(2, "0");
            const horario = `${h}:${m}`;

            const botao = document.createElement("button");
            botao.type = "button";
            botao.textContent =
                ocupadosSet.has(horario)
                    ? `${horario} — ocupado`
                    : `${horario} — disponível`;

            botao.disabled = ocupadosSet.has(horario);

            if (!botao.disabled) {
                botao.addEventListener("click", () => {
                    document.getElementById("agendamento-horario").value =
                        horario;
                });
            }

            area.appendChild(botao);
        });
    } catch (erro) {
        lista.innerHTML =
            `<p>${escaparHTML(erro.message)}</p>`;
    }
}

// ============================================================
// CLIENTE
// ============================================================

async function iniciarCliente() {
    const data = document.getElementById("agendamento-data");

    if (data) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, "0");
        const dd = String(hoje.getDate()).padStart(2, "0");
        data.min = `${yyyy}-${mm}-${dd}`;
    }

    const nome =
        localStorage.getItem("nome") ||
        usuarioAtual()?.nome;

    const boasVindas =
        document.getElementById("boasVindas");

    if (boasVindas && nome) {
        boasVindas.textContent = `Olá, ${nome}!`;
    }

    configurarFormularioAgendamentos();

    await Promise.allSettled([
        carregarSelectsAgendamento(),
        carregarAgendamentosCliente()
    ]);
}

async function carregarAgendamentosCliente() {
    const tabela = document.getElementById("lista-agendamentos");
    if (!tabela) return;

    try {
        const clienteId = await obterClienteParaAgendamento();
        const agendamentos = await request("/agendamentos");

        const meus = agendamentos.filter(
            (item) =>
                Number(item.clientes_id_clientes) === Number(clienteId)
        );

        limparElemento(tabela);

        if (!meus.length) {
            criarLinhaVazia(
                tabela,
                9,
                "Você ainda não possui agendamentos."
            );
            return;
        }

        meus.forEach((item) => {
            const tr = document.createElement("tr");
            const servico = item.barba
                ? `${item.servico} + ${item.barba}`
                : item.servico;

            tr.innerHTML = `
                <td>${item.id_agendamentos}</td>
                <td>${formatarData(item.data)}</td>
                <td>${escaparHTML(String(item.horario || "").slice(0, 5))}</td>
                <td>${escaparHTML(item.cliente || "")}</td>
                <td>${escaparHTML(servico || "")}</td>
                <td>${escaparHTML(item.funcionario || "")}</td>
                <td>${escaparHTML(item.metodo_pagamento || "—")}</td>
                <td>${formatarPreco(item.preco)}</td>
                <td>
                    <button type="button"
                        onclick="editarAgendamento(${item.id_agendamentos})">
                        Editar
                    </button>
                    <button type="button"
                        onclick="excluirAgendamento(${item.id_agendamentos})">
                        Cancelar
                    </button>
                </td>
            `;

            tabela.appendChild(tr);
        });
    } catch (erro) {
        console.error(erro);
        criarLinhaVazia(tabela, 9, erro.message);
    }
}

// ============================================================
// RELATÓRIO
// ============================================================

async function iniciarRelatorio() {
    const status = document.getElementById("status-api");

    try {
        const [clientes, funcionarios, servicos, agendamentos] =
            await Promise.all([
                request("/clientes"),
                request("/funcionarios"),
                request("/servicos"),
                request("/agendamentos")
            ]);

        if (status) {
            status.textContent = "Backend conectado e banco respondendo.";
        }

        const valores = {
            "total-clientes": clientes.length,
            "total-funcionarios": funcionarios.length,
            "total-servicos": servicos.length,
            "total-agendamentos": agendamentos.length
        };

        Object.entries(valores).forEach(([id, valor]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = valor;
        });

        const tabela =
            document.getElementById("lista-agendamentos-home");

        if (tabela) {
            limparElemento(tabela);

            agendamentos.slice(0, 10).forEach((item) => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${item.id_agendamentos}</td>
                    <td>${formatarData(item.data)}</td>
                    <td>${escaparHTML(String(item.horario || "").slice(0, 5))}</td>
                    <td>${escaparHTML(item.cliente || "")}</td>
                    <td>${escaparHTML(
                        item.barba
                            ? `${item.servico} + ${item.barba}`
                            : item.servico || ""
                    )}</td>
                    <td>${escaparHTML(item.funcionario || "")}</td>
                `;

                tabela.appendChild(tr);
            });

            if (!agendamentos.length) {
                criarLinhaVazia(
                    tabela,
                    6,
                    "Nenhum agendamento encontrado."
                );
            }
        }
    } catch (erro) {
        console.error(erro);

        if (status) {
            status.textContent = `Erro ao conectar: ${erro.message}`;
        }
    }
}

// ============================================================
// TEMA
// ============================================================

function configurarTema() {
    const botoes = document.querySelectorAll(
        "#toggle-tema, #btn-tema, .btn-tema, #tema"
    );

    if (!botoes.length) return;

    const aplicar = () => {
        const escuro =
            localStorage.getItem("tema") !== "light";

        document.body.classList.toggle("dark", escuro);

        botoes.forEach((botao) => {
            botao.textContent = escuro ? "☀️" : "🌙";
        });
    };

    aplicar();

    botoes.forEach((botao) => {
        if (botao.dataset.temaConfigurado) return;

        botao.dataset.temaConfigurado = "1";

        botao.addEventListener("click", () => {
            const escuro =
                !document.body.classList.contains("dark");

            document.body.classList.toggle("dark", escuro);
            localStorage.setItem(
                "tema",
                escuro ? "dark" : "light"
            );

            botoes.forEach((item) => {
                item.textContent = escuro ? "☀️" : "🌙";
            });
        });
    });
}

// ============================================================
// FUNÇÕES GLOBAIS PARA onclick EXISTENTES
// ============================================================

Object.assign(window, {
    editarCliente,
    excluirCliente,
    editarFuncionario,
    excluirFuncionario,
    editarServico,
    excluirServico,
    editarAgendamento,
    excluirAgendamento,
    selecionarServico,
    selecionarNenhumaBarba,
    salvarAgendamento,
    resetarFormularioAgendamento,
    verificarDisponibilidade,
    sair
});
