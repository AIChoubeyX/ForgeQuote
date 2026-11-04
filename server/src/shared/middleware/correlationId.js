import crypto from 'node:crypto';

export function correlationIdMiddleware(req, res, next) {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    `req-${crypto.randomUUID()}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

