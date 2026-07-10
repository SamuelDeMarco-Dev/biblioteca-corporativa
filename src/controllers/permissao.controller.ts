import { Request, Response } from "express";
import { listarPermissoes } from "../services/permissao.service";

export async function listar(req: Request, res: Response) {
    try {
        return res.status(200).json(await listarPermissoes());
    } catch {
        return res.status(500).json({ erro: 'Erro ao listar permissões' });
    }
}