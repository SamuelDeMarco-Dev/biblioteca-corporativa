import { ConflictError } from '../../shared/errors';

interface LivroDuplicadoDetails {
  livro: unknown;
  totalExemplares: number;
  exemplaresDisponiveis: number;
}

// Carrega o livro já cadastrado como extensão do Problem Details (RFC 9457
// permite membros extras) — o frontend usa esses dados para exibir o duplicado.
export class LivroDuplicadoError extends ConflictError {
  constructor(private readonly extras: LivroDuplicadoDetails) {
    super('Livro já cadastrado no acervo');
  }

  toDetails() {
    return { duplicado: true, ...this.extras };
  }
}
