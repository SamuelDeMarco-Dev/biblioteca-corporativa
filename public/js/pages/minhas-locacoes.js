import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { mensagem, confirmarModal, abrirModal, esc, icone } from '../ui.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const DIA = 86400000;
let historico = []; // guardado para o modal de histórico
let ativasCache = []; // guardado para o modal de detalhes do card

async function init() {
  iniciarLayout();
  const eu = await exigirAcesso();
  if (!eu) return;
  await carregar();
}

async function carregar() {
  // Sempre só as locações do usuário logado (meu=true força isso até para admin).
  // A visão de todos os usuários fica no Painel geral.
  const { ok, data } = await api.locacoes(true);
  const locacoes = ok ? data : [];
  const ativas = locacoes.filter((l) => l.ativa);
  ativasCache = ativas;
  historico = locacoes.filter((l) => !l.ativa);

  const atrasadas = ativas.filter((l) => l.status === 'ATRASADA').length;
  document.getElementById('contAtivas').textContent = ativas.length - atrasadas;
  document.getElementById('contAtraso').textContent = atrasadas;
  document.getElementById('contHist').textContent = historico.length;

  renderAtivas(ativas);
}

// Calcula a urgência do prazo: define a cor e o texto exibido no card.
function urgencia(l) {
  if (l.status === 'ATRASADA') {
    const dias = Math.max(1, Math.ceil((Date.now() - new Date(l.prazo).getTime()) / DIA));
    return { classe: 'atraso', texto: `Atrasado há ${dias} ${dias === 1 ? 'dia' : 'dias'}` };
  }
  const dias = Math.ceil((new Date(l.prazo).getTime() - Date.now()) / DIA);
  if (dias <= 0) return { classe: 'alerta', texto: 'Vence hoje' };
  if (dias === 1) return { classe: 'alerta', texto: 'Vence amanhã' };
  if (dias <= 3) return { classe: 'alerta', texto: `Vence em ${dias} dias` };
  return { classe: 'ok', texto: `${dias} dias restantes` };
}

function renderAtivas(lista) {
  const grid = document.getElementById('ativas');
  if (!lista.length) {
    grid.classList.remove('cards-locacoes');
    grid.innerHTML = `<div class="estado-vazio">${icone('relogio')}<p>Nenhuma locação ativa no momento.</p></div>`;
    return;
  }
  grid.classList.add('cards-locacoes');
  grid.innerHTML = lista.map((l) => {
    const u = urgencia(l);
    return `<article class="loc-card ${u.classe}" data-id="${l.id}" tabindex="0">
      <div class="loc-card-topo">
        <h3>${esc(l.livro)}</h3>
        <span class="badge ${l.status}">${l.status}</span>
      </div>
      <p class="loc-autor">${esc(l.autor ?? '—')}</p>
      <dl class="loc-meta">
        <div><dt>Exemplar</dt><dd>${esc(l.exemplar)}</dd></div>
        <div><dt>Locado em</dt><dd>${fmt(l.dataLocacao)}</dd></div>
      </dl>
      <div class="loc-prazo ${u.classe}">
        ${icone('relogio')}
        <span class="loc-prazo-txt">
          <span class="loc-prazo-rotulo">Prazo de devolução</span>
          <strong>${u.texto} <span class="loc-prazo-data">· ${fmt(l.prazo)}</span></strong>
        </span>
      </div>
      <div class="loc-card-acoes">
        <button class="btn btn-primario" data-id="${l.id}" data-titulo="${esc(l.livro)}">Devolver</button>
      </div>
    </article>`;
  }).join('');
}

// Delegação: "Devolver" devolve; clicar em qualquer outra parte do card abre os detalhes.
const grade = document.getElementById('ativas');
grade.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (b) { devolver(Number(b.dataset.id), b.dataset.titulo); return; }
  const card = e.target.closest('.loc-card');
  if (card) abrirDetalhes(Number(card.dataset.id));
});
// Acessibilidade: Enter/Espaço no card também abre os detalhes.
grade.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.loc-card');
  if (card && e.target === card) { e.preventDefault(); abrirDetalhes(Number(card.dataset.id)); }
});

function abrirDetalhes(id) {
  const l = ativasCache.find((x) => x.id === id);
  if (!l) return;
  const u = urgencia(l);
  const linha = (rot, val) => `<div class="det-linha"><dt>${rot}</dt><dd>${esc(val)}</dd></div>`;
  const corpo = `
    <dl class="det-lista">
      ${linha('Livro', l.livro)}
      ${linha('Autor', l.autor ?? '—')}
      ${linha('Exemplar', l.exemplar)}
      ${linha('Locado em', fmt(l.dataLocacao))}
      ${linha('Prazo', fmt(l.prazo))}
      <div class="det-linha"><dt>Situação</dt><dd><span class="badge ${l.status}">${l.status}</span> <span class="det-urg ${u.classe}">${u.texto}</span></dd></div>
    </dl>`;
  abrirModal({
    titulo: 'Detalhes da locação',
    corpoHTML: corpo,
    largura: 480,
    acoes: [
      { texto: 'Fechar', onClick: (f) => f() },
      { texto: 'Devolver', classe: 'btn-primario', onClick: (f) => { f(); devolver(l.id, l.livro); } },
    ],
  });
}

async function devolver(id, titulo) {
  const ok = await confirmarModal({
    titulo: 'Confirmar devolução',
    mensagem: `Confirmar a devolução de "${titulo}"?`,
    textoConfirmar: 'Devolver',
  });
  if (!ok) return;

  const resp = await api.devolver(id);
  if (!resp.ok) {
    mensagem((resp.data.erro || '').trim() === 'Você não tem permissão para esta ação'
      ? 'Você não tem permissão para devolver livros.' : (resp.data.erro || 'Falha na devolução'), 'erro');
    return;
  }
  mensagem('Devolução registrada!', 'sucesso');
  carregar();
}

// ---- Histórico em modal, com filtro ----
document.getElementById('btnHistorico').addEventListener('click', abrirHistorico);

function abrirHistorico() {
  const corpo = `
    <div class="hist-filtros">
      <input type="search" id="histBusca" class="campo-busca" placeholder="Buscar por livro ou exemplar…" autocomplete="off" />
    </div>
    <div class="tabela-scroll hist-scroll">
      <table>
        <thead><tr><th>Livro</th><th>Exemplar</th><th>Locado em</th><th>Prazo</th><th>Devolvido em</th></tr></thead>
        <tbody id="histBody"></tbody>
      </table>
    </div>
    <p class="hist-vazio" id="histVazio" hidden>Nenhum registro encontrado.</p>`;

  const { body } = abrirModal({ titulo: 'Histórico de locações', corpoHTML: corpo, largura: 880 });
  const busca = body.querySelector('#histBusca');
  const tbody = body.querySelector('#histBody');
  const vazio = body.querySelector('#histVazio');

  const pintar = (termo = '') => {
    const t = termo.trim().toLowerCase();
    const filtradas = historico.filter((l) => !t
      || [l.livro, l.exemplar].some((c) => (c || '').toLowerCase().includes(t)));

    vazio.hidden = filtradas.length > 0;
    tbody.innerHTML = filtradas.map((l) => `<tr>
        <td>${esc(l.livro)}</td><td>${esc(l.exemplar)}</td>
        <td>${fmt(l.dataLocacao)}</td><td>${fmt(l.prazo)}</td><td>${fmt(l.dataDevolucao)}</td>
      </tr>`).join('');
  };

  busca.addEventListener('input', () => pintar(busca.value));
  pintar();
}

init();
