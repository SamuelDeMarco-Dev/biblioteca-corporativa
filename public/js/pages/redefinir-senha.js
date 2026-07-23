import '../theme.js';
import { api } from '../api.js';
import { mensagem } from '../ui.js';

const token = new URLSearchParams(location.search).get('token');

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, data } = await api.redefinirSenha({ token, novaSenha: document.getElementById('senha').value });
  if (!ok) { mensagem(data.erro || 'Falha ao redefinir', 'erro'); return; }
  mensagem('Senha redefinida! Redirecionando para o login...', 'sucesso');
  setTimeout(() => (location.href = '/'), 1500);
});
