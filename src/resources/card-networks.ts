import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CARD_NETWORKS } from '../lib/card-networks.js';

const RESOURCE_URI = 'payments-toolkit://card-networks';

export function registerCardNetworksResource(server: McpServer): void {
  server.registerResource(
    'card_networks',
    RESOURCE_URI,
    {
      title: 'Card Networks',
      description:
        'Supported card networks and the IIN/BIN prefix ranges used to ' +
        'identify them.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const data = CARD_NETWORKS.map(({ name, prefixRanges }) => ({
        name,
        prefixRanges,
      }));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );
}
