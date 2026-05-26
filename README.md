# API OdontoCare

API REST em Node.js/Express para autenticação, gestão de pacientes, agenda e módulos clínico-financeiros do OdontoCare.

## Stack

- Node.js 18+
- Express 5
- Zod (validação)
- JWT (autenticação)
- Mongoose/MongoDB
- Fallback SQLite com better-sqlite3

## Pré-requisitos

- Node.js 18 ou superior
- npm
- MongoDB Atlas ou MongoDB local (opcional, pois há fallback para SQLite)

## Configuração

1. Copie o arquivo de ambiente:

```bash
cp .env.exemple .env
```

2. Ajuste as variáveis conforme seu ambiente:

- `PORT`: porta da API (ex.: `3000`)
- `JWT_SECRET`: segredo para assinatura do token
- `MONGO_URI`: conexão MongoDB Atlas (opcional)
- `MONGO_LOCAL_URI`: conexão MongoDB local (opcional)
- `SQLITE_PATH`: caminho do arquivo SQLite de fallback

## Instalação

```bash
npm install
```

## Scripts

- `npm run dev`: inicia API com nodemon
- `npm start`: inicia API em modo normal
- `npm run seed`: popula base com dados de teste

## Fluxo de banco de dados

A API tenta conectar nesta ordem:

1. MongoDB Atlas (`MONGO_URI`)
2. MongoDB local (`MONGO_LOCAL_URI`)
3. SQLite (`SQLITE_PATH`) como fallback automático

## Rotas principais

Base URL local: `http://localhost:3000`

### Públicas

- `POST /api/auth/register`
- `POST /api/auth/login`

### Protegidas por Bearer Token

- `GET|POST|PUT|DELETE /api/users`
- `GET|POST|PUT|DELETE /api/patients`
- `GET|POST|PUT|DELETE /api/appointments`
- `GET|POST|PUT|DELETE /api/treatments`
- `GET|POST|PUT|DELETE /api/budgets`
- `GET|POST|PUT|DELETE /api/medical-records`
- `GET|POST|PUT|DELETE /api/payments`
- `GET|POST|DELETE /api/files`

## Estrutura principal

```
src/
	app.js
	server.js
	config/
	controllers/
	middleware/
	models/
	routes/
	validation/
database/
	seed.js
	factories/
	seeders/
docs/
```

## Como rodar localmente

```bash
npm run dev
```

API disponível em `http://localhost:3000` (ou porta definida em `PORT`).

## Estado atual

- Núcleo de autenticação, pacientes e agenda está funcional.
- Módulos de tratamentos, orçamentos, prontuários, pagamentos e arquivos estão implementados com validação.
- Upload binário real de arquivos ainda não está implementado (módulo de arquivos trabalha com metadados/URL).

