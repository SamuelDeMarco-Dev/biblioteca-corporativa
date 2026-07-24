import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: { id: number; perfil: string };
}

export function autenticar(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!);
    req.usuario = payload as { id: number; perfil: string };
    next();
  } catch (_error) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

export function exigirAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.usuario?.perfil !== 'ADMINISTRADOR') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

// Fábrica de `exigirPermissao`: fica aqui (sem acesso a Prisma) para não inverter
// a dependência shared → modules. Quem checa a permissão de fato é o usuario
// module — o container injeta essa função ao montar a instância real.
export function criarExigirPermissao(
  checarPermissao: (usuarioId: number, permissao: string) => Promise<boolean>,
) {
  return function exigirPermissao(permissao: string): RequestHandler {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.usuario) {
        return res.status(401).json({ erro: 'Não autenticado' });
      }
      if (req.usuario.perfil === 'ADMINISTRADOR') {
        return next();
      }
      const temPermissao = await checarPermissao(req.usuario.id, permissao);
      if (!temPermissao) {
        return res.status(403).json({ erro: 'Você não tem permissão para esta ação' });
      }
      next();
    };
  };
}
