import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import { DomainError, ValidationError } from '../errors';

// Formato de resposta: Problem Details (RFC 9457) + `erro`/`campos` legados —
// o frontend estático (public/js/api.js) lê `data.erro`, então mantemos os dois
// contratos convivendo em vez de migrar front e back juntos.
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  erro: string;
  campos?: Record<string, string>;
}

function problem(
  status: number,
  title: string,
  detail: string,
  campos?: Record<string, string>,
  details?: Record<string, unknown>,
): ProblemDetails {
  return {
    type: 'about:blank',
    title,
    status,
    detail,
    erro: detail,
    ...(campos ? { campos } : {}),
    ...(details ?? {}),
  };
}

function zodCampos(error: ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const chave = issue.path.map(String).join('.') || '_';
    if (!campos[chave]) campos[chave] = issue.message;
  }
  return campos;
}

// Traduz erros conhecidos do Prisma; retorna null se não for um erro tratável aqui.
function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): ProblemDetails | null {
  if (err.code === 'P2002') {
    const alvo = err.meta?.target as string[] | string | undefined;
    const campo = Array.isArray(alvo) ? alvo.join(', ') : (alvo ?? 'valor');
    return problem(409, 'Conflict', `Já existe um registro com este ${campo}.`);
  }
  if (err.code === 'P2025') {
    return problem(404, 'Not Found', 'Registro não encontrado.');
  }
  return null;
}

// Middleware global de erro: única porta de saída para toda exceção não
// tratada dentro de um asyncHandler. Nunca expõe stack trace, SQL ou
// estruturas internas ao cliente — loga o detalhe internamente e formata a
// resposta pública a partir do tipo do erro.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ValidationError) {
    res.status(err.status).json(problem(err.status, 'Validation Error', err.message, err.campos));
    return;
  }

  if (err instanceof DomainError) {
    res
      .status(err.status)
      .json(problem(err.status, err.code, err.message, undefined, err.toDetails()));
    return;
  }

  if (err instanceof ZodError) {
    const campos = zodCampos(err);
    res
      .status(400)
      .json(
        problem(
          400,
          'Validation Error',
          'Verifique os campos destacados e tente novamente.',
          campos,
        ),
      );
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaError(err);
    if (mapped) {
      res.status(mapped.status).json(mapped);
      return;
    }
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res
      .status(400)
      .json(
        problem(
          400,
          'Bad Request',
          'Não foi possível ler os dados enviados. Verifique e tente novamente.',
        ),
      );
    return;
  }

  console.error('[ERRO NÃO TRATADO]', err);
  res
    .status(500)
    .json(
      problem(
        500,
        'Internal Server Error',
        'Ocorreu um erro inesperado. Tente novamente em instantes.',
      ),
    );
};
