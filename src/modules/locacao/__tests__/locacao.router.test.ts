import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { RequestHandler } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createLocacaoRouter } from '../locacao.router';
import { errorHandler } from '../../../shared/middlewares';
import { ForbiddenError, ConflictError } from '../../../shared/errors';

process.env.JWT_SECRET = 'segredo-de-teste';

const allowAll: (permissao: string) => RequestHandler = () => (_req, _res, next) => next();

function tokenUsuario(id = 1) {
  return jwt.sign({ id, perfil: 'USUARIO' }, process.env.JWT_SECRET!);
}

function mockService() {
  return { locar: vi.fn(), listar: vi.fn(), devolver: vi.fn() };
}

function buildApp(locacaoService: ReturnType<typeof mockService>) {
  const app = express();
  app.use(express.json());
  app.use('/locacoes', createLocacaoRouter(locacaoService as never, allowAll));
  app.use(errorHandler);
  return app;
}

describe('locacao router', () => {
  let locacaoService: ReturnType<typeof mockService>;

  beforeEach(() => {
    locacaoService = mockService();
  });

  it('POST /locacoes com corpo inválido responde 400', async () => {
    const app = buildApp(locacaoService);
    const res = await request(app)
      .post('/locacoes')
      .set('Authorization', `Bearer ${tokenUsuario()}`)
      .send({ livroId: -1 });
    expect(res.status).toBe(400);
    expect(locacaoService.locar).not.toHaveBeenCalled();
  });

  it('POST /locacoes registra e responde 201 com os dados formatados', async () => {
    locacaoService.locar.mockResolvedValue({
      locacao: { id: 10 },
      exemplar: { codigo: 'A-001' },
      dataPrevista: new Date('2026-08-01'),
    });
    const app = buildApp(locacaoService);
    const res = await request(app)
      .post('/locacoes')
      .set('Authorization', `Bearer ${tokenUsuario(5)}`)
      .send({ livroId: 2, dias: 7 });
    expect(res.status).toBe(201);
    expect(res.body.locacaoId).toBe(10);
    expect(locacaoService.locar).toHaveBeenCalledWith(5, 2, 7);
  });

  it('GET /locacoes repassa ehAdmin e o filtro "meu" ao service', async () => {
    locacaoService.listar.mockResolvedValue([]);
    const app = buildApp(locacaoService);
    await request(app)
      .get('/locacoes?meu=true')
      .set('Authorization', `Bearer ${tokenUsuario(1)}`);
    expect(locacaoService.listar).toHaveBeenCalledWith(1, false, true);
  });

  it('PATCH /locacoes/:id/devolver com ownership violado responde 403', async () => {
    locacaoService.devolver.mockRejectedValue(
      new ForbiddenError('Você só pode devolver suas próprias locações'),
    );
    const app = buildApp(locacaoService);
    const res = await request(app)
      .patch('/locacoes/1/devolver')
      .set('Authorization', `Bearer ${tokenUsuario()}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /locacoes/:id/devolver já devolvida responde 409', async () => {
    locacaoService.devolver.mockRejectedValue(new ConflictError('Locação já devolvida'));
    const app = buildApp(locacaoService);
    const res = await request(app)
      .patch('/locacoes/1/devolver')
      .set('Authorization', `Bearer ${tokenUsuario()}`);
    expect(res.status).toBe(409);
  });

  it('PATCH /locacoes/:id/devolver com id inválido responde 400', async () => {
    const app = buildApp(locacaoService);
    const res = await request(app)
      .patch('/locacoes/abc/devolver')
      .set('Authorization', `Bearer ${tokenUsuario()}`);
    expect(res.status).toBe(400);
    expect(locacaoService.devolver).not.toHaveBeenCalled();
  });
});
