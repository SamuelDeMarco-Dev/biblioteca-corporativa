import { PrismaClient } from '../../generated/prisma/client';

export class PermissaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll() {
    return this.prisma.permissao.findMany({ orderBy: { id: 'asc' } });
  }
}
