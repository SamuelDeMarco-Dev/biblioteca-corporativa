import { PrismaClient, Prisma } from '../../generated/prisma/client';
import { recalcularStatusLivro } from '../../shared/livro-status';
import { CriarLivroInput } from './livro.schema';

export class LivroRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAtivoDuplicado(
    dados: Pick<CriarLivroInput, 'titulo' | 'autor' | 'editora' | 'edicao' | 'anoPublicacao'>,
  ) {
    return this.prisma.livro.findFirst({
      where: {
        titulo: { equals: dados.titulo, mode: 'insensitive' },
        autor: { equals: dados.autor, mode: 'insensitive' },
        editora: { equals: dados.editora, mode: 'insensitive' },
        edicao: { equals: dados.edicao, mode: 'insensitive' },
        anoPublicacao: dados.anoPublicacao,
        ativo: true,
      },
      include: { exemplares: true },
    });
  }

  criarComExemplares(dadosLivro: Prisma.LivroCreateInput, quantidadeExemplares: number) {
    return this.prisma.$transaction(async (tx) => {
      const livro = await tx.livro.create({ data: dadosLivro });

      await tx.exemplar.createMany({
        data: Array.from({ length: quantidadeExemplares }, (_, i) => ({
          codigo: `${livro.id}-${String(i + 1).padStart(3, '0')}`,
          livroId: livro.id,
        })),
      });

      return tx.livro.findUnique({ where: { id: livro.id }, include: { exemplares: true } });
    });
  }

  findByIdComExemplares(id: number) {
    return this.prisma.livro.findUnique({ where: { id }, include: { exemplares: true } });
  }

  async adicionarExemplares(livroId: number, quantidade: number, existentes: number) {
    await this.prisma.exemplar.createMany({
      data: Array.from({ length: quantidade }, (_, i) => ({
        codigo: `${livroId}-${String(existentes + i + 1).padStart(3, '0')}`,
        livroId,
      })),
    });
    await recalcularStatusLivro(this.prisma, livroId);
    return this.findByIdComExemplares(livroId);
  }

  findAtivosComDisponibilidade() {
    return this.prisma.livro.findMany({
      where: { ativo: true },
      orderBy: { titulo: 'asc' },
      include: {
        exemplares: {
          include: {
            locacoes: { where: { dataDevolucao: null }, orderBy: { dataPrevista: 'asc' }, take: 1 },
          },
        },
      },
    });
  }

  async desativar(id: number) {
    const atualizado = await this.prisma.livro.update({ where: { id }, data: { ativo: false } });
    await recalcularStatusLivro(this.prisma, id);
    return atualizado;
  }
}
