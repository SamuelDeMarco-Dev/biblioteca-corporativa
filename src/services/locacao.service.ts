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

type FiltroLocacoes = { usuarioId: number; todos: boolean };

export async function listarLocacoes({ usuarioId, todos }: FiltroLocacoes) {
    const locacoes = await prisma.locacao.findMany({
        where: todos ? {} : { usuarioId },
        orderBy: { dataLocacao: 'desc' },
        include: {
            exemplar: { include: { livro: true } },
            usuario: { select: { id: true, nome: true, email: true} },
        },
    });

    const agora = Date.now();
    return locacoes.map((l) => {
        let status: 'ATIVA' | 'ATRASADA' | 'DEVOLVIDA';
        if(l.dataDevolucao) status = 'DEVOLVIDA';
        else if (l.dataPrevista.getTime() < agora) status = 'ATRASADA';
        else status = 'ATIVA';

        return {
            id: l.id,
            livro: l.exemplar.livro.titulo,
            autor: l.exemplar.livro.autor,
            exemplar: l.exemplar.codigo,
            dataLocacao: l.dataLocacao,
            prazo: l.dataPrevista,
            dataDevolucao: l.dataDevolucao,
            status,
            ativa: !l.dataDevolucao,
            usuario: l.usuario,
        };
    });
}

export async function devolverLocacao(locacaoId: number, usuarioId: number, ehAdmin: boolean) {
    return prisma.$transaction(async (tx) => {
        const locacao = await tx.locacao.findUnique({ where: {id: locacaoId } });
        if(!locacao) return { erro: 'NAO_ENCONTRADA' as const };
        if(locacao.dataDevolucao) return { erro: 'JA_DEVOLVIDA' as const };

        if(!ehAdmin && locacao.usuarioId !== usuarioId) return { erro: 'SEM_PERMISSAO' as const };
        
        const atualizada = await tx.locacao.update({
            where: { id: locacaoId },
            data: { dataDevolucao: new Date() },
        });
        await tx.exemplar.update({ where: { id: locacao.exemplarId }, data: { status: 'DISPONIVEL' } });
        await tx.historicoMovimentacao.create({
            data: { tipo: 'DEVOLUCAO', locacaoId, usuarioId: locacao.usuarioId },
        });
        return { locacao: atualizada };    
    });
}