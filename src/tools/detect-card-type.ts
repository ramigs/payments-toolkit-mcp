import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { detectCardType } from '../lib/card-networks.js';
import { cardNumberSchema } from '../lib/schemas.js';
import { CARD_PREVIEW_RESOURCE_URI } from '../resources/card-preview.js';
import { withToolLogging } from '../lib/with-logging.js';

export function registerDetectCardTypeTool(server: McpServer): void {
  registerAppTool(
    server,
    'detect_card_type',
    {
      title: 'Detect Card Type',
      description:
        'Identifies the card network (Visa, Mastercard, American Express, ' +
        "Discover, Diners Club, JCB) from the card number's IIN/BIN prefix. " +
        'Accepts digits only (spaces/dashes should be stripped by the caller).',
      inputSchema: {
        cardNumber: cardNumberSchema,
      },
      outputSchema: {
        network: z.string(),
        cardNumber: z.string(),
      },
      // Links this tool to the card-preview widget; an MCP Apps host renders
      // that resource and pushes this result to it.
      _meta: { ui: { resourceUri: CARD_PREVIEW_RESOURCE_URI } },
    },
    withToolLogging('detect_card_type', async ({ cardNumber }) => {
      const network = detectCardType(cardNumber);
      return {
        content: [
          { type: 'text', text: JSON.stringify({ network, cardNumber }) },
        ],
        structuredContent: { network, cardNumber },
      };
    }),
  );
}
