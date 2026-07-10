import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { CriarUsuarioInput } from '../schemas/usuario.schema';
import { PERMISSOES_PADRAO_USUARIO } from '../constants/permissoes';
import { EditarUsuarioInput } from '../schemas/usuario.schema';

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

export async function listarUsuarios() {
    return prisma.usuario.findMany({
        orderBy: { nome: 'asc' },
        select: {
            id: true, nome: true, email: true, setor: true, cpf: true,
            perfil: true, criadoEm: true,
            permissoes: { select: { id: true, nome: true } },
        },
    });
}

export async function editarUsuario(id: number, dados: EditarUsuarioInput) {
    return prisma.usuario.update({
        where: { id },
        data: dados,
        select: {
            id: true, nome: true, email: true, setor: true, cpf: true,
            perfil: true, permissoes: { select: { id: true, nome: true }},
        },
    });
}
