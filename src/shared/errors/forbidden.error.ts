import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';

  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message);
  }
}
