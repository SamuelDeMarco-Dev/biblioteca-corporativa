import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { criarLivroSchema } from '../schemas/livro.schema';
import { criarLivro } from '../services/livro.service';

export async function cadastrar(req: Request, res: Response) {
    const parse = criarLivroSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues });
    }

    try {
        const livro = await criarLivro(parse.data);
        return res.status(201).json(livro);
    } catch (err) {
        if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'){
            return res.status(409).json({erro: 'Já existe um livro com este ISBN'});
        }
        return res.status(500).json({erro: 'Erro ao cadastrar livro'});
    }
}