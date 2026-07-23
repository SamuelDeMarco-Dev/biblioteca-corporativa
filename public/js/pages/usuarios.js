import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { mensagem, abrirModal, aplicarErros, limparErros, validacoes, esc } from '../ui.js';

const SETORES = ['SUPORTE', 'SERVICOS', 'SANCONHUB', 'ADMINISTRATIVO', 'COMERCIAL', 'MARKETING', 'TI', 'RH', 'DIRETORIA'];
const rotuloSetor = (s) => s.charAt(0) + s.slice(1).toLowerCase();

let permissoes = [];
let usuariosCache = [];

async function init() {
  iniciarLayout();
  if (!(await exigirAcesso({ admin: true }))) return;
  document.getElementById('btnNovoUsuario').addEventListener('click', abrirModalNovoUsuario);

  const tbody = document.getElementById('lista');
  tbody.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const u = usuariosCache.find((x) => x.id === Number(b.dataset.id));
    if (u) abrirModalEditar(u);
  });

  await carregar();
}

async function carregar() {
  const [rU, rP] = await Promise.all([api.usuarios(), api.permissoes()]);
  if (rU.status === 403) { location.href = '/home.html'; return; }
  usuariosCache = rU.ok ? rU.data : [];
  permissoes = rP.ok ? rP.data : [];
  render(usuariosCache);
}

function render(usuarios) {
  const tbody = document.getElementById('lista');
  document.getElementById('contUsuarios').textContent = usuarios.length;
  if (!usuarios.length) { tbody.innerHTML = '<tr><td class="vazio" colspan="6">Nenhum usuário cadastrado.</td></tr>'; return; }
  tbody.innerHTML = usuarios.map((u) => `
    <tr>
      <td>${u.id}</td>
      <td>${esc(u.email)}</td>
      <td>${esc(u.nome)}</td>
      <td>${u.perfil === 'ADMINISTRADOR'
        ? '<span class="badge" style="background:var(--primaria)">Administrador</span>'
        : '<span class="badge" style="background:#7b8794">Usuário</span>'}</td>
      <td><span class="contador">${u.permissoes.length}</span></td>
      <td style="text-align:right"><button class="btn" data-id="${u.id}">Editar</button></td>
    </tr>`).join('');
}

function validarNovoUsuario(d) {
  const erros = {};
  if (!d.nome.trim()) erros.nome = 'Nome é obrigatório';
  if (!validacoes.email(d.email)) erros.email = 'E-mail inválido';
  if (!validacoes.cpf(d.cpf)) erros.cpf = 'CPF inválido';
  if ((d.senha || '').length < 6) erros.senha = 'Senha deve ter ao menos 6 caracteres';
  return Object.keys(erros).length ? erros : null;
}

// ===== Cadastro =====
function abrirModalNovoUsuario() {
  const opcoesSetor = SETORES.map((s) => `<option value="${s}">${rotuloSetor(s)}</option>`).join('');
  const corpo = `
    <form id="formNovo" class="form" novalidate>
      <label for="nome">Nome</label>
      <input id="nome" placeholder="Nome completo" />
      <label for="email">E-mail</label>
      <input id="email" type="email" placeholder="email@empresa.com" />
      <label for="cpf">CPF</label>
      <input id="cpf" inputmode="numeric" maxlength="11" placeholder="Somente números (11 dígitos)" />
      <label for="senha">Senha</label>
      <input id="senha" type="password" placeholder="Mínimo 6 caracteres" />
      <label for="setor">Setor</label>
      <select id="setor">${opcoesSetor}</select>
      <label for="perfil">Perfil</label>
      <select id="perfil"><option value="USUARIO">Usuário</option><option value="ADMINISTRADOR">Administrador</option></select>
    </form>`;
  const m = abrirModal({
    titulo: 'Cadastrar novo usuário',
    largura: 480,
    corpoHTML: corpo,
    acoes: [
      { texto: 'Cancelar', onClick: (f) => f() },
      { texto: 'Cadastrar', classe: 'btn-primario', onClick: (f) => cadastrarUsuario(m.body, f) },
    ],
  });
}

async function cadastrarUsuario(root, fechar) {
  limparErros(root);
  const dados = {
    nome: root.querySelector('#nome').value,
    email: root.querySelector('#email').value.trim(),
    cpf: root.querySelector('#cpf').value.replace(/\D/g, ''),
    senha: root.querySelector('#senha').value,
    setor: root.querySelector('#setor').value,
    perfil: root.querySelector('#perfil').value,
  };
  const errosLocais = validarNovoUsuario(dados);
  if (errosLocais) { aplicarErros(errosLocais, root); return; }

  const { ok, data } = await api.criarUsuario(dados);
  if (!ok) { aplicarErros(data.campos, root); mensagem(data.erro || 'Falha ao cadastrar usuário', 'erro'); return; }
  fechar();
  mensagem(`Usuário "${data.nome}" cadastrado com sucesso.`, 'sucesso');
  carregar();
}

// ===== Edição + permissões =====
function abrirModalEditar(u) {
  const checks = permissoes.map((p) => `
    <label style="display:flex;align-items:center;gap:8px;font-weight:normal;margin:6px 0">
      <input type="checkbox" data-pid="${p.id}" ${u.permissoes.some((x) => x.id === p.id) ? 'checked' : ''} style="width:auto" />
      ${esc(p.nome)}
    </label>`).join('');
  const corpo = `
    <div class="form">
      <label for="edNome">Nome</label>
      <input id="edNome" value="${esc(u.nome)}" />
      <label for="edPerfil">Perfil</label>
      <select id="edPerfil">
        <option value="USUARIO" ${u.perfil === 'USUARIO' ? 'selected' : ''}>Usuário</option>
        <option value="ADMINISTRADOR" ${u.perfil === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
      </select>
      <label style="margin-top:14px">Permissões</label>
      <div>${checks}</div>
    </div>`;
  const orig = new Set(u.permissoes.map((p) => p.id));
  const m = abrirModal({
    titulo: `Editar — ${esc(u.email)}`,
    largura: 460,
    corpoHTML: corpo,
    acoes: [
      { texto: 'Cancelar', onClick: (f) => f() },
      { texto: 'Salvar', classe: 'btn-primario', onClick: (f) => salvarEdicao(u.id, m.body, orig, f) },
    ],
  });
}

async function salvarEdicao(id, root, orig, fechar) {
  limparErros(root);
  const nome = root.querySelector('#edNome').value;
  const perfil = root.querySelector('#edPerfil').value;
  if (!nome.trim()) { aplicarErros({ edNome: 'Nome é obrigatório' }, root); return; }

  const r1 = await api.editarUsuario(id, { nome, perfil });
  if (!r1.ok) { aplicarErros(r1.data.campos, root); mensagem(r1.data.erro || 'Falha ao salvar dados', 'erro'); return; }

  const marcados = new Set([...root.querySelectorAll('input[type=checkbox]')].filter((c) => c.checked).map((c) => Number(c.dataset.pid)));
  const habilitar = [...marcados].filter((pid) => !orig.has(pid));
  const desabilitar = [...orig].filter((pid) => !marcados.has(pid));
  if (habilitar.length || desabilitar.length) {
    const r2 = await api.atualizarPermissoes(id, { habilitar, desabilitar });
    if (!r2.ok) { mensagem(r2.data.erro || 'Dados salvos, mas falhou ao atualizar permissões.', 'erro'); carregar(); return; }
  }
  fechar();
  mensagem(`Usuário #${id} atualizado com sucesso.`, 'sucesso');
  carregar();
}

init();
