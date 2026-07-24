import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NotFoundError } from '../../shared/errors';
import { AuthRepository } from './auth.repository';
import { LoginInput } from './auth.schema';
import { InvalidCredentialsError, InvalidResetTokenError } from './auth.errors';

type EnviarEmailReset = (destino: string, link: string) => Promise<unknown>;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly enviarEmailReset: EnviarEmailReset,
  ) {}

  async login(dados: LoginInput) {
    const usuario = await this.authRepository.findByEmail(dados.email);
    if (!usuario) throw new InvalidCredentialsError();

    const senhaCorreta = await bcrypt.compare(dados.senha, usuario.senhaHash);
    if (!senhaCorreta) throw new InvalidCredentialsError();

    const token = jwt.sign({ id: usuario.id, perfil: usuario.perfil }, process.env.JWT_SECRET!, {
      expiresIn: '8h',
    });

    const { senhaHash: _senhaHash, ...usuarioSemSenha } = usuario;
    return { token, usuario: usuarioSemSenha };
  }

  async solicitarReset(email: string): Promise<void> {
    const usuario = await this.authRepository.findByEmail(email);
    if (!usuario) throw new NotFoundError('E-mail não cadastrado');

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 1000 * 60 * 30);
    await this.authRepository.setResetToken(usuario.id, hashToken(token), expiraEm);

    const baseUrl = process.env.APP_URL ?? 'http://localhost:3002';
    const link = `${baseUrl}/redefinir-senha.html?token=${token}`;
    await this.enviarEmailReset(usuario.email, link);
  }

  async redefinirSenha(token: string, novaSenha: string): Promise<void> {
    const usuario = await this.authRepository.findByResetTokenHash(hashToken(token));
    if (!usuario) throw new InvalidResetTokenError();

    await this.authRepository.updatePassword(usuario.id, await bcrypt.hash(novaSenha, 10));
  }

  async me(usuarioId: number) {
    const usuario = await this.authRepository.findProfileById(usuarioId);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');

    return { ...usuario, permissoes: usuario.permissoes.map((p) => p.nome) };
  }
}
