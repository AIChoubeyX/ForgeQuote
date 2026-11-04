import crypto from 'node:crypto';
import { AppError } from '../errors.js';

export const aiConfig = {
  get apiKey() {
    return process.env.GROQ_API_KEY || '';
  },
  get primaryModel() {
    return process.env.GROQ_PRIMARY_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  },
  get fallbackModels() {
    const raw = process.env.GROQ_FALLBACK_MODELS || 'llama-3.1-8b-instant,mixtral-8x7b-32768';
    return raw
      .split(',')
      .map(m => m.trim())
      .filter(Boolean)
      .filter(m => m !== (process.env.GROQ_PRIMARY_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'));
  },
  get timeoutMs() {
    return Math.max(5000, Number(process.env.GROQ_TIMEOUT_MS || 30000));
  },
  get maxRetries() {
    return Math.max(1, Number(process.env.AI_MAX_RETRIES || 2));
  },
  get retryBaseDelayMs() {
    return Math.max(100, Number(process.env.AI_RETRY_BASE_DELAY_MS || 1000));
  },
  get maxOutputTokens() {
    return Math.max(256, Number(process.env.AI_MAX_OUTPUT_TOKENS || 2048));
  }
};

class CircuitBreaker {
  constructor(threshold = 5, cooldownMs = 30000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.lastFailureTime = 0;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF-OPEN'
  }

  canExecute() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF-OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

export const aiCircuitBreaker = new CircuitBreaker(5, 30000);

export function validateAiConfig() {
  const isConfigured = Boolean(aiConfig.apiKey && aiConfig.apiKey.trim().length > 0);
  return {
    configured: isConfigured,
    primaryModel: aiConfig.primaryModel,
    fallbackModels: aiConfig.fallbackModels,
    timeoutMs: aiConfig.timeoutMs,
    maxRetries: aiConfig.maxRetries,
    circuitState: aiCircuitBreaker.state
  };
}

let cachedGroqClient = null;
let lastApiKey = null;

export async function getRawGroqClient() {
  const key = aiConfig.apiKey;
  if (!key) {
    throw new AppError(503, 'AI service is not configured; manual workflows remain active');
  }
  if (!cachedGroqClient || lastApiKey !== key) {
    const { default: Groq } = await import('groq-sdk');
    cachedGroqClient = new Groq({ apiKey: key, timeout: aiConfig.timeoutMs, maxRetries: 0 });
    lastApiKey = key;
  }
  return cachedGroqClient;
}

export function parseAndRepairJson(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Empty AI response from provider');
  }

  // 1. Strip markdown fences
  let clean = rawContent.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Extract outermost JSON structure
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  // 3. First parse attempt
  try {
    return JSON.parse(clean);
  } catch (initialErr) {
    // 4. Bounded repair: remove trailing commas before closing braces/brackets
    const repaired = clean
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u0000-\u001F]+/g, ' '); // remove ASCII control characters

    try {
      return JSON.parse(repaired);
    } catch {
      throw new Error(`AI returned invalid JSON: ${initialErr.message}`);
    }
  }
}

function computeBackoff(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, 5000);
    }
  }
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(aiConfig.retryBaseDelayMs * Math.pow(2, attempt - 1) + jitter, 5000);
}

