import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { esc, mensagem } from '../ui.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

async function init() {
  iniciarLayout();
  const eu = await exigirAcesso();
  if (!eu) return;

  if (eu.perfil === 'ADMINISTRADOR') {
    document.getElementById('painelAdmin').hidden = false;
    await carregarDashboard();
  } else {
    document.getElementById('nomeComum').textContent = eu.nome;
    document.getElementById('painelComum').hidden = false;
  }
}

async function carregarDashboard() {
  const { ok, data: d } = await api.dashboard();
  if (!ok) { mensagem('Não foi possível carregar os indicadores. Tente novamente.', 'erro'); return; }

  // Stat-tiles
  document.getElementById('cards').innerHTML = `
    <div class="card stat stat-teal"><div class="num">${d.totais.cadastrados}</div>Livros cadastrados</div>
    <div class="card stat stat-verde"><div class="num">${d.totais.disponiveis}</div>Disponíveis</div>
    <div class="card stat stat-laranja"><div class="num">${d.totais.locados}</div>Locados</div>`;

  // Destaque
  document.getElementById('topUsuario').innerHTML = d.usuarioTop
    ? `Maior locador: <strong>${esc(d.usuarioTop.nome)}</strong> — ${d.usuarioTop.total} locação(ões)`
    : 'Nenhuma locação registrada ainda.';

  // Gráfico de barras — ranking
  const ranking = d.ranking || [];
  const max = ranking.reduce((m, r) => Math.max(m, r.total), 0) || 1;
  document.getElementById('ranking').innerHTML = ranking.length
    ? ranking.map((r) => `
        <div class="barra-row">
          <span class="rot" title="${esc(r.nome)}">${esc(r.nome)}</span>
          <div class="barra-track"><div class="barra-fill" style="width:${((r.total / max) * 100).toFixed(1)}%"></div></div>
          <span class="barra-val">${r.total}</span>
        </div>`).join('')
    : '<p class="sem-acao">Sem dados de locação.</p>';

  // Donut — situação do acervo (disponíveis x locados)
  const disp = d.totais.disponiveis || 0;
  const loc = d.totais.locados || 0;
  const total = (disp + loc) || 1;
  const donut = document.getElementById('donut');
  donut.style.setProperty('--p1', ((disp / total) * 100).toFixed(1));
  donut.style.setProperty('--p2', ((loc / total) * 100).toFixed(1));
  document.getElementById('donutLeg').innerHTML = `
    <div class="item"><span class="pt" style="background:var(--sucesso)"></span> Disponíveis <strong>${disp}</strong></div>
    <div class="item"><span class="pt" style="background:var(--aviso)"></span> Locados <strong>${loc}</strong></div>
    <div class="item"><span class="pt" style="background:var(--chip)"></span> Cadastrados <strong>${d.totais.cadastrados}</strong></div>`;

  // Últimas locações
  document.getElementById('ultimas').innerHTML = d.ultimasLocacoes.length
    ? d.ultimasLocacoes.map((l) => `<tr><td>${esc(l.livro)}</td><td>${esc(l.usuario)}</td><td>${fmt(l.dataLocacao)}</td><td>${fmt(l.prazo)}</td><td>${l.devolvido ? 'Devolvido' : 'Ativa'}</td></tr>`).join('')
    : '<tr><td class="vazio" colspan="5">Sem locações</td></tr>';
}

init();
