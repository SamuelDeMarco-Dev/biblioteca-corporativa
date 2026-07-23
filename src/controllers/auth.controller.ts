import { Request, Response } from 'express';
import { loginSchema } from '../schemas/auth.schema';
import { autenticarUsuario } from '../services/auth.service';
import { solicitarResetSchema, redefinirSenhaSchema } from '../schemas/auth.schema';
import { solicitarReset, redefinirSenha } from '../services/auth.service';
import { enviarEmailReset } from '../lib/mailer';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { erroDeValidacao } from '../utils/erros';

export async function login(req: Request, res: Response) {
    const parse = loginSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
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

export async function esqueciSenha(req: Request, res: Response) {
    const parse = solicitarResetSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const resultado = await solicitarReset(parse.data.email);
        if(!resultado){
            return res.status(404).json({ erro: 'E-mail não cadastrado'});
        }

        const baseUrl = process.env.APP_URL ?? 'http://localhost:3002';
        const link = `${baseUrl}/redefinir-senha.html?token=${resultado.token}`;

        await enviarEmailReset(resultado.email, link);

        return res.status(200).json({ mensagem: 'E-mail de redefinição enviado' });
    } catch (err) {
        console.error('Erro ao enviar e-mail de redefinição:', err);
        return res.status(500).json({ erro: 'Erro ao solicitar redefinição'});
    }
}

export async function redefinir(req: Request, res: Response){
    const parse = redefinirSenhaSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const ok = await redefinirSenha(parse.data.token, parse.data.novaSenha);
        if(!ok){
            return res.status(400).json({ erro: 'Token inválido ou expirado'});
        }
        return res.status(200).json({ mensagem: 'Senha redefinida com sucesso'});
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao redefinir a senha'});
    }
}

export async function me(req: AuthRequest, res: Response){
    const usuario = await prisma.usuario.findUnique({
        where: { id: req.usuario!.id },
        select: {
            id: true, nome: true, email: true, perfil: true,
            permissoes: { select: { nome: true } },
        },
    });

    if(!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
    return res.status(200).json({
        ...usuario,
        permissoes: usuario.permissoes.map((p) => p.nome),
    });
}