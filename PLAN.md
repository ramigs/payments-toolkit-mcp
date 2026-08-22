# PLAN.md — Payments Toolkit MCP Server (Learning Project)

## Objective

Build a minimal Model Context Protocol (MCP) server in TypeScript to learn the
core MCP concepts hands-on: **tools**, **resources**, the **stdio transport**,
and the request/response lifecycle between a server and a real client (Claude
Code / Claude Desktop).

The server ("payments-toolkit-mcp") will expose three tools and one resource, all
backed by **local logic only — no external API calls, no network dependency.**
This keeps the project self-contained and testable offline.

- `validate_card_number` — Luhn algorithm check
- `detect_card_type` — identifies the card network (Visa, Mastercard, Amex,
  etc.) from the IIN/BIN prefix
- `validate_iban` — format + checksum validation (mod-97) for IBANs
- A static `card_networks` resource — supported networks and their prefix
  ranges

Scope is deliberately small — the goal is understanding the protocol, not
shipping something production-grade.

---

## Prerequisites

- Node.js 18+ (`node --version` to check)
- Claude Code or Claude Desktop installed, for the final connection test
- No API keys, no network access needed

---

## Steps

### 1. Scaffold the project

```bash
mkdir payments-toolkit-mcp && cd payments-toolkit-mcp
pnpm init
pnpm add @modelcontextprotocol/sdk zod
pnpm add -D typescript @types/node
mkdir src && touch src/index.ts
```

Set `"type": "module"` in `package.json` — the SDK is ESM-first.

Add a minimal `tsconfig.json` targeting ES2022+ with `module: "NodeNext"`.

### 2. Create the server instance

In `src/index.ts`:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({
  name: 'payments-toolkit-mcp',
  version: '1.0.0',
});
```

### 3. Register the `validate_card_number` tool

- Zod schema requiring a string input (digits only, reasonable length).
- Implement the Luhn algorithm to check validity.
- Return a structured result (`{ valid: boolean }`).
- This is the fastest way to see input validation + response formatting
  end to end.

### 4. Register the `detect_card_type` tool

- Zod schema: same card-number string input.
- Match against known IIN/BIN prefix ranges (Visa starts with 4; Mastercard
  51–55 and 2221–2720; Amex 34/37; etc.) — a small hardcoded lookup table is
  enough.
- Return `{ network: string | "unknown" }`.
- Good second tool: same input shape as tool #3, different logic — reinforces
  the registration pattern without new concepts.

### 5. Register the `validate_iban` tool

- Zod schema requiring a string input (the IBAN).
- Steps: strip spaces/uppercase → check country-code + length rules →
  rearrange and mod-97 checksum per the ISO 13616 algorithm.
- Return `{ valid: boolean, country?: string }`.
- Slightly more involved logic — good practice for a tool with real
  multi-step validation.

### 6. Add the `card_networks` resource

- Register a static resource exposing the network → prefix-range table used
  in step 4.
- This is the read-only counterpart to tools — rounds out the core mental
  model (tools = actions, resources = data).

### 7. Wire up the stdio transport

```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Critical rule:** never use `console.log` in a stdio server — stdout is
reserved for JSON-RPC protocol frames. Use `console.error` for any debug
output; stderr is safe.

### 8. Build

```bash
pnpm exec tsc
```

