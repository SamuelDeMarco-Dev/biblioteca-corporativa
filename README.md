# 📚 Biblioteca Interna

Sistema web para gerenciamento de biblioteca interna com cadastro, locação e devolução de livros, permissões de usuários, dashboard administrativo e integração com a Open Library API.

## 🛠️ Tecnologias

- **Node.js 22** com **Express** — servidor web (arquitetura MVC)
- **TypeScript** — tipagem estática (compilado com `tsc`, executado em dev com `tsx`)
- **PostgreSQL** — banco de dados
- **Prisma ORM 7** — modelagem, migrations e client tipado (via `@prisma/adapter-pg`)
- **JWT** (`jsonwebtoken`) — autenticação e autorização por perfil
- **bcryptjs** — criptografia de senhas
- **Zod** — validação dos dados de entrada
- **Docker / Docker Compose** — containerização
- **Jest** — testes automatizados

## 📁 Estrutura do Projeto

```
template-node-mvc/
├── src/
│   ├── server.ts          # Ponto de entrada da aplicação
│   ├── app.ts             # Configuração do Express (middlewares e rotas)
│   ├── routes/            # Definição das rotas (ex.: usuario.routes.ts)
│   ├── controllers/       # Camada HTTP (req/res, status codes)
│   ├── services/          # Regra de negócio e acesso ao Prisma
│   ├── middlewares/       # Autenticação e autorização (auth.ts)
│   ├── schemas/           # Validação de entrada com Zod
│   ├── lib/
│   │   └── prisma.ts      # Instância única do Prisma Client
│   └── generated/         # Client do Prisma gerado (não versionado)
├── prisma/
│   ├── schema.prisma      # Definição das tabelas e relacionamentos
│   └── migrations/        # Histórico de migrations (versionado)
├── public/
│   └── index.html         # Arquivos estáticos (front-end)
├── .env.example           # Modelo de variáveis de ambiente
├── tsconfig.json          # Configuração do compilador TypeScript
├── Dockerfile             # Imagem Docker da aplicação
├── docker-compose.yml     # Orquestração (app + PostgreSQL)
└── package.json
```

## 🗄️ Modelo de Dados

O schema (em [prisma/schema.prisma](prisma/schema.prisma)) define seis tabelas principais:

| Tabela | Descrição |
|--------|-----------|
| `permissoes` | Permissões específicas atribuíveis a usuários (relação N:N) |
| `usuarios` | Usuários do sistema — CPF e e-mail únicos; possuem `perfil`, `setor` e permissões |
| `livros` | Títulos do acervo (autor, ISBN, editora) |
| `exemplares` | Cópias físicas de um livro, com status `DISPONIVEL` / `LOCADO` / `MANUTENCAO` |
| `locacoes` | Empréstimos de exemplares a usuários (com data de devolução) |
| `historico_movimentacoes` | Auditoria de locações, devoluções e renovações |

> A separação entre **livro** (título) e **exemplar** (cópia física) permite controlar múltiplos exemplares de um mesmo livro e saber, individualmente, se cada cópia está disponível ou locada.

O usuário distingue dois conceitos de acesso:

