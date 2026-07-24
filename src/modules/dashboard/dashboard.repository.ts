import { PrismaClient } from '../../generated/prisma/client';
import { StatusLivro } from '../../shared/livro-status';

export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  contarLivros(status?: StatusLivro) {
    return this.prisma.livro.count({ where: status ? { ativo: true, status } : { ativo: true } });
  }

  rankingLocacoes(limite: number) {
    return this.prisma.locacao.groupBy({
      by: ['usuarioId'],
      _count: { _all: true },
      orderBy: { _count: { usuarioId: 'desc' } },
      take: limite,
    });
  }

  ultimasLocacoes(limite: number) {
    return this.prisma.locacao.findMany({
      orderBy: { dataLocacao: 'desc' },
      take: limite,
      include: {
        usuario: { select: { nome: true } },
        exemplar: { include: { livro: { select: { titulo: true } } } },
      },
    });
  }

  findNomesPorIds(ids: number[]) {
    return this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
  }
}
