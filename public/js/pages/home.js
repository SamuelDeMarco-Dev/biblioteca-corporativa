import '../theme.js';
import { iniciarLayout, exigirAcesso } from '../layout.js';
import { api } from '../api.js';
import { esc, mensagem } from '../ui.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const DIA = 86400000;

async function init() {
  iniciarLayout();
  const eu = await exigirAcesso();
  if (!eu) return;

  // O dashboard (pessoal) aparece para admin ou para quem tem ACESSAR_DASHBOARD.
  const podeDashboard = eu.perfil === 'ADMINISTRADOR' || (eu.permissoes || []).includes('ACESSAR_DASHBOARD');
  if (podeDashboard) {
    document.getElementById('saudacao').textContent = `Olá, ${eu.nome} — aqui está o resumo das suas locações.`;
    document.getElementById('painelPessoal').hidden = false;
    await carregarPessoal(eu);
  } else {
    document.getElementById('nomeComum').textContent = eu.nome;
    document.getElementById('painelComum').hidden = false;
  }
}

// Calcula a urgência do prazo de uma locação ativa.
function urgencia(l) {
  if (l.status === 'ATRASADA') {
    const dias = Math.max(1, Math.ceil((Date.now() - new Date(l.prazo).getTime()) / DIA));
    return { classe: 'atraso', texto: `Atrasado há ${dias} ${dias === 1 ? 'dia' : 'dias'}` };
  }
  const dias = Math.ceil((new Date(l.prazo).getTime() - Date.now()) / DIA);
  if (dias <= 0) return { classe: 'alerta', texto: 'Vence hoje' };
  if (dias === 1) return { classe: 'alerta', texto: 'Vence amanhã' };
  if (dias <= 3) return { classe: 'alerta', texto: `Vence em ${dias} dias` };
  return { classe: 'ok', texto: `${dias} dias restantes` };
}

async function carregarPessoal(eu) {
  // Admin vê tudo por padrão em /locacoes; meu=true garante só as dele.
  const { ok, data } = await api.locacoes(eu.perfil === 'ADMINISTRADOR');
  if (!ok) { mensagem('Não foi possível carregar suas locações. Tente novamente.', 'erro'); return; }

  const minhas = data || [];
  const ativas = minhas.filter((l) => l.ativa);
  const atrasadas = ativas.filter((l) => l.status === 'ATRASADA');
  const emDia = ativas.length - atrasadas.length;
  const devolvidas = minhas.filter((l) => !l.ativa).length;

  // Stat-tiles
  document.getElementById('cards').innerHTML = `
    <div class="card stat stat-verde"><div class="num">${emDia}</div>Em dia</div>
    <div class="card stat stat-vermelho"><div class="num">${atrasadas.length}</div>Atrasadas</div>
    <div class="card stat stat-teal"><div class="num">${devolvidas}</div>Devolvidas</div>
    <div class="card stat stat-laranja"><div class="num">${minhas.length}</div>Total</div>`;

  // Próximas devoluções (ativas ordenadas pelo prazo)
  const proximas = [...ativas].sort((a, b) => new Date(a.prazo) - new Date(b.prazo));
  document.getElementById('proximas').innerHTML = proximas.length
    ? proximas.map((l) => {
        const u = urgencia(l);
        return `<li class="prox-item">
          <span class="prox-dot ${u.classe}"></span>
          <span class="prox-livro" title="${esc(l.livro)}">${esc(l.livro)}</span>
          <span class="prox-prazo ${u.classe}"><strong>${u.texto}</strong><small>${fmt(l.prazo)}</small></span>
        </li>`;
      }).join('')
    : '<li class="prox-item"><span class="sem-acao">Você não tem locações ativas.</span></li>';

  // Donut: em dia (verde) x atrasadas (amarelo) x devolvidas (cinza)
  const total = (emDia + atrasadas.length + devolvidas) || 1;
  const donut = document.getElementById('donut');
  donut.style.setProperty('--p1', ((emDia / total) * 100).toFixed(1));
  donut.style.setProperty('--p2', ((atrasadas.length / total) * 100).toFixed(1));
  document.getElementById('donutLeg').innerHTML = `
    <div class="item"><span class="pt" style="background:var(--sucesso)"></span> Em dia <strong>${emDia}</strong></div>
    <div class="item"><span class="pt" style="background:var(--aviso)"></span> Atrasadas <strong>${atrasadas.length}</strong></div>
    <div class="item"><span class="pt" style="background:var(--chip)"></span> Devolvidas <strong>${devolvidas}</strong></div>`;
}

init();
