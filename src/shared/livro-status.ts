import { Prisma } from '../generated/prisma/client';

// Compartilhado entre os módulos livro e locacao: ambos alteram o status de um
// exemplar e precisam recalcular o status agregado do livro na mesma operação.
export type StatusLivro = 'DISPONIVEL' | 'LOCADO' | 'INDISPONIVEL' | 'REMOVIDO';

export function calcularStatusLivro(ativo: boolean, exemplares: { status: string }[]): StatusLivro {
  if (!ativo) return 'REMOVIDO';
  if (exemplares.length === 0) return 'INDISPONIVEL';
  if (exemplares.some((e) => e.status === 'DISPONIVEL')) return 'DISPONIVEL';
  if (exemplares.every((e) => e.status === 'LOCADO')) return 'LOCADO';
  return 'INDISPONIVEL';
}

export async function recalcularStatusLivro(client: Prisma.TransactionClient, livroId: number) {
  const livro = await client.livro.findUnique({
    where: { id: livroId },
    include: { exemplares: true },
  });
  if (!livro) return;
  const status = calcularStatusLivro(livro.ativo, livro.exemplares);
  await client.livro.update({ where: { id: livroId }, data: { status } });
  return status;
}
