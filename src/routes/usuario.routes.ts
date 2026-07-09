import { Router } from 'express';
import { cadastrar } from '../controllers/usuario.controller';
import { autenticar, exigirAdmin } from '../middlewares/auth';

const router = Router();

router.post('/', autenticar, exigirAdmin, cadastrar);

export default router;
