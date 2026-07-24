import { Router } from 'express';
import { asyncHandler, autenticar, exigirAdmin } from '../../shared/middlewares';
import { PermissaoService } from './permissao.service';

export function createPermissaoRouter(permissaoService: PermissaoService): Router {
  const router = Router();

  router.get(
    '/',
    autenticar,
    exigirAdmin,
    asyncHandler(async (_req, res) => {
      res.status(200).json(await permissaoService.listar());
    }),
  );

  return router;
}
