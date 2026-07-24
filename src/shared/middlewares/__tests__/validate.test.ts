import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Request } from 'express';
import { validate } from '../validate';
import { ValidationError } from '../../errors';

describe('validate', () => {
  const schema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') });

  it('chama next() sem erro e substitui req.body pelo dado parseado', () => {
    const req = { body: { nome: 'Ada' } } as Request;
    const next = vi.fn();
    validate(schema)(req, {} as never, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ nome: 'Ada' });
  });

  it('chama next(ValidationError) com campos quando o body é inválido', () => {
    const req = { body: { nome: '' } } as Request;
    const next = vi.fn();
    validate(schema)(req, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.campos).toEqual({ nome: 'Nome é obrigatório' });
  });

  it('valida req.params quando source = "params"', () => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const req = { params: { id: '42' } } as unknown as Request;
    const next = vi.fn();
    validate(paramsSchema, 'params')(req, {} as never, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: 42 });
  });

  it('valida req.query quando source = "query" sem substituir a referência', () => {
    const querySchema = z.object({ titulo: z.string().min(1) });
    const originalQuery = { titulo: 'dom' };
    const req = { query: originalQuery } as unknown as Request;
    const next = vi.fn();
    validate(querySchema, 'query')(req, {} as never, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.query).toBe(originalQuery); // mesma referência (Object.assign, não substituição)
    expect(req.query).toEqual({ titulo: 'dom' });
  });
});
