import { Router } from 'express';
import { locar, listar, devolver } from '../controllers/locacao.controller';
import { autenticar, exigirPermissao } from '../middlewares/auth';
import { PERMISSOES } from '../constants/permissoes';

const router = Router();

router.post('/', autenticar, exigirPermissao(PERMISSOES.LOCAR_LIVROS), locar);
router.get('/', autenticar, listar);
router.patch('/:id/devolver', autenticar, exigirPermissao(PERMISSOES.DEVOLVER_LIVROS), devolver);

export default router;