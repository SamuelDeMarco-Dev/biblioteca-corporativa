import '../theme.js';
import { api } from '../api.js';
import { mensagem, aplicarErros, limparErros, validacoes } from '../ui.js';

const form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErros(form);

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  const erros = {};
  if (!validacoes.email(email)) erros.email = 'E-mail inválido';
  if (!senha) erros.senha = 'Senha é obrigatória';
  if (Object.keys(erros).length) { aplicarErros(erros, form); return; }

  const { ok, data } = await api.login({ email, senha });
  if (!ok) {
    aplicarErros(data.campos, form);
    mensagem(data.erro || 'Falha no login', 'erro');
    return;
  }
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  location.href = '/home.html';
});
