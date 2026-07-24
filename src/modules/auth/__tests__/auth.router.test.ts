import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createAuthRouter } from '../auth.router';
import { errorHandler } from '../../../shared/middlewares';
import { InvalidCredentialsError, InvalidResetTokenError } from '../auth.errors';
import { NotFoundError } from '../../../shared/errors';

process.env.JWT_SECRET = 'segredo-de-teste';

function buildApp(authService: {
  login: ReturnType<typeof vi.fn>;
  solicitarReset: ReturnType<typeof vi.fn>;
  redefinirSenha: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(authService as never));
  app.use(errorHandler);
  return app;
}

function mockService() {
  return {
    login: vi.fn(),
    solicitarReset: vi.fn(),
    redefinirSenha: vi.fn(),
    me: vi.fn(),
  };
}

describe('auth router', () => {
  let authService: ReturnType<typeof mockService>;

  beforeEach(() => {
    authService = mockService();
  });

  it('POST /auth/login com corpo inválido responde 400', async () => {
    const app = buildApp(authService);
    const res = await request(app).post('/auth/login').send({ email: 'não-é-email' });
    expect(res.status).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('POST /auth/login com credenciais válidas responde 200 com o token', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-token', usuario: { id: 1 } });
    const app = buildApp(authService);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ada@exemplo.com', senha: 'correta123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBe('jwt-token');
  });

  it('POST /auth/login com credenciais inválidas responde 401', async () => {
    authService.login.mockRejectedValue(new InvalidCredentialsError());
    const app = buildApp(authService);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ada@exemplo.com', senha: 'errada' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/redefinir-senha com token inválido responde 400', async () => {
    authService.redefinirSenha.mockRejectedValue(new InvalidResetTokenError());
    const app = buildApp(authService);
    const res = await request(app)
      .post('/auth/redefinir-senha')
      .send({ token: 'invalido', novaSenha: 'novaSenha123' });
    expect(res.status).toBe(400);
  });

  it('GET /auth/me sem token responde 401', async () => {
    const app = buildApp(authService);
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(authService.me).not.toHaveBeenCalled();
  });

  it('GET /auth/me com token válido responde 200 com o perfil', async () => {
    authService.me.mockResolvedValue({ id: 1, nome: 'Ada', permissoes: [] });
    const token = jwt.sign({ id: 1, perfil: 'USUARIO' }, process.env.JWT_SECRET!);
    const app = buildApp(authService);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(authService.me).toHaveBeenCalledWith(1);
  });

  it('GET /auth/me quando o service lança NotFoundError responde 404', async () => {
    authService.me.mockRejectedValue(new NotFoundError('Usuário não encontrado.'));
    const token = jwt.sign({ id: 999, perfil: 'USUARIO' }, process.env.JWT_SECRET!);
    const app = buildApp(authService);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
