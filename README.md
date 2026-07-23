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
│   ├── app.ts             # Express + middleware global de erro
│   ├── routes/            # Definição das rotas (ex.: usuario.routes.ts)
│   ├── controllers/       # Camada HTTP (req/res, status codes)
│   ├── services/          # Regra de negócio e acesso ao Prisma
│   ├── middlewares/       # Autenticação e autorização (auth.ts)
│   ├── schemas/           # Validação de entrada com Zod
│   ├── constants/         # Constantes do domínio (ex.: permissoes.ts)
│   ├── utils/             # Utilitários: cpf.ts (validação) e erros.ts (padrão de erro)
│   ├── lib/
│   │   ├── prisma.ts      # Instância única do Prisma Client
│   │   └── mailer.ts      # Envio de e-mail (Nodemailer)
│   └── generated/         # Client do Prisma gerado (não versionado)
├── prisma/
│   ├── schema.prisma      # Definição das tabelas e relacionamentos
│   ├── migrations/        # Histórico de migrations (versionado)
│   ├── seed-admin.ts      # Cria o primeiro administrador
│   └── seed-permissoes.ts # Popula as permissões do sistema
├── public/                    # Front-end estático (ES Modules, sem JS inline no HTML)
│   ├── index.html             # Login (com a logo da Sancon)
│   ├── home.html              # Início — dashboard PESSOAL do usuário
│   ├── dashboard.html         # Painel geral — indicadores de todos (admin)
│   ├── livros.html            # Acervo (cards de livros + filtros)
│   ├── locacao.html           # Confirmar locação
│   ├── minhas-locacoes.html   # Minhas locações (cards + histórico em modal)
│   ├── admin-usuarios.html    # Cadastro/gestão de usuários (admin)
│   ├── esqueci-senha.html / redefinir-senha.html
│   ├── img/sancon.svg         # Logo da Sancon (favicon e telas)
│   ├── css/estilo.css         # Estilos + design tokens (tema claro/escuro)
│   └── js/                    # Front-end separado em camadas de responsabilidade
│       ├── api.js             # Camada de dados — concentra as chamadas à API
│       ├── ui.js              # Ícones, modais, mensagens e validação de campos
│       ├── theme.js           # Modo claro/escuro (persistido no navegador)
│       ├── layout.js          # Sidebar/topbar + guard de acesso (exigirAcesso)
│       └── pages/             # Um controlador por tela (login, acervo, home, …)
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
| `ACESSAR_DASHBOARD` | Ver o **dashboard pessoal** na tela Início |

Ao cadastrar um novo `USUARIO` sem permissões explícitas, ele recebe o **conjunto padrão limitado**: `LOCAR_LIVROS`, `DEVOLVER_LIVROS` e `ACESSAR_DASHBOARD`.

> 📊 **Dashboards — pessoal x geral:** a permissão `ACESSAR_DASHBOARD` libera o **dashboard pessoal** (só as locações do próprio usuário) na tela **Início**. O **Painel geral** — indicadores de **todos** os usuários — é uma tela à parte, **exclusiva de administradores** (rota `GET /dashboard` protegida por `exigirAdmin`). Cada usuário, portanto, só enxerga os dados das próprias locações; o admin vê as dele no Início e todas no Painel geral.

A verificação é feita pelo middleware `exigirPermissao(<nome>)` (em [src/middlewares/auth.ts](src/middlewares/auth.ts)), que consulta as permissões do usuário **no banco a cada requisição** — assim, habilitar ou remover uma permissão tem efeito imediato, sem esperar o token expirar. Um administrador gerencia as permissões de um usuário pela rota `PATCH /usuarios/:id/permissoes`.

**Duas camadas de enforcement:**

1. **Front-end (experiência)** — o menu e os botões de ação são montados conforme o `perfil`/`permissoes` retornados por `GET /auth/me`. Itens não permitidos ficam **ocultos** e, ao tentar abrir uma página restrita pela URL, o guard `exigirAcesso()` (em [public/js/layout.js](public/js/layout.js)) **redireciona** o usuário. Isso é apenas usabilidade.
2. **Back-end (segurança real)** — toda rota sensível é protegida por `autenticar` + `exigirPermissao`/`exigirAdmin`. Mesmo que alguém chame a rota manualmente (curl/Postman), o back-end responde **401/403**. **Esta é a camada que de fato protege o sistema** — o front-end nunca é a fonte de verdade.

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

