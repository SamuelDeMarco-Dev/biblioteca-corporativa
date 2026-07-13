import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { criarLivroSchema, adicionarExemplaresSchema } from '../schemas/livro.schema';
import { criarLivro, buscarLivroDuplicado, adicionarExemplares, listarLivros } from '../services/livro.service';

export async function cadastrar(req: Request, res: Response) {
    const parse = criarLivroSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues });
    }

    try {
        // Critério: detectar livro já cadastrado (mesmo título, autor, editora, ano e edição).
        const duplicado = await buscarLivroDuplicado(parse.data);
        if (duplicado) {
            return res.status(409).json({
                erro: 'Livro já cadastrado no acervo',
                duplicado: true,
                livro: duplicado.livro,
                totalExemplares: duplicado.totalExemplares,
                exemplaresDisponiveis: duplicado.exemplaresDisponiveis,
            });
        }

        const livro = await criarLivro(parse.data);
        return res.status(201).json(livro);
    } catch (err) {
        if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'){
            return res.status(409).json({erro: 'Já existe um livro com este ISBN'});
        }
        return res.status(500).json({erro: 'Erro ao cadastrar livro'});
    }
}

export async function adicionarExemplaresController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const parse = adicionarExemplaresSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues });
    }

    try {
        const resultado = await adicionarExemplares(id, parse.data.quantidade);
        if (!resultado) return res.status(404).json({ erro: 'Livro não encontrado' });
        return res.status(201).json(resultado);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao adicionar exemplares' });
    }
}

export async function listar(req: Request, res: Response){
    try {
        return res.status(200).json(await listarLivros());
    } catch {
        return res.status(500).json({ erro: 'Erro ao listar livros' });
    }
}