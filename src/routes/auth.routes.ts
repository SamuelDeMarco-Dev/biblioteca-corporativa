import { Router } from 'express';
import { login, esqueciSenha, redefinir } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinir);

export default router;