import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { criarUsuarioSchema } from '../schemas/usuario.schema';
import { criarUsuario } from '../services/usuario.service';

export async function cadastrar(req: Request, res: Response) {
    const parse = criarUsuarioSchema.safeParse(req.body);
    if(!parse.success) {
        return res.status(400).json({erro: 'Dados Inválidos', detalhes: parse.error.issues});
    }

    try {
        const usuario = await criarUsuario(parse.data);
        const { senhaHash, ...semSenha } = usuario;
        return res.status(201).json(semSenha);
    } catch(err) {
        if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            const campo = (err.meta?.target as string[])?.join(', ');
            return res.status(409).json({ erro: `Já existe um usuário com este ${campo}`});
        }
        return res.status(500).json({ erro: 'Erro ao cadastrar usuário'});
    }
}