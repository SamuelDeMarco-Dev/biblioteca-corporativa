/*
  Warnings:

  - You are about to drop the column `permissao_id` on the `usuarios` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'USUARIO');

-- CreateEnum
CREATE TYPE "Setor" AS ENUM ('SUPORTE', 'SERVICOS', 'SANCONHUB', 'ADMINISTRATIVO', 'COMERCIAL', 'MARKETING', 'TI', 'RH', 'DIRETORIA');

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_permissao_id_fkey";

-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "permissao_id",
ADD COLUMN     "perfil" "Perfil" NOT NULL DEFAULT 'USUARIO',
ADD COLUMN     "setor" "Setor" NOT NULL DEFAULT 'ADMINISTRATIVO';

-- CreateTable
CREATE TABLE "_PermissaoToUsuario" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PermissaoToUsuario_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PermissaoToUsuario_B_index" ON "_PermissaoToUsuario"("B");

-- AddForeignKey
ALTER TABLE "_PermissaoToUsuario" ADD CONSTRAINT "_PermissaoToUsuario_A_fkey" FOREIGN KEY ("A") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissaoToUsuario" ADD CONSTRAINT "_PermissaoToUsuario_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