Confirm `dist/index.js` runs standalone: `node dist/index.js` (should hang,
waiting on stdio — that's expected).

### 9. Test with MCP Inspector (before touching any client)

```bash
pnpm dlx @modelcontextprotocol/inspector node dist/index.js
```

Opens a local web UI to call your tools directly and see raw JSON-RPC
requests/responses. Try known-good and known-bad card numbers/IBANs to
confirm the logic, not just the protocol plumbing.

### 10. Connect to Claude Code

```bash
claude mcp add payments-toolkit-mcp -- node /path/to/payments-toolkit-mcp/dist/index.js
claude mcp list        # confirm it's registered
```

Inside a Claude Code session, run `/mcp` to check connection status and see
which tools/resources were discovered.

### 11. End-to-end test

Ask Claude Code something that requires the tools, e.g. "is 4111111111111111
a valid Visa test number?" or "check this IBAN: DE89370400440532013000".
Claude decides on its own whether to call your tool based on the tool's
description — so this step also tests whether your descriptions are clear
enough for the model to pick the right tool.

---

## Debugging notes

- Silent failure or odd errors from Claude Code → almost always either:
  (a) something accidentally printed to stdout (corrupts the JSON-RPC
  stream), or (b) the Zod schema rejecting input the model sent.
- MCP Inspector surfaces both immediately — use it before assuming
  something's wrong with the client integration.
- Using the stable **v1.x** TypeScript SDK (`@modelcontextprotocol/sdk`,
  currently 1.30.0 on npm). A v2 exists as a beta tag on GitHub but isn't
  published to npm yet — revisit once it ships as a stable release.

---

## Stretch goals (after the basics work)

- [x] Try `StreamableHTTPServerTransport` instead of stdio, for a server that
      could be shared across multiple clients. See step 12 below.
- [x] Add a prompt template (the third MCP primitive, alongside tools and
      resources). See step 13 below.
- [x] Structured logging, to have a debuggable trace of every call (for both
      stdio and HTTP). See step 14 below.

### 12. Add the Streamable HTTP transport (done)

Supporting both transports meant splitting `index.ts`: the tool/resource
registration moved into a `createServer()` factory (`src/server.ts`), and
each transport got its own module (`src/transports/stdio.ts`,
`src/transports/http.ts`). `index.ts` now just picks one based on a
`--http` flag.

Key thing learned: an `McpServer` can only be `connect()`-ed to **one**
transport — calling `connect()` twice throws. For stdio that's a non-issue
(one process per client), but HTTP needs to serve multiple clients from one
long-running process. The fix is the pattern from the SDK's own docs:
create a brand-new `McpServer` + `StreamableHTTPServerTransport` pair per
session, generated on the `initialize` request and keyed by the
`Mcp-Session-Id` header on every request after that (`POST/GET/DELETE
/mcp`). Requests with no session ID that aren't `initialize` get a 400.

Used `express` for body parsing and routing — added as a real dependency
(`pnpm add express`), not just for the stretch goal; it's the same pattern
the SDK's own examples use for this transport, so no need to hand-roll body
buffering over raw `node:http`.

Verified with raw `curl`: `initialize` returns an `Mcp-Session-Id` header,
reusing it on `tools/list` and `tools/call` works, and omitting it on a
non-initialize request correctly 400s.

### 13. Add a prompt template (done)

Registered `check_payment_details` (`src/prompts/check-payment-details.ts`)
via `server.registerPrompt`, following the same one-file-per-primitive
pattern as `tools/` and `resources/`. It takes optional `cardNumber`/`iban`
string arguments and returns a `messages` array telling the model which
tools to call and how to format the summary — the server never calls the
tools itself, it just hands back text.

Key thing learned: prompts are the odd one out among the three primitives —
tools are invoked by the model on its own judgment, resources are read by
the client/model for context, but prompts are invoked **explicitly by the
user**, surfaced as a picker or slash command (in Claude Code:
`/mcp__payments-toolkit-mcp__check_payment_details`). A prompt's `argsSchema`
is a flat shape of strings only (the MCP spec has clients render arguments
as plain text fields), unlike a tool's `inputSchema`, which can be any Zod
shape.

Gotcha while testing: a client enumerates a server's prompts (and
tools/resources) when the connection is first established, so adding a new
prompt after a Claude Code session already connected doesn't show up until
you reconnect via `/mcp` or restart the session — rebuilding `dist/` alone
isn't enough for an already-connected client to see it.

Verified two ways: `pnpm dlx @modelcontextprotocol/inspector --cli node
dist/index.js --method prompts/list` (and `prompts/get` with sample args)
to check the raw protocol output directly, then reconnecting in Claude Code
and running the slash command end to end.

### 14. Add structured logging (done)

Added `pino` (real dependency) and `pino-pretty` (dev-only), behind a
single `logger` instance in `src/lib/logger.ts`: raw JSON to stderr when
`NODE_ENV=production`, pretty-printed stderr otherwise. Both transports'
startup banners (`console.error` calls) were switched to `logger.info` too
— mixing a plain string line with JSON trace lines on the same stream
would break anything parsing the log as JSONL.

Per-call tracing lives in `src/lib/with-logging.ts`, covering all three
primitives: `withToolLogging`, `withResourceLogging`, and
`withPromptLogging`, each a thin wrapper around a shared
`withCallLogging` core rather than logging calls sprinkled inside each
handler body. It logs a `start` and `finish`/`error` line per call with
`kind` (`tool`/`resource`/`prompt`), `target` (the primitive's name), and
— from the SDK's `RequestHandlerExtra` passed to every tool, resource,
and prompt callback alike — `requestId` (all calls) and `sessionId`
(HTTP only, since stdio is one client per process). That `extra` object
already carries everything needed to correlate a call; no need to
generate a separate id.

Gotcha: pino treats a `name` binding specially — it folds it into the
logger's display prefix instead of showing it as a normal field — so the
per-call label is bound as `target`, not `name`.

Key thing learned: since every tool/prompt here takes a raw payment
identifier (card number, IBAN) as its only string argument, the wrapper
masks _all_ string args to their last 4 characters by default rather than
maintaining a per-primitive list of sensitive field names — safer default
for this domain, and one less thing to remember when adding a new
tool/prompt later. Resource reads have no such argument (`card_networks`
takes only a URI), so only the URI is logged.

Verified with the MCP Inspector CLI (stdio, across `tools/call`,
`resources/read`, and `prompts/get`) and raw `curl` against the HTTP
transport: confirmed masked args in the trace, `requestId`/`sessionId`
correlation, stdout staying untouched on the stdio transport, and the
JSON-vs-pretty switch via `NODE_ENV`.
