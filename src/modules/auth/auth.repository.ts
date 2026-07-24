import { PrismaClient } from '../../generated/prisma/client';

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findProfileById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        permissoes: { select: { nome: true } },
      },
    });
  }

  findByResetTokenHash(hash: string) {
    return this.prisma.usuario.findFirst({
      where: { resetTokenHash: hash, resetTokenExpira: { gt: new Date() } },
    });
  }

  setResetToken(usuarioId: number, tokenHash: string, expiraEm: Date) {
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { resetTokenHash: tokenHash, resetTokenExpira: expiraEm },
    });
  }

  updatePassword(usuarioId: number, senhaHash: string) {
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash, resetTokenHash: null, resetTokenExpira: null },
    });
  }
}
