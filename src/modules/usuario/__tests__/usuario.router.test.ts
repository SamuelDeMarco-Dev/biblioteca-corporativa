import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { RequestHandler } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createUsuarioRouter } from '../usuario.router';
import { errorHandler } from '../../../shared/middlewares';

process.env.JWT_SECRET = 'segredo-de-teste';

const allowAll: (permissao: string) => RequestHandler = () => (_req, _res, next) => next();

function tokenAdmin() {
  return jwt.sign({ id: 1, perfil: 'ADMINISTRADOR' }, process.env.JWT_SECRET!);
}

function mockService() {
  return {
    criar: vi.fn(),
    listar: vi.fn(),
    atualizarPermissoes: vi.fn(),
    editar: vi.fn(),
    possuiPermissao: vi.fn(),
  };
}

function buildApp(usuarioService: ReturnType<typeof mockService>, exigirPermissao = allowAll) {
  const app = express();
  app.use(express.json());
  app.use('/usuarios', createUsuarioRouter(usuarioService as never, exigirPermissao));
  app.use(errorHandler);
  return app;
}

describe('usuario router', () => {
  let usuarioService: ReturnType<typeof mockService>;

  beforeEach(() => {
    usuarioService = mockService();
  });

  it('GET /usuarios sem token responde 401', async () => {
    const app = buildApp(usuarioService);
    const res = await request(app).get('/usuarios');
    expect(res.status).toBe(401);
  });

  it('GET /usuarios com admin responde 200 com a lista', async () => {
    usuarioService.listar.mockResolvedValue([{ id: 1, nome: 'Ada' }]);
    const app = buildApp(usuarioService);
    const res = await request(app).get('/usuarios').set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, nome: 'Ada' }]);
  });

  it('POST /usuarios com corpo inválido responde 400 sem chamar o service', async () => {
    const app = buildApp(usuarioService);
    const res = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nome: '' });
    expect(res.status).toBe(400);
    expect(usuarioService.criar).not.toHaveBeenCalled();
  });

  it('POST /usuarios com corpo válido responde 201', async () => {
    usuarioService.criar.mockResolvedValue({ id: 2, nome: 'Ada' });
    const app = buildApp(usuarioService);
    const res = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        nome: 'Ada',
        email: 'ada@exemplo.com',
        setor: 'TI',
        cpf: '11144477735',
        senha: 'senha123',
        perfil: 'USUARIO',
      });
    expect(res.status).toBe(201);
  });

  it('PATCH /usuarios/:id com id inválido responde 400', async () => {
    const app = buildApp(usuarioService);
    const res = await request(app)
      .patch('/usuarios/abc')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nome: 'Novo nome' });
    expect(res.status).toBe(400);
    expect(usuarioService.editar).not.toHaveBeenCalled();
  });

  it('PATCH /usuarios/:id/permissoes chama o service com os arrays corretos', async () => {
    usuarioService.atualizarPermissoes.mockResolvedValue({ id: 1, permissoes: [] });
    const app = buildApp(usuarioService);
    const res = await request(app)
      .patch('/usuarios/1/permissoes')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ habilitar: [1], desabilitar: [2] });
    expect(res.status).toBe(200);
    expect(usuarioService.atualizarPermissoes).toHaveBeenCalledWith(1, [1], [2]);
  });
});
