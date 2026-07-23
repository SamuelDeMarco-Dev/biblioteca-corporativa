// Camada de layout: monta a sidebar + topbar (com dropdown do usuário e modo
// noturno) e expõe o guard de acesso. Depende de api, ui e theme.
import { icone } from './ui.js';
import { api, logout } from './api.js';
import { temaAtual, alternarTema } from './theme.js';

const LINKS_BASE = [
  ['/home.html', 'Início', 'grafico'],
  ['/livros.html', 'Acervo', 'livro'],
  ['/minhas-locacoes.html', 'Minhas locações', 'relogio'],
];

const iniciais = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const marca = () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h9a3 3 0 0 1 3 3v15l-6-3-6 3V4a1 1 0 0 1 1-1z" opacity=".55"/><path d="M13 3h6a1 1 0 0 1 1 1v16l-5-2.5V6a3 3 0 0 0-2-2.83z"/></svg>`;

// Guard: garante sessão e (opcionalmente) admin/permissão. Redireciona quem não pode.
export async function exigirAcesso({ permissao, admin } = {}) {
  if (!localStorage.getItem('token')) { location.href = '/'; return null; }
  const r = await api.me();
  if (!r.ok || !r.data || !r.data.perfil) { localStorage.clear(); location.href = '/'; return null; }
  const me = r.data;
  const ehAdmin = me.perfil === 'ADMINISTRADOR';
  const pode = ehAdmin || (me.permissoes || []).includes(permissao);
  if (admin && !ehAdmin) { location.href = '/home.html'; return null; }
  if (permissao && !pode) { location.href = '/home.html'; return null; }
  return me;
}

export async function iniciarLayout() {
  if (document.querySelector('.topbar')) return; // idempotente: nunca duplica a topbar/sidebar
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!localStorage.getItem('token') || !usuario) return;

  const r = await api.me();
  const perfil = r.ok ? r.data.perfil : usuario.perfil;

  const links = [...LINKS_BASE];
  if (perfil === 'ADMINISTRADOR') links.push(['/admin-usuarios.html', 'Usuários', 'usuarios']);
  const atual = location.pathname;

  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="marca">${marca()} Biblioteca</div>
    <nav>${links.map(([h, t, ic]) => `<a href="${h}" class="${atual === h ? 'ativo' : ''}">${icone(ic)}<span>${t}</span></a>`).join('')}</nav>
    <div class="rodape"><div class="powered">Biblioteca Interna</div></div>`;

  const titulo = (document.querySelector('main h1')?.textContent || document.title || '').trim();
  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <button class="toggle" type="button" aria-label="Menu">${icone('menu')}</button>
    <span class="titulo">${titulo}</span>
    <div class="topbar-direita">
      <button class="tema-btn" type="button" aria-label="Alternar tema"></button>
      <div class="usuario">
        <button class="user-btn" type="button" aria-haspopup="true" aria-expanded="false">
          <span class="avatar">${iniciais(usuario.nome)}</span>
          <span class="nome">${usuario.nome}</span>
          ${icone('chevron')}
        </button>
        <div class="user-drop" hidden>
          <button class="drop-item perigo" type="button" data-acao="sair">${icone('sair')} Sair</button>
        </div>
      </div>
    </div>`;

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  document.body.classList.add('app-shell');
  document.body.prepend(overlay);
  document.body.prepend(aside);
  (document.querySelector('main') || document.body).insertAdjacentElement('beforebegin', header);

  const h1 = document.querySelector('main h1');
  if (h1) h1.style.display = 'none';

  // Menu lateral (mobile)
  const fecharMenu = () => document.body.classList.remove('sidebar-aberta');
  header.querySelector('.toggle').addEventListener('click', () => document.body.classList.toggle('sidebar-aberta'));
  overlay.addEventListener('click', fecharMenu);
  aside.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', fecharMenu));

  // Botão de tema (ícone independente ao lado do usuário)
  const temaBtn = header.querySelector('.tema-btn');
  const rotularTema = () => {
    temaBtn.innerHTML = temaAtual() === 'dark' ? icone('sol') : icone('lua');
    const rot = temaAtual() === 'dark' ? 'Ativar modo claro' : 'Ativar modo noturno';
    temaBtn.setAttribute('aria-label', rot);
    temaBtn.title = rot;
  };
  rotularTema();
  temaBtn.addEventListener('click', () => { alternarTema(); rotularTema(); });

  // Dropdown do usuário (agora só com "Sair")
  const usuarioEl = header.querySelector('.usuario');
  const userBtn = header.querySelector('.user-btn');
  const drop = header.querySelector('.user-drop');
  const setDrop = (aberto) => {
    drop.toggleAttribute('hidden', !aberto);
    userBtn.setAttribute('aria-expanded', String(aberto));
  };
  userBtn.addEventListener('click', (e) => { e.stopPropagation(); setDrop(drop.hasAttribute('hidden')); });
  document.addEventListener('click', (e) => { if (!usuarioEl.contains(e.target)) setDrop(false); });
  drop.querySelector('[data-acao="sair"]').addEventListener('click', logout);
}
