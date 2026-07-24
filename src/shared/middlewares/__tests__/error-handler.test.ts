import { describe, it, expect, vi, afterEach } from 'vitest';
import { ZodError, z } from 'zod';
import { Request, Response } from 'express';
import { errorHandler } from '../error-handler';
import { Prisma } from '../../../generated/prisma/client';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../errors';

function mockRes() {
  const res: Partial<Response> & { headersSent: boolean } = { headersSent: false };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

const next = vi.fn();

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mapeia NotFoundError para 404', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('Livro não encontrado.'), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, erro: 'Livro não encontrado.' }),
    );
  });

  it('mapeia ForbiddenError para 403', () => {
    const res = mockRes();
    errorHandler(new ForbiddenError(), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('mapeia ConflictError para 409', () => {
    const res = mockRes();
    errorHandler(new ConflictError('Já existe.'), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('mapeia ValidationError para 400 incluindo campos', () => {
    const res = mockRes();
    errorHandler(
      new ValidationError(undefined, { email: 'E-mail inválido' }),
      {} as Request,
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ campos: { email: 'E-mail inválido' } }),
    );
  });

  it('mapeia ZodError para 400 com campos derivados', () => {
    const res = mockRes();
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'invalido' });
    errorHandler(result.error as ZodError, {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ campos: { email: expect.any(String) } }),
    );
  });

  it('mapeia Prisma P2002 (unicidade) para 409 citando o campo', () => {
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: { target: ['email'] },
    });
    errorHandler(err, {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ erro: expect.stringContaining('email') }),
    );
  });

  it('mapeia Prisma P2025 (não encontrado) para 404', () => {
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.8.0',
    });
    errorHandler(err, {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('mapeia SyntaxError de corpo JSON malformado para 400', () => {
    const res = mockRes();
    const err = new SyntaxError('Unexpected token') as SyntaxError & { body: true };
    err.body = true;
    errorHandler(err, {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('cai no 500 genérico para erro desconhecido, sem vazar a mensagem original', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = mockRes();
    errorHandler(new Error('detalhe interno sensível'), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.erro).not.toContain('detalhe interno sensível');
  });

  it('repassa para next se a resposta já foi enviada', () => {
    const res = mockRes();
    res.headersSent = true;
    const err = new Error('qualquer coisa');
    errorHandler(err, {} as Request, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
