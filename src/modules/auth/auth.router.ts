import { Router } from 'express';
import { validate, asyncHandler, autenticar, AuthRequest } from '../../shared/middlewares';
import { AuthService } from './auth.service';
import { loginSchema, solicitarResetSchema, redefinirSenhaSchema } from './auth.schema';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post(
    '/login',
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const resultado = await authService.login(req.body);
      res.status(200).json(resultado);
    }),
  );

  router.post(
    '/esqueci-senha',
    validate(solicitarResetSchema),
    asyncHandler(async (req, res) => {
      await authService.solicitarReset(req.body.email);
      res.status(200).json({ mensagem: 'E-mail de redefinição enviado' });
    }),
  );

  router.post(
    '/redefinir-senha',
    validate(redefinirSenhaSchema),
    asyncHandler(async (req, res) => {
      await authService.redefinirSenha(req.body.token, req.body.novaSenha);
      res.status(200).json({ mensagem: 'Senha redefinida com sucesso' });
    }),
  );

  router.get(
    '/me',
    autenticar,
    asyncHandler(async (req: AuthRequest, res) => {
      const usuario = await authService.me(req.usuario!.id);
      res.status(200).json(usuario);
    }),
  );

  return router;
}
