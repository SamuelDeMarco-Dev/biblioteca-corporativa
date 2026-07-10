import { prisma } from '../lib/prisma';
import { CriarLivroInput } from '../schemas/livro.schema';

// Conta quantos exemplares de um livro estão disponíveis para locação.
function contarDisponiveis(exemplares: { status: string }[]) {
    return exemplares.filter((e) => e.status === 'DISPONIVEL').length;
}

// Detecta um livro já cadastrado com mesmo título, autor(es), editora, ano e edição.
// Comparação case-insensitive nos campos de texto (PostgreSQL).
export async function buscarLivroDuplicado(dados: CriarLivroInput) {
    const livro = await prisma.livro.findFirst({
        where: {
            titulo:  { equals: dados.titulo,  mode: 'insensitive' },
            autor:   { equals: dados.autor,   mode: 'insensitive' },
            editora: { equals: dados.editora, mode: 'insensitive' },
            edicao:  { equals: dados.edicao,  mode: 'insensitive' },
            anoPublicacao: dados.anoPublicacao,
        },
        include: { exemplares: true },
    });

    if (!livro) return null;
    return {
        livro,
        totalExemplares: livro.exemplares.length,
        exemplaresDisponiveis: contarDisponiveis(livro.exemplares),
    };
}

export async function criarLivro(dados: CriarLivroInput) {
    const { quantidadeExemplares, ...dadosLivro } = dados;

    return prisma.$transaction(async (tx) => {
        const livro = await tx.livro.create({ data: dadosLivro });

        await tx.exemplar.createMany({
            data: Array.from({ length: quantidadeExemplares }, (_, i) => ({
                codigo: `${livro.id}-${String(i + 1).padStart(3, '0')}`,
                livroId: livro.id,
            })),
        });

        return tx.livro.findUnique({
            where: { id: livro.id },
            include: { exemplares: true },
        });
    });
}

// Adiciona novos exemplares a um livro já existente e retorna a contagem atualizada.
export async function adicionarExemplares(livroId: number, quantidade: number) {
    const livro = await prisma.livro.findUnique({
        where: { id: livroId },
        include: { exemplares: true },
    });
    if (!livro) return null;

    const existentes = livro.exemplares.length;

    await prisma.exemplar.createMany({
        data: Array.from({ length: quantidade }, (_, i) => ({
            codigo: `${livroId}-${String(existentes + i + 1).padStart(3, '0')}`,
            livroId,
        })),
    });

    const atualizado = await prisma.livro.findUnique({
        where: { id: livroId },
        include: { exemplares: true },
    });

    return {
        livro: atualizado,
        totalExemplares: atualizado!.exemplares.length,
        exemplaresDisponiveis: contarDisponiveis(atualizado!.exemplares),
    };
}
