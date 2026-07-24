import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { InvalidCredentialsError, InvalidResetTokenError } from '../auth.errors';
import { NotFoundError } from '../../../shared/errors';

process.env.JWT_SECRET = 'segredo-de-teste';

function mockRepository() {
  return {
    findByEmail: vi.fn(),
    findProfileById: vi.fn(),
    findByResetTokenHash: vi.fn(),
    setResetToken: vi.fn(),
    updatePassword: vi.fn(),
  };
}

describe('AuthService', () => {
  let repository: ReturnType<typeof mockRepository>;
  let enviarEmailReset: ReturnType<typeof vi.fn>;
  let service: AuthService;

  beforeEach(() => {
    repository = mockRepository();
    enviarEmailReset = vi.fn().mockResolvedValue(undefined);
    service = new AuthService(repository as never, enviarEmailReset);
  });

  describe('login', () => {
    it('retorna token e usuário sem senhaHash quando as credenciais são válidas', async () => {
      const senhaHash = await bcrypt.hash('correta123', 10);
      repository.findByEmail.mockResolvedValue({
        id: 1,
        nome: 'Ada',
        email: 'ada@exemplo.com',
        senhaHash,
        perfil: 'USUARIO',
      });

      const resultado = await service.login({ email: 'ada@exemplo.com', senha: 'correta123' });

      expect(resultado.token).toEqual(expect.any(String));
      expect(resultado.usuario).not.toHaveProperty('senhaHash');
    });

    it('lança InvalidCredentialsError quando o e-mail não existe', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', senha: 'qualquer' })).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('lança InvalidCredentialsError quando a senha está incorreta', async () => {
      const senhaHash = await bcrypt.hash('correta123', 10);
      repository.findByEmail.mockResolvedValue({ id: 1, senhaHash, perfil: 'USUARIO' });
      await expect(service.login({ email: 'ada@exemplo.com', senha: 'errada' })).rejects.toThrow(
        InvalidCredentialsError,
      );
    });
  });

  describe('solicitarReset', () => {
    it('lança NotFoundError quando o e-mail não está cadastrado', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(service.solicitarReset('ninguem@exemplo.com')).rejects.toThrow(NotFoundError);
      expect(enviarEmailReset).not.toHaveBeenCalled();
    });

    it('grava o token e envia o e-mail quando o usuário existe', async () => {
      repository.findByEmail.mockResolvedValue({ id: 7, email: 'ada@exemplo.com' });
      await service.solicitarReset('ada@exemplo.com');

      expect(repository.setResetToken).toHaveBeenCalledWith(
        7,
        expect.any(String),
        expect.any(Date),
      );
      expect(enviarEmailReset).toHaveBeenCalledWith(
        'ada@exemplo.com',
        expect.stringContaining('/redefinir-senha.html?token='),
      );
    });
  });

  describe('redefinirSenha', () => {
    it('lança InvalidResetTokenError quando o token não é encontrado/expirou', async () => {
      repository.findByResetTokenHash.mockResolvedValue(null);
      await expect(service.redefinirSenha('token-invalido', 'novaSenha123')).rejects.toThrow(
        InvalidResetTokenError,
      );
    });

    it('atualiza a senha quando o token é válido', async () => {
      repository.findByResetTokenHash.mockResolvedValue({ id: 3 });
      await service.redefinirSenha('token-valido', 'novaSenha123');
      expect(repository.updatePassword).toHaveBeenCalledWith(3, expect.any(String));
    });
  });

  describe('me', () => {
    it('lança NotFoundError quando o usuário não existe', async () => {
      repository.findProfileById.mockResolvedValue(null);
      await expect(service.me(999)).rejects.toThrow(NotFoundError);
    });

    it('retorna o perfil com permissoes como lista de nomes', async () => {
      repository.findProfileById.mockResolvedValue({
        id: 1,
        nome: 'Ada',
        email: 'ada@exemplo.com',
        perfil: 'USUARIO',
        permissoes: [{ nome: 'LOCAR_LIVROS' }],
      });
      const resultado = await service.me(1);
      expect(resultado.permissoes).toEqual(['LOCAR_LIVROS']);
    });
  });
});
