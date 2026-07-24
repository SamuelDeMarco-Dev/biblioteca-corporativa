import { PrismaClient } from '../../generated/prisma/client';
import { recalcularStatusLivro } from '../../shared/livro-status';

type FiltroLocacoes = { usuarioId: number; todos: boolean };

export class LocacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  criarComExemplarDisponivel(usuarioId: number, livroId: number, dias: number) {
    return this.prisma.$transaction(async (tx) => {
      const exemplar = await tx.exemplar.findFirst({
        where: { livroId, status: 'DISPONIVEL' },
        orderBy: { id: 'asc' },
      });
      if (!exemplar) return null;

      const dataPrevista = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

      const locacao = await tx.locacao.create({
        data: { usuarioId, exemplarId: exemplar.id, dataPrevista },
      });

      await tx.exemplar.update({ where: { id: exemplar.id }, data: { status: 'LOCADO' } });
      await recalcularStatusLivro(tx, exemplar.livroId);
      await tx.historicoMovimentacao.create({
        data: { tipo: 'LOCACAO', locacaoId: locacao.id, usuarioId },
      });

      return { locacao, exemplar, dataPrevista };
    });
  }

  findAll({ usuarioId, todos }: FiltroLocacoes) {
    return this.prisma.locacao.findMany({
      where: todos ? {} : { usuarioId },
      orderBy: { dataLocacao: 'desc' },
      include: {
        exemplar: { include: { livro: true } },
        usuario: { select: { id: true, nome: true, email: true } },
      },
    });
  }

  findById(id: number) {
    return this.prisma.locacao.findUnique({ where: { id } });
  }

  // Assume que o chamador (service) já validou existência/estado/permissão —
  // esta transação só executa a devolução em si (update + recálculo + histórico).
  devolver(locacaoId: number) {
    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.locacao.update({
        where: { id: locacaoId },
        data: { dataDevolucao: new Date() },
      });
      const exemplarAtualizado = await tx.exemplar.update({
        where: { id: atualizada.exemplarId },
        data: { status: 'DISPONIVEL' },
      });
      await recalcularStatusLivro(tx, exemplarAtualizado.livroId);
      await tx.historicoMovimentacao.create({
        data: { tipo: 'DEVOLUCAO', locacaoId, usuarioId: atualizada.usuarioId },
      });
      return atualizada;
    });
  }
}
