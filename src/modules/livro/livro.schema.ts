import { z } from 'zod';

export const criarLivroSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  autor: z.string().min(1, 'Autor(es) é obrigatório'),
  editora: z.string().optional(),
  anoPublicacao: z.number().int().gte(0, 'Ano de publicação inválido'),
  edicao: z.string().min(1, 'Edição é obrigatória'),
  observacao: z.string().optional(),
  isbn: z.string().optional(),
  quantidadeExemplares: z.number().int().min(1, 'Informe ao menos 1 exemplar'),
});
export type CriarLivroInput = z.infer<typeof criarLivroSchema>;

export const adicionarExemplaresSchema = z.object({
  quantidade: z.number().int().min(1, 'Informe ao menos 1 exemplar'),
});
export type AdicionarExemplaresInput = z.infer<typeof adicionarExemplaresSchema>;

export const livroIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});
