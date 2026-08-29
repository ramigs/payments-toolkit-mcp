import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('payments-toolkit-mcp server', () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    server = createServer();
    client = new Client({ name: 'test-client', version: '0.0.0' });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('lists all registered tools, resources, and prompts', async () => {
    const [tools, resources, prompts] = await Promise.all([
      client.listTools(),
      client.listResources(),
      client.listPrompts(),
    ]);

    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      'detect_card_type',
      'validate_card_number',
      'validate_iban',
    ]);
    expect(resources.resources.map((r) => r.uri)).toEqual([
      'payments-toolkit://card-networks',
      'ui://payments-toolkit/card-preview',
    ]);
    expect(prompts.prompts.map((p) => p.name)).toEqual([
      'check_payment_details',
    ]);
  });

  describe('validate_card_number tool', () => {
    it('returns valid: true for a Luhn-valid number', async () => {
      const result = await client.callTool({
        name: 'validate_card_number',
        arguments: { cardNumber: '4111111111111111' },
      });
      expect(result.structuredContent).toEqual({ valid: true });
    });

    it('returns valid: false for a Luhn-invalid number', async () => {
      const result = await client.callTool({
        name: 'validate_card_number',
        arguments: { cardNumber: '4111111111111112' },
      });
      expect(result.structuredContent).toEqual({ valid: false });
    });

    it('rejects input that fails the Zod schema at the protocol boundary', async () => {
      const result = await client.callTool({
        name: 'validate_card_number',
        arguments: { cardNumber: 'not-a-number' },
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('detect_card_type tool', () => {
    it('identifies a Visa number and returns the full card number', async () => {
      const result = await client.callTool({
        name: 'detect_card_type',
        arguments: { cardNumber: '4111111111111111' },
      });
      expect(result.structuredContent).toEqual({
        network: 'Visa',
        cardNumber: '4111111111111111',
      });
    });

    it('is an MCP App tool bound to the card-preview UI resource', async () => {
      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === 'detect_card_type');
      expect(tool?._meta).toMatchObject({
        ui: { resourceUri: 'ui://payments-toolkit/card-preview' },
      });
    });
  });

  describe('card_preview UI resource', () => {
    it('serves the bundled widget HTML with the MCP App mime type', async () => {
      const result = await client.readResource({
        uri: 'ui://payments-toolkit/card-preview',
      });
      const [content] = result.contents;
      if (!('text' in content)) {
        throw new Error('expected a text resource');
      }
      expect(content.mimeType).toBe('text/html;profile=mcp-app');
      // The widget is bundled to a single self-contained HTML file, so the
      // MCP App SDK is inlined into it rather than fetched at runtime.
      expect(content.text.toLowerCase()).toContain('<!doctype html>');
      expect(content.text).toContain('id="card"');
      // The network artwork is inlined into the single-file bundle — the Visa
      // brand colour proves an SVG made it in.
      expect(content.text).toContain('id="logo"');
      expect(content.text).toContain('#1434CB');
    });
  });

  describe('validate_iban tool', () => {
    it('returns valid: true with the country for a valid IBAN', async () => {
      const result = await client.callTool({
        name: 'validate_iban',
        arguments: { iban: 'DE89370400440532013000' },
      });
      expect(result.structuredContent).toEqual({
        valid: true,
        country: 'DE',
      });
    });

    it('returns valid: false for a bad checksum', async () => {
      const result = await client.callTool({
        name: 'validate_iban',
        arguments: { iban: 'DE89370400440532013001' },
      });
      expect(result.structuredContent).toEqual({
        valid: false,
        country: 'DE',
      });
    });
  });

  describe('card_networks resource', () => {
    it('returns the network table as JSON', async () => {
      const result = await client.readResource({
        uri: 'payments-toolkit://card-networks',
      });
      const [content] = result.contents;
      if (!('text' in content)) {
        throw new Error('Expected a text resource, got a binary blob');
      }
      const data = JSON.parse(content.text);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toContainEqual({
        name: 'Visa',
        prefixRanges: ['4'],
      });
    });
  });

  describe('check_payment_details prompt', () => {
    it('requests checks for both a card number and an IBAN when both are given', async () => {
      const result = await client.getPrompt({
        name: 'check_payment_details',
        arguments: {
          cardNumber: '4111111111111111',
          iban: 'DE89370400440532013000',
        },
      });
      const messageContent = result.messages[0].content;
      if (messageContent.type !== 'text') {
        throw new Error(
          `Expected a text prompt message, got "${messageContent.type}"`,
        );
      }
      const text = messageContent.text;

      expect(text).toContain('4111111111111111');
      expect(text).toContain('detect_card_type');
      expect(text).toContain('DE89370400440532013000');
      expect(text).toContain('validate_iban');
    });

    it('asks the user for input when neither argument is given', async () => {
      const result = await client.getPrompt({
        name: 'check_payment_details',
        arguments: {},
      });
      const messageContent = result.messages[0].content;
      if (messageContent.type !== 'text') {
        throw new Error(
          `Expected a text prompt message, got "${messageContent.type}"`,
        );
      }
      const text = messageContent.text;

      expect(text).toContain('Ask the user for a card number and/or IBAN');
    });
  });
});
