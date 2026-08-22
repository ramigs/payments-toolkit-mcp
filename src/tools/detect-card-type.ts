import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { detectCardType } from '../lib/card-networks.js';
import { cardNumberSchema } from '../lib/schemas.js';
import { withToolLogging } from '../lib/with-logging.js';

export function registerDetectCardTypeTool(server: McpServer): void {
  server.registerTool(
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
      },
    },
    withToolLogging('detect_card_type', async ({ cardNumber }) => {
      const network = detectCardType(cardNumber);
      return {
        content: [{ type: 'text', text: JSON.stringify({ network }) }],
        structuredContent: { network },
      };
    }),
  );
}
