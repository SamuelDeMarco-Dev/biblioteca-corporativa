import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { criarLocacaoSchema } from '../schemas/locacao.schema';
import { criarLocacao } from '../services/locacao.service';

export async function locar(req: AuthRequest, res: Response){
    const parse = criarLocacaoSchema.safeParse(req.body);
    if(!parse.success){
        return res.status(400).json({ erro: 'Dados inválidos', detalhes: parse.error.issues});
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
