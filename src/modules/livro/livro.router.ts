import { Router, RequestHandler } from 'express';
import { validate, asyncHandler, autenticar, exigirAdmin } from '../../shared/middlewares';
import { PERMISSOES } from '../../constants/permissoes';
import { LivroService } from './livro.service';
import { criarLivroSchema, adicionarExemplaresSchema, livroIdParamsSchema } from './livro.schema';

export function createLivroRouter(
  livroService: LivroService,
  exigirPermissao: (permissao: string) => RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/',
    autenticar,
    exigirPermissao(PERMISSOES.CADASTRAR_LIVROS),
    validate(criarLivroSchema),
    asyncHandler(async (req, res) => {
      const livro = await livroService.cadastrar(req.body);
      res.status(201).json(livro);
    }),
  );

  router.post(
    '/:id/exemplares',
    autenticar,
    exigirPermissao(PERMISSOES.CADASTRAR_LIVROS),
    validate(livroIdParamsSchema, 'params'),
    validate(adicionarExemplaresSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params as unknown as { id: number };
      const resultado = await livroService.adicionarExemplares(id, req.body.quantidade);
      res.status(201).json(resultado);
    }),
  );

  router.get(
    '/',
    autenticar,
    asyncHandler(async (_req, res) => {
      res.status(200).json(await livroService.listar());
    }),
  );

  router.get(
    '/buscar-externo',
    autenticar,
    exigirPermissao(PERMISSOES.CADASTRAR_LIVROS),
    asyncHandler(async (req, res) => {
      const titulo = String(req.query.titulo ?? '');
      res.status(200).json(await livroService.buscarExterno(titulo));
    }),
  );

  router.delete(
    '/:id',
    autenticar,
    exigirAdmin,
    validate(livroIdParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const { id } = req.params as unknown as { id: number };
      await livroService.excluir(id);
      res.status(200).json({ mensagem: 'Livro removido do acervo' });
    }),
  );

  return router;
}
