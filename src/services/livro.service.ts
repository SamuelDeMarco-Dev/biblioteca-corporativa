import { prisma } from '../lib/prisma';
import { CriarLivroInput } from '../schemas/livro.schema';

export async function criarLivro(dados: CriarLivroInput) {
    const { quantidadeExemplares, ...dadosLivro } = dados;

    return prisma.$transaction(async (tx) => {
        const livro = await tx.livro.create({data: dadosLivro});
    
        await tx.exemplar.createMany({
            data: Array.from({ length: quantidadeExemplares }, (_, i) => ({
                codigo: `${livro.id}-${String(i+1).padStart(3, '0')}`,
                livroId: livro.id,
            })),
        });

        return tx.livro.findUnique({
            where: {id: livro.id},
            include: {exemplares: true},
        });
    });
}