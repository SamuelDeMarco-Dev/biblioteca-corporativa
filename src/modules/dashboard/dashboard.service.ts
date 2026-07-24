import { DashboardRepository } from './dashboard.repository';

const LIMITE_RANKING = 5;
const LIMITE_ULTIMAS_LOCACOES = 5;

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async obter() {
    const [cadastrados, disponiveis, locados, grupos, ultimas] = await Promise.all([
      // Total de livros cadastrados (ativos, ou seja, não removidos)
      this.dashboardRepository.contarLivros(),
      this.dashboardRepository.contarLivros('DISPONIVEL'),
      this.dashboardRepository.contarLivros('LOCADO'),
      // Ranking: quem mais locou (conta locações por usuário)
      this.dashboardRepository.rankingLocacoes(LIMITE_RANKING),
      // Últimas locações realizadas
      this.dashboardRepository.ultimasLocacoes(LIMITE_ULTIMAS_LOCACOES),
    ]);

    // Resolve os nomes do ranking (groupBy só devolve o usuarioId)
    const ids = grupos.map((g) => g.usuarioId);
    const usuarios = await this.dashboardRepository.findNomesPorIds(ids);
    const ranking = grupos.map((g) => ({
      usuarioId: g.usuarioId,
      nome: usuarios.find((u) => u.id === g.usuarioId)?.nome ?? '—',
      total: g._count._all,
    }));

    return {
      totais: { cadastrados, disponiveis, locados },
      usuarioTop: ranking[0] ?? null, // critério: usuário que mais locou
      ranking,
      ultimasLocacoes: ultimas.map((l) => ({
        livro: l.exemplar.livro.titulo,
        usuario: l.usuario.nome,
        dataLocacao: l.dataLocacao,
        prazo: l.dataPrevista,
        devolvido: !!l.dataDevolucao,
      })),
    };
  }
}
