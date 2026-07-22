import { Router } from 'express';
import { obter } from '../controllers/dashboard.controller';
import { autenticar, exigirAdmin } from '../middlewares/auth';

const router = Router();
router.get('/', autenticar, exigirAdmin, obter);
export default router;
