import { prisma } from "../lib/prisma";

export async function criarLocacao(usuarioId: number, livroId: number, dias: number){
    return prisma.$transaction(async (tx) => {
        const exemplar = await tx.exemplar.findFirst({
            where: { livroId, status: 'DISPONIVEL' },
            orderBy: { id: 'asc' },
        });
        if(!exemplar) return null;

        const dataPrevista = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

        const locacao = await tx.locacao.create({
            data: { usuarioId, exemplarId: exemplar.id, dataPrevista },
        });

        await tx.exemplar.update({
            where: { id: exemplar.id },
            data: { status: 'LOCADO' },
        });

        await tx.historicoMovimentacao.create({
            data: { tipo: 'LOCACAO', locacaoId: locacao.id, usuarioId },
        });

        return { locacao, exemplar, dataPrevista };
    });
}