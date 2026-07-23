(function () {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  // Ícones (Feather-style, traço) usados no menu e na topbar
  const ICONES = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    livro: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    mais: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    grafico: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  const svg = (nome, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICONES[nome]}</svg>`;
  // Marca (livro estilizado) para sidebar/topbar/login
  window.marcaSVG = (extra = '') =>
    `<svg viewBox="0 0 24 24" fill="currentColor" ${extra}><path d="M4 3h9a3 3 0 0 1 3 3v15l-6-3-6 3V4a1 1 0 0 1 1-1z" opacity=".55"/><path d="M13 3h6a1 1 0 0 1 1 1v16l-5-2.5V6a3 3 0 0 0-2-2.83z"/></svg>`;

  const iniciais = (nome) => (nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  // Monta a sidebar + topbar só quando há sessão (páginas de login ficam sem menu)
  async function montarHeader() {
    if (!token || !usuario) return;

    // Perfil + permissões atualizados para montar o menu correto
    let perfil = usuario.perfil, permissoes = [];
    try {
      const me = await (await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json();
      perfil = me.perfil; permissoes = me.permissoes || [];
    } catch {}

    const links = [
      ['/home.html', 'Início', 'grafico'],
      ['/livros.html', 'Acervo', 'livro'],
      ['/minhas-locacoes.html', 'Minhas locações', 'relogio'],
    ];
    if (perfil === 'ADMINISTRADOR') links.push(['/admin-usuarios.html', 'Usuários', 'usuarios']);

    const atual = location.pathname;

    // Sidebar
    const aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.innerHTML = `
      <div class="marca">${window.marcaSVG()} Biblioteca</div>
      <nav>${links.map(([h, t, ic]) =>
        `<a href="${h}" class="${atual === h ? 'ativo' : ''}">${svg(ic)} <span>${t}</span></a>`).join('')}</nav>
      <div class="rodape"><div class="powered">Biblioteca Interna</div></div>`;

    // Topbar
    const titulo = (document.querySelector('main h1')?.textContent || document.title || '').trim();
    const header = document.createElement('header');
    header.className = 'topbar';
    header.innerHTML = `
      <button class="toggle" id="btnMenu" aria-label="Menu">${svg('menu')}</button>
      <span class="titulo">${titulo}</span>
      <span class="usuario">
        <span class="avatar">${iniciais(usuario.nome)}</span>
        <span class="nome">${usuario.nome}</span>
        <button class="btn-sair" id="btnSair">${svg('sair')} Sair</button>
      </span>`;

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';

    document.body.classList.add('app-shell');
    document.body.prepend(overlay);
    document.body.prepend(aside);
    (document.querySelector('main') || document.body).insertAdjacentElement('beforebegin', header);

    // Título já aparece na topbar — evita duplicar no conteúdo
    const h1 = document.querySelector('main h1');
    if (h1) h1.style.display = 'none';

    document.getElementById('btnSair').addEventListener('click', () => { localStorage.clear(); location.href = '/'; });
    const fechar = () => document.body.classList.remove('sidebar-aberta');
    document.getElementById('btnMenu').addEventListener('click', () => document.body.classList.toggle('sidebar-aberta'));
    overlay.addEventListener('click', fechar);
    aside.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', fechar));
  }

  // Guard de acesso reutilizável: consulta o backend (/auth/me), que é a fonte
  // confiável de perfil/permissões, e redireciona quem não pode. Devolve o
  // usuário para a página reaproveitar (evita um segundo /auth/me).
  window.exigirAcesso = async function ({ permissao, admin } = {}) {
    if (!token) { location.href = '/'; return null; }
    let me;
    try {
      me = await (await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json();
    } catch { location.href = '/'; return null; }
    if (!me || !me.perfil) { localStorage.clear(); location.href = '/'; return null; }
    const ehAdmin = me.perfil === 'ADMINISTRADOR';
    const pode = ehAdmin || (me.permissoes || []).includes(permissao);
    if (admin && !ehAdmin) { location.href = '/home.html'; return null; }
    if (permissao && !pode) { location.href = '/home.html'; return null; }
    return me;
  };

  // Helper global de mensagens (sucesso | erro | aviso)
  window.mensagem = function (texto, tipo = 'sucesso') {
    let box = document.getElementById('app-msg');
    if (!box) {
      box = document.createElement('div');
      box.id = 'app-msg';
      (document.querySelector('main') || document.body).prepend(box);
    }
    box.className = `alerta ${tipo}`;
    box.textContent = texto;
  };

  // ---- Validação e destaque de campos (padrão do sistema) ----

  // Remove destaques/mensagens de erro de um formulário (ou do documento).
  window.limparErros = function (raiz = document) {
    raiz.querySelectorAll('.campo-erro').forEach((el) => el.classList.remove('campo-erro'));
    raiz.querySelectorAll('.msg-campo').forEach((el) => el.remove());
  };

  // Recebe { campo: mensagem } (vindo do backend ou da validação local) e
  // destaca cada input correspondente (id === nome do campo), com a mensagem abaixo.
  window.aplicarErros = function (campos, raiz = document) {
    if (!campos) return;
    let primeiro = null;
    Object.entries(campos).forEach(([campo, msg]) => {
      const input = raiz.querySelector(`#${CSS.escape(campo)}`);
      if (!input) return;
      input.classList.add('campo-erro');
      const aviso = document.createElement('span');
      aviso.className = 'msg-campo';
      aviso.textContent = msg;
      input.insertAdjacentElement('afterend', aviso);
      if (!primeiro) primeiro = input;
    });
    if (primeiro) primeiro.focus();
  };

  // Validações reaproveitáveis no cliente (feedback imediato; o backend revalida).
  window.validacoes = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim()),
    cpf: (v) => {
      const cpf = (v || '').replace(/\D/g, '');
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
      const dig = (base, peso) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
        const r = (soma * 10) % 11;
        return r === 10 ? 0 : r;
      };
      return dig(cpf.slice(0, 9), 10) === Number(cpf[9]) && dig(cpf.slice(0, 10), 11) === Number(cpf[10]);
    },
  };

  // ---- Modal reutilizável (profissional e responsivo) ----
  // abrirModal({ titulo, corpoHTML, acoes:[{texto,classe,onClick(fechar),id}], largura })
  // Retorna { overlay, modal, body, footer, fechar }.
  window.abrirModal = function ({ titulo = '', corpoHTML = '', acoes = [], largura } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTit"${largura ? ` style="max-width:${largura}px"` : ''}>
        <div class="modal-header">
          <h2 id="modalTit">${titulo}</h2>
          <button class="modal-fechar" type="button" aria-label="Fechar">${svg('x')}</button>
        </div>
        <div class="modal-body">${corpoHTML}</div>
        <div class="modal-footer"${acoes.length ? '' : ' style="display:none"'}></div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('modal-aberto');

    const modal = overlay.querySelector('.modal');
    const body = overlay.querySelector('.modal-body');
    const footer = overlay.querySelector('.modal-footer');

    const fechar = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (!document.querySelector('.modal-overlay')) document.body.classList.remove('modal-aberto');
    };
    const onKey = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) fechar(); });
    overlay.querySelector('.modal-fechar').addEventListener('click', fechar);

    acoes.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.classe || ''}`.trim();
      btn.textContent = a.texto;
      if (a.id) btn.id = a.id;
      btn.addEventListener('click', () => a.onClick && a.onClick(fechar, btn));
      footer.appendChild(btn);
    });

    setTimeout(() => (body.querySelector('input,select,textarea')?.focus()), 60);
    return { overlay, modal, body, footer, fechar };
  };

  // Confirmação estilizada (substitui window.confirm). Retorna Promise<boolean>.
  window.confirmarModal = function ({ titulo = 'Confirmar', mensagem: msg = '', textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', perigo = false } = {}) {
    return new Promise((resolve) => {
      window.abrirModal({
        titulo,
        corpoHTML: `<p class="modal-msg">${msg}</p>`,
        acoes: [
          { texto: textoCancelar, onClick: (f) => { f(); resolve(false); } },
          { texto: textoConfirmar, classe: perigo ? 'btn-perigo' : 'btn-primario', onClick: (f) => { f(); resolve(true); } },
        ],
      });
    });
  };

  document.addEventListener('DOMContentLoaded', montarHeader);
})();
