# payments-toolkit-mcp

A minimal [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
server, built as a hands-on learning project (see [PLAN.md](./PLAN.md) for
the full step-by-step walkthrough).

It exposes payments-related validation utilities as MCP tools and one static
resource — all local logic, no network calls, no API keys required.

## Tools

- **`validate_card_number`** — Luhn checksum validation for a card number
  (digits only, 8-19 length).
- **`detect_card_type`** — identifies the card network (Visa, Mastercard,
  American Express, Discover, Diners Club, JCB) from the IIN/BIN prefix.
- **`validate_iban`** — format, country-specific length, and ISO 13616
  mod-97 checksum validation for an IBAN.

## Resources

- **`card_networks`** (`payments-toolkit://card-networks`) — static JSON
  listing of supported card networks and their prefix ranges.

## Prerequisites

- Node.js 18+ (project developed against v24)
- [pnpm](https://pnpm.io)

## Setup

```bash
pnpm install
pnpm run build
```

## Usage

Run the server standalone (it waits on stdio, so this is mainly for sanity
checking):

```bash
pnpm run start
```

Inspect and call the tools/resource directly via a local web UI, without
wiring up a client:

```bash
pnpm run inspect
```

## Connect to Claude Code

```bash
claude mcp add payments-toolkit-mcp -- node /path/to/payments-toolkit-mcp/dist/index.js
claude mcp list
```

Inside a Claude Code session, run `/mcp` to confirm the connection and see
the discovered tools/resources.

## Project structure

```
src/
  index.ts                   # composition root: creates the server, wires up transport
  lib/                       # pure validation/lookup logic (no MCP dependency)
    luhn.ts
    card-networks.ts
    iban.ts
    schemas.ts
  tools/                     # one file per registered MCP tool
    validate-card-number.ts
    detect-card-type.ts
    validate-iban.ts
  resources/                 # one file per registered MCP resource
    card-networks.ts
```

## Notes

- Never `console.log` in this server — stdout is reserved for the JSON-RPC
  protocol stream over stdio. Use `console.error` for any debug output.
