import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { criarLocacaoSchema } from '../schemas/locacao.schema';
import { criarLocacao, listarLocacoes, devolverLocacao } from '../services/locacao.service';
import { erroDeValidacao } from '../utils/erros';

export async function locar(req: AuthRequest, res: Response){
    const parse = criarLocacaoSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json(erroDeValidacao(parse.error));
    }

    try {
        const usuarioId = req.usuario!.id;
        const resultado = await criarLocacao(usuarioId, parse.data.livroId, parse.data.dias);
        
        if(!resultado){
            return res.status(409).json({ erro: 'Nenhum exemplar disponível para este livro' });
        }
        return res.status(201).json({
            mensagem: 'Locação registrada com sucesso',
            locacaoId: resultado.locacao.id,
            exemplar: resultado.exemplar.codigo,
            dataPrevista: resultado.dataPrevista,
        });
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao registrar locação' });
    }
}

export async function listar(req: AuthRequest, res: Response){
    try {
        const ehAdmin = req.usuario!.perfil === 'ADMINISTRADOR';
        const todos = ehAdmin && req.query.meu !== 'true';

        const locacoes = await listarLocacoes({ usuarioId: req.usuario!.id, todos });
        return res.status(200).json(locacoes);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar locações' });
    }
}

export async function devolver(req: AuthRequest, res: Response){
    const id = Number(req.params.id);
    if(Number.isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

    try {
        const ehAdmin = req.usuario!.perfil === 'ADMINISTRADOR';
        const r = await devolverLocacao(id, req.usuario!.id, ehAdmin);
        if(r.erro === 'NAO_ENCONTRADA') return res.status(404).json({ erro: 'Locação não encontrada' });
        if(r.erro === 'JA_DEVOLVIDA') return res.status(409).json({ erro: 'Locação já devolvida' });
        if(r.erro === 'SEM_PERMISSAO') return res.status(403).json({ erro: 'Você só pode devolver suas próprias locações' });
        return res.status(200).json({ mensagem: 'Devolução registrada', dataDevolucao: r.locacao!.dataDevolucao });
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao registrar devolução' });
    }   
}
