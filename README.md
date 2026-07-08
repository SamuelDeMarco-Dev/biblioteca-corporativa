# 📚 Biblioteca Interna

Sistema web para gerenciamento de biblioteca interna com cadastro, locação e devolução de livros, permissões de usuários, dashboard administrativo e integração com a Open Library API.

## 🛠️ Tecnologias

- **Node.js** com **Express** — servidor web (arquitetura MVC)
- **PostgreSQL** — banco de dados (driver `pg`)
- **JWT** (`jsonwebtoken`) — autenticação
- **bcryptjs** — criptografia de senhas
- **Docker / Docker Compose** — containerização
- **Jest** — testes automatizados
- **Nodemon** — hot reload em desenvolvimento

## 📁 Estrutura do Projeto

```
template-node-mvc/
├── src/
│   ├── app.js          # Configuração do Express (middlewares e rotas)
│   └── server.js       # Ponto de entrada da aplicação
├── public/
│   └── index.html      # Arquivos estáticos (front-end)
├── database/
│   └── init.sql        # Script de inicialização do banco de dados
├── .env.example        # Modelo de variáveis de ambiente
├── Dockerfile          # Imagem Docker da aplicação
├── docker-compose.yml  # Orquestração (app + PostgreSQL)
└── package.json
```

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [PostgreSQL](https://www.postgresql.org/) (ou Docker)
- [Docker e Docker Compose](https://www.docker.com/) (opcional, para execução em containers)

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

### 3. Instalar dependências

```bash
npm install
```

### 4. Iniciar a aplicação

**Modo desenvolvimento** (com hot reload):

```bash
npm run dev
```

**Modo produção:**

```bash
npm start
```

**Com Docker Compose** (aplicação + banco de dados):

```bash
docker-compose up -d
```

## 📜 Scripts disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `start` | `node src/server.js` | Inicia a aplicação em modo produção |
| `dev` | `nodemon src/server.js` | Inicia com hot reload para desenvolvimento |
| `test` | `jest` | Executa os testes automatizados |

## ✨ Funcionalidades

- 📖 Cadastro de livros
- 🔄 Locação e devolução de livros
- 👥 Gerenciamento de usuários e permissões
- 📊 Dashboard administrativo
- 🌐 Integração com a [Open Library API](https://openlibrary.org/developers/api)

## 👤 Autor

**Samuel De Marco**

## 📄 Licença

Este projeto está sob a licença [MIT](https://opensource.org/licenses/MIT).