- **`perfil`** (enum) — papel que controla o acesso: `ADMINISTRADOR` ou `USUARIO`.
- **`permissoes`** (relação N:N) — permissões específicas e granulares, atribuíveis por usuário.
- **`setor`** (enum) — área da empresa: `SUPORTE`, `SERVICOS`, `SANCONHUB`, `ADMINISTRATIVO`, `COMERCIAL`, `MARKETING`, `TI`, `RH`, `DIRETORIA`.

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) 22 ou superior
- [Docker e Docker Compose](https://www.docker.com/) (recomendado — sobe app + banco juntos)
- [PostgreSQL](https://www.postgresql.org/) (apenas se optar por rodar sem Docker)

## 🚀 Como executar

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd template-node-mvc
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e ajuste os valores conforme seu ambiente:

```bash
cp .env.example .env
```

Variáveis disponíveis:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3002` | Porta em que a aplicação escuta |
| `DB_HOST` | `db` | Host do PostgreSQL (`db` = nome do serviço no Docker Compose; use `localhost` fora do Docker) |
| `DB_PORT` | `5432` | Porta interna do PostgreSQL |
| `DB_USER` | — | Usuário do banco de dados |
| `DB_PASSWORD` | — | Senha do banco de dados |
| `DB_NAME` | `biblioteca` | Nome do banco de dados |
| `DATABASE_URL` | — | String de conexão usada pelo Prisma (ver observação abaixo) |
| `JWT_SECRET` | — | Segredo para assinatura dos tokens JWT |

> ⚠️ **Portas:** o app usa **3002** e o PostgreSQL é exposto no host na porta **5433** (a 3000 e a 5432 costumam estar ocupadas por outros serviços / instalações locais). Ao alterá-las, ajuste também os mapeamentos `ports` no `docker-compose.yml`.
>
> ⚠️ **`DATABASE_URL` e host:** ao rodar migrations e o Prisma Studio **do seu terminal** (fora do Docker), use host `localhost` e porta `5433`:
> `postgresql://usuario:senha@localhost:5433/biblioteca`
> Dentro do container, o `docker-compose.yml` já sobrescreve a `DATABASE_URL` com host `db` e porta `5432` (rede interna do Docker).

### 3. Instalar dependências

```bash
npm install
```

### 4. Iniciar a aplicação

**Com Docker Compose** (recomendado — aplica as migrations e sobe app + banco):

```bash
docker compose up -d --build
```

**Modo desenvolvimento** (com hot reload, banco via Docker):

```bash
docker compose up -d db          # sobe apenas o PostgreSQL
npx prisma migrate dev           # aplica as migrations
npm run dev                      # inicia a aplicação com reload
```

### 5. Verificar se está funcionando

A aplicação sobe em [http://localhost:3002](http://localhost:3002). Para testar a conexão com o banco de dados:

```bash
curl http://localhost:3002/health
```

Resposta esperada:

```json
{ "status": "ok", "database": "conectado", "hora": "..." }
```

## 🗃️ Banco de dados (Prisma)

| Comando | Descrição |
|---------|-----------|
| `npx prisma migrate dev --name <nome>` | Cria e aplica uma nova migration (desenvolvimento) |
| `npx prisma migrate deploy` | Aplica migrations pendentes (produção / container) |
| `npx prisma generate` | Regenera o client tipado a partir do schema |
| `npx prisma studio` | Abre a interface visual para inspecionar e editar dados |

> Ao inserir dados manualmente, respeite a ordem de dependência: crie uma **permissão** antes do **usuário**, e um **livro** antes do **exemplar**.

## 🔌 API

### `POST /usuarios` — Cadastro de usuário

Cadastra um novo usuário no sistema. **Restrito a administradores.**

**Autenticação:** requer header `Authorization: Bearer <token>`, e o token deve pertencer a um usuário com `perfil: ADMINISTRADOR`.

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `nome` | string | ✅ | Nome do usuário |
| `email` | string | ✅ | E-mail (único e em formato válido) |
| `setor` | enum | ✅ | Um dos setores: `SUPORTE`, `SERVICOS`, `SANCONHUB`, `ADMINISTRATIVO`, `COMERCIAL`, `MARKETING`, `TI`, `RH`, `DIRETORIA` |
| `cpf` | string | ✅ | CPF com 11 dígitos (único) |
| `senha` | string | ✅ | Mínimo de 6 caracteres (armazenada com hash) |
| `perfil` | enum | ✅ | `ADMINISTRADOR` ou `USUARIO` |
| `permissoesIds` | number[] | ❌ | IDs de permissões específicas a vincular |

**Exemplo de requisição:**

```json
{
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "setor": "TI",
  "cpf": "12345678901",
  "senha": "senha123",
  "perfil": "USUARIO",
  "permissoesIds": [1, 2]
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `201 Created` | Usuário cadastrado (a senha nunca é retornada) |
| `400 Bad Request` | Campos inválidos (validação Zod) ou JSON malformado |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Token válido, mas o usuário não é `ADMINISTRADOR` |
| `409 Conflict` | Já existe usuário com o mesmo CPF ou e-mail |

## 📜 Scripts disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `tsx watch src/server.ts` | Inicia em modo desenvolvimento com hot reload |
| `build` | `prisma generate && tsc` | Gera o client do Prisma e compila `src/` → `dist/` |
| `start` | `node dist/server.js` | Inicia a aplicação compilada (produção) |
| `test` | `jest` | Executa os testes automatizados |

## ✨ Funcionalidades

- 👥 Cadastro de usuários com perfil, setor e permissões (restrito a administradores)
- 📖 Cadastro de livros e controle de exemplares
- 🔄 Locação e devolução de livros
- 📊 Dashboard administrativo
- 🌐 Integração com a [Open Library API](https://openlibrary.org/developers/api)

## 👤 Autor

**Samuel De Marco**

## 📄 Licença

Este projeto está sob a licença [MIT](https://opensource.org/licenses/MIT).