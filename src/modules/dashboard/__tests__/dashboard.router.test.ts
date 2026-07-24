import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createDashboardRouter } from '../dashboard.router';
import { errorHandler } from '../../../shared/middlewares';

process.env.JWT_SECRET = 'segredo-de-teste';

function buildApp(dashboardService: { obter: ReturnType<typeof vi.fn> }) {
  const app = express();
  app.use(express.json());
  app.use('/dashboard', createDashboardRouter(dashboardService as never));
  app.use(errorHandler);
  return app;
}

describe('dashboard router', () => {
  let dashboardService: { obter: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dashboardService = { obter: vi.fn() };
  });

  it('GET /dashboard sem token responde 401', async () => {
    const app = buildApp(dashboardService);
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /dashboard com usuário comum (não admin) responde 403', async () => {
    const token = jwt.sign({ id: 1, perfil: 'USUARIO' }, process.env.JWT_SECRET!);
    const app = buildApp(dashboardService);
    const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(dashboardService.obter).not.toHaveBeenCalled();
  });

  it('GET /dashboard com admin responde 200 com os dados', async () => {
    dashboardService.obter.mockResolvedValue({
      totais: { cadastrados: 1, disponiveis: 1, locados: 0 },
    });
    const token = jwt.sign({ id: 1, perfil: 'ADMINISTRADOR' }, process.env.JWT_SECRET!);
    const app = buildApp(dashboardService);
    const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totais.cadastrados).toBe(1);
  });
});
