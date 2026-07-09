import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    usuario?: { id: number, perfil: string };
}

export function autenticar(req: AuthRequest, res: Response, next: NextFunction){
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer')){
        return res.status(401).json({ erro: 'Token não fornecido'});
    }
    try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!);
        req.usuario = payload as { id: number; perfil: string};
        next();
    } catch(error) {
        return res.status(400).json({ erro: 'Token inválido' });
    }
}

export function exigirAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if(req.usuario?.perfil !== 'ADMINISTRADOR') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores'});
    }
    next();
}