> 🌱 **Primeira execução:** as migrations rodam sozinhas no start, mas o banco sobe **vazio**. Popule as permissões e crie o admin inicial rodando os seeds **dentro do container** (uma única vez):
> ```bash
> docker compose exec app npx tsx prisma/seed-permissoes.ts
> docker compose exec app npx tsx prisma/seed-admin.ts
> ```
> Depois acesse [http://localhost:3002](http://localhost:3002) e entre com **admin@empresa.com / admin123** (ou os valores de `ADMIN_EMAIL` / `ADMIN_SENHA`).
>
> Para **zerar o banco** e recomeçar do zero: `docker compose down -v && docker compose up -d --build` (o `-v` apaga o volume `pgdata` — **irreversível** — e exige rodar os seeds novamente).

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

## 🖥️ Telas principais

O front-end são páginas estáticas em [public/](public/) que consomem a API. O cabeçalho com o menu é montado dinamicamente por [public/js/layout.js](public/js/layout.js), exibindo apenas os itens permitidos ao usuário logado.

| Tela | Arquivo | Acesso | Descrição |
|------|---------|--------|-----------|
| **Login** | `index.html` | Público | Entrada por e-mail/senha; guarda o token JWT e redireciona para o Início. Link para "Esqueci minha senha". |
| **Esqueci / Redefinir senha** | `esqueci-senha.html`, `redefinir-senha.html` | Público | Solicita o e-mail de redefinição e define a nova senha a partir do link recebido. |
| **Início** | `home.html` | Autenticado | **Dashboard pessoal**: só as locações do próprio usuário (em dia / atrasadas / devolvidas), próximas devoluções por prazo e situação. Aparece para quem tem `ACESSAR_DASHBOARD` (senão, boas-vindas com atalhos). |
| **Acervo** | `livros.html` | Autenticado | Cards de livros de **tamanho uniforme** com **busca e filtros** (título, autor, editora, ano, status). Faixa lateral colorida pelo status; **clicar no card abre um modal** com os detalhes. Ações conforme a permissão (**Locar**, **+ Exemplar**, **Excluir**). O cadastro de livro é um **modal** com autocomplete via Open Library e detecção de duplicados. |
| **Confirmar locação** | `locacao.html` | `LOCAR_LIVROS` | Confirma o empréstimo de um livro selecionado no acervo, definindo o prazo. |
| **Minhas locações** | `minhas-locacoes.html` | Autenticado | **Cards** das locações ativas do próprio usuário, com o **prazo destacado por cor** (em dia / vencendo / atrasado); clicar no card mostra os detalhes. Botão **Devolver** (com confirmação) e **histórico** em modal com filtro. |
| **Gerenciar usuários** | `admin-usuarios.html` | Administrador | **Cadastro de novo usuário** (com validação de campos, CPF e e-mail), edição de dados/perfil e habilitação/remoção de permissões. |
| **Painel geral** | `dashboard.html` | Administrador | Indicadores de **todos** os usuários: totais do acervo, ranking de locadores, situação do acervo e últimas locações. |

### Interface

- **Front-end em camadas** (ES Modules, sem JavaScript inline no HTML): dados (`api.js`), apresentação (`ui.js`), tema (`theme.js`), layout/guards (`layout.js`) e um controlador por tela em `js/pages/`.
- **Modo claro / escuro** — botão de tema (ícone) ao lado do usuário na barra superior; a escolha é **persistida** no navegador e, na primeira visita, respeita a preferência do sistema operacional.
- **Design responsivo** com sidebar retrátil no mobile, e cards que se adaptam à largura da tela.
- **Identidade Sancon** — a logo aparece no **favicon** (aba do navegador), na tela de login e no rodapé da barra lateral.

## ✅ Validações e tratamento de erros

O sistema padroniza validações e mensagens para nunca quebrar nem expor erros internos ao usuário.

**Validação de entrada (Zod):** todos os corpos de requisição são validados por schemas em [src/schemas/](src/schemas/). Campos obrigatórios, formato de e-mail e o **CPF** (validado pelos **dígitos verificadores** — não apenas 11 dígitos, ver [src/utils/cpf.ts](src/utils/cpf.ts)) são checados no back-end. O front-end também valida antes de enviar, para feedback imediato.

**Formato único de erro:** respostas de erro seguem sempre o formato:

```json
{
  "erro": "Verifique os campos destacados e tente novamente.",
  "campos": { "email": "E-mail inválido", "cpf": "CPF inválido" }
}
```

- `erro` — mensagem amigável, pronta para exibir.
- `campos` (opcional) — mapa `campo → mensagem`; o front-end usa para **destacar** o input inválido (borda vermelha + texto abaixo) via `aplicarErros()` em [public/js/ui.js](public/js/ui.js).

**Erros de banco:** violações conhecidas do Prisma são traduzidas para respostas amigáveis (registro duplicado → `409`, não encontrado → `404`) em [src/utils/erros.ts](src/utils/erros.ts). Nunca é exposto SQL ou stack trace.

**Falha na Open Library:** a busca externa tem *timeout* de 5s e, em qualquer falha (rede, timeout ou status inválido), responde `{ indisponivel: true }` — a tela apenas informa que as sugestões estão indisponíveis e permite o cadastro manual, sem travar.

**Rede de segurança:** um middleware global em [src/app.ts](src/app.ts) captura qualquer exceção não prevista, registra o detalhe **apenas no log do servidor** e devolve um `500` genérico (`"Ocorreu um erro inesperado. Tente novamente em instantes."`).

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
| `cpf` | string | ✅ | 11 dígitos, **validado pelos dígitos verificadores** (não apenas o formato); único |
| `senha` | string | ✅ | Mínimo de 6 caracteres (armazenada com hash) |
| `perfil` | enum | ✅ | `ADMINISTRADOR` ou `USUARIO` |
| `permissoesIds` | number[] | ❌ | IDs de permissões específicas a vincular |

**Exemplo de requisição:**

```json
{
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "setor": "TI",
  "cpf": "52998224725",
  "senha": "senha123",
  "perfil": "USUARIO",
  "permissoesIds": [1, 2]
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `201 Created` | Usuário cadastrado (a senha nunca é retornada) |
| `400 Bad Request` | Campos inválidos — retorna `{ erro, campos }` (ver [Validações e erros](#-validações-e-tratamento-de-erros)) |
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

### `DELETE /livros/:id` — Remover livro do acervo

Remove um livro do acervo por **soft delete** (marca `ativo = false`), preservando o histórico de locações associado. **Restrito a administradores.** Um livro com algum exemplar **locado** não pode ser removido.

**Autenticação:** requer header `Authorization: Bearer <token>` de um usuário com `perfil: ADMINISTRADOR`.

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Livro removido do acervo (inativado) |
| `400 Bad Request` | ID inválido |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Usuário não é `ADMINISTRADOR` |
| `404 Not Found` | Livro não encontrado |
| `409 Conflict` | Livro possui exemplar locado — não pode ser excluído |

> Livros inativados **deixam de aparecer** em `GET /livros`, portanto não ficam disponíveis para locação, mas continuam no banco (com `ativo: false`) para manter o histórico. Na tela de acervo, o botão **Excluir** aparece apenas para administradores e pede **confirmação** antes de remover.

### `GET /livros/buscar-externo` — Autocomplete via Open Library

Consulta a [Open Library API](https://openlibrary.org/developers/api) para sugerir títulos durante o cadastro (autocomplete). Atua como **proxy**: aplica limite de resultados, timeout e tratamento de falha, para o front-end preencher os campos do livro a partir da sugestão escolhida. **Requer a permissão `CADASTRAR_LIVROS`.**

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Query params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `titulo` | string | ✅ | Termo de busca (mínimo 2 caracteres; abaixo disso retorna lista vazia) |

**Exemplo de resposta (`200 OK`):**

```json
{
  "indisponivel": false,
  "sugestoes": [
    {
      "titulo": "Harry Potter and the Philosopher's Stone",
      "autor": "J. K. Rowling",
      "editora": "",
      "anoPublicacao": 1997,
      "isbn": ""
    }
  ]
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Lista de até **10** sugestões em `sugestoes`. Se a Open Library falhar ou expirar (timeout de 5s), responde `200` com `indisponivel: true` e `sugestoes: []` — a tela continua usável e o cadastro manual permanece possível |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Usuário sem a permissão `CADASTRAR_LIVROS` |

> ⚠️ A API externa pode não retornar todos os campos (ex.: `editora`, `isbn` costumam vir vazios no `search.json`). Os campos ausentes ficam para preenchimento manual; `edição` e `observação` são sempre manuais.

### `POST /locacoes` — Locar um livro

Registra a locação de um livro pelo usuário logado. O sistema seleciona automaticamente um **exemplar disponível** do livro, calcula a data prevista de devolução e marca o exemplar como `LOCADO`. **Requer a permissão `LOCAR_LIVROS`.**

**Autenticação:** requer header `Authorization: Bearer <token>` — o usuário da locação é obtido do token (não é enviado no corpo).

**Corpo (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `livroId` | number | ✅ | ID do livro a ser locado |
| `dias` | number | ✅ | Quantidade de dias de utilização (mínimo 1) |

**Exemplo de resposta (`201 Created`):**

```json
{
  "mensagem": "Locação registrada com sucesso",
  "locacaoId": 12,
  "exemplar": "4-001",
  "dataPrevista": "2026-07-21T18:30:00.000Z"
}
```

**Respostas:**

| Status | Situação |
|--------|----------|
| `201 Created` | Locação registrada — retorna o exemplar locado e a data prevista de devolução |
| `400 Bad Request` | Campos inválidos (ex.: `dias` ausente ou menor que 1) |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Usuário sem a permissão `LOCAR_LIVROS` |
| `409 Conflict` | Nenhum exemplar disponível para o livro |

> A operação é **transacional**: cria a `Locacao`, muda o status do exemplar para `LOCADO` e registra a movimentação (`LOCACAO`) no histórico. A `dataPrevista` é calculada como **hoje + `dias`**. Quando **todos** os exemplares de um livro ficam locados, o acervo (`GET /livros`) passa a exibir `status: LOCADO` com a `dataPrevistaDisponibilidade`.

### `GET /locacoes` — Listar locações

Lista as locações com o status derivado de cada uma, para a tela "Minhas locações". **Requer autenticação.** O escopo depende do perfil:

- **`USUARIO`** — retorna **apenas as próprias** locações.
- **`ADMINISTRADOR`** — retorna as de **todos** os usuários (use `?meu=true` para ver apenas as suas).

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Query params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `meu` | boolean | ❌ | Só faz efeito para administradores: `true` limita à própria conta |

Cada item retorna:

| Campo | Descrição |
|-------|-----------|
| `id` | ID da locação |
| `livro`, `autor`, `exemplar` | Livro locado e o código do exemplar |
| `dataLocacao` | Data da locação |
| `prazo` | Data prevista de devolução (`dataPrevista`) |
| `dataDevolucao` | Data da devolução, ou `null` se ainda ativa |
| `status` | `ATIVA`, `ATRASADA` (prazo vencido, não devolvida) ou `DEVOLVIDA` |
| `ativa` | `true` enquanto não devolvida (usado para exibir a ação de devolução) |
| `usuario` | Dono da locação (`id`, `nome`, `email`) — relevante para o administrador |

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Lista de locações no escopo do usuário |
| `401 Unauthorized` | Token ausente ou inválido |

> 🔒 Um `USUARIO` **nunca** recebe locações de terceiros — o filtro por `usuarioId` do token é aplicado no servidor, independentemente de query params.

### `PATCH /locacoes/:id/devolver` — Registrar devolução

Registra a devolução de uma locação ativa: grava a `dataDevolucao`, devolve o exemplar ao status `DISPONIVEL` e registra a movimentação (`DEVOLUCAO`) no histórico. **Requer a permissão `DEVOLVER_LIVROS`.**

**Autenticação:** requer header `Authorization: Bearer <token>`.

**Respostas:**

| Status | Situação |
|--------|----------|
| `200 OK` | Devolução registrada — retorna a `dataDevolucao` |
| `400 Bad Request` | ID inválido |
| `401 Unauthorized` | Token ausente ou inválido |
| `403 Forbidden` | Sem a permissão `DEVOLVER_LIVROS`, ou tentativa de devolver locação de outro usuário (não-admin) |
| `404 Not Found` | Locação não encontrada |
| `409 Conflict` | Locação já devolvida |

> Um `USUARIO` só pode devolver as **próprias** locações; um `ADMINISTRADOR` pode devolver qualquer uma. A locação devolvida permanece registrada (passa a compor o histórico).
>
> Na tela "Minhas locações", o botão **Devolver** (exibido apenas nas locações ativas) pede **confirmação** antes de efetivar a devolução; ao concluir, a locação migra para o histórico com a data de devolução.

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
- 📖 Cadastro de livros e controle de exemplares, com detecção de duplicados, reforço de exemplares e remoção (soft delete) restrita a administradores
- 🗂️ Acervo em cards de tamanho uniforme, com status colorido, detalhes em modal e ações conforme a permissão do usuário
- 🔄 Locação e devolução de livros, com "Minhas locações" em cards e **prazo destacado por cor** (em dia / vencendo / atrasado) e histórico filtrável em modal
- 📊 **Dashboard pessoal** na tela Início (locações do próprio usuário) e **Painel geral** para administradores (indicadores de todos)
- 🌐 Integração com a [Open Library API](https://openlibrary.org/developers/api) — autocomplete de títulos no cadastro de livros
- 🧭 Menu e ações exibidos conforme as permissões do usuário (com bloqueio real no back-end)
- 🌓 **Modo claro/escuro** persistido, e interface responsiva com identidade visual da Sancon
- ✅ Validações padronizadas (campos obrigatórios, e-mail e **CPF por dígitos verificadores**) com mensagens amigáveis e destaque de campos inválidos
- 🛡️ Tratamento centralizado de erros — o sistema não expõe erros internos nem quebra em falhas de banco ou da API externa

## 👤 Autor

**Samuel De Marco**

## 📄 Licença

Este projeto está sob a licença [MIT](https://opensource.org/licenses/MIT).