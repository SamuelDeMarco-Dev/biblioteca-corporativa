import { Router } from 'express';
import { cadastrar, adicionarExemplaresController } from '../controllers/livro.controller';
import { autenticar, exigirPermissao } from '../middlewares/auth';
import { PERMISSOES } from '../constants/permissoes';

const router = Router();

router.post('/', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), cadastrar);
router.post('/:id/exemplares', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), adicionarExemplaresController);

export default router;
