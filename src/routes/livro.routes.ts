import { Router } from 'express';
import { cadastrar, adicionarExemplaresController, listar, buscarExterno, excluir } from '../controllers/livro.controller';
import { autenticar, exigirPermissao, exigirAdmin } from '../middlewares/auth';
import { PERMISSOES } from '../constants/permissoes';

const router = Router();

router.post('/', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), cadastrar);
router.post('/:id/exemplares', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), adicionarExemplaresController);

router.get('/', autenticar, listar);
router.get('/buscar-externo', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), buscarExterno);

router.delete('/:id', autenticar, exigirAdmin, excluir);

export default router;
