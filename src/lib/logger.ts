import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';
const isProd = process.env.NODE_ENV === 'production';

// stdout is reserved for JSON-RPC frames on the stdio transport, so that
// mode always logs to stderr (fd 2). The HTTP transport has no such
// constraint, so it logs to stdout (fd 1) instead, matching the usual
// "app emits a stream, the platform routes it" convention. `index.ts` sets
// MCP_TRANSPORT via an env var before dynamically importing whichever
// transport module was selected, so by the time this module is evaluated
// (transitively, through that import) the env var is already in place.
const destination = process.env.MCP_TRANSPORT === 'http' ? 1 : 2;

export const logger = isProd
  ? pino({ level }, pino.destination(destination))
  : pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { destination },
      },
    });
