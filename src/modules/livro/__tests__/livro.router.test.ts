import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { RequestHandler } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createLivroRouter } from '../livro.router';
import { errorHandler } from '../../../shared/middlewares';
import { LivroDuplicadoError } from '../livro.errors';
import { NotFoundError, ConflictError } from '../../../shared/errors';

process.env.JWT_SECRET = 'segredo-de-teste';

const allowAll: (permissao: string) => RequestHandler = () => (_req, _res, next) => next();

function token() {
  return jwt.sign({ id: 1, perfil: 'ADMINISTRADOR' }, process.env.JWT_SECRET!);
}

function mockService() {
  return {
    cadastrar: vi.fn(),
    adicionarExemplares: vi.fn(),
    listar: vi.fn(),
    buscarExterno: vi.fn(),
    excluir: vi.fn(),
  };
}

function buildApp(livroService: ReturnType<typeof mockService>) {
  const app = express();
  app.use(express.json());
  app.use('/livros', createLivroRouter(livroService as never, allowAll));
  app.use(errorHandler);
  return app;
}

describe('livro router', () => {
  let livroService: ReturnType<typeof mockService>;

  beforeEach(() => {
    livroService = mockService();
  });

  it('POST /livros com corpo inválido responde 400', async () => {
    const app = buildApp(livroService);
    const res = await request(app)
      .post('/livros')
      .set('Authorization', `Bearer ${token()}`)
      .send({ titulo: '' });
    expect(res.status).toBe(400);
    expect(livroService.cadastrar).not.toHaveBeenCalled();
  });

  it('POST /livros duplicado responde 409 com os detalhes do livro existente', async () => {
    livroService.cadastrar.mockRejectedValue(
      new LivroDuplicadoError({ livro: { id: 1 }, totalExemplares: 2, exemplaresDisponiveis: 1 }),
    );
    const app = buildApp(livroService);
    const res = await request(app).post('/livros').set('Authorization', `Bearer ${token()}`).send({
      titulo: 'Dom Casmurro',
      autor: 'Machado',
      edicao: '1',
      anoPublicacao: 1899,
      quantidadeExemplares: 1,
    });
    expect(res.status).toBe(409);
    expect(res.body.duplicado).toBe(true);
    expect(res.body.totalExemplares).toBe(2);
  });

  it('GET /livros/:id inexistente ao adicionar exemplares responde 404', async () => {
    livroService.adicionarExemplares.mockRejectedValue(new NotFoundError('Livro não encontrado'));
    const app = buildApp(livroService);
    const res = await request(app)
      .post('/livros/1/exemplares')
      .set('Authorization', `Bearer ${token()}`)
      .send({ quantidade: 2 });
    expect(res.status).toBe(404);
  });

  it('DELETE /livros/:id com exemplar locado responde 409', async () => {
    livroService.excluir.mockRejectedValue(
      new ConflictError('Livro possui exemplar locado - não pode ser excluido'),
    );
    const app = buildApp(livroService);
    const res = await request(app).delete('/livros/1').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(409);
  });

  it('GET /livros/buscar-externo responde 200 mesmo quando indisponivel', async () => {
    livroService.buscarExterno.mockResolvedValue({ indisponivel: true, sugestoes: [] });
    const app = buildApp(livroService);
    const res = await request(app)
      .get('/livros/buscar-externo?titulo=dom')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.indisponivel).toBe(true);
  });
});
