import { describe, it, expect, vi } from 'vitest';
import { Response } from 'express';
import { criarExigirPermissao, AuthRequest } from '../auth';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('criarExigirPermissao', () => {
  it('responde 401 quando não autenticado', async () => {
    const checarPermissao = vi.fn();
    const exigirPermissao = criarExigirPermissao(checarPermissao);
    const res = mockRes();
    const next = vi.fn();

    await exigirPermissao('LOCAR_LIVROS')({} as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(checarPermissao).not.toHaveBeenCalled();
  });

  it('deixa passar administrador sem checar permissão', async () => {
    const checarPermissao = vi.fn();
    const exigirPermissao = criarExigirPermissao(checarPermissao);
    const next = vi.fn();

    await exigirPermissao('LOCAR_LIVROS')(
      { usuario: { id: 1, perfil: 'ADMINISTRADOR' } } as AuthRequest,
      mockRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(checarPermissao).not.toHaveBeenCalled();
  });

  it('libera usuário comum quando checarPermissao retorna true', async () => {
    const checarPermissao = vi.fn().mockResolvedValue(true);
    const exigirPermissao = criarExigirPermissao(checarPermissao);
    const next = vi.fn();

    await exigirPermissao('LOCAR_LIVROS')(
      { usuario: { id: 5, perfil: 'USUARIO' } } as AuthRequest,
      mockRes(),
      next,
    );

    expect(checarPermissao).toHaveBeenCalledWith(5, 'LOCAR_LIVROS');
    expect(next).toHaveBeenCalled();
  });

  it('responde 403 quando usuário comum não tem a permissão', async () => {
    const checarPermissao = vi.fn().mockResolvedValue(false);
    const exigirPermissao = criarExigirPermissao(checarPermissao);
    const res = mockRes();
    const next = vi.fn();

    await exigirPermissao('LOCAR_LIVROS')(
      { usuario: { id: 5, perfil: 'USUARIO' } } as AuthRequest,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
