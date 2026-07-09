import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { CriarUsuarioInput } from '../schemas/usuario.schema';

export async function criarUsuario(dados: CriarUsuarioInput) {
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    return prisma.usuario.create({
        data: {
            nome: dados.nome,
            email: dados.email,
            setor: dados.setor,
            cpf: dados.cpf,
            senhaHash,
            perfil: dados.perfil,
            permissoes: dados.permissoesIds
                ? { connect: dados.permissoesIds.map((id) => ({ id })) }
            : undefined,
        },
    });
}