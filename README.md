# 📚 Biblioteca Interna

Sistema web para gerenciamento de biblioteca interna com cadastro, locação e devolução de livros, permissões de usuários, dashboard administrativo e integração com a Open Library API.

## 🛠️ Tecnologias

- **Node.js 22** com **Express** — servidor web (arquitetura MVC)
- **TypeScript** — tipagem estática (compilado com `tsc`, executado em dev com `tsx`)
- **PostgreSQL** — banco de dados
- **Prisma ORM 7** — modelagem, migrations e client tipado (via `@prisma/adapter-pg`)
- **JWT** (`jsonwebtoken`) — autenticação e autorização por perfil
- **bcryptjs** — criptografia de senhas
- **Nodemailer** — envio de e-mails (redefinição de senha) via SMTP
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

## 🔐 Controle de acesso (perfis e permissões)

O acesso às funcionalidades é controlado em duas camadas:

- **Perfil `ADMINISTRADOR`** — tem **acesso total por padrão**. O middleware de autorização libera qualquer ação sem depender de permissões individuais.
- **Perfil `USUARIO`** — acesso **limitado**, definido pelas permissões específicas vinculadas a ele (relação N:N).

As permissões possíveis (populadas via seed, ver abaixo):

| Permissão | Descrição |
|-----------|-----------|
| `CADASTRAR_USUARIOS` | Cadastrar usuários |
| `CADASTRAR_LIVROS` | Cadastrar livros |
| `LOCAR_LIVROS` | Locar livros |
| `DEVOLVER_LIVROS` | Devolver livros |
| `EXCLUIR_LIVROS` | Excluir livros |
| `ACESSAR_DASHBOARD` | Acessar dashboard |

Ao cadastrar um novo `USUARIO` sem permissões explícitas, ele recebe o **conjunto padrão limitado**: `LOCAR_LIVROS`, `DEVOLVER_LIVROS` e `ACESSAR_DASHBOARD`.

A verificação é feita pelo middleware `exigirPermissao(<nome>)` (em [src/middlewares/auth.ts](src/middlewares/auth.ts)), que consulta as permissões do usuário **no banco a cada requisição** — assim, habilitar ou remover uma permissão tem efeito imediato, sem esperar o token expirar. Um administrador gerencia as permissões de um usuário pela rota `PATCH /usuarios/:id/permissoes`.

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
| `SMTP_HOST` | — | Host do servidor SMTP. **Vazio em dev** → usa conta de teste Ethereal (link sai no console) |
| `SMTP_PORT` | `587` | Porta SMTP (`587` = TLS/STARTTLS, `465` = SSL) |
| `SMTP_USER` | — | Usuário de autenticação SMTP (geralmente o e-mail completo) |
| `SMTP_PASS` | — | Senha do SMTP (muitas vezes uma "senha de app") |
| `SMTP_FROM` | — | Remetente exibido no e-mail (ex.: `"Biblioteca <nao-responda@empresa.com>"`) |
| `APP_URL` | `http://localhost:3002` | URL base usada para montar o link de redefinição no e-mail |

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

**Seeds (dados iniciais):**

| Comando | Descrição |
|---------|-----------|
| `npx tsx prisma/seed-permissoes.ts` | Popula as 6 permissões do sistema (idempotente) |
| `npx tsx prisma/seed-admin.ts` | Cria o primeiro usuário administrador (ajuste `ADMIN_EMAIL` / `ADMIN_SENHA`) |

> Ao inserir dados manualmente, respeite a ordem de dependência: crie uma **permissão** antes do **usuário**, e um **livro** antes do **exemplar**.

## 🔌 API

### `POST /auth/login` — Autenticação

Autentica um usuário a partir de e-mail e senha e retorna um token JWT usado nas rotas protegidas. **Rota pública.**

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `email` | string | ✅ | E-mail cadastrado |
| `senha` | string | ✅ | Senha do usuário |

**Exemplo de requisição:**

```json
{
  "email": "admin@empresa.com",
  "senha": "admin123"
}
```

