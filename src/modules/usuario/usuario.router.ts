import { Router, RequestHandler } from 'express';
import { validate, asyncHandler, autenticar, exigirAdmin } from '../../shared/middlewares';
import { PERMISSOES } from '../../constants/permissoes';
import { UsuarioService } from './usuario.service';
import {
  criarUsuarioSchema,
  atualizarPermissoesSchema,
  editarUsuarioSchema,
  usuarioIdParamsSchema,
} from './usuario.schema';

export function createUsuarioRouter(
  usuarioService: UsuarioService,
  exigirPermissao: (permissao: string) => RequestHandler,
): Router {
  const router = Router();

  router.get(
    '/',
    autenticar,
    exigirAdmin,
    asyncHandler(async (_req, res) => {
      res.status(200).json(await usuarioService.listar());
    }),
  );

  router.post(
    '/',
    autenticar,
    exigirPermissao(PERMISSOES.CADASTRAR_USUARIOS),
    validate(criarUsuarioSchema),
    asyncHandler(async (req, res) => {
      const usuario = await usuarioService.criar(req.body);
      res.status(201).json(usuario);
    }),
  );

  router.patch(
    '/:id/permissoes',
    autenticar,
    exigirAdmin,
    validate(usuarioIdParamsSchema, 'params'),
    validate(atualizarPermissoesSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params as unknown as { id: number };
      const usuario = await usuarioService.atualizarPermissoes(
        id,
        req.body.habilitar,
        req.body.desabilitar,
      );
      res.status(200).json(usuario);
    }),
  );

  router.patch(
    '/:id',
    autenticar,
    exigirAdmin,
    validate(usuarioIdParamsSchema, 'params'),
    validate(editarUsuarioSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params as unknown as { id: number };
      const usuario = await usuarioService.editar(id, req.body);
      res.status(200).json(usuario);
    }),
  );

  return router;
}
