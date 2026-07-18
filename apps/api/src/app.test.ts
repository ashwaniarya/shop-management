// Behavioural test (smoke): critical-path check that the server boots and responds
import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from './app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
