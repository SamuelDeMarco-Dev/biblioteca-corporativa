-- CreateEnum
CREATE TYPE "StatusLivro" AS ENUM ('DISPONIVEL', 'LOCADO', 'INDISPONIVEL', 'REMOVIDO');

-- AlterTable
ALTER TABLE "livros" ADD COLUMN     "status" "StatusLivro" NOT NULL DEFAULT 'DISPONIVEL';
