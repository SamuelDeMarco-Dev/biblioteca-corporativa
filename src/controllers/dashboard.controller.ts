import { Request, Response } from 'express';
import { obterDashboard } from '../services/dashboard.service';

export async function obter(req: Request, res: Response) {
    try {
        return res.status(200).json(await obterDashboard());
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao carregar o dashboard' });
    }
}
