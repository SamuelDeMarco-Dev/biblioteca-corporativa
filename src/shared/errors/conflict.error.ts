import { DomainError } from './domain-error';

export class ConflictError extends DomainError {
  readonly status = 409;
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}
