import { NotFoundError, ConflictError } from '../../shared/errors';
import { buscarLivrosExternos, OpenLibrarySugestao } from '../../shared/clients/open-library';
import { LivroRepository } from './livro.repository';
import { CriarLivroInput } from './livro.schema';
import { LivroDuplicadoError } from './livro.errors';

function contarDisponiveis(exemplares: { status: string }[]) {
  return exemplares.filter((e) => e.status === 'DISPONIVEL').length;
}

export class LivroService {
  constructor(private readonly livroRepository: LivroRepository) {}

  async cadastrar(dados: CriarLivroInput) {
    // Critério: detectar livro já cadastrado (mesmo título, autor, editora, ano e edição).
    const duplicado = await this.livroRepository.findAtivoDuplicado(dados);
    if (duplicado) {
      throw new LivroDuplicadoError({
        livro: duplicado,
        totalExemplares: duplicado.exemplares.length,
        exemplaresDisponiveis: contarDisponiveis(duplicado.exemplares),
      });
    }

    const { quantidadeExemplares, ...dadosLivro } = dados;
    return this.livroRepository.criarComExemplares(dadosLivro, quantidadeExemplares);
  }

  async adicionarExemplares(livroId: number, quantidade: number) {
    const livro = await this.livroRepository.findByIdComExemplares(livroId);
    if (!livro) throw new NotFoundError('Livro não encontrado');

    const atualizado = await this.livroRepository.adicionarExemplares(
      livroId,
      quantidade,
      livro.exemplares.length,
    );

    return {
      livro: atualizado,
      totalExemplares: atualizado!.exemplares.length,
      exemplaresDisponiveis: contarDisponiveis(atualizado!.exemplares),
    };
  }

  async listar() {
    const livros = await this.livroRepository.findAtivosComDisponibilidade();

    return livros.map((l) => {
      const total = l.exemplares.length;
      const disponiveis = contarDisponiveis(l.exemplares);
      const status = disponiveis > 0 ? 'DISPONIVEL' : 'LOCADO';

      let dataPrevistaDisponibilidade: Date | null = null;
      if (status === 'LOCADO') {
        const datas = l.exemplares
          .flatMap((e) => e.locacoes.map((loc) => loc.dataPrevista))
          .sort((a, b) => a.getTime() - b.getTime());
        dataPrevistaDisponibilidade = datas[0] ?? null;
      }

      return {
        id: l.id,
        titulo: l.titulo,
        autor: l.autor,
        editora: l.editora,
        anoPublicacao: l.anoPublicacao,
        edicao: l.edicao,
        isbn: l.isbn,
        totalExemplares: total,
        exemplaresDisponiveis: disponiveis,
        status: l.status,
        dataPrevistaDisponibilidade,
      };
    });
  }

  async buscarExterno(
    titulo: string,
  ): Promise<{ indisponivel: boolean; sugestoes: OpenLibrarySugestao[] }> {
    const tituloNormalizado = titulo.trim();
    if (tituloNormalizado.length < 2) return { indisponivel: false, sugestoes: [] };

    try {
      const sugestoes = await buscarLivrosExternos(tituloNormalizado);
      return { indisponivel: false, sugestoes };
    } catch {
      return { indisponivel: true, sugestoes: [] };
    }
  }

  async excluir(id: number): Promise<void> {
    const livro = await this.livroRepository.findByIdComExemplares(id);
    if (!livro) throw new NotFoundError('Livro não encontrado');

    const temLocado = livro.exemplares.some((e) => e.status === 'LOCADO');
    if (temLocado) throw new ConflictError('Livro possui exemplar locado - não pode ser excluido');

    await this.livroRepository.desativar(id);
  }
}
