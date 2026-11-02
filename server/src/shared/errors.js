export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error.name === 'ZodError') {
    return res.status(400).json({ error: { message: 'Invalid request data', details: error.flatten() } });
  }
  const status = error.status || 500;
  res.status(status).json({ error: { message: status === 500 ? 'Unexpected server error' : error.message, details: error.details } });
}
