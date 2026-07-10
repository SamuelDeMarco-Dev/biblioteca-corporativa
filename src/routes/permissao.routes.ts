import { Router } from 'express';
import { listar } from '../controllers/permissao.controller';
import { autenticar, exigirAdmin } from '../middlewares/auth';

const router = Router();
router.get('/', autenticar, exigirAdmin, listar);
export default router;