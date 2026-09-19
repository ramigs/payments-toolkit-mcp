# payments-toolkit-mcp

Payments Toolkit is a validation assistant for **card numbers** and **IBANs**.
Ask in plain English — it checks card numbers (Luhn checksum and card network)
and IBANs (format, country length, checksum) by running real validators.

Learn more: [A validation assistant built on MCP, AG-UI, and MCP
Apps](https://ramigs.dev/blog/a-validation-assistant-built-on-mcp-ag-ui-and-mcp-apps/)

This is the MCP server: it exposes payments-related validation utilities as MCP
tools, a static resource, two MCP Apps (widgets that render the card and IBAN
tools' results), and a prompt template — all local logic, no network calls, no
API keys required.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_

- [Tools](#tools)
- [Resources](#resources)
- [Prompts](#prompts)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
  - [Type-checking, linting, formatting, building](#type-checking-linting-formatting-building)
- [Testing](#testing)
- [Connect to Claude Code](#connect-to-claude-code)
- [Deployment](#deployment)
- [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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

Streamable HTTP (a single long-running server multiple clients can connect to
over `POST/GET/DELETE /mcp`, with sessions keyed by the `Mcp-Session-Id`
header):

```bash
cp .env.example .env   # first time only — fill in MCP_AUTH_TOKEN
pnpm run start:http    # listens on PORT (default 3000)
```

`.env` is loaded automatically (via `dotenv`) and is gitignored. Stdio mode
doesn't use it — `MCP_AUTH_TOKEN` only matters for HTTP.

Inspect and call the tools/resource directly via a local web UI, without wiring
up a client:

```bash
pnpm run inspect
```

### Type-checking, linting, formatting, building

```bash
pnpm run typecheck     # tsc --noEmit (server + tests + both widget tsconfigs)
pnpm run lint          # eslint .
pnpm run lint:fix      # eslint . --fix
pnpm run format        # prettier --write .
pnpm run format:check  # prettier --check .
pnpm run build         # builds the widgets, compiles the server, copies flags into dist/
pnpm run toc           # regenerates this README's table of contents
```

## Testing

```bash
pnpm test              # run the full suite once
pnpm run test:watch    # re-run on file changes
pnpm run test:coverage # run once and print a coverage report
```

Only `pnpm test` builds the widgets first (via its `pretest` hook). Run `pnpm
run build:widget` beforehand if you use `test:watch` or `test:coverage` on a
fresh checkout — otherwise the widget-resource tests fail with `ENOENT` on
`dist/ui/*/mcp-app.html`.

Tests are split into two kinds, mirroring `src/`:

- `tests/unit/` — pure logic (`src/lib/*`), no MCP or HTTP involved.
- `tests/integration/` — `server.test.ts` wires the real `McpServer` to a real
  `Client` over an in-memory transport and drives it through
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

Inside a Claude Code session, run `/mcp` to confirm the connection and see the
discovered tools/resources/prompts. If you add or change a prompt after the
session already connected, reconnect via `/mcp` (or restart the session) — the
prompt list is enumerated at connection time.

## Deployment

Running `start:http` as a standalone service (e.g. one Railway service talking
to another, rather than a local stdio child) needs:

- `MCP_AUTH_TOKEN` — a shared-secret bearer token; every request must present
  it as `Authorization: Bearer <token>`, checked with a constant-time
  comparison. `runHttp` throws at boot if it's unset. See `.env.example`.
- **No public domain.** This token is defense-in-depth, not the primary
  boundary — the intended deployment puts this service on a private network
  (e.g. Railway's internal `*.railway.internal` networking) reachable only by
  the caller that needs it, not the public internet. Full OAuth (the MCP
  Authorization spec) is overkill here: that model exists for third-party
  clients acting on behalf of many distinct end users, not a single caller you
  control.
- A `Dockerfile` is included, mirroring the deployment conventions of
  `payments-toolkit-agent` (its consumer).
- `DOTENV_CONFIG_QUIET=true` — optional, but recommended on a platform (like
  Railway) that classifies logs by stream: `dotenv@18+` logs its own
  "injected env (N) from .env" line via `console.error` regardless of
  whether a `.env` file was even found, which such a platform then flags as
  an error even though nothing failed. This variable silences that message;
  it's read directly by `dotenv`, not by this app's own code.

## Notes

- Over stdio, stdout is reserved for the JSON-RPC protocol stream, so that
  transport's logs go to stderr — never `console.log` there, use
  `console.error` for debug output. The HTTP transport has no such
  constraint, so its logs go to stdout instead (see `src/lib/logger.ts`);
  `index.ts` sets `MCP_TRANSPORT` (not meant to be set manually) so the
  logger picks the right one.
- Each MCP server instance can only be `connect()`-ed to one transport, so the
  HTTP transport creates a fresh `McpServer` per session (keyed by
  `Mcp-Session-Id`) rather than sharing one across clients.
