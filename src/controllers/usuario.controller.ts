import { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { criarUsuarioSchema } from '../schemas/usuario.schema';
import { criarUsuario } from '../services/usuario.service';
import { atualizarPermissoesSchema } from '../schemas/usuario.schema';
import { atualizarPermissoes } from '../services/usuario.service';
import { listarUsuarios } from '../services/usuario.service';
import { editarUsuarioSchema } from '../schemas/usuario.schema';
import { editarUsuario } from '../services/usuario.service';

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

export async function gerenciarPermissoes(req: Request, res: Response) {
    const id = Number(req.params.id);
    if(Number.isNaN(id)) return res.status(400).json({ erro: 'ID Inválido' });

    const parse = atualizarPermissoesSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados Inválidos', detalhes: parse.error.issues });
    }

    try {
        const usuario = await atualizarPermissoes(
            id, parse.data.habilitar, parse.data.desabilitar,
        );
        const { senhaHash, ...semSenha } = usuario;
        return res.status(200).json(semSenha);
    } catch(err) {
        if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'){
            return res.status(404).json({ erro: 'Usuário ou permissão não encontrado'});
        }
        return res.status(500).json({ erro: 'Erro ao atualizar permissões' });
    }
}

export async function listar(req: Request, res: Response) {
    try {
        const usuarios = await listarUsuarios();
        return res.status(200).json(usuarios);
    } catch {
        return res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
}

export async function editar(req: Request, res: Response) {
    const id = Number(req.params.id);
    if(Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const parse = editarUsuarioSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues });
    }

    try {
        const usuario = await editarUsuario(id, parse.data);
        return res.status(200).json(usuario);    
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {   // e-mail/cpf duplicado
                const campo = (err.meta?.target as string[])?.join(', ');
                return res.status(409).json({ erro: `Já existe um usuário com este ${campo}` });
            }
            if(err.code === 'P2025') return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        return res.status(500).json({erro: 'Erro ao editar usuario'});
    }
}
