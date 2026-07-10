import { Request, Response } from 'express';
import { loginSchema } from '../schemas/auth.schema';
import { autenticarUsuario } from '../services/auth.service';

export async function login(req: Request, res: Response) {
    const parse = loginSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues });
    }

    try{
        const resultado = await autenticarUsuario(parse.data);
        if(!resultado) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos'});
        }
        return res.status(200).json(resultado);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao autenticar'});
    }
}

