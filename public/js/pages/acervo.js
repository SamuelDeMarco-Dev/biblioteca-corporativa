import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { mensagem, abrirModal, confirmarModal, aplicarErros, limparErros, esc } from '../ui.js';

let eu = { perfil: 'USUARIO', permissoes: [] };
let todos = [];

const grid = document.getElementById('grid');
const pode = (p) => eu.perfil === 'ADMINISTRADOR' || eu.permissoes.includes(p);
const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

const STATUS = {
  DISPONIVEL: { txt: 'Disponível', cor: '#2e9e5b' },
  LOCADO: { txt: 'Locado', cor: '#c0392b' },
  INDISPONIVEL: { txt: 'Indisponível', cor: '#e08a3c' },
  REMOVIDO: { txt: 'Removido', cor: '#616161' },
};

async function init() {
  iniciarLayout();
  const me = await exigirAcesso();
  if (!me) return;
  eu = me;

  if (pode('CADASTRAR_LIVROS')) {
    const btn = document.getElementById('btnNovoLivro');
    btn.hidden = false;
    btn.addEventListener('click', abrirModalNovoLivro);
  }

  wireFiltros();
  await carregar();
}

async function carregar() {
  const { ok, data } = await api.livros();
  todos = ok ? data : [];
  aplicarFiltros();
}

