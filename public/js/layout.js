(function () {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  // Monta o cabeçalho só quando há sessão (páginas de login ficam sem menu)
  async function montarHeader() {
    if (!token || !usuario) return;

    // Perfil + permissões atualizados para montar o menu correto
    let perfil = usuario.perfil, permissoes = [];
    try {
      const me = await (await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json();
      perfil = me.perfil; permissoes = me.permissoes || [];
    } catch {}

    const pode = (p) => perfil === 'ADMINISTRADOR' || permissoes.includes(p);
    const links = [
      ['/home.html', 'Início'],
      ['/livros.html', 'Acervo'],
      ['/minhas-locacoes.html', 'Minhas locações'],
    ];
    if (pode('CADASTRAR_LIVROS')) links.push(['/cadastro-livros.html', 'Cadastrar livro']);
    if (perfil === 'ADMINISTRADOR') { links.push(['/admin-usuarios.html', 'Usuários'], ['/dashboard.html', 'Dashboard']); }

    const atual = location.pathname;
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="barra">
        <span class="marca">📚 Biblioteca</span>
        <nav>${links.map(([h, t]) => `<a href="${h}" class="${atual === h ? 'ativo' : ''}">${t}</a>`).join('')}</nav>
        <span class="usuario">${usuario.nome} <button class="btn" id="btnSair">Sair</button></span>
      </div>`;
    document.body.prepend(header);
    document.getElementById('btnSair').addEventListener('click', () => { localStorage.clear(); location.href = '/'; });
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

  document.addEventListener('DOMContentLoaded', montarHeader);
})();
