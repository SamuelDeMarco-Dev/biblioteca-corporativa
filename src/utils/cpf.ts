// Validação de CPF pelos dígitos verificadores (não apenas o formato).
// Rejeita sequências repetidas (ex.: 00000000000) e CPFs com dígitos inválidos.
export function cpfValido(valor: string): boolean {
  const cpf = (valor || '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dig1 = calcDigito(cpf.slice(0, 9), 10);
  if (dig1 !== Number(cpf[9])) return false;

  const dig2 = calcDigito(cpf.slice(0, 10), 11);
  if (dig2 !== Number(cpf[10])) return false;

  return true;
}
