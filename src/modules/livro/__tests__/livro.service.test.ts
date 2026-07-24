import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivroService } from '../livro.service';
import { LivroDuplicadoError } from '../livro.errors';
import { NotFoundError, ConflictError } from '../../../shared/errors';
import { buscarLivrosExternos } from '../../../shared/clients/open-library';

vi.mock('../../../shared/clients/open-library', () => ({
  buscarLivrosExternos: vi.fn(),
}));

function mockRepository() {
  return {
    findAtivoDuplicado: vi.fn(),
    criarComExemplares: vi.fn(),
    findByIdComExemplares: vi.fn(),
    adicionarExemplares: vi.fn(),
    findAtivosComDisponibilidade: vi.fn(),
    desativar: vi.fn(),
  };
}

describe('LivroService', () => {
  let repository: ReturnType<typeof mockRepository>;
  let service: LivroService;

  beforeEach(() => {
    repository = mockRepository();
    service = new LivroService(repository as never);
    vi.clearAllMocks();
  });

  describe('cadastrar', () => {
    it('lança LivroDuplicadoError com os detalhes do duplicado', async () => {
      repository.findAtivoDuplicado.mockResolvedValue({
        id: 1,
        exemplares: [{ status: 'DISPONIVEL' }, { status: 'LOCADO' }],
      });

      const dados = {
        titulo: 'Dom Casmurro',
        autor: 'Machado',
        edicao: '1',
        anoPublicacao: 1899,
        quantidadeExemplares: 1,
      } as never;

      await expect(service.cadastrar(dados)).rejects.toThrow(LivroDuplicadoError);
      expect(repository.criarComExemplares).not.toHaveBeenCalled();
    });

    it('cria o livro quando não há duplicado', async () => {
      repository.findAtivoDuplicado.mockResolvedValue(null);
      repository.criarComExemplares.mockResolvedValue({ id: 1, exemplares: [] });

      await service.cadastrar({
        titulo: 'Dom Casmurro',
        autor: 'Machado',
        edicao: '1',
        anoPublicacao: 1899,
        quantidadeExemplares: 3,
      } as never);

      expect(repository.criarComExemplares).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Dom Casmurro' }),
        3,
      );
    });
  });

  describe('adicionarExemplares', () => {
    it('lança NotFoundError quando o livro não existe', async () => {
      repository.findByIdComExemplares.mockResolvedValue(null);
      await expect(service.adicionarExemplares(1, 2)).rejects.toThrow(NotFoundError);
    });

    it('retorna as contagens atualizadas', async () => {
      repository.findByIdComExemplares.mockResolvedValue({
        id: 1,
        exemplares: [{ status: 'DISPONIVEL' }],
      });
      repository.adicionarExemplares.mockResolvedValue({
        exemplares: [{ status: 'DISPONIVEL' }, { status: 'DISPONIVEL' }],
      });

      const resultado = await service.adicionarExemplares(1, 1);
      expect(resultado.totalExemplares).toBe(2);
      expect(resultado.exemplaresDisponiveis).toBe(2);
    });
  });

  describe('buscarExterno', () => {
    it('retorna lista vazia sem chamar a API quando o título tem menos de 2 caracteres', async () => {
      const resultado = await service.buscarExterno('a');
      expect(resultado).toEqual({ indisponivel: false, sugestoes: [] });
      expect(buscarLivrosExternos).not.toHaveBeenCalled();
    });

    it('retorna indisponivel:true quando a chamada externa falha (degradação graciosa)', async () => {
      vi.mocked(buscarLivrosExternos).mockRejectedValue(new Error('timeout'));
      const resultado = await service.buscarExterno('dom casmurro');
      expect(resultado).toEqual({ indisponivel: true, sugestoes: [] });
    });

    it('retorna as sugestões quando a chamada externa funciona', async () => {
      vi.mocked(buscarLivrosExternos).mockResolvedValue([
        { titulo: 'Dom Casmurro', autor: 'Machado', editora: '', anoPublicacao: 1899, isbn: '' },
      ]);
      const resultado = await service.buscarExterno('dom casmurro');
      expect(resultado.indisponivel).toBe(false);
      expect(resultado.sugestoes).toHaveLength(1);
    });
  });

  describe('excluir', () => {
    it('lança NotFoundError quando o livro não existe', async () => {
      repository.findByIdComExemplares.mockResolvedValue(null);
      await expect(service.excluir(1)).rejects.toThrow(NotFoundError);
    });

    it('lança ConflictError quando há exemplar locado', async () => {
      repository.findByIdComExemplares.mockResolvedValue({ exemplares: [{ status: 'LOCADO' }] });
      await expect(service.excluir(1)).rejects.toThrow(ConflictError);
      expect(repository.desativar).not.toHaveBeenCalled();
    });

    it('desativa o livro quando não há exemplar locado', async () => {
      repository.findByIdComExemplares.mockResolvedValue({
        exemplares: [{ status: 'DISPONIVEL' }],
      });
      await service.excluir(1);
      expect(repository.desativar).toHaveBeenCalledWith(1);
    });
  });
});
