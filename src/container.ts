// Único ponto de instanciação/injeção de dependências. Zero lógica de negócio
// aqui — só wiring, sempre na ordem: repository → service → router → routes.
import { Router } from 'express';
import { prisma } from './lib/prisma';
import { enviarEmailReset } from './lib/mailer';
import { criarExigirPermissao } from './shared/middlewares';

import { AuthRepository } from './modules/auth/auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { createAuthRouter } from './modules/auth/auth.router';

import { UsuarioRepository } from './modules/usuario/usuario.repository';
import { UsuarioService } from './modules/usuario/usuario.service';
import { createUsuarioRouter } from './modules/usuario/usuario.router';

import { LivroRepository } from './modules/livro/livro.repository';
import { LivroService } from './modules/livro/livro.service';
import { createLivroRouter } from './modules/livro/livro.router';

import { LocacaoRepository } from './modules/locacao/locacao.repository';
import { LocacaoService } from './modules/locacao/locacao.service';
import { createLocacaoRouter } from './modules/locacao/locacao.router';

import { DashboardRepository } from './modules/dashboard/dashboard.repository';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { createDashboardRouter } from './modules/dashboard/dashboard.router';

import { PermissaoRepository } from './modules/permissao/permissao.repository';
import { PermissaoService } from './modules/permissao/permissao.service';
import { createPermissaoRouter } from './modules/permissao/permissao.router';

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository, enviarEmailReset);
const authRouter = createAuthRouter(authService);

const usuarioRepository = new UsuarioRepository(prisma);
const usuarioService = new UsuarioService(usuarioRepository);

// Middleware compartilhado entre módulos (livro, locacao) — a checagem de
// permissão mora no usuario module; o container faz a ponte.
export const exigirPermissao = criarExigirPermissao((usuarioId, permissao) =>
  usuarioService.possuiPermissao(usuarioId, permissao),
);

const usuarioRouter = createUsuarioRouter(usuarioService, exigirPermissao);

const livroRepository = new LivroRepository(prisma);
const livroService = new LivroService(livroRepository);
const livroRouter = createLivroRouter(livroService, exigirPermissao);

const locacaoRepository = new LocacaoRepository(prisma);
const locacaoService = new LocacaoService(locacaoRepository);
const locacaoRouter = createLocacaoRouter(locacaoService, exigirPermissao);

const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository);
const dashboardRouter = createDashboardRouter(dashboardService);

const permissaoRepository = new PermissaoRepository(prisma);
const permissaoService = new PermissaoService(permissaoRepository);
const permissaoRouter = createPermissaoRouter(permissaoService);

export const routes: { path: string; router: Router }[] = [
  { path: '/auth', router: authRouter },
  { path: '/usuarios', router: usuarioRouter },
  { path: '/livros', router: livroRouter },
  { path: '/locacoes', router: locacaoRouter },
  { path: '/dashboard', router: dashboardRouter },
  { path: '/permissoes', router: permissaoRouter },
];
