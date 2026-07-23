import { prisma } from '../lib/prisma';

export async function obterDashboard() {
    const [cadastrados, disponiveis, locados, grupos, ultimas] = await Promise.all([
        // Total de livros cadastrados (ativos, ou seja, não removidos)
        prisma.livro.count({ where: { ativo: true } }),

        // Total disponíveis e locados — usa o status derivado que mantemos no banco
        prisma.livro.count({ where: { ativo: true, status: 'DISPONIVEL' } }),
        prisma.livro.count({ where: { ativo: true, status: 'LOCADO' } }),

        // Ranking: quem mais locou (conta locações por usuário)
        prisma.locacao.groupBy({
            by: ['usuarioId'],
            _count: { _all: true },
            orderBy: { _count: { usuarioId: 'desc' } },
            take: 5,
        }),

        // Últimas locações realizadas
        prisma.locacao.findMany({
            orderBy: { dataLocacao: 'desc' },
            take: 5,
            include: {
                usuario: { select: { nome: true } },
                exemplar: { include: { livro: { select: { titulo: true } } } },
            },
        }),
    ]);

    // Resolve os nomes do ranking (groupBy só devolve o usuarioId)
    const ids = grupos.map((g) => g.usuarioId);
    const usuarios = await prisma.usuario.findMany({
        where: { id: { in: ids } },
        select: { id: true, nome: true },
    });
    const ranking = grupos.map((g) => ({
        usuarioId: g.usuarioId,
        nome: usuarios.find((u) => u.id === g.usuarioId)?.nome ?? '—',
        total: g._count._all,
    }));

    return {
        totais: { cadastrados, disponiveis, locados },
        usuarioTop: ranking[0] ?? null,          // critério: usuário que mais locou
        ranking,
        ultimasLocacoes: ultimas.map((l) => ({
            livro: l.exemplar.livro.titulo,
            usuario: l.usuario.nome,
            dataLocacao: l.dataLocacao,
            prazo: l.dataPrevista,
            devolvido: !!l.dataDevolucao,
        })),
    };
}
