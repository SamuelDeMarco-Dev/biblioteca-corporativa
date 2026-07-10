import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { LoginInput } from '../schemas/auth.schema';

export async function autenticarUsuario(dados: LoginInput) {
    const usuario = await prisma.usuario.findUnique({
        where: { email: dados.email},
    });

    if (!usuario) return null;

    const senhaCorreta = await bcrypt.compare(dados.senha, usuario.senhaHash);
    if(!senhaCorreta) return null;

    const token = jwt.sign(
        { id: usuario.id, perfil: usuario.perfil},
        process.env.JWT_SECRET!,
        { expiresIn: '8h'},
    );

    const { senhaHash, ...usuarioSemSenha } = usuario;
    return { token, usuario: usuarioSemSenha };
}