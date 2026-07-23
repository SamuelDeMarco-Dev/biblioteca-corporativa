import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { PERMISSOES } from '../src/constants/permissoes';

const DESCRICOES: Record<string, string> = {
    CADASTRAR_USUARIOS: 'Cadastrar usuários',
    CADASTRAR_LIVROS: 'Cadastrar livros',
    LOCAR_LIVROS: 'Locar livros',
    DEVOLVER_LIVROS: 'Devolver livros',
    EXCLUIR_LIVROS: 'Excluir livros',
    ACESSAR_DASHBOARD: 'Acessar dashboard',
};

async function main() {
    for (const nome of Object.values(PERMISSOES)) {
        await prisma.permissao.upsert({
            where: { nome },
            update: {},
            create: { nome, descricao: DESCRICOES[nome] },
        });
    }
    const total = await prisma.permissao.count();
    console.log(`Permissões garantidas no banco (total: ${total})`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());