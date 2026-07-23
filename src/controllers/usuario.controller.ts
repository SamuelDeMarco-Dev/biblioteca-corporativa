import { Request, Response } from 'express';
import { criarUsuarioSchema } from '../schemas/usuario.schema';
import { criarUsuario } from '../services/usuario.service';
import { atualizarPermissoesSchema } from '../schemas/usuario.schema';
import { atualizarPermissoes } from '../services/usuario.service';
import { listarUsuarios } from '../services/usuario.service';
import { editarUsuarioSchema } from '../schemas/usuario.schema';
import { editarUsuario } from '../services/usuario.service';
import { erroDeValidacao, tratarErroPrisma } from '../utils/erros';

export async function cadastrar(req: Request, res: Response) {
    const parse = criarUsuarioSchema.safeParse(req.body);
    if(!parse.success) {
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const usuario = await criarUsuario(parse.data);
        const { senhaHash, ...semSenha } = usuario;
        return res.status(201).json(semSenha);
    } catch(err) {
        if (tratarErroPrisma(err, res, 'usuário')) return;
        return res.status(500).json({ erro: 'Erro ao cadastrar usuário. Tente novamente.'});
    }
}

export async function gerenciarPermissoes(req: Request, res: Response) {
    const id = Number(req.params.id);
    if(Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const parse = atualizarPermissoesSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const usuario = await atualizarPermissoes(
            id, parse.data.habilitar, parse.data.desabilitar,
        );
        const { senhaHash, ...semSenha } = usuario;
        return res.status(200).json(semSenha);
    } catch(err) {
        if (tratarErroPrisma(err, res, 'usuário ou permissão')) return;
        return res.status(500).json({ erro: 'Erro ao atualizar permissões. Tente novamente.' });
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
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const usuario = await editarUsuario(id, parse.data);
        return res.status(200).json(usuario);
    } catch (err) {
        if (tratarErroPrisma(err, res, 'usuário')) return;
        return res.status(500).json({erro: 'Erro ao editar usuário. Tente novamente.'});
    }
}
