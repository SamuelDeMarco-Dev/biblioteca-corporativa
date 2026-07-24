import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Recurso não encontrado.') {
    super(message);
  }
}
