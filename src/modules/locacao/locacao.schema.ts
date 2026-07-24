import { z } from 'zod';

export const criarLocacaoSchema = z.object({
  livroId: z.number().int().positive('Livro inválido'),
  dias: z.number().int().min(1, 'A quantidade de dias é obrigatória'),
});
export type CriarLocacaoInput = z.infer<typeof criarLocacaoSchema>;

export const locacaoIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});
