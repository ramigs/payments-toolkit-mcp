import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { createApp } from '../../src/transports/http.js';

const ACCEPT_BOTH = 'application/json, text/event-stream';

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
    .send(initializeBody());
  return res.headers['mcp-session-id'] as string;
}

describe('HTTP transport', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('POST /mcp', () => {
    it('rejects a non-initialize request with no session ID', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/no valid session ID/);
    });

    it('creates a new session on initialize', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .send(initializeBody());

      expect(res.status).toBe(200);
      expect(res.headers['mcp-session-id']).toBeTruthy();
    });

    it('accepts a follow-up request that reuses the session ID', async () => {
      const sessionId = await initializeSession(app);

      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('mcp-session-id', sessionId)
        .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

      expect(res.status).toBe(200);
    });

    it('rejects a non-initialize request with an unknown session ID', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('mcp-session-id', 'unknown-session')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /mcp', () => {
    it('rejects a request with no session ID', async () => {
      const res = await request(app)
        .get('/mcp')
        .set('Accept', 'text/event-stream');

      expect(res.status).toBe(400);
    });

    it('rejects a request with an unknown session ID', async () => {
      const res = await request(app)
        .get('/mcp')
        .set('Accept', 'text/event-stream')
        .set('mcp-session-id', 'unknown-session');

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /mcp', () => {
    it('rejects a request with no session ID', async () => {
      const res = await request(app).delete('/mcp');

      expect(res.status).toBe(400);
    });

    it('rejects a request with an unknown session ID', async () => {
      const res = await request(app)
        .delete('/mcp')
        .set('mcp-session-id', 'unknown-session');

      expect(res.status).toBe(400);
    });

    it('closes a valid session so it can no longer be used', async () => {
      const sessionId = await initializeSession(app);

      const deleteRes = await request(app)
        .delete('/mcp')
        .set('mcp-session-id', sessionId);
      expect(deleteRes.status).toBe(200);

      const followUp = await request(app)
        .post('/mcp')
        .set('Accept', ACCEPT_BOTH)
        .set('mcp-session-id', sessionId)
        .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      expect(followUp.status).toBe(400);
    });
  });
});
