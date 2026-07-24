import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsuarioService } from '../usuario.service';

function mockRepository() {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    updatePermissoes: vi.fn(),
    update: vi.fn(),
    existsPermissao: vi.fn(),
  };
}

describe('UsuarioService', () => {
  let repository: ReturnType<typeof mockRepository>;
  let service: UsuarioService;

  beforeEach(() => {
    repository = mockRepository();
    service = new UsuarioService(repository as never);
  });

  describe('criar', () => {
    it('conecta as permissões padrão quando perfil é USUARIO e nenhuma permissoesIds foi enviada', async () => {
      repository.create.mockResolvedValue({ id: 1, senhaHash: 'hash', nome: 'Ada' });
      await service.criar({
        nome: 'Ada',
        email: 'ada@exemplo.com',
        setor: 'TI',
        cpf: '12345678909',
        senha: 'senha123',
        perfil: 'USUARIO',
      });

      const dataArg = repository.create.mock.calls[0][0];
      expect(dataArg.permissoes.connect.length).toBeGreaterThan(0);
    });

    it('conecta as permissoesIds explícitas quando informadas', async () => {
      repository.create.mockResolvedValue({ id: 1, senhaHash: 'hash' });
      await service.criar({
        nome: 'Ada',
        email: 'ada@exemplo.com',
        setor: 'TI',
        cpf: '12345678909',
        senha: 'senha123',
        perfil: 'ADMINISTRADOR',
        permissoesIds: [1, 2],
      });

      const dataArg = repository.create.mock.calls[0][0];
      expect(dataArg.permissoes.connect).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('não retorna senhaHash no resultado', async () => {
      repository.create.mockResolvedValue({ id: 1, senhaHash: 'hash', nome: 'Ada' });
      const resultado = await service.criar({
        nome: 'Ada',
        email: 'ada@exemplo.com',
        setor: 'TI',
        cpf: '12345678909',
        senha: 'senha123',
        perfil: 'ADMINISTRADOR',
      });
      expect(resultado).not.toHaveProperty('senhaHash');
    });
  });

  it('atualizarPermissoes repassa habilitar/desabilitar e não retorna senhaHash', async () => {
    repository.updatePermissoes.mockResolvedValue({ id: 1, senhaHash: 'hash', permissoes: [] });
    const resultado = await service.atualizarPermissoes(1, [2], [3]);
    expect(repository.updatePermissoes).toHaveBeenCalledWith(1, [2], [3]);
    expect(resultado).not.toHaveProperty('senhaHash');
  });

  it('possuiPermissao delega ao repository', async () => {
    repository.existsPermissao.mockResolvedValue(true);
    const resultado = await service.possuiPermissao(1, 'LOCAR_LIVROS');
    expect(resultado).toBe(true);
    expect(repository.existsPermissao).toHaveBeenCalledWith(1, 'LOCAR_LIVROS');
  });
});
