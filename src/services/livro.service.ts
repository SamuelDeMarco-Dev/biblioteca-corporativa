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

export async function listarLivros() {
    const livros = await prisma.livro.findMany({
        orderBy: { titulo: 'asc' },
        include: {
            exemplares: {
                include: {
                    locacoes: {
                        where: { dataDevolucao: null },
                        orderBy: { dataPrevista: 'asc' },
                        take: 1,
                    },
                },
            },
        },
    });

    return livros.map((l) => {
        const total = l.exemplares.length;
        const disponiveis = l.exemplares.filter((e) => e.status === 'DISPONIVEL').length;
        const status = disponiveis > 0 ? 'DISPONIVEL' : 'LOCADO';

        let dataPrevistaDisponibilidade: Date | null = null;
        if(status === 'LOCADO'){
            const datas = l.exemplares
                .flatMap((e) => e.locacoes.map((loc) => loc.dataPrevista))
                .sort((a, b) => a.getTime() - b.getTime());
            dataPrevistaDisponibilidade = datas[0] ?? null;
        }

        return {
            id: l.id, titulo: l.titulo, autor: l.autor, editora: l.editora,
            anoPublicacao: l.anoPublicacao, edicao: l.edicao, isbn: l.isbn,
            totalExemplares: total, exemplaresDisponiveis: disponiveis,
            status, dataPrevistaDisponibilidade,
        };
    });
}

export async function buscarLivrosExternos(titulo: string){
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(titulo)}&limit=10`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`Open Library respondeu ${resp.status}`);

        const data = await resp.json();
        return (data.docs ?? []).slice(0, 10).map((d: any) => ({
            titulo: d.title ?? '',
            autor: Array.isArray(d.author_name) ? d.author_name.join(', ') : '',
            editora: Array.isArray(d.publisher) ? d.publisher[0] : '',
            anoPublicacao: d.first_publish_year ?? null,
            isbn: Array.isArray(d.isbn) ? d.isbn[0] : '',
        }));
    } finally {
        clearTimeout(timeout);
    }
}