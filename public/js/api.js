// Camada de acesso a dados. Concentra TODAS as chamadas ao backend.
// Retorna sempre { ok, status, data } — nenhuma tela fala fetch diretamente.
const token = () => localStorage.getItem('token');

export const estaLogado = () => !!token();

export function logout() {
  localStorage.clear();
  location.href = '/';
}

async function request(metodo, url, corpo) {
  const headers = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const opcoes = { method: metodo, headers };
  if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }

  let resp;
  try {
    resp = await fetch(url, opcoes);
  } catch {
    return { ok: false, status: 0, data: { erro: 'Falha de conexão com o servidor.' } };
  }
  let data = {};
  try { data = await resp.json(); } catch { /* corpo vazio */ }
  return { ok: resp.ok, status: resp.status, data };
}

// Memoiza o /auth/me dentro do carregamento da página (layout + guard compartilham).
let meMemo = null;

export const api = {
  me: async () => {
    if (meMemo) return { ok: true, status: 200, data: meMemo };
    const r = await request('GET', '/auth/me');
    if (r.ok) meMemo = r.data;
    return r;
  },
  login: (corpo) => request('POST', '/auth/login', corpo),
  esqueciSenha: (corpo) => request('POST', '/auth/esqueci-senha', corpo),
  redefinirSenha: (corpo) => request('POST', '/auth/redefinir-senha', corpo),

  livros: () => request('GET', '/livros'),
  criarLivro: (corpo) => request('POST', '/livros', corpo),
  adicionarExemplares: (id, quantidade) => request('POST', `/livros/${id}/exemplares`, { quantidade }),
  excluirLivro: (id) => request('DELETE', `/livros/${id}`),
  buscarExterno: (titulo) => request('GET', `/livros/buscar-externo?titulo=${encodeURIComponent(titulo)}`),

  // meu=true força o admin a ver só as próprias locações (dashboard pessoal).
  locacoes: (meu = false) => request('GET', `/locacoes${meu ? '?meu=true' : ''}`),
  locar: (corpo) => request('POST', '/locacoes', corpo),
  devolver: (id) => request('PATCH', `/locacoes/${id}/devolver`),

  usuarios: () => request('GET', '/usuarios'),
  permissoes: () => request('GET', '/permissoes'),
  criarUsuario: (corpo) => request('POST', '/usuarios', corpo),
  editarUsuario: (id, corpo) => request('PATCH', `/usuarios/${id}`, corpo),
  atualizarPermissoes: (id, corpo) => request('PATCH', `/usuarios/${id}/permissoes`, corpo),

  dashboard: () => request('GET', '/dashboard'),
};
