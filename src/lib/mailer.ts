import nodemailer, { Transporter } from 'nodemailer';

let transporterPromise: Promise<Transporter> | null = null;

// Cria (uma vez) o transporter. Se não houver SMTP configurado, usa a conta
// de teste automática do Ethereal — ideal para desenvolvimento.
async function getTransporter(): Promise<Transporter> {
    if (transporterPromise) return transporterPromise;

    transporterPromise = (async () => {
        if (process.env.SMTP_HOST) {
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }

        // DEV: conta de teste descartável (nenhum cadastro necessário)
        const conta = await nodemailer.createTestAccount();
        console.log('📭 SMTP não configurado — usando conta de teste Ethereal.');
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: conta.user, pass: conta.pass },
        });
    })();

    return transporterPromise;
}

// Envia o e-mail de redefinição de senha.
export async function enviarEmailReset(destino: string, link: string) {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'Biblioteca Interna <nao-responda@biblioteca.local>',
        to: destino,
        subject: 'Redefinição de senha — Biblioteca Interna',
        text: `Você solicitou a redefinição da sua senha.\n\nAcesse o link abaixo (válido por 30 minutos):\n${link}\n\nSe não foi você, ignore este e-mail.`,
        html: `
            <p>Você solicitou a redefinição da sua senha.</p>
            <p><a href="${link}">Clique aqui para definir uma nova senha</a> (válido por 30 minutos).</p>
            <p>Se não foi você, ignore este e-mail.</p>`,
    });

    // No Ethereal, isto imprime a URL onde você VÊ o e-mail enviado.
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`📬 Preview do e-mail: ${preview}`);

    return info;
}
