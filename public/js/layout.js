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

  document.addEventListener('DOMContentLoaded', montarHeader);
})();
