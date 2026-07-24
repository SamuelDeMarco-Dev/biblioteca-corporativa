import { PrismaClient, Prisma } from '../../generated/prisma/client';
import { EditarUsuarioInput } from './usuario.schema';

const SELECT_SEM_SENHA = {
  id: true,
  nome: true,
  email: true,
  setor: true,
  cpf: true,
  perfil: true,
  criadoEm: true,
  permissoes: { select: { id: true, nome: true } },
} satisfies Prisma.UsuarioSelect;

export class UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(dados: Prisma.UsuarioCreateInput) {
    return this.prisma.usuario.create({ data: dados });
  }

  findAll() {
    return this.prisma.usuario.findMany({ orderBy: { nome: 'asc' }, select: SELECT_SEM_SENHA });
  }

  updatePermissoes(usuarioId: number, habilitar: number[], desabilitar: number[]) {
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        permissoes: {
          connect: habilitar.map((id) => ({ id })),
          disconnect: desabilitar.map((id) => ({ id })),
        },
      },
      include: { permissoes: true },
    });
  }

  update(id: number, dados: EditarUsuarioInput) {
    return this.prisma.usuario.update({ where: { id }, data: dados, select: SELECT_SEM_SENHA });
  }

  async existsPermissao(usuarioId: number, permissao: string): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { permissoes: true },
    });
    return usuario?.permissoes.some((p) => p.nome === permissao) ?? false;
  }
}
