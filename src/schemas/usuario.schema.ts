import { z } from 'zod';

export const criarUsuarioSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    setor: z.enum(['SUPORTE','SERVICOS','SANCONHUB','ADMINISTRATIVO','COMERCIAL','MARKETING','TI','RH','DIRETORIA']),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
    senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    perfil: z.enum(['ADMINISTRADOR','USUARIO']),
    permissoesIds: z.array(z.number()).optional(),
})

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;