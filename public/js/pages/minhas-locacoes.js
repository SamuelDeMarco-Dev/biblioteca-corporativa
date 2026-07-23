import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { mensagem, confirmarModal, esc } from '../ui.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
let ehAdmin = false;

async function init() {
  iniciarLayout();
  const eu = await exigirAcesso();
  if (!eu) return;
  ehAdmin = eu.perfil === 'ADMINISTRADOR';
  if (ehAdmin) document.getElementById('titulo').textContent = 'Locações (todos os usuários)';
  await carregar();
}

async function carregar() {
  const { ok, data } = await api.locacoes();
  const locacoes = ok ? data : [];
  const ativas = locacoes.filter((l) => l.ativa);
  const historico = locacoes.filter((l) => !l.ativa);

  document.getElementById('contAtivas').textContent = ativas.length;
  document.getElementById('contHist').textContent = historico.length;

  montarCabecalhos();
  render(ativas, 'ativas', true);
  render(historico, 'historico', false);
}

function montarCabecalhos() {
  const base = ['Livro', 'Exemplar', 'Locação', 'Prazo', 'Status'];
  const cols = ehAdmin ? ['Usuário', ...base] : base;
  document.getElementById('thAtivas').innerHTML = cols.map((c) => `<th>${c}</th>`).join('') + '<th>Ação</th>';
  document.getElementById('thHist').innerHTML = cols.map((c) => `<th>${c}</th>`).join('') + '<th>Devolvido em</th>';
}

function render(lista, tbodyId, ativas) {
  const tbody = document.getElementById(tbodyId);
  if (!lista.length) { tbody.innerHTML = '<tr><td class="vazio" colspan="8">Nenhuma locação por aqui.</td></tr>'; return; }
  tbody.innerHTML = lista.map((l) => {
    const usuarioCol = ehAdmin ? `<td>${esc(l.usuario?.nome ?? '—')}</td>` : '';
    const acao = ativas
      ? `<td><button class="btn btn-primario" data-id="${l.id}" data-titulo="${esc(l.livro)}">Devolver</button></td>`
      : `<td>${fmt(l.dataDevolucao)}</td>`;
    return `<tr>
      ${usuarioCol}
      <td>${esc(l.livro)}</td><td>${esc(l.exemplar)}</td>
      <td>${fmt(l.dataLocacao)}</td><td>${fmt(l.prazo)}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      ${acao}
    </tr>`;
  }).join('');
}

// Delegação: botões "Devolver" na tabela de ativas
document.getElementById('ativas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (b) devolver(Number(b.dataset.id), b.dataset.titulo);
});

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

init();
