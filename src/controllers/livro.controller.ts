import { Request, Response } from 'express';
import { criarLivroSchema, adicionarExemplaresSchema } from '../schemas/livro.schema';
import { criarLivro, buscarLivroDuplicado, adicionarExemplares, listarLivros, buscarLivrosExternos, excluirLivro } from '../services/livro.service';
import { erroDeValidacao, tratarErroPrisma } from '../utils/erros';

export async function cadastrar(req: Request, res: Response) {
    const parse = criarLivroSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        // Critério: detectar livro já cadastrado (mesmo título, autor, editora, ano e edição).
        const duplicado = await buscarLivroDuplicado(parse.data);
        if (duplicado) {
            return res.status(409).json({
                erro: 'Livro já cadastrado no acervo',
                duplicado: true,
                livro: duplicado.livro,
                totalExemplares: duplicado.totalExemplares,
                exemplaresDisponiveis: duplicado.exemplaresDisponiveis,
            });
        }

        const livro = await criarLivro(parse.data);
        return res.status(201).json(livro);
    } catch (err) {
        if (tratarErroPrisma(err, res, 'livro (ISBN)')) return;
        return res.status(500).json({erro: 'Erro ao cadastrar livro. Tente novamente.'});
    }
}

export async function adicionarExemplaresController(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    const parse = adicionarExemplaresSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const resultado = await adicionarExemplares(id, parse.data.quantidade);
        if (!resultado) return res.status(404).json({ erro: 'Livro não encontrado' });
        return res.status(201).json(resultado);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao adicionar exemplares' });
    }
}

export async function listar(req: Request, res: Response){
    try {
        return res.status(200).json(await listarLivros());
    } catch {
        return res.status(500).json({ erro: 'Erro ao listar livros' });
    }
}

export async function buscarExterno(req: Request, res: Response) {
    const titulo = String(req.query.titulo ?? '').trim();
    if(titulo.length < 2) return res.status(200).json({ indisponivel: false, sugestoes: [] });

    try {
        const sugestoes = await buscarLivrosExternos(titulo);
        return res.status(200).json({ indisponivel: false, sugestoes });
    } catch (err) {
        return res.status(200).json({ indisponivel: true, sugestoes: [] });
    }
}

export async function excluir(req: Request, res: Response) {
    const id = Number(req.params.id);
    if(Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    try {
        const r = await excluirLivro(id);
        if(r.erro === 'NAO_ENCONTRADO') return res.status(404).json({ erro: 'Livro não encontrado' });
        if(r.erro === 'LOCADO') return res.status(409).json({ erro: 'Livro possui exemplar locado - não pode ser excluido' });
        return res.status(200).json({ mensagem: 'Livro removido do acervo' });
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao excluir livro' });
    }
}