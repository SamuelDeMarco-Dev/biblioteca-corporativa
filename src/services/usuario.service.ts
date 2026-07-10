import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { CriarUsuarioInput } from '../schemas/usuario.schema';
import { PERMISSOES_PADRAO_USUARIO } from '../constants/permissoes';

export async function criarUsuario(dados: CriarUsuarioInput) {
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const permissoesConnect = 
        dados.permissoesIds && dados.permissoesIds.length > 0
            ? dados.permissoesIds.map((id) => ({ id }))
            : dados.perfil === 'USUARIO'
                ? PERMISSOES_PADRAO_USUARIO.map((nome) => ({ nome }))
                : [];

    return prisma.usuario.create({
        data: {
            nome: dados.nome,
            email: dados.email,
            setor: dados.setor,
            cpf: dados.cpf,
            senhaHash,
            perfil: dados.perfil,
            permissoes: { connect: permissoesConnect },
        },
    });
}

export async function atualizarPermissoes (
    usuarioId: number,
    habilitar: number[] = [],
    desabilitar: number[] = [],
) {
    return prisma.usuario.update({
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