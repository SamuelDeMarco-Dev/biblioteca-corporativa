import { Router } from 'express';
import { asyncHandler, autenticar, exigirAdmin } from '../../shared/middlewares';
import { DashboardService } from './dashboard.service';

// Dashboard GERAL (todos os usuários) é exclusivo de administradores.
// O dashboard pessoal do usuário é montado no front a partir de /locacoes.
export function createDashboardRouter(dashboardService: DashboardService): Router {
  const router = Router();

  router.get(
    '/',
    autenticar,
    exigirAdmin,
    asyncHandler(async (_req, res) => {
      res.status(200).json(await dashboardService.obter());
    }),
  );

  return router;
}
