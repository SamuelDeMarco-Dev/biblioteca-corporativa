import { Router } from 'express';
import { cadastrar, gerenciarPermissoes, listar, editar } from '../controllers/usuario.controller';
import { autenticar, exigirAdmin, exigirPermissao } from '../middlewares/auth';
import { PERMISSOES } from '../constants/permissoes';

const router = Router();

router.get('/', autenticar, exigirAdmin, listar);

router.post('/', autenticar, exigirPermissao(PERMISSOES.CADASTRAR_USUARIOS), cadastrar);

router.patch('/:id/permissoes', autenticar, exigirAdmin, gerenciarPermissoes);
router.patch('/:id', autenticar, exigirAdmin, editar);

export default router;

// router.post('/livros',            autenticar, exigirPermissao(PERMISSOES.CADASTRAR_LIVROS), ...);
// router.delete('/livros/:id',      autenticar, exigirPermissao(PERMISSOES.EXCLUIR_LIVROS),   ...);
// router.post('/locacoes',          autenticar, exigirPermissao(PERMISSOES.LOCAR_LIVROS),     ...);
// router.post('/devolucoes',        autenticar, exigirPermissao(PERMISSOES.DEVOLVER_LIVROS),  ...);
// router.get('/dashboard',          autenticar, exigirPermissao(PERMISSOES.ACESSAR_DASHBOARD),...);
