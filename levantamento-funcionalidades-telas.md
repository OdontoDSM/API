# Levantamento de Funcionalidades e Telas

Data: 25/05/2026
Escopo analisado: backend Node.js/Express em `src/`
Metodo: leitura de rotas, controllers, models, middlewares e scripts do projeto.

## 1) Prontas

### 1.1 Infraestrutura da API
- Inicializacao do servidor Express com CORS, JSON parser e registro das rotas de dominio.
- Conexao com banco com tentativa MongoDB Atlas -> MongoDB local -> fallback SQLite.
- Middleware global de erro e rota nao encontrada.

### 1.2 Autenticacao
- Cadastro de usuario (`POST /api/auth/register`) com hash de senha.
- Login (`POST /api/auth/login`) com emissao de JWT.
- Middleware de autenticacao por Bearer token protegendo os modulos privados.

### 1.3 Usuarios
- CRUD de usuarios em `/api/users` protegido por autenticacao.
- Remocao logica (campo `ativo`) no delete.
- Sanitizacao para nao retornar senha.
- Compatibilidade declarada para MongoDB e SQLite (inclusive `findOneAndUpdate` no adaptador SQLite).

### 1.4 Pacientes
- CRUD em `/api/patients` com validacoes de ID nos endpoints por id.
- Normalizacao de campos `name/nome` e `phone/telefone`.

### 1.5 Agendamentos
- CRUD em `/api/appointments`.
- Validacoes de conflito de sala/horario e de referencias (paciente/usuario).
- Filtros por paciente, usuario, sala, status e intervalo de datas.

### 1.6 Tratamentos
- CRUD em `/api/treatments`.
- Validacao de preco base e IDs.

### 1.7 Orcamentos
- CRUD em `/api/budgets`.
- Validacao de paciente/tratamento e filtros.

### 1.8 Prontuarios
- CRUD em `/api/medical-records`.
- Busca por paciente (`GET /api/medical-records/patient/:patientId`).
- Restricao de 1 prontuario por paciente.

### 1.9 Pagamentos
- CRUD em `/api/payments`.
- Regras de validacao de valores, desconto e relacionamento com orcamento.

### 1.10 Arquivos (metadados)
- Criacao, listagem, busca por ID e remocao em `/api/files`.
- Associacao com prontuario medico e filtros.

## 2) Comecadas, mas nao concluidas

### 2.1 Modulo de arquivos sem upload real
- O modulo de arquivos hoje salva metadados (`fileType`, `fileUrl`) e nao possui fluxo de upload/armazenamento de arquivo.
- Status: funcional para referencia por URL, incompleto para gestao de upload nativo.

### 2.2 Controle de permissao por perfil
- Existe campo `isAdmin` no usuario, mas nao ha middlewares/guards de autorizacao por papel (apenas autenticacao).
- Status: base de permissao iniciada, sem RBAC aplicado nas rotas.

### 2.3 Testes automatizados
- Script `npm test` ainda esta como placeholder (`"Error: no test specified"`).
- Status: estrutura de projeto pronta, cobertura de testes nao implementada.

### 2.4 Documentacao principal do projeto
- `README.md` esta praticamente vazio (apenas titulo).
- Status: documentacao iniciada, sem instrucoes de setup/uso/endpoints.

## 3) Ainda nao comecado

### 3.1 Telas do sistema (frontend)
- Nao ha projeto frontend no workspace (React, Vue, Angular, HTML views etc.).
- Portanto, nao existem telas implementadas neste repositorio.

Telas identificadas no estado atual:
- Nenhuma tela implementada.

## 4) Inventario resumido por modulo

- Auth: pronto (register/login JWT).
- Usuarios: pronto (CRUD + delete logico).
- Pacientes: pronto (CRUD).
- Agendamentos: pronto (CRUD + conflito de sala/horario).
- Tratamentos: pronto (CRUD).
- Orcamentos: pronto (CRUD).
- Prontuarios: pronto (CRUD + busca por paciente).
- Pagamentos: pronto (CRUD + validacoes de soma).
- Arquivos: parcial (metadados prontos, upload real nao iniciado).
- Telas frontend: nao iniciado.

## 5) Observacao importante

A classificacao acima considera o que esta efetivamente presente no codigo atual do repositorio. Ela nao pressupoe requisitos externos adicionais que nao estejam no projeto.