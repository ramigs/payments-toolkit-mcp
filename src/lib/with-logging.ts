import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type CallKind = 'tool' | 'resource' | 'prompt';

function withCallLogging<Args, Result>(
  kind: CallKind,
  name: string,
  handler: (args: Args, extra: Extra) => Result | Promise<Result>,
  options: {
    toLogArgs: (args: Args) => Record<string, unknown>;
    isError?: (result: Result) => boolean;
  },
): (args: Args, extra: Extra) => Promise<Result> {
  return async (args, extra) => {
    // pino treats a `name` binding specially (folds it into the logger
    // prefix instead of showing it as a field), so use `target` instead.
    const log = logger.child({
      kind,
      target: name,
      requestId: extra.requestId,
      sessionId: extra.sessionId,
    });
    const startedAt = Date.now();
    log.info({ args: options.toLogArgs(args) }, `${kind} call started`);

    try {
      const result = await handler(args, extra);
      const fields: Record<string, unknown> = {
        durationMs: Date.now() - startedAt,
      };
      if (options.isError) fields.isError = options.isError(result);
      log.info(fields, `${kind} call finished`);
      return result;
    } catch (err) {
      log.error(
        { durationMs: Date.now() - startedAt, err },
        `${kind} call threw`,
      );
      throw err;
    }
  };
}

export function withToolLogging<Args extends Record<string, unknown>>(
  toolName: string,
  handler: (
    args: Args,
    extra: Extra,
  ) => CallToolResult | Promise<CallToolResult>,
): (args: Args, extra: Extra) => Promise<CallToolResult> {
  return withCallLogging('tool', toolName, handler, {
    toLogArgs: maskArgs,
    isError: (result) => result.isError ?? false,
  });
}

export function withResourceLogging(
  resourceName: string,
  handler: (
    uri: URL,
    extra: Extra,
  ) => ReadResourceResult | Promise<ReadResourceResult>,
): (uri: URL, extra: Extra) => Promise<ReadResourceResult> {
  return withCallLogging('resource', resourceName, handler, {
    toLogArgs: (uri) => ({ uri: uri.href }),
  });
}

export function withPromptLogging<Args extends Record<string, unknown>>(
  promptName: string,
  handler: (
    args: Args,
    extra: Extra,
  ) => GetPromptResult | Promise<GetPromptResult>,
): (args: Args, extra: Extra) => Promise<GetPromptResult> {
  return withCallLogging('prompt', promptName, handler, {
    toLogArgs: maskArgs,
  });
}

// All current tool/prompt inputs are sensitive payment identifiers (card
// numbers, IBANs), so every string argument is masked to its last 4
// characters rather than maintaining a per-field allowlist of sensitive names.
function maskArgs(args: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    masked[key] = typeof value === 'string' ? maskSensitive(value) : value;
  }
  return masked;
}

function maskSensitive(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
