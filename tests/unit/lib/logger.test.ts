import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// `pino.destination()`/`pino({ transport: ... })` run at module-import time,
// so `pino` itself is mocked to capture which destination fd `logger.ts`
// resolves to, without spinning up a real pino-pretty worker thread or
// relying on internals of the returned logger instance. Each case needs a
// fresh module registry (`vi.resetModules()`) and a dynamic re-import,
// since a single static top-level import would only ever see the first
// case's env vars.
describe('logger destination', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('pino');
  });

  async function resolvedDestination(
    transport: string | undefined,
    nodeEnv: string,
  ): Promise<number | undefined> {
    vi.stubEnv('MCP_TRANSPORT', transport);
    vi.stubEnv('NODE_ENV', nodeEnv);

    let captured: number | undefined;

    vi.doMock('pino', () => {
      const destination = vi.fn((fd: number) => {
        captured = fd;
        return { fd };
      });
      const pinoFactory = vi.fn(
        (opts?: { transport?: { options?: { destination?: number } } }) => {
          if (opts?.transport?.options?.destination !== undefined) {
            captured = opts.transport.options.destination;
          }
          return {};
        },
      );
      return { default: Object.assign(pinoFactory, { destination }) };
    });

    await import('../../../src/lib/logger.js');
    return captured;
  }

  it('resolves to stdout (fd 1) in prod when MCP_TRANSPORT is http', async () => {
    expect(await resolvedDestination('http', 'production')).toBe(1);
  });

  it('resolves to stderr (fd 2) in prod when MCP_TRANSPORT is stdio', async () => {
    expect(await resolvedDestination('stdio', 'production')).toBe(2);
  });

  it('resolves to stdout (fd 1) in dev when MCP_TRANSPORT is http', async () => {
    expect(await resolvedDestination('http', 'development')).toBe(1);
  });

  it('resolves to stderr (fd 2) in dev when MCP_TRANSPORT is stdio', async () => {
    expect(await resolvedDestination('stdio', 'development')).toBe(2);
  });

  it('defaults to stderr (fd 2) when MCP_TRANSPORT is unset', async () => {
    expect(await resolvedDestination(undefined, 'production')).toBe(2);
  });
});
