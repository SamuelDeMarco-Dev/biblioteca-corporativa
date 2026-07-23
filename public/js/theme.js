// Camada de tema (modo noturno). Aplica o tema salvo/sistema no carregamento
// e expõe helpers para alternar. Persistido em localStorage.
const CHAVE = 'tema';
const ouvintes = [];

function aplicar(tema) {
  document.documentElement.setAttribute('data-theme', tema);
}

function temaInicial() {
  const salvo = localStorage.getItem(CHAVE);
  if (salvo === 'dark' || salvo === 'light') return salvo;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let atual = temaInicial();
aplicar(atual); // aplica o quanto antes (executa no carregamento do módulo)

export function temaAtual() { return atual; }

export function alternarTema() {
  atual = atual === 'dark' ? 'light' : 'dark';
  localStorage.setItem(CHAVE, atual);
  aplicar(atual);
  ouvintes.forEach((fn) => fn(atual));
  return atual;
}

export function aoMudarTema(cb) { ouvintes.push(cb); }
