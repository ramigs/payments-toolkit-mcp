import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';
const isProd = process.env.NODE_ENV === 'production';

// stdout is reserved for JSON-RPC frames on the stdio transport, so every
// log line — in both transports, for consistency — goes to stderr (fd 2).
export const logger = isProd
  ? pino({ level }, pino.destination(2))
  : pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { destination: 2 },
      },
    });
