import crypto from 'crypto';
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

function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function solicitarReset(email: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email }});
    if(!usuario) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 1000 * 60 * 30);

    await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
            resetTokenHash: hashToken(token),
            resetTokenExpira: expira,
        },
    });

    return { token, email: usuario.email };
}

export async function redefinirSenha(token: string, novaSenha: string) {
    const usuario = await prisma.usuario.findFirst({
        where: {
            resetTokenHash: hashToken(token),
            resetTokenExpira: { gt: new Date() },
        },
    });
    if (!usuario) return false;

    await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
            senhaHash: await bcrypt.hash(novaSenha, 10),
            resetTokenHash: null,
            resetTokenExpira: null,
        },
    });

    return true;
}