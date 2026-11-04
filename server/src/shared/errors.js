export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(error, req, res, _next) {
  const correlationId = req?.correlationId;
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Invalid request data',
        details: error.flatten(),
        correlationId
      }
    });
  }
  const status = error.status || 500;
  if (status === 500) {
    console.error(`[Internal Error ${correlationId || 'unknown'}]`, error);
  }
  res.status(status).json({
    error: {
      message: status === 500 ? 'An unexpected server error occurred. Please contact support.' : error.message,
      details: status === 500 ? undefined : error.details,
      correlationId
    }
  });
}
