import { Request, Response, NextFunction } from 'express';

// Catches anything that slipped past try/catch in the controllers.
// Better to return a JSON error than to crash the whole server over one weird request.
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,

  _next: NextFunction
) {
  console.error('[Unhandled Error]', err.message, err.stack);
  res.status(500).json({
    error: 'An unexpected error occurred. The space-time continuum is unstable.',
  });
}

// Handles routes that don't exist — better than Express's default HTML 404.
export function notFoundMiddleware(_req: Request, res: Response) {
  res.status(404).json({ error: "This route doesn't exist. Were you looking for POST /identify?" });
}
