import { prisma } from '../lib/prisma';

export async function listarPermissoes() {
    return prisma.permissao.findMany({ orderBy: { id: 'asc' } });
}