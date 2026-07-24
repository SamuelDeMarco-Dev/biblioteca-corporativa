import { z } from 'zod';
import { cpfValido } from '../../utils/cpf';

export const criarUsuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  setor: z.enum([
    'SUPORTE',
    'SERVICOS',
    'SANCONHUB',
    'ADMINISTRATIVO',
    'COMERCIAL',
    'MARKETING',
    'TI',
    'RH',
    'DIRETORIA',
  ]),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .refine(cpfValido, 'CPF inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  perfil: z.enum(['ADMINISTRADOR', 'USUARIO']),
  permissoesIds: z.array(z.number()).optional(),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const atualizarPermissoesSchema = z
  .object({
    habilitar: z.array(z.number()).optional(),
    desabilitar: z.array(z.number()).optional(),
  })
  .refine((d) => d.habilitar?.length || d.desabilitar?.length, {
    message: 'Informe ao menos uma Permissão para habilitar ou desabilitar',
  });
export type AtualizarPermissoesInput = z.infer<typeof atualizarPermissoesSchema>;

export const editarUsuarioSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    email: z.string().email('E-mail inválido').optional(),
    setor: z
      .enum([
        'SUPORTE',
        'SERVICOS',
        'SANCONHUB',
        'ADMINISTRATIVO',
        'COMERCIAL',
        'MARKETING',
        'TI',
        'RH',
        'DIRETORIA',
      ])
      .optional(),
    cpf: z
      .string()
      .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
      .refine(cpfValido, 'CPF inválido')
      .optional(),
    perfil: z.enum(['ADMINISTRADOR', 'USUARIO']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;

export const usuarioIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});
