import { Router } from 'express';
import { locar } from '../controllers/locacao.controller';
import { autenticar, exigirPermissao } from '../middlewares/auth';
import { PERMISSOES } from '../constants/permissoes';

const router = Router();
router.post('/', autenticar, exigirPermissao(PERMISSOES.LOCAR_LIVROS), locar);
export default router;