export async function executeAiCompletion({
  taskType = 'general',
  correlationId = null,
  messages,
  temperature = 0,
  maxTokens = aiConfig.maxOutputTokens,
  jsonMode = true,
  customModels = null
}) {
  const reqId = correlationId || `ai-${crypto.randomBytes(4).toString('hex')}`;

  if (!aiCircuitBreaker.canExecute()) {
    throw new AppError(
      503,
      'AI service is temporarily pausing to recover from consecutive provider errors; manual workflows remain active'
    );
  }

  const client = await getRawGroqClient();
  const models = customModels && customModels.length > 0
    ? customModels
    : [aiConfig.primaryModel, ...aiConfig.fallbackModels];

  let lastError = null;
  const startTime = Date.now();

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const currentModel = models[modelIndex];
    let attempts = 0;

    while (attempts < aiConfig.maxRetries) {
      attempts++;
      const callStart = Date.now();

      try {
        let response;
        const requestPayload = {
          model: currentModel,
          temperature,
          max_tokens: maxTokens,
          messages
        };

        if (jsonMode) {
          try {
            response = await client.chat.completions.create({
              ...requestPayload,
              response_format: { type: 'json_object' }
            });
          } catch (jsonErr) {
            // Some models do not support json_object mode, fall back to plain completion
            if (jsonErr.status === 400 || jsonErr.code === 'json_validate_failed') {
              response = await client.chat.completions.create(requestPayload);
            } else {
              throw jsonErr;
            }
          }
        } else {
          response = await client.chat.completions.create(requestPayload);
        }

        const duration = Date.now() - callStart;
        const rawContent = response.choices?.[0]?.message?.content;

        if (!rawContent || rawContent.trim().length === 0) {
          throw new Error('AI provider returned empty content');
        }

        // Structured observability logging without leaking secrets or full document
        console.log(
          `[AI Observability] task=${taskType} reqId=${reqId} model=${currentModel} duration=${duration}ms attempts=${attempts} tokens=${response.usage?.total_tokens || 0} status=success`
        );

        aiCircuitBreaker.recordSuccess();

        return {
          content: rawContent,
          model: currentModel,
          usage: response.usage || null,
          finishReason: response.choices?.[0]?.finish_reason || 'stop',
          attempts,
          correlationId: reqId,
          totalDurationMs: Date.now() - startTime
        };
      } catch (err) {
        lastError = err;
        const status = err.status || err.statusCode;
        const duration = Date.now() - callStart;

        console.warn(
          `[AI Warning] task=${taskType} reqId=${reqId} model=${currentModel} attempt=${attempts}/${aiConfig.maxRetries} duration=${duration}ms status=${status || 'error'} msg="${err.message || 'Error'}"`
        );

        // Immediate fail on authentication error — do not spam other models
        if (status === 401) {
          aiCircuitBreaker.recordFailure();
          throw new AppError(502, 'AI provider authentication failed');
        }

        // Model not found or deprecated: immediately skip to next model in fallback list
        if (status === 404 || err.code === 'model_not_found') {
          break; // break retry loop, move to next model
        }

        const isTransient =
          status === 429 ||
          status === 503 ||
          status === 504 ||
          status === 408 ||
          err.name === 'TimeoutError' ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT';

        if (isTransient && attempts < aiConfig.maxRetries) {
          const retryAfter = err.headers?.['retry-after'] || err.response?.headers?.['retry-after'];
          const delay = computeBackoff(attempts, retryAfter);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If not transient or retries exhausted for this model, break to try fallback model
        break;
      }
    }
  }

  aiCircuitBreaker.recordFailure();

  // If we reach here, all configured models failed
  const finalStatus = lastError?.status || lastError?.statusCode;
  if (finalStatus === 429) {
    throw new AppError(429, 'AI service is temporarily rate limited; please retry shortly');
  }
  if (finalStatus === 408 || lastError?.name === 'TimeoutError') {
    throw new AppError(504, 'AI service timed out; manual entry remains available');
  }
  if (finalStatus === 404 || lastError?.code === 'model_not_found') {
    throw new AppError(502, `Configured AI models are unavailable on Groq; check GROQ_PRIMARY_MODEL`);
  }
  if (lastError?.name === 'ZodError' || lastError instanceof SyntaxError) {
    throw new AppError(502, 'AI provider returned an invalid response structure');
  }

  throw new AppError(
    503,
    `AI service is temporarily unavailable; manual workflows remain active (${lastError?.message || 'provider error'})`
  );
}

