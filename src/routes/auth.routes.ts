import { Router } from 'express';
import { autenticar } from '../middlewares/auth';
import { login, esqueciSenha, redefinir, me } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinir);

router.get('/me', autenticar, me);

export default router;