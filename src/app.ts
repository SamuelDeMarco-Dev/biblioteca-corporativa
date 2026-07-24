import path from 'path';
import express, { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { errorHandler } from './shared/middlewares';
import { routes } from './container';

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

for (const { path: routePath, router } of routes) {
  app.use(routePath, router);
}

app.get('/health', async (req: Request, res: Response) => {
  try {
    const [result] = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    res.json({ status: 'ok', database: 'conectado', hora: result.now });
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : 'erro desconhecido';
    res.status(500).json({ status: 'erro', database: 'falha na conexão', detalhe });
  }
});

app.use(errorHandler);
export default app;
