import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { createApp } from '../../src/transports/http.js';

const ACCEPT_BOTH = 'application/json, text/event-stream';
const TOKEN = 'test-token';
const AUTH_HEADER = `Bearer ${TOKEN}`;

function initializeBody() {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  };
}

async function initializeSession(app: Express): Promise<string> {
  const res = await request(app)
    .post('/mcp')
    .set('Accept', ACCEPT_BOTH)
    .set('Authorization', AUTH_HEADER)
    .send(initializeBody());
  return res.headers['mcp-session-id'] as string;
}

describe('HTTP transport', () => {
  let app: Express;

  beforeEach(() => {
    vi.stubEnv('MCP_AUTH_TOKEN', TOKEN);
    app = createApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('auth', () => {
    it('rejects a request with no Authorization header', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .send(initializeBody());

      expect(res.status).toBe(401);
    });

    it('rejects a request with the wrong token', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', 'Bearer wrong-token')
        .send(initializeBody());

      expect(res.status).toBe(401);
    });

    it('rejects a malformed Authorization header', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', TOKEN)
        .send(initializeBody());

      expect(res.status).toBe(401);
    });

    it('accepts GET/DELETE requests with a valid token (still 400 for other reasons)', async () => {
      const getRes = await request(app)
        .get('/mcp')
        .set('Accept', 'text/event-stream')
        .set('Authorization', AUTH_HEADER);
      expect(getRes.status).toBe(400);

      const deleteRes = await request(app)
        .delete('/mcp')
        .set('Authorization', AUTH_HEADER);
      expect(deleteRes.status).toBe(400);
    });
  });

  describe('POST /mcp', () => {
    it('rejects a non-initialize request with no session ID', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', AUTH_HEADER)
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/no valid session ID/);
    });

    it('creates a new session on initialize', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', AUTH_HEADER)
        .send(initializeBody());

      expect(res.status).toBe(200);
      expect(res.headers['mcp-session-id']).toBeTruthy();
    });

    it('accepts a follow-up request that reuses the session ID', async () => {
      const sessionId = await initializeSession(app);

      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', sessionId)
        .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

      expect(res.status).toBe(200);
    });

    it('rejects a non-initialize request with an unknown session ID', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', 'unknown-session')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /mcp', () => {
    it('rejects a request with no session ID', async () => {
      const res = await request(app)
        .get('/mcp')
        .set('Accept', 'text/event-stream')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
    });

    it('rejects a request with an unknown session ID', async () => {
      const res = await request(app)
        .get('/mcp')
        .set('Accept', 'text/event-stream')
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', 'unknown-session');

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /mcp', () => {
    it('rejects a request with no session ID', async () => {
      const res = await request(app)
        .delete('/mcp')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
    });

    it('rejects a request with an unknown session ID', async () => {
      const res = await request(app)
        .delete('/mcp')
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', 'unknown-session');

      expect(res.status).toBe(400);
    });

    it('closes a valid session so it can no longer be used', async () => {
      const sessionId = await initializeSession(app);

      const deleteRes = await request(app)
        .delete('/mcp')
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', sessionId);
      expect(deleteRes.status).toBe(200);

      const followUp = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('Authorization', AUTH_HEADER)
        .set('mcp-session-id', sessionId)
        .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      expect(followUp.status).toBe(400);
    });
  });
});
