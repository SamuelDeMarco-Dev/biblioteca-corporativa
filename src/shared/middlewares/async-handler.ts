import { Request, Response, NextFunction, RequestHandler } from 'express';

// Envolve um handler async para que qualquer exceção não capturada vá ao
// errorHandler central (evita unhandled rejection / request travada).
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
