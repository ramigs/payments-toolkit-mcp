import { randomUUID, timingSafeEqual } from 'node:crypto';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from '../server.js';
import { logger } from '../lib/logger.js';

// Shared-secret bearer token, checked against every request. Not the MCP
// spec's own OAuth-based authorization (that model assumes third-party
// clients acting on behalf of many distinct end users, needing individual
// consent) — this server has exactly one known caller (its deployment's own
// agent), so a static token is the proportionate check, meant to sit behind
// network-level isolation (e.g. a private network with no public domain)
// rather than as the sole line of defense.
function isAuthorized(header: string | undefined): boolean {
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token || !header?.startsWith('Bearer ')) return false;

  const presented = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(token);
  // timingSafeEqual throws on a buffer-length mismatch rather than
  // returning false, so the lengths are checked explicitly first.
  return (
    presented.length === expected.length &&
    timingSafeEqual(presented, expected)
  );
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthorized(req.header('authorization'))) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    });
    return;
  }
  next();
}

export function createApp(): Express {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const app = express();
  app.use(express.json());
  app.use(requireAuth);

  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.header('mcp-session-id');
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: no valid session ID provided',
          },
          id: null,
        });
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport!);
        },
      });
      transport.onclose = () => {
        if (transport!.sessionId) transports.delete(transport!.sessionId);
      };

      const server = createServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.header('mcp-session-id');
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transport.handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  return app;
}

export async function runHttp(port: number): Promise<void> {
  if (!process.env.MCP_AUTH_TOKEN) {
    throw new Error('MCP_AUTH_TOKEN is not set.');
  }

  const app = createApp();

  await new Promise<void>((resolve) => {
    app.listen(port, () => resolve());
  });
  logger.info(
    `payments-toolkit-mcp server running on http://localhost:${port}/mcp`,
  );
}
