import { RequestHandler } from 'express';
import { ZodType, ZodError } from 'zod';
import { ValidationError } from '../errors';

type Source = 'body' | 'params' | 'query';

function camposDoErro(error: ZodError) {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const chave = issue.path.map(String).join('.') || '_';
    if (!campos[chave]) campos[chave] = issue.message; // primeira mensagem por campo
  }
  return campos;
}

// Valida req[source] contra o schema Zod. Em erro, lança ValidationError (o
// errorHandler central formata a resposta); em sucesso, substitui req[source]
// pelo dado já parseado (com defaults/coerções aplicados).
export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new ValidationError(undefined, camposDoErro(result.error)));
      return;
    }

    if (source === 'query') {
      // Request.query não tem setter nos types do Express 5 — atualiza em vez de substituir.
      Object.assign(req.query, result.data as Record<string, unknown>);
    } else {
      req[source] = result.data;
    }
    next();
  };
}
