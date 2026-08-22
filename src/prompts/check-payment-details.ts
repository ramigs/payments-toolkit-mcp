import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withPromptLogging } from '../lib/with-logging.js';

export function registerCheckPaymentDetailsPrompt(server: McpServer): void {
  server.registerPrompt(
    'check_payment_details',
    {
      title: 'Check Payment Details',
      description:
        'Validates a card number and/or IBAN using the available tools and ' +
        'reports the results in a standard summary format.',
      argsSchema: {
        cardNumber: z
          .string()
          .optional()
          .describe('Card number to validate (digits, spaces/dashes okay)'),
        iban: z.string().optional().describe('IBAN to validate'),
      },
    },
    withPromptLogging('check_payment_details', ({ cardNumber, iban }) => {
      const requests: string[] = [];
      if (cardNumber) {
        requests.push(
          `- Card number "${cardNumber}": run \`detect_card_type\` and ` +
            '`validate_card_number` on it.',
        );
      }
      if (iban) {
        requests.push(`- IBAN "${iban}": run \`validate_iban\` on it.`);
      }
      if (requests.length === 0) {
        requests.push(
          '- Ask the user for a card number and/or IBAN to check, since ' +
            'none was provided.',
        );
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                'Check the following payment details using the payments ' +
                'toolkit tools, then summarize the results in a short ' +
                'report with one line per item (input, validity, and any ' +
                'detected network/country):\n\n' +
                requests.join('\n'),
            },
          },
        ],
      };
    }),
  );
}
