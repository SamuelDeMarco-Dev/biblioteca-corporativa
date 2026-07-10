import path from 'path';
import authRoutes from './routes/auth.routes';

import usuariosRoutes from './routes/usuario.routes';

import express, { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { ErrorRequestHandler } from 'express';


const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);

app.get('/health', async (req: Request, res: Response) => {
    try{
        const [result] = await prisma.$queryRaw<{ now: Date}[]>`SELECT NOW() as now`;
        res.json({ status: 'ok', database: 'conectado', hora: result.now });
    } catch (err) {
        const detalhe = err instanceof Error ? err.message : 'erro desconhecido';
        res.status(500).json({status: 'erro', database: 'falha na conexão', detalhe });
    }
});

const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }
  next(err);
};

app.use(jsonErrorHandler);
export default app;


