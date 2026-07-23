import path from 'path';
import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuario.routes';
import permissoesRoutes from './routes/permissao.routes';
import livrosRoutes from './routes/livro.routes';
import locacaoRoutes from './routes/locacao.routes';
import express, { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { ErrorRequestHandler } from 'express';
import dashboardRoutes from './routes/dashboard.routes';



const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);
app.use('/permissoes', permissoesRoutes);
app.use('/livros', livrosRoutes);
app.use('/locacoes', locacaoRoutes);
app.use('/dashboard', dashboardRoutes);

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
    return res.status(400).json({ erro: 'Não foi possível ler os dados enviados. Verifique e tente novamente.' });
  }
  next(err);
};

// Middleware global: rede de segurança para QUALQUER erro não tratado.
// Loga o detalhe internamente e devolve uma mensagem genérica — nunca expõe
// stack trace, SQL ou estruturas internas ao usuário (critério de aceite).
const erroGlobal: ErrorRequestHandler = (err, req, res, next) => {
  console.error('[ERRO NÃO TRATADO]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ erro: 'Ocorreu um erro inesperado. Tente novamente em instantes.' });
};

app.use(jsonErrorHandler);
app.use(erroGlobal);
export default app;