function render(livros) {
  if (!livros.length) { grid.innerHTML = '<p class="sem-acao">Nenhum livro encontrado.</p>'; return; }
  grid.innerHTML = '';

  livros.forEach((l) => {
    const disponivel = l.status === 'DISPONIVEL';
    const s = STATUS[l.status] ?? STATUS.INDISPONIVEL;

    let detalhe = '';
    if (l.status === 'DISPONIVEL') detalhe = `${l.exemplaresDisponiveis}/${l.totalExemplares} exemplares disponíveis`;
    else if (l.status === 'LOCADO') detalhe = `Disponível a partir de ${fmtData(l.dataPrevistaDisponibilidade)}`;

    const botoes = [];
    if (pode('LOCAR_LIVROS') && disponivel) botoes.push(`<button class="btn btn-primario" data-acao="locar" data-id="${l.id}">Locar</button>`);
    if (pode('CADASTRAR_LIVROS')) botoes.push(`<button class="btn" data-acao="exemplar" data-id="${l.id}">+ Exemplar</button>`);
    if (eu.perfil === 'ADMINISTRADOR') botoes.push(`<button class="btn btn-perigo" data-acao="excluir" data-id="${l.id}" data-titulo="${esc(l.titulo)}">Excluir</button>`);

    const card = document.createElement('div');
    card.className = `card livro-card st-${l.status}`;
    card.dataset.id = l.id;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="livro-topo">
        <h3>${esc(l.titulo)}</h3>
        <span class="badge" style="background:${s.cor}">${s.txt}</span>
      </div>
      <dl class="livro-meta">
        <div class="full"><dt>Autor(es)</dt><dd>${esc(l.autor)}</dd></div>
        <div class="full"><dt>Editora</dt><dd>${esc(l.editora) || '—'}</dd></div>
        <div><dt>Ano</dt><dd>${l.anoPublicacao ?? '—'}</dd></div>
        <div><dt>Edição</dt><dd>${esc(l.edicao) || '—'}</dd></div>
      </dl>
      ${detalhe ? `<p class="livro-detalhe">${detalhe}</p>` : ''}
      <div class="acoes">${botoes.join('') || '<span class="sem-acao">Sem ações disponíveis</span>'}</div>`;
    grid.appendChild(card);
  });
}

// Delegação: ações nos botões; clicar em qualquer outra parte do card abre os detalhes.
grid.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-acao]');
  if (b) {
    const id = Number(b.dataset.id);
    if (b.dataset.acao === 'locar') location.href = `/locacao.html?livroId=${id}`;
    else if (b.dataset.acao === 'exemplar') addExemplar(id);
    else if (b.dataset.acao === 'excluir') excluir(id, b.dataset.titulo);
    return;
  }
  const card = e.target.closest('.livro-card');
  if (card) abrirDetalhes(Number(card.dataset.id));
});
grid.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.livro-card');
  if (card && e.target === card) { e.preventDefault(); abrirDetalhes(Number(card.dataset.id)); }
});

// ===== Modal: detalhes do livro =====
function abrirDetalhes(id) {
  const l = todos.find((x) => x.id === id);
  if (!l) return;
  const s = STATUS[l.status] ?? STATUS.INDISPONIVEL;
  const linha = (rot, val) => (val || val === 0 ? `<div class="det-linha"><dt>${rot}</dt><dd>${esc(val)}</dd></div>` : '');

  let disp = '';
  if (l.status === 'DISPONIVEL') disp = `${l.exemplaresDisponiveis}/${l.totalExemplares} exemplares disponíveis`;
  else if (l.status === 'LOCADO') disp = `Disponível a partir de ${fmtData(l.dataPrevistaDisponibilidade)}`;

  const corpo = `
    <dl class="det-lista">
      ${linha('Autor(es)', l.autor)}
      ${linha('Editora', l.editora)}
      ${linha('Ano', l.anoPublicacao)}
      ${linha('Edição', l.edicao)}
      ${linha('ISBN', l.isbn)}
      ${linha('Observação', l.observacao)}
      ${linha('Exemplares', `${l.exemplaresDisponiveis}/${l.totalExemplares}`)}
      <div class="det-linha"><dt>Status</dt><dd><span class="badge" style="background:${s.cor}">${s.txt}</span></dd></div>
      ${disp ? `<div class="det-linha"><dt>Disponibilidade</dt><dd>${esc(disp)}</dd></div>` : ''}
    </dl>`;

  const acoes = [{ texto: 'Fechar', onClick: (f) => f() }];
  if (pode('LOCAR_LIVROS') && l.status === 'DISPONIVEL') {
    acoes.push({ texto: 'Locar', classe: 'btn-primario', onClick: () => { location.href = `/locacao.html?livroId=${l.id}`; } });
  }
  abrirModal({ titulo: l.titulo, corpoHTML: corpo, largura: 520, acoes });
}

// ===== Modal: cadastrar livro =====
function abrirModalNovoLivro() {
  const corpo = `
    <form id="formLivro" class="form" novalidate>
      <label for="titulo">Título</label>
      <input id="titulo" placeholder="Título" autocomplete="off" />
      <div id="sugestoes" class="card" style="display:none;padding:0;max-height:180px;overflow:auto;margin-top:4px"></div>
      <small id="apiAviso" style="color:var(--aviso);display:none">Sugestões indisponíveis no momento — cadastre manualmente.</small>
      <label for="autor">Autor(es)</label>
      <input id="autor" placeholder="Autor(es)" />
      <label for="editora">Editora</label>
      <input id="editora" placeholder="Editora" />
      <label for="anoPublicacao">Ano de publicação</label>
      <input id="anoPublicacao" type="number" placeholder="Ano de publicação" />
      <label for="edicao">Edição</label>
      <input id="edicao" placeholder="Edição" />
      <label for="observacao">Observação</label>
      <input id="observacao" placeholder="Observação" />
      <label for="isbn">ISBN (opcional)</label>
      <input id="isbn" placeholder="ISBN" />
      <label for="quantidadeExemplares">Quantidade de exemplares</label>
      <input id="quantidadeExemplares" type="number" min="1" value="1" />
    </form>
    <div id="duplicadoAlerta" class="alerta aviso" style="display:none;margin-top:16px">
      <p id="duplicadoTexto" style="margin:0 0 8px"></p>
      <button id="btnAdicionar" type="button" class="btn btn-primario">Adicionar exemplares ao livro existente</button>
    </div>`;

  const m = abrirModal({
    titulo: 'Cadastrar livro',
    corpoHTML: corpo,
    largura: 560,
    acoes: [
      { texto: 'Cancelar', onClick: (f) => f() },
      { texto: 'Salvar', classe: 'btn-primario', onClick: (f) => submeterLivro(m.body, f) },
    ],
  });
  wireAutocomplete(m.body);
}

function wireAutocomplete(root) {
  const inputTitulo = root.querySelector('#titulo');
  const box = root.querySelector('#sugestoes');
  let debounce;
  inputTitulo.addEventListener('input', () => {
    clearTimeout(debounce);
    const termo = inputTitulo.value.trim();
    if (termo.length < 2) { box.style.display = 'none'; return; }
    debounce = setTimeout(() => buscarSugestoes(termo, root), 300);
  });
  root.addEventListener('click', (e) => {
    if (e.target !== inputTitulo && !box.contains(e.target)) box.style.display = 'none';
  });
}

async function buscarSugestoes(termo, root) {
  const aviso = root.querySelector('#apiAviso');
  const box = root.querySelector('#sugestoes');
  aviso.style.display = 'none';
  const { data } = await api.buscarExterno(termo);
  if (!data || data.indisponivel) { aviso.style.display = 'block'; box.style.display = 'none'; return; }
  renderSugestoes(data.sugestoes || [], root);
}

function renderSugestoes(lista, root) {
  const box = root.querySelector('#sugestoes');
  if (!lista.length) { box.style.display = 'none'; return; }
  box.innerHTML = '';
  lista.forEach((s) => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:8px;cursor:pointer;border-bottom:1px solid var(--borda);';
    item.textContent = `${s.titulo}${s.autor ? ' — ' + s.autor : ''}${s.anoPublicacao ? ' (' + s.anoPublicacao + ')' : ''}`;
    item.addEventListener('click', () => {
      root.querySelector('#titulo').value = s.titulo || '';
      root.querySelector('#autor').value = s.autor || '';
      root.querySelector('#editora').value = s.editora || '';
      if (s.anoPublicacao) root.querySelector('#anoPublicacao').value = s.anoPublicacao;
      if (s.isbn) root.querySelector('#isbn').value = s.isbn;
      box.style.display = 'none';
    });
    box.appendChild(item);
  });
  box.style.display = 'block';
}

function lerFormLivro(root) {
  return {
    titulo: root.querySelector('#titulo').value,
    autor: root.querySelector('#autor').value,
    editora: root.querySelector('#editora').value,
    anoPublicacao: Number(root.querySelector('#anoPublicacao').value),
    edicao: root.querySelector('#edicao').value,
    observacao: root.querySelector('#observacao').value,
    isbn: root.querySelector('#isbn').value || undefined,
    quantidadeExemplares: Number(root.querySelector('#quantidadeExemplares').value),
  };
}

async function submeterLivro(root, fechar) {
  limparErros(root);
  root.querySelector('#duplicadoAlerta').style.display = 'none';
  const body = lerFormLivro(root);

  const { ok, status, data } = await api.criarLivro(body);

  if (status === 409 && data.duplicado) {
    root.querySelector('#duplicadoAlerta').style.display = 'block';
    root.querySelector('#duplicadoTexto').textContent =
      `O livro "${data.livro.titulo}" já está cadastrado (${data.exemplaresDisponiveis} de ${data.totalExemplares} disponível(is)). ` +
      `Deseja adicionar ${body.quantidadeExemplares} novo(s) exemplar(es) a ele?`;
    root.querySelector('#btnAdicionar').onclick = () => adicionarExemplaresLivro(data.livro.id, body.quantidadeExemplares, fechar);
    return;
  }
  if (!ok) {
    aplicarErros(data.campos, root);
    mensagem((data.erro || '').trim() === 'Você não tem permissão para esta ação'
      ? 'Você não tem permissão para cadastrar livros.' : (data.erro || 'Falha ao cadastrar'), 'erro');
    return;
  }
  fechar();
  mensagem(`Livro "${data.titulo}" cadastrado com ${data.exemplares.length} exemplar(es).`, 'sucesso');
  carregar();
}

async function adicionarExemplaresLivro(livroId, quantidade, fechar) {
  const { ok, data } = await api.adicionarExemplares(livroId, quantidade);
  if (!ok) { mensagem(data.erro || 'Falha ao adicionar exemplares', 'erro'); return; }
  fechar();
  mensagem(`Exemplares adicionados. Total agora: ${data.totalExemplares} (${data.exemplaresDisponiveis} disponível(is)).`, 'sucesso');
  carregar();
}

// ===== Modal: adicionar exemplares =====
function addExemplar(id) {
  const m = abrirModal({
    titulo: 'Adicionar exemplares',
    corpoHTML: `<div class="form"><label for="qtdEx">Quantos exemplares adicionar?</label><input id="qtdEx" type="number" min="1" value="1" /></div>`,
    acoes: [
      { texto: 'Cancelar', onClick: (f) => f() },
      { texto: 'Adicionar', classe: 'btn-primario', onClick: async (f) => {
          const qtd = Number(m.body.querySelector('#qtdEx').value);
          if (!qtd || qtd < 1) { aplicarErros({ qtdEx: 'Informe ao menos 1 exemplar' }, m.body); return; }
          const { ok, data } = await api.adicionarExemplares(id, qtd);
          if (!ok) { mensagem(data.erro || 'Falha ao adicionar exemplares', 'erro'); return; }
          f();
          mensagem(`Total de exemplares: ${data.totalExemplares} (${data.exemplaresDisponiveis} disponível(is)).`, 'sucesso');
          carregar();
        } },
    ],
  });
}

// ===== Excluir =====
async function excluir(id, titulo) {
  const ok = await confirmarModal({
    titulo: 'Remover livro',
    mensagem: `Remover o livro "${titulo}" do acervo? Esta ação não pode ser desfeita.`,
    textoConfirmar: 'Remover', perigo: true,
  });
  if (!ok) return;

  const resp = await api.excluirLivro(id);
  if (!resp.ok) {
    mensagem((resp.data.erro || '').trim() === 'Você não tem permissão para esta ação'
      ? 'Apenas administradores podem excluir livros.' : (resp.data.erro || 'Falha ao excluir'), 'erro');
    return;
  }
  mensagem('Livro removido do acervo.', 'sucesso');
  carregar();
}

// ===== Filtros =====
function aplicarFiltros() {
  const t = document.getElementById('fTitulo').value.trim().toLowerCase();
  const a = document.getElementById('fAutor').value.trim().toLowerCase();
  const e = document.getElementById('fEditora').value.trim().toLowerCase();
  const ano = document.getElementById('fAno').value.trim();
  const status = document.getElementById('fStatus').value;
  const soDisp = document.getElementById('fDisponivel').checked;

  render(todos.filter((l) => {
    if (t && !(l.titulo || '').toLowerCase().includes(t)) return false;
    if (a && !(l.autor || '').toLowerCase().includes(a)) return false;
    if (e && !(l.editora || '').toLowerCase().includes(e)) return false;
    if (ano && String(l.anoPublicacao ?? '') !== ano) return false;
    if (status && l.status !== status) return false;
    if (soDisp && l.status !== 'DISPONIVEL') return false;
    return true;
  }));
}

function wireFiltros() {
  ['fTitulo', 'fAutor', 'fEditora', 'fAno', 'fStatus', 'fDisponivel'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', aplicarFiltros);
    el.addEventListener('change', aplicarFiltros);
  });
  document.getElementById('fLimpar').addEventListener('click', () => {
    ['fTitulo', 'fAutor', 'fEditora', 'fAno'].forEach((id) => (document.getElementById(id).value = ''));
    document.getElementById('fStatus').value = '';
    document.getElementById('fDisponivel').checked = false;
    aplicarFiltros();
  });
}

init();
