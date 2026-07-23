import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { mensagem } from '../ui.js';

const fmt = (d) => d.toLocaleDateString('pt-BR');
const livroIdParam = new URLSearchParams(location.search).get('livroId');
const select = document.getElementById('livroId');
const diasInput = document.getElementById('dias');
let disponiveis = [];

async function init() {
  iniciarLayout();
  const eu = await exigirAcesso();
  if (!eu) return;
  document.getElementById('usuario').value = `${eu.nome} (${eu.email})`;
  await carregar();
}

async function carregar() {
  const { ok, data } = await api.livros();
  disponiveis = (ok ? data : []).filter((l) => l.status === 'DISPONIVEL');

  if (!disponiveis.length) {
    select.innerHTML = '<option value="">Nenhum livro disponível</option>';
    document.querySelector('#form button[type=submit]').disabled = true;
    atualizarResumo();
    return;
  }

  select.innerHTML = disponiveis
    .map((l) => `<option value="${l.id}">${l.titulo} — ${l.autor} (${l.exemplaresDisponiveis} disp.)</option>`).join('');

  if (livroIdParam && disponiveis.some((l) => String(l.id) === String(livroIdParam))) {
    select.value = String(livroIdParam);
  }
  atualizarResumo();
  atualizarPrevisao();
}

function atualizarResumo() {
  const l = disponiveis.find((x) => String(x.id) === select.value);
  const disp = document.getElementById('rDisp');
  if (!l) {
    document.getElementById('rLivro').textContent = 'Nenhum livro selecionado';
    document.getElementById('rInfo').textContent = '—';
    disp.style.display = 'none';
    return;
  }
  document.getElementById('rLivro').textContent = l.titulo;
  document.getElementById('rInfo').textContent = `${l.autor} · ${l.editora ?? '—'} · ${l.anoPublicacao ?? '—'}`;
  disp.textContent = `${l.exemplaresDisponiveis} exemplar(es) disponível(is)`;
  disp.style.display = '';
}

function atualizarPrevisao() {
  const dias = Number(diasInput.value) || 0;
  document.getElementById('previsao').textContent = dias > 0 ? fmt(new Date(Date.now() + dias * 86400000)) : '—';
}

select.addEventListener('change', atualizarResumo);
diasInput.addEventListener('input', atualizarPrevisao);

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { livroId: Number(select.value), dias: Number(diasInput.value) };
  if (!body.livroId) { mensagem('Selecione um livro.', 'aviso'); return; }

  const { ok, data } = await api.locar(body);
  if (!ok) {
    mensagem((data.erro || '').trim() === 'Você não tem permissão para esta ação'
      ? 'Você não tem permissão para locar livros.' : (data.erro || 'Falha ao locar'), 'erro');
    return;
  }
  mensagem(`Locação registrada! Exemplar ${data.exemplar}. Devolver até ${fmt(new Date(data.dataPrevista))}.`, 'sucesso');
  carregar();
});

init();
