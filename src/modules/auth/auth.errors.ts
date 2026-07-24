import { DomainError } from '../../shared/errors';

export class InvalidCredentialsError extends DomainError {
  readonly status = 401;
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('E-mail ou senha inválidos');
  }
}

export class InvalidResetTokenError extends DomainError {
  readonly status = 400;
  readonly code = 'INVALID_RESET_TOKEN';

  constructor() {
    super('Token inválido ou expirado');
  }
}
