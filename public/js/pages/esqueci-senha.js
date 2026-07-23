import '../theme.js';
import { api } from '../api.js';
import { mensagem } from '../ui.js';

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, data } = await api.esqueciSenha({ email: document.getElementById('email').value });
  if (!ok) { mensagem(data.erro || 'Falha na solicitação', 'erro'); return; }
  mensagem('Se o e-mail estiver cadastrado, enviamos um link de redefinição.', 'sucesso');
});
