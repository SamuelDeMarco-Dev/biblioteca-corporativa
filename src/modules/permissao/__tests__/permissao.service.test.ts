import { describe, it, expect, vi } from 'vitest';
import { PermissaoService } from '../permissao.service';

describe('PermissaoService', () => {
  it('listar delega ao repository', async () => {
    const repository = { findAll: vi.fn().mockResolvedValue([{ id: 1, nome: 'LOCAR_LIVROS' }]) };
    const service = new PermissaoService(repository as never);
    const resultado = await service.listar();
    expect(resultado).toEqual([{ id: 1, nome: 'LOCAR_LIVROS' }]);
    expect(repository.findAll).toHaveBeenCalled();
  });
});
