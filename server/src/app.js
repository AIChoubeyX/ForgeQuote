import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './shared/errors.js';
import { correlationIdMiddleware } from './shared/middleware/correlationId.js';
import routes from './routes.js';

export const app = express();

app.set('trust proxy', 1);

app.use(correlationIdMiddleware);
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Rate limiters for auth and AI endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { error: { message: 'Too many authentication attempts; please try again later' } },
  standardHeaders: true,
  legacyHeaders: false
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: { error: { message: 'AI request limit reached; manual workflows remain active' } },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/ai-intake', aiLimiter);
app.use('/api/ai-reviews', aiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ForgeQuote API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);
app.use(errorHandler);
