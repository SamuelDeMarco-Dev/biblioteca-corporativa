import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createPermissaoRouter } from '../permissao.router';
import { errorHandler } from '../../../shared/middlewares';

process.env.JWT_SECRET = 'segredo-de-teste';

function buildApp(permissaoService: { listar: ReturnType<typeof vi.fn> }) {
  const app = express();
  app.use(express.json());
  app.use('/permissoes', createPermissaoRouter(permissaoService as never));
  app.use(errorHandler);
  return app;
}

describe('permissao router', () => {
  let permissaoService: { listar: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    permissaoService = { listar: vi.fn() };
  });

  it('GET /permissoes sem token responde 401', async () => {
    const app = buildApp(permissaoService);
    const res = await request(app).get('/permissoes');
    expect(res.status).toBe(401);
  });

  it('GET /permissoes com admin responde 200 com a lista', async () => {
    permissaoService.listar.mockResolvedValue([{ id: 1, nome: 'LOCAR_LIVROS' }]);
    const token = jwt.sign({ id: 1, perfil: 'ADMINISTRADOR' }, process.env.JWT_SECRET!);
    const app = buildApp(permissaoService);
    const res = await request(app).get('/permissoes').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, nome: 'LOCAR_LIVROS' }]);
  });
});
