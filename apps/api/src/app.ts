import { readFileSync } from 'node:fs';

import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import { resolveOpenApiPath } from './lib/openapiPath';
import { authenticate } from './middleware/authenticate';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { categoriesRouter } from './routes/categories';
import { inventoryRouter } from './routes/inventory';
import { invoicesRouter } from './routes/invoices';
import { manufacturersRouter } from './routes/manufacturers';
import { partGradesRouter } from './routes/partGrades';
import { partsRouter } from './routes/parts';
import { shopsRouter } from './routes/shops';
import { stockTransactionsRouter } from './routes/stockTransactions';
import { suppliersRouter } from './routes/suppliers';
import { vehiclesRouter } from './routes/vehicles';

function parseAllowedOrigins(rawAllowedOrigins: string | undefined): string[] {
  if (!rawAllowedOrigins) {
    return ['http://localhost:3000'];
  }
  return rawAllowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}

export const app = express();

// Behind Railway's proxy: trust the first hop so express-rate-limit keys on the real
// client IP (from X-Forwarded-For) instead of the proxy. Scoped to 1, not `true`.
app.set('trust proxy', 1);

app.use(cors({ origin: parseAllowedOrigins(process.env.ALLOWED_ORIGINS) }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const openApiDocument: Record<string, unknown> = YAML.parse(readFileSync(resolveOpenApiPath(), 'utf-8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/v1', authRouter);

// Global gate: every /api/v1/* route below requires a valid Bearer token.
// authRouter is mounted above so POST /auth/login (and the already-authenticated
// /auth/me, /auth/logout) are matched before this gate.
app.use('/api/v1', authenticate);

app.use('/api/v1', manufacturersRouter);
app.use('/api/v1', categoriesRouter);
app.use('/api/v1', suppliersRouter);
app.use('/api/v1', vehiclesRouter);
app.use('/api/v1', partGradesRouter);
app.use('/api/v1', partsRouter);
app.use('/api/v1', shopsRouter);
app.use('/api/v1', inventoryRouter);
app.use('/api/v1', stockTransactionsRouter);
app.use('/api/v1', invoicesRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

app.use(errorHandler);
