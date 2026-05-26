# Levantamento de Funcionalidades - API

Data: 26/05/2026
Escopo analisado: backend Node.js/Express em `src/`
Metodo: leitura de rotas, controllers, middlewares, validacoes e scripts.

## 1) Prontas

### 1.1 Infraestrutura

- API Express com CORS, parser JSON e tratamento global de erros.
- Registro de rotas por dominio em `/api/*`.
- Inicializacao via `src/server.js` com carregamento de `.env`.

### 1.2 Banco de dados e resiliencia

- Conexao com tentativa em cascata:
1. MongoDB Atlas (`MONGO_URI`)
2. MongoDB local (`MONGO_LOCAL_URI`)
3. SQLite (`SQLITE_PATH`) como fallback
- Estado de banco centralizado em `src/config/dbState.js`.

### 1.3 Autenticacao

- `POST /api/auth/register` com hash de senha.
- `POST /api/auth/login` com emissao de JWT.
- Middleware `auth` por Bearer token para modulos privados.

### 1.4 Usuarios

- CRUD em `/api/users` protegido por autenticacao.
- Delete logico com campo `ativo`.
- Senha removida das respostas.

### 1.5 Pacientes

- CRUD em `/api/patients` com validacao de params/body.
- Normalizacao de campos (`name/nome`, `phone/telefone`).

### 1.6 Agendamentos

- CRUD em `/api/appointments`.
- Validacoes de conflito de sala/horario e referencias.
- Filtros por paciente, usuario, sala, status e intervalo de datas.

### 1.7 Tratamentos

- CRUD em `/api/treatments`.
- Validacoes de identificador e preco.

### 1.8 Orcamentos

- CRUD em `/api/budgets`.
- Filtros e validacoes de relacionamento.

### 1.9 Prontuarios

- CRUD em `/api/medical-records`.
- Busca por paciente em `GET /api/medical-records/patient/:patientId`.
- Regra de um prontuario por paciente.

### 1.10 Pagamentos

- CRUD em `/api/payments`.
- Validacoes de valor, desconto e consistencia com orcamento.

### 1.11 Arquivos (metadados)

- Criacao/listagem/busca/remocao em `/api/files`.
- Modelo baseado em metadados e URL de arquivo.

## 2) Parcial / Em evolucao

### 2.1 Upload fisico de arquivos

- O modulo de arquivos nao recebe binario nem faz armazenamento local/cloud.
- Estado atual: apenas metadados (`fileType`, `fileUrl`, referencias).

### 2.2 Autorizacao por perfil (RBAC)

- Existe base de perfil (`isAdmin`), mas sem regras por rota.
- Estado atual: controle de acesso apenas por autenticacao.

### 2.3 Testes automatizados

- Script de teste ainda placeholder no `package.json`.
- Estado atual: sem suite automatizada de testes.

## 3) Rotas mapeadas

### Publicas

- `POST /api/auth/register`
- `POST /api/auth/login`

### Protegidas

- `GET|POST|PUT|DELETE /api/users`
- `GET|POST|PUT|DELETE /api/patients`
- `GET|POST|PUT|DELETE /api/appointments`
- `GET|POST|PUT|DELETE /api/treatments`
- `GET|POST|PUT|DELETE /api/budgets`
- `GET|POST|PUT|DELETE /api/medical-records`
- `GET|POST|PUT|DELETE /api/payments`
- `GET|POST|DELETE /api/files`

## 4) Resumo executivo

- O backend esta funcional para o fluxo principal do produto (autenticacao, pacientes e agenda).
- Existem modulos de apoio clinico-financeiro implementados com validacao.
- Os principais gaps atuais sao upload real de arquivo, RBAC e testes automatizados.