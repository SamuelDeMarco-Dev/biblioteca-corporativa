import { DomainError } from './domain-error';

// `campos` alimenta o destaque de campo-a-campo no frontend (mesmo contrato do
// antigo utils/erros.ts:erroDeValidacao — { erro, campos }).
export class ValidationError extends DomainError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly campos?: Record<string, string>;

  constructor(
    message = 'Verifique os campos destacados e tente novamente.',
    campos?: Record<string, string>,
  ) {
    super(message);
    this.campos = campos;
  }
}
