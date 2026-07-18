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

describe('GET /docs', () => {
  it('serves the Swagger UI as HTML', async () => {
    const response = await request(app).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('swagger-ui');
  });
});

// Behavioural test: the CORS allowlist grants only origins from ALLOWED_ORIGINS
// (defaulting to the local web app when unset)
describe('CORS allowlist', () => {
  it('grants the allowed origin an ACAO header and withholds it from others', async () => {
    const allowedResponse = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(allowedResponse.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const disallowedResponse = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(disallowedResponse.headers['access-control-allow-origin']).toBeUndefined();
  });
});
