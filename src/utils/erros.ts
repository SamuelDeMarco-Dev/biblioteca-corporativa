import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';

// Formato ÚNICO de resposta de erro do sistema:
//   { erro: "mensagem amigável", campos?: { <campo>: "mensagem" } }
// `campos` alimenta o destaque de campos no frontend.

// Converte um ZodError em resposta amigável, sem vazar a estrutura interna do Zod.
export function erroDeValidacao(zodError: ZodError) {
    const campos: Record<string, string> = {};
    for (const issue of zodError.issues) {
        const chave = issue.path.join('.') || '_';
        if (!campos[chave]) campos[chave] = issue.message; // primeira mensagem por campo
    }
    return { erro: 'Verifique os campos destacados e tente novamente.', campos };
}

// Traduz erros conhecidos do Prisma para respostas HTTP amigáveis.
// Retorna true se tratou (já respondeu); false para deixar cair no 500 genérico.
export function tratarErroPrisma(err: unknown, res: Response, contexto = 'registro'): boolean {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const alvo = err.meta?.target as string[] | string | undefined;
            const campo = Array.isArray(alvo) ? alvo.join(', ') : (alvo ?? 'valor');
            res.status(409).json({ erro: `Já existe um ${contexto} com este ${campo}.` });
            return true;
        }
        if (err.code === 'P2025') {
            res.status(404).json({ erro: `${capitalizar(contexto)} não encontrado.` });
            return true;
        }
    }
    return false;
}

function capitalizar(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Envolve um handler async para que qualquer exceção não capturada vá ao
// middleware global de erro (evita unhandled rejection / request travada).
export function asyncHandler(fn: RequestHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
