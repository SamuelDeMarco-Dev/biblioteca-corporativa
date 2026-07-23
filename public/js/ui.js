// Camada de apresentação: ícones, mensagens, modais e validação de campos.
// Nenhuma regra de negócio aqui — só interação/DOM.

const ICONES = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  livro: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  grafico: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  lua: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sol: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
};

export function icone(nome) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ''}</svg>`;
}

export function esc(s) {
  return (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Mensagem global (sucesso | erro | aviso)
export function mensagem(texto, tipo = 'sucesso') {
  let box = document.getElementById('app-msg');
  if (!box) {
    box = document.createElement('div');
    box.id = 'app-msg';
    (document.querySelector('main') || document.body).prepend(box);
  }
  box.className = `alerta ${tipo}`;
  box.textContent = texto;
}

// Validações reaproveitáveis no cliente (o backend revalida)
export const validacoes = {
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

export function limparErros(raiz = document) {
  raiz.querySelectorAll('.campo-erro').forEach((el) => el.classList.remove('campo-erro'));
  raiz.querySelectorAll('.msg-campo').forEach((el) => el.remove());
}

export function aplicarErros(campos, raiz = document) {
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
}

// Modal reutilizável. Retorna { overlay, modal, body, footer, fechar }.
export function abrirModal({ titulo = '', corpoHTML = '', acoes = [], largura } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTit"${largura ? ` style="max-width:${largura}px"` : ''}>
      <div class="modal-header">
        <h2 id="modalTit">${titulo}</h2>
        <button class="modal-fechar" type="button" aria-label="Fechar">${icone('x')}</button>
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

  setTimeout(() => body.querySelector('input,select,textarea')?.focus(), 60);
  return { overlay, modal, body, footer, fechar };
}

export function confirmarModal({ titulo = 'Confirmar', mensagem: msg = '', textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', perigo = false } = {}) {
  return new Promise((resolve) => {
    abrirModal({
      titulo,
      corpoHTML: `<p class="modal-msg">${esc(msg)}</p>`,
      acoes: [
        { texto: textoCancelar, onClick: (f) => { f(); resolve(false); } },
        { texto: textoConfirmar, classe: perigo ? 'btn-perigo' : 'btn-primario', onClick: (f) => { f(); resolve(true); } },
      ],
    });
  });
}
