# GZ Barbearia — revisão final TCC

## Correções aplicadas

- Corrigidas as rotas de login e cadastro do backend.
- Login local e login pelo Render usam a mesma API.
- Cadastro cria/atualiza o registro correspondente em `clientes`.
- Corrigido o campo de valor dos agendamentos: banco usa `valor`; API devolve `valor AS preco` para o frontend.
- Corrigidos caminhos de imagens com `Imagens` (maiúsculo), compatíveis com hospedagem Linux.
- Removidas referências a Service Workers que não existiam no projeto.
- Corrigidos links internos quebrados entre relatório, dashboard, login e área do cliente.
- Criada página de relatório funcional com contagem de clientes, funcionários, serviços e agendamentos.
- Implementado cadastro/edição/exclusão de clientes.
- Implementado cadastro/edição/exclusão de funcionários.
- Implementado cadastro/edição/exclusão de serviços.
- Implementado formulário de serviço que realmente envia POST/PUT para a API.
- Implementada seleção de cliente no agendamento administrativo.
- Corrigida seleção de corte/barba e opção de nenhuma barba.
- Implementada verificação visual de horários disponíveis/ocupados.
- Implementada edição e exclusão de agendamentos.
- Corrigida tabela de agendamentos do cliente para corresponder às 9 colunas do HTML.
- Adicionadas validações de data, domingo, horário comercial e conflito de funcionário.
- API ganhou `/` e `/health` para diagnóstico.
- CORS e tratamento de 404 foram ajustados.

## Testes realizados

- `node --check backend/routes.js`
- `node --check backend/server.js`
- `node --check frontend/js/app.js`
- Inicialização local da API e teste de `/` e `/health`.
- Teste simulado de login: HTTP 200.
- Teste simulado de cadastro: HTTP 201.
- Teste simulado de criação de agendamento: HTTP 201.
- Verificação das referências de arquivos `/frontend/...`: nenhuma referência apontando para arquivo inexistente.

## Para testar amanhã

### Backend local
```bash
cd backend
npm install
npm start
```

### Frontend
Abra `frontend/login.html` pelo Live Server.

Se estiver rodando em `localhost`, o frontend usa automaticamente `http://localhost:3000`.
Se estiver hospedado, usa automaticamente `https://gz-barbearia-ofc-2.onrender.com`.

## Observação importante

O ambiente desta revisão não consegue acessar a internet/Render/Supabase. Portanto, os testes reais de conexão com o banco remoto não puderam ser executados aqui. A estrutura das consultas foi corrigida de acordo com o modelo presente no projeto, incluindo o campo `agendamentos.valor`.
