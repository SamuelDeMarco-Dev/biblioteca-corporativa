import { Router } from 'express';
import { obter } from '../controllers/dashboard.controller';
import { autenticar, exigirAdmin } from '../middlewares/auth';

const router = Router();
// Dashboard GERAL (todos os usuários) é exclusivo de administradores.
// O dashboard pessoal do usuário é montado no front a partir de /locacoes.
router.get('/', autenticar, exigirAdmin, obter);
export default router;
