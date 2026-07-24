import { Router, RequestHandler } from 'express';
import { validate, asyncHandler, autenticar, AuthRequest } from '../../shared/middlewares';
import { PERMISSOES } from '../../constants/permissoes';
import { LocacaoService } from './locacao.service';
import { criarLocacaoSchema, locacaoIdParamsSchema } from './locacao.schema';

export function createLocacaoRouter(
  locacaoService: LocacaoService,
  exigirPermissao: (permissao: string) => RequestHandler,
): Router {
  const router = Router();

  router.post(
    '/',
    autenticar,
    exigirPermissao(PERMISSOES.LOCAR_LIVROS),
    validate(criarLocacaoSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const resultado = await locacaoService.locar(
        req.usuario!.id,
        req.body.livroId,
        req.body.dias,
      );
      res.status(201).json({
        mensagem: 'Locação registrada com sucesso',
        locacaoId: resultado.locacao.id,
        exemplar: resultado.exemplar.codigo,
        dataPrevista: resultado.dataPrevista,
      });
    }),
  );

  router.get(
    '/',
    autenticar,
    asyncHandler(async (req: AuthRequest, res) => {
      const ehAdmin = req.usuario!.perfil === 'ADMINISTRADOR';
      const meuFiltro = req.query.meu === 'true';
      const locacoes = await locacaoService.listar(req.usuario!.id, ehAdmin, meuFiltro);
      res.status(200).json(locacoes);
    }),
  );

  router.patch(
    '/:id/devolver',
    autenticar,
    exigirPermissao(PERMISSOES.DEVOLVER_LIVROS),
    validate(locacaoIdParamsSchema, 'params'),
    asyncHandler(async (req: AuthRequest, res) => {
      const { id } = req.params as unknown as { id: number };
      const ehAdmin = req.usuario!.perfil === 'ADMINISTRADOR';
      const atualizada = await locacaoService.devolver(id, req.usuario!.id, ehAdmin);
      res
        .status(200)
        .json({ mensagem: 'Devolução registrada', dataDevolucao: atualizada.dataDevolucao });
    }),
  );

  return router;
}
