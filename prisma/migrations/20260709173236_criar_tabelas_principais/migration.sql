-- CreateEnum
CREATE TYPE "StatusExemplar" AS ENUM ('DISPONIVEL', 'LOCADO', 'MANUTENCAO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('LOCACAO', 'DEVOLUCAO', 'RENOVACAO');

-- CreateTable
CREATE TABLE "permissoes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "permissao_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livros" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "isbn" TEXT,
    "editora" TEXT,
    "ano_edicao" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exemplares" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "StatusExemplar" NOT NULL DEFAULT 'DISPONIVEL',
    "livro_id" INTEGER NOT NULL,

    CONSTRAINT "exemplares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "exemplar_id" INTEGER NOT NULL,
    "data_locacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_prevista" TIMESTAMP(3) NOT NULL,
    "data_devolucao" TIMESTAMP(3),

    CONSTRAINT "locacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_movimentacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "locacao_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,

    CONSTRAINT "historico_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_nome_key" ON "permissoes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "livros_isbn_key" ON "livros"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "exemplares_codigo_key" ON "exemplares"("codigo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exemplares" ADD CONSTRAINT "exemplares_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacoes" ADD CONSTRAINT "locacoes_exemplar_id_fkey" FOREIGN KEY ("exemplar_id") REFERENCES "exemplares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_movimentacoes" ADD CONSTRAINT "historico_movimentacoes_locacao_id_fkey" FOREIGN KEY ("locacao_id") REFERENCES "locacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_movimentacoes" ADD CONSTRAINT "historico_movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