**Exemplo de resposta (`200 OK`):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@empresa.com",
    "setor": "TI",
    "cpf": "00000000000",
    "perfil": "ADMINISTRADOR",
    "criadoEm": "2026-07-10T00:00:00.000Z"
  }
}
```

O token expira em **8 horas** e deve ser enviado nas rotas protegidas no header `Authorization: Bearer <token>`. A senha nunca é retornada.

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Autenticado — retorna `token` e dados do usuário (sem a senha) |
| `400 Bad Request` | Campos inválidos (validação Zod) ou JSON malformado |
| `401 Unauthorized` | E-mail inexistente ou senha incorreta |
| `500 Internal Server Error` | Falha inesperada ao autenticar |

> 🔑 **Primeiro acesso:** o cadastro de usuários (`POST /usuarios`) exige um token de administrador. Para criar o primeiro admin — sem o qual não há como gerar esse token — rode o script de bootstrap: `npx tsx prisma/seed-admin.ts` (ajuste `ADMIN_EMAIL` / `ADMIN_SENHA` conforme necessário). Ele insere um administrador com a senha já em hash bcrypt.

### `GET /auth/me` — Dados do usuário logado

Retorna o perfil e as permissões do usuário autenticado, usados pelo front-end para exibir ações conforme o que o usuário pode fazer. Como as permissões são lidas do banco, refletem imediatamente qualquer alteração. **Requer autenticação.**

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Exemplo de resposta (`200 OK`):**

```json
{
  "id": 9,
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "perfil": "USUARIO",
  "permissoes": ["LOCAR_LIVROS", "DEVOLVER_LIVROS", "ACESSAR_DASHBOARD"]
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Dados do usuário logado (`perfil` e `permissoes` achatadas em array de nomes) |
| `401 Unauthorized` | Token ausente ou inválido |
| `404 Not Found` | Usuário do token não encontrado |

### `POST /auth/esqueci-senha` — Solicitar redefinição de senha

Inicia o fluxo de "Esqueci minha senha": valida se o e-mail está cadastrado, gera um token de redefinição (aleatório, armazenado com hash e validade de **30 minutos**) e envia por e-mail um link para o usuário definir uma nova senha. **Rota pública.**

> 📧 O e-mail é enviado via SMTP (config nas variáveis `SMTP_*`). Em desenvolvimento, com `SMTP_HOST` vazio, é usada uma conta de teste **Ethereal** e a URL de preview do e-mail é exibida no console do servidor.

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `email` | string | ✅ | E-mail cadastrado |

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Solicitação aceita — e-mail de redefinição enviado |
| `400 Bad Request` | Campo inválido (validação Zod) ou JSON malformado |
| `404 Not Found` | E-mail não cadastrado |
| `500 Internal Server Error` | Falha ao gerar o token ou enviar o e-mail |

### `POST /auth/redefinir-senha` — Redefinir a senha

Conclui o fluxo: valida o token recebido no link, verifica se **não** está expirado e substitui a senha anterior. O token é de **uso único** — após redefinir, ele é invalidado. **Rota pública.**

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `token` | string | ✅ | Token recebido no link enviado por e-mail |
| `novaSenha` | string | ✅ | Nova senha (mínimo de 6 caracteres, armazenada com hash) |

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Senha redefinida com sucesso |
| `400 Bad Request` | Campos inválidos, **ou token inválido / expirado / já utilizado** |
| `500 Internal Server Error` | Falha inesperada ao redefinir |

### `GET /usuarios` — Listar usuários

Lista todos os usuários cadastrados (ordenados por nome), com seus perfis e permissões. Usado pela tela de administração. **Restrito a administradores.** A senha (hash) nunca é retornada.

**Autenticação:** requer header `Authorization: Bearer <token>` de um usuário com `perfil: ADMINISTRADOR`.

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Lista de usuários (cada um com `id`, `nome`, `email`, `setor`, `cpf`, `perfil`, `criadoEm` e `permissoes`) |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Token válido, mas o usuário não é `ADMINISTRADOR` |

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

### `PATCH /usuarios/:id/permissoes` — Habilitar/desabilitar permissões

Habilita ou remove permissões específicas de um usuário. **Restrito a administradores.**

**Autenticação:** requer header `Authorization: Bearer <token>` de um usuário com `perfil: ADMINISTRADOR`.

**Corpo (JSON):** informe ao menos um dos campos.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `habilitar` | number[] | ❌ | IDs de permissões a vincular ao usuário |
| `desabilitar` | number[] | ❌ | IDs de permissões a remover do usuário |

**Exemplo de requisição:**

```json
{
  "habilitar": [4],
  "desabilitar": [7]
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Permissões atualizadas — retorna o usuário (sem a senha) com a lista de permissões |
| `400 Bad Request` | ID inválido, corpo inválido ou nenhum campo informado |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Token válido, mas o usuário não é `ADMINISTRADOR` |
| `404 Not Found` | Usuário ou permissão informada não encontrado |

### `PATCH /usuarios/:id` — Editar dados e perfil

Atualiza dados básicos e/ou o perfil de um usuário. **Restrito a administradores.** Todos os campos são opcionais, mas ao menos um deve ser informado.

**Autenticação:** requer header `Authorization: Bearer <token>` de um usuário com `perfil: ADMINISTRADOR`.

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `nome` | string | ❌ | Novo nome |
| `email` | string | ❌ | Novo e-mail (único e em formato válido) |
| `setor` | enum | ❌ | Um dos setores válidos |
| `cpf` | string | ❌ | CPF com 11 dígitos (único) |
| `perfil` | enum | ❌ | `ADMINISTRADOR` ou `USUARIO` |

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Usuário atualizado (sem a senha), com a lista de permissões |
| `400 Bad Request` | ID inválido, campos inválidos ou nenhum campo informado |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Token válido, mas o usuário não é `ADMINISTRADOR` |
| `404 Not Found` | Usuário não encontrado |
| `409 Conflict` | Já existe usuário com o mesmo CPF ou e-mail |

> ⚠️ **Alteração de perfil e o token:** mudar o `perfil` de um usuário só passa a valer no **próximo login** dele, pois o perfil está gravado no JWT. Já a alteração de **permissões** reflete imediatamente (o middleware as consulta no banco a cada requisição).

### `GET /permissoes` — Listar permissões

Retorna todas as permissões disponíveis no sistema (usada para montar a tela de administração). **Restrito a administradores.**

**Autenticação:** requer header `Authorization: Bearer <token>` de um usuário com `perfil: ADMINISTRADOR`.

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Lista de permissões (`id`, `nome`, `descricao`) |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Token válido, mas o usuário não é `ADMINISTRADOR` |

### `GET /livros` — Listar livros do acervo

Lista todos os livros (ordenados por título) com o **status derivado** de seus exemplares, para a tela de acervo em grid de cards. **Requer autenticação** (qualquer usuário logado pode ver o acervo; as ações é que exigem permissões).

**Autenticação:** requer header `Authorization: Bearer <token>`.

Cada item retorna:

| Campo | Descrição |
|-------|-----------|
| `id`, `titulo`, `autor`, `editora`, `anoPublicacao`, `edicao`, `isbn` | Dados do livro |
| `totalExemplares` | Total de exemplares cadastrados |
| `exemplaresDisponiveis` | Quantidade de exemplares com status `DISPONIVEL` |
| `status` | `DISPONIVEL` (há ao menos um exemplar livre) ou `LOCADO` (todos locados) |
| `dataPrevistaDisponibilidade` | Quando `LOCADO`, a menor data prevista de devolução entre as locações ativas; caso contrário, `null` |

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Lista de livros com status e contagem de exemplares |
| `401 Unauthorized` | Token ausente ou inválido |

> Enquanto a funcionalidade de locação não estiver ativa, nenhum exemplar fica `LOCADO`, então todos os livros retornam `status: DISPONIVEL` e `dataPrevistaDisponibilidade: null`.

### `POST /livros` — Cadastro de livro

Cadastra um livro no acervo e cria automaticamente a quantidade informada de **exemplares** (todos com status `DISPONIVEL`). **Requer a permissão `CADASTRAR_LIVROS`** (administradores têm acesso por padrão).

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `titulo` | string | ✅ | Título do livro |
| `autor` | string | ✅ | Autor(es) — vários podem ser separados por vírgula |
| `editora` | string | ✅ | Editora |
| `anoPublicacao` | number | ✅ | Ano de publicação |
| `edicao` | string | ✅ | Edição (ex.: `"2ª"`) |
| `observacao` | string | ✅ | Observação |
| `isbn` | string | ❌ | ISBN (único, se informado) |
| `quantidadeExemplares` | number | ✅ | Quantidade de exemplares a criar (mínimo 1) |

**Exemplo de requisição:**

```json
{
  "titulo": "Clean Code",
  "autor": "Robert C. Martin",
  "editora": "Prentice Hall",
  "anoPublicacao": 2008,
  "edicao": "1ª",
  "observacao": "Ótimo estado",
  "quantidadeExemplares": 3
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `201 Created` | Livro cadastrado — retorna o livro com a lista de `exemplares` criados |
| `400 Bad Request` | Campos obrigatórios inválidos (validação Zod) ou JSON malformado |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Usuário sem a permissão `CADASTRAR_LIVROS` |
| `409 Conflict` | **Livro duplicado** (mesmo título, autor, editora, ano e edição) ou ISBN já existente |

> O livro e seus exemplares são criados numa **transação** (ou tudo, ou nada). Cada exemplar recebe um código de tombo único no formato `<idLivro>-<sequencial>` (ex.: `5-001`).

**Detecção de duplicados:** antes de criar, o sistema verifica se já existe um livro com o mesmo **título, autor(es), editora, ano de publicação e edição** (comparação _case-insensitive_ nos campos de texto). Se existir, responde `409` com um corpo que identifica o livro existente e permite adicionar exemplares a ele (ver endpoint abaixo):

```json
{
  "erro": "Livro já cadastrado no acervo",
  "duplicado": true,
  "livro": { "id": 5, "titulo": "Clean Code", "...": "..." },
  "totalExemplares": 3,
  "exemplaresDisponiveis": 2
}
```

### `POST /livros/:id/exemplares` — Adicionar exemplares a um livro existente

Cria novos exemplares (status `DISPONIVEL`) para um livro já cadastrado e retorna a contagem atualizada. Usado quando o cadastro detecta um duplicado e o usuário opta por reforçar o acervo. **Requer a permissão `CADASTRAR_LIVROS`.**

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `quantidade` | number | ✅ | Quantidade de exemplares a adicionar (mínimo 1) |

**Exemplo de resposta (`201 Created`):**

```json
{
  "livro": { "id": 5, "titulo": "Clean Code", "exemplares": [] },
  "totalExemplares": 5,
  "exemplaresDisponiveis": 4
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `201 Created` | Exemplares adicionados — retorna `totalExemplares` e `exemplaresDisponiveis` |
| `400 Bad Request` | ID inválido ou quantidade inválida |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Usuário sem a permissão `CADASTRAR_LIVROS` |
| `404 Not Found` | Livro não encontrado |

## 📜 Scripts disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `tsx watch src/server.ts` | Inicia em modo desenvolvimento com hot reload |
| `build` | `prisma generate && tsc` | Gera o client do Prisma e compila `src/` → `dist/` |
| `start` | `node dist/server.js` | Inicia a aplicação compilada (produção) |
| `test` | `jest` | Executa os testes automatizados |

## ✨ Funcionalidades

- 🔐 Autenticação de usuários com login por e-mail/senha e token JWT
- 📧 Recuperação de senha por e-mail (token de uso único com expiração)
- 👥 Cadastro de usuários com perfil, setor e permissões (restrito a administradores)
- 🛠️ Tela de administração para listar usuários, editar dados/perfil e gerenciar permissões
- 📖 Cadastro de livros e controle de exemplares, com detecção de duplicados e reforço de exemplares
- 🗂️ Acervo em grid de cards, com status (Disponível/Locado) e ações conforme a permissão do usuário
- 🔄 Locação e devolução de livros
- 📊 Dashboard administrativo
- 🌐 Integração com a [Open Library API](https://openlibrary.org/developers/api)

## 👤 Autor

**Samuel De Marco**

## 📄 Licença

Este projeto está sob a licença [MIT](https://opensource.org/licenses/MIT).