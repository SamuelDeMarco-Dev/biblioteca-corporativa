import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const solicitarResetSchema = z.object({
  email: z.string().email('E-mail inválido'),
});
export type SolicitarResetInput = z.infer<typeof solicitarResetSchema>;

export const redefinirSenhaSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  novaSenha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;
