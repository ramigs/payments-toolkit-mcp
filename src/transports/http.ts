import { randomUUID } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from '../server.js';

export function createApp(): Express {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const app = express();
  app.use(express.json());

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
  const app = createApp();

  await new Promise<void>((resolve) => {
    app.listen(port, () => resolve());
  });
  console.error(
    `payments-toolkit-mcp server running on http://localhost:${port}/mcp`,
  );
}
