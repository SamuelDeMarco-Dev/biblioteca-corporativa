import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { PERMISSOES_PADRAO_USUARIO } from '../src/constants/permissoes';

/**
 * Manutenção pontual das permissões:
 *  1) Remove as permissões "fantasma" (nomes fora do modelo oficial da ISSUE 7).
 *  2) Faz backfill do conjunto padrão nos usuários USUARIO existentes.
 *
 * Uso: npx tsx prisma/cleanup-permissoes.ts
 */
async function main() {
  const NOMES_OFICIAIS = [
    'CADASTRAR_USUARIOS',
    'CADASTRAR_LIVROS',
    'LOCAR_LIVROS',
    'DEVOLVER_LIVROS',
    'EXCLUIR_LIVROS',
    'ACESSAR_DASHBOARD',
  ];

  // 1) Apaga permissões fora do modelo oficial (o Prisma limpa os vínculos N:N automaticamente).
  const removidas = await prisma.permissao.deleteMany({
    where: { nome: { notIn: NOMES_OFICIAIS } },
  });
  console.log(`🧹 Permissões fantasma removidas: ${removidas.count}`);

  // 2) Backfill: garante o conjunto padrão em todos os usuários USUARIO.
  const usuarios = await prisma.usuario.findMany({ where: { perfil: 'USUARIO' } });
  for (const u of usuarios) {
    await prisma.usuario.update({
      where: { id: u.id },
      data: {
        permissoes: {
          connect: PERMISSOES_PADRAO_USUARIO.map((nome) => ({ nome })),
        },
      },
    });
  }
  console.log(`✅ Backfill aplicado em ${usuarios.length} usuário(s) USUARIO.`);

  // Relatório final
  const final = await prisma.usuario.findMany({
    select: { id: true, email: true, perfil: true, permissoes: { select: { nome: true } } },
  });
  console.log('\n=== Estado final ===');
  final.forEach((u) =>
    console.log(
      `  id=${u.id}  ${u.email}  [${u.perfil}]  perms=[${u.permissoes.map((p) => p.nome).join(', ')}]`,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
