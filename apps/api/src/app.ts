import { readFileSync } from 'node:fs';

import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import { resolveOpenApiPath } from './lib/openapiPath';
import { errorHandler } from './middleware/errorHandler';
import { categoriesRouter } from './routes/categories';
import { inventoryRouter } from './routes/inventory';
import { manufacturersRouter } from './routes/manufacturers';
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

app.use(cors({ origin: parseAllowedOrigins(process.env.ALLOWED_ORIGINS) }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const openApiDocument: Record<string, unknown> = YAML.parse(readFileSync(resolveOpenApiPath(), 'utf-8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/v1', manufacturersRouter);
app.use('/api/v1', categoriesRouter);
app.use('/api/v1', suppliersRouter);
app.use('/api/v1', vehiclesRouter);
app.use('/api/v1', partsRouter);
app.use('/api/v1', shopsRouter);
app.use('/api/v1', inventoryRouter);
app.use('/api/v1', stockTransactionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

app.use(errorHandler);
