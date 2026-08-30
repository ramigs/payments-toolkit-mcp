# payments-toolkit-mcp

A minimal [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
server, built as a hands-on learning project (see [PLAN.md](./PLAN.md) for
the full step-by-step walkthrough).

It exposes payments-related validation utilities as MCP tools, one static
resource, and one prompt template — all local logic, no network calls, no
API keys required.

## Tools

- **`validate_card_number`** — Luhn checksum validation for a card number
  (digits only, 8-19 length).
- **`detect_card_type`** — identifies the card network (Visa, Mastercard,
  American Express, Discover, Diners Club, JCB) from the IIN/BIN prefix.
  Bound to the `card-preview` MCP App widget.
- **`validate_iban`** — format, country-specific length, and ISO 13616
  mod-97 checksum validation for an IBAN. Bound to the `iban-preview` MCP
  App widget; its result also carries the country name and flag SVG.

## Resources

- **`card_networks`** (`payments-toolkit://card-networks`) — static JSON
  listing of supported card networks and their prefix ranges.
- **`card-preview`** (`ui://payments-toolkit/card-preview`) — MCP App
  widget HTML rendered by `detect_card_type`.
- **`iban-preview`** (`ui://payments-toolkit/iban-preview`) — MCP App
  widget HTML rendered by `validate_iban`; shows the grouped IBAN, its
  country and flag, and whether the checksum passed. Flags are vendored
  from [flag-icons](https://github.com/lipis/flag-icons) (MIT) by
  `pnpm run vendor:flags`.

## Prompts

- **`check_payment_details`** — takes an optional `cardNumber` and/or `iban`
  argument and returns a message instructing the model to run the relevant
  tools and summarize the results. Unlike tools, prompts are invoked
  explicitly by the user (e.g. as a `/mcp__payments-toolkit-mcp__check_payment_details`
  slash command in Claude Code), not chosen autonomously by the model.

## Prerequisites

- Node.js 18+ (project developed against v24)
- [pnpm](https://pnpm.io)

## Setup

```bash
pnpm install
pnpm run build
```

## Usage

The server supports two transports, chosen at startup.

Stdio (default — one client per process, e.g. Claude Code/Desktop):

```bash
pnpm run start
```

Streamable HTTP (a single long-running server multiple clients can connect
to over `POST/GET/DELETE /mcp`, with sessions keyed by the `Mcp-Session-Id`
header):

```bash
pnpm run start:http          # listens on PORT (default 3000)
PORT=4000 pnpm run start:http
```

Inspect and call the tools/resource directly via a local web UI, without
wiring up a client:

```bash
pnpm run inspect
```

## Testing

```bash
pnpm test              # run the full suite once
pnpm run test:watch    # re-run on file changes
pnpm run test:coverage # run once and print a coverage report
```

Tests are split into two kinds, mirroring `src/`:

- `tests/unit/` — pure logic (`src/lib/*`), no MCP or HTTP involved.
- `tests/integration/` — `server.test.ts` wires the real `McpServer` to a
  real `Client` over an in-memory transport and drives it through
  `tools/resources/prompts`; `http.test.ts` drives the Streamable HTTP
  transport's Express app directly with
  [supertest](https://github.com/ladjs/supertest) to cover session
  creation/reuse/teardown.

## Connect to Claude Code

Over stdio:

```bash
claude mcp add payments-toolkit-mcp -- node /path/to/payments-toolkit-mcp/dist/index.js
claude mcp list
```

Over HTTP (start the server with `pnpm run start:http` first):

```bash
claude mcp add --transport http payments-toolkit-mcp http://localhost:3000/mcp
```

Inside a Claude Code session, run `/mcp` to confirm the connection and see
the discovered tools/resources/prompts. If you add or change a prompt after
the session already connected, reconnect via `/mcp` (or restart the
session) — the prompt list is enumerated at connection time.

## Project structure

```
src/
  index.ts                   # entry point: picks a transport from argv/env
  server.ts                  # factory: builds an McpServer with tools/resources/prompts registered
  transports/
    stdio.ts                 # single-session stdio transport
    http.ts                  # StreamableHTTPServerTransport, one server instance per session
  lib/                       # pure validation/lookup logic (no MCP dependency)
    luhn.ts
    card-networks.ts
    iban.ts
    flags.ts                 # loads one vendored country flag SVG on demand
    schemas.ts
  tools/                     # one file per registered MCP tool
    validate-card-number.ts
    detect-card-type.ts
    validate-iban.ts
  resources/                 # one file per registered MCP resource
    card-networks.ts
    card-preview.ts          # serves the detect_card_type widget HTML
    iban-preview.ts          # serves the validate_iban widget HTML
  prompts/                    # one file per registered MCP prompt
    check-payment-details.ts
  ui/                        # MCP App widgets, bundled to one HTML file each by Vite
    card-preview/
    iban-preview/            # includes flags/ — vendored, served by validate_iban
scripts/
  vendor-flags.mjs           # regenerates src/ui/iban-preview/flags from flag-icons
  copy-flags.mjs             # copies those flags into dist/ during build
tests/
  unit/lib/                   # unit tests for src/lib, mirrored 1:1
  integration/
    server.test.ts            # McpServer <-> Client over an in-memory transport
    http.test.ts              # Streamable HTTP transport, via supertest
```

## Notes

- Never `console.log` in this server — over stdio, stdout is reserved for
  the JSON-RPC protocol stream. Use `console.error` for any debug output
  (harmless but kept consistent for the HTTP transport too).
- Each MCP server instance can only be `connect()`-ed to one transport, so
  the HTTP transport creates a fresh `McpServer` per session (keyed by
  `Mcp-Session-Id`) rather than sharing one across clients.
