import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocacaoService } from '../locacao.service';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../shared/errors';

function mockRepository() {
  return {
    criarComExemplarDisponivel: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    devolver: vi.fn(),
  };
}

describe('LocacaoService', () => {
  let repository: ReturnType<typeof mockRepository>;
  let service: LocacaoService;

  beforeEach(() => {
    repository = mockRepository();
    service = new LocacaoService(repository as never);
  });

  describe('locar', () => {
    it('lança ConflictError quando não há exemplar disponível', async () => {
      repository.criarComExemplarDisponivel.mockResolvedValue(null);
      await expect(service.locar(1, 2, 7)).rejects.toThrow(ConflictError);
    });

    it('retorna o resultado da locação quando há exemplar disponível', async () => {
      const resultado = {
        locacao: { id: 1 },
        exemplar: { codigo: '1-001' },
        dataPrevista: new Date(),
      };
      repository.criarComExemplarDisponivel.mockResolvedValue(resultado);
      await expect(service.locar(1, 2, 7)).resolves.toBe(resultado);
    });
  });

  describe('listar', () => {
    it('passa todos=true apenas quando ehAdmin e sem filtro "meu"', async () => {
      repository.findAll.mockResolvedValue([]);
      await service.listar(1, true, false);
      expect(repository.findAll).toHaveBeenCalledWith({ usuarioId: 1, todos: true });
    });

    it('passa todos=false quando ehAdmin mas com filtro "meu"', async () => {
      repository.findAll.mockResolvedValue([]);
      await service.listar(1, true, true);
      expect(repository.findAll).toHaveBeenCalledWith({ usuarioId: 1, todos: false });
    });

    it('passa todos=false para usuário comum independente do filtro', async () => {
      repository.findAll.mockResolvedValue([]);
      await service.listar(1, false, false);
      expect(repository.findAll).toHaveBeenCalledWith({ usuarioId: 1, todos: false });
    });

    it('deriva status ATIVA/ATRASADA/DEVOLVIDA corretamente', async () => {
      const agora = Date.now();
      repository.findAll.mockResolvedValue([
        {
          id: 1,
          exemplar: { livro: { titulo: 'A', autor: 'X' }, codigo: 'A-001' },
          dataLocacao: new Date(agora),
          dataPrevista: new Date(agora + 1000 * 60 * 60 * 24),
          dataDevolucao: null,
          usuario: { id: 1, nome: 'Ada', email: 'ada@x.com' },
        },
        {
          id: 2,
          exemplar: { livro: { titulo: 'B', autor: 'Y' }, codigo: 'B-001' },
          dataLocacao: new Date(agora - 1000 * 60 * 60 * 24 * 10),
          dataPrevista: new Date(agora - 1000 * 60 * 60 * 24),
          dataDevolucao: null,
          usuario: { id: 1, nome: 'Ada', email: 'ada@x.com' },
        },
        {
          id: 3,
          exemplar: { livro: { titulo: 'C', autor: 'Z' }, codigo: 'C-001' },
          dataLocacao: new Date(agora - 1000 * 60 * 60 * 24 * 10),
          dataPrevista: new Date(agora - 1000 * 60 * 60 * 24 * 5),
          dataDevolucao: new Date(agora),
          usuario: { id: 1, nome: 'Ada', email: 'ada@x.com' },
        },
      ]);

      const resultado = await service.listar(1, false, false);
      expect(resultado.map((r) => r.status)).toEqual(['ATIVA', 'ATRASADA', 'DEVOLVIDA']);
    });
  });

  describe('devolver', () => {
    it('lança NotFoundError quando a locação não existe', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.devolver(1, 1, false)).rejects.toThrow(NotFoundError);
    });

    it('lança ConflictError quando já foi devolvida', async () => {
      repository.findById.mockResolvedValue({ id: 1, usuarioId: 1, dataDevolucao: new Date() });
      await expect(service.devolver(1, 1, false)).rejects.toThrow(ConflictError);
    });

    it('lança ForbiddenError quando não é admin e não é o dono', async () => {
      repository.findById.mockResolvedValue({ id: 1, usuarioId: 2, dataDevolucao: null });
      await expect(service.devolver(1, 1, false)).rejects.toThrow(ForbiddenError);
      expect(repository.devolver).not.toHaveBeenCalled();
    });

    it('permite que admin devolva locação de outro usuário', async () => {
      repository.findById.mockResolvedValue({ id: 1, usuarioId: 2, dataDevolucao: null });
      repository.devolver.mockResolvedValue({ id: 1, dataDevolucao: new Date() });
      await service.devolver(1, 999, true);
      expect(repository.devolver).toHaveBeenCalledWith(1);
    });

    it('permite que o dono devolva a própria locação', async () => {
      repository.findById.mockResolvedValue({ id: 1, usuarioId: 1, dataDevolucao: null });
      repository.devolver.mockResolvedValue({ id: 1, dataDevolucao: new Date() });
      await service.devolver(1, 1, false);
      expect(repository.devolver).toHaveBeenCalledWith(1);
    });
  });
});
