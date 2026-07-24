import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../dashboard.service';

function mockRepository() {
  return {
    contarLivros: vi.fn(),
    rankingLocacoes: vi.fn(),
    ultimasLocacoes: vi.fn(),
    findNomesPorIds: vi.fn(),
  };
}

describe('DashboardService', () => {
  let repository: ReturnType<typeof mockRepository>;
  let service: DashboardService;

  beforeEach(() => {
    repository = mockRepository();
    service = new DashboardService(repository as never);
  });

  it('monta totais, ranking com nomes resolvidos e últimas locações', async () => {
    repository.contarLivros
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4);
    repository.rankingLocacoes.mockResolvedValue([
      { usuarioId: 1, _count: { _all: 3 } },
      { usuarioId: 2, _count: { _all: 1 } },
    ]);
    repository.findNomesPorIds.mockResolvedValue([
      { id: 1, nome: 'Ada' },
      { id: 2, nome: 'Bob' },
    ]);
    repository.ultimasLocacoes.mockResolvedValue([
      {
        exemplar: { livro: { titulo: 'Dom Casmurro' } },
        usuario: { nome: 'Ada' },
        dataLocacao: new Date('2026-01-01'),
        dataPrevista: new Date('2026-01-10'),
        dataDevolucao: null,
      },
    ]);

    const resultado = await service.obter();

    expect(resultado.totais).toEqual({ cadastrados: 10, disponiveis: 6, locados: 4 });
    expect(resultado.usuarioTop).toEqual({ usuarioId: 1, nome: 'Ada', total: 3 });
    expect(resultado.ranking).toHaveLength(2);
    expect(resultado.ultimasLocacoes[0]).toEqual({
      livro: 'Dom Casmurro',
      usuario: 'Ada',
      dataLocacao: new Date('2026-01-01'),
      prazo: new Date('2026-01-10'),
      devolvido: false,
    });
  });

  it('usuarioTop é null quando não há nenhuma locação', async () => {
    repository.contarLivros.mockResolvedValue(0);
    repository.rankingLocacoes.mockResolvedValue([]);
    repository.findNomesPorIds.mockResolvedValue([]);
    repository.ultimasLocacoes.mockResolvedValue([]);

    const resultado = await service.obter();
    expect(resultado.usuarioTop).toBeNull();
  });
});
