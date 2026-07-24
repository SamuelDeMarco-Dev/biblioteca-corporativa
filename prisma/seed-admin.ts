import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

/**
 * Cria o primeiro usuário ADMINISTRADOR do sistema.
 *
 * Resolve o problema do "ovo e galinha": o cadastro via POST /usuarios exige um
 * token de administrador, mas não há admin para gerar esse token. Este script
 * insere o primeiro admin direto no banco, com a senha já em hash bcrypt.
 *
 * Uso:
 *   npx tsx prisma/seed-admin.ts
 *
 * Ajuste os valores abaixo (ou defina via variáveis de ambiente) antes de rodar.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@empresa.com';
  const senha = process.env.ADMIN_SENHA ?? 'admin123';

  const senhaHash = await bcrypt.hash(senha, 10);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: 'Administrador',
      email,
      setor: 'TI',
      cpf: '00000000000',
      senhaHash,
      perfil: 'ADMINISTRADOR',
    },
  });

  console.log('✅ Administrador pronto:');
  console.log(`   id:    ${admin.id}`);
  console.log(`   email: ${admin.email}`);
  console.log(`   senha: ${senha}  (use esta senha em texto puro para logar)`);
}

main()
  .catch((err) => {
    console.error('❌ Erro ao criar administrador:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
