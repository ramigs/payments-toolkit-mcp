import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isValidLuhn } from '../lib/luhn.js';
import { cardNumberSchema } from '../lib/schemas.js';

export function registerValidateCardNumberTool(server: McpServer): void {
  server.registerTool(
    'validate_card_number',
    {
      title: 'Validate Card Number',
      description:
        'Checks whether a card number passes the Luhn checksum algorithm. ' +
        'Accepts digits only (spaces/dashes should be stripped by the caller).',
      inputSchema: {
        cardNumber: cardNumberSchema,
      },
      outputSchema: {
        valid: z.boolean(),
      },
    },
    async ({ cardNumber }) => {
      const valid = isValidLuhn(cardNumber);
      return {
        content: [{ type: 'text', text: JSON.stringify({ valid }) }],
        structuredContent: { valid },
      };
    },
  );
}
