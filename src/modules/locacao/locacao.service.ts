import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors';
import { LocacaoRepository } from './locacao.repository';

export class LocacaoService {
  constructor(private readonly locacaoRepository: LocacaoRepository) {}

  async locar(usuarioId: number, livroId: number, dias: number) {
    const resultado = await this.locacaoRepository.criarComExemplarDisponivel(
      usuarioId,
      livroId,
      dias,
    );
    if (!resultado) throw new ConflictError('Nenhum exemplar disponível para este livro');
    return resultado;
  }

  async listar(usuarioId: number, ehAdmin: boolean, meuFiltro: boolean) {
    const todos = ehAdmin && !meuFiltro;
    const locacoes = await this.locacaoRepository.findAll({ usuarioId, todos });

    const agora = Date.now();
    return locacoes.map((l) => {
      let status: 'ATIVA' | 'ATRASADA' | 'DEVOLVIDA';
      if (l.dataDevolucao) status = 'DEVOLVIDA';
      else if (l.dataPrevista.getTime() < agora) status = 'ATRASADA';
      else status = 'ATIVA';

      return {
        id: l.id,
        livro: l.exemplar.livro.titulo,
        autor: l.exemplar.livro.autor,
        exemplar: l.exemplar.codigo,
        dataLocacao: l.dataLocacao,
        prazo: l.dataPrevista,
        dataDevolucao: l.dataDevolucao,
        status,
        ativa: !l.dataDevolucao,
        usuario: l.usuario,
      };
    });
  }

  async devolver(locacaoId: number, usuarioId: number, ehAdmin: boolean) {
    const locacao = await this.locacaoRepository.findById(locacaoId);
    if (!locacao) throw new NotFoundError('Locação não encontrada');
    if (locacao.dataDevolucao) throw new ConflictError('Locação já devolvida');
    if (!ehAdmin && locacao.usuarioId !== usuarioId) {
      throw new ForbiddenError('Você só pode devolver suas próprias locações');
    }

    return this.locacaoRepository.devolver(locacaoId);
  }
}
