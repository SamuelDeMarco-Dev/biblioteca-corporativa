// Classe-base de todos os erros de negócio. Nunca é lançada diretamente —
// sempre uma subclasse concreta (NotFoundError, ForbiddenError, ...).
export abstract class DomainError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  // Extensão opcional (RFC 9457 permite membros extras no Problem Details).
  // Subclasses que precisam devolver dados estruturados junto do erro
  // (ex.: payload de "registro duplicado") sobrescrevem este método.
  toDetails(): Record<string, unknown> | undefined {
    return undefined;
  }
}
