import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json' with { type: 'json' };
import { registerValidateCardNumberTool } from './tools/validate-card-number.js';
import { registerDetectCardTypeTool } from './tools/detect-card-type.js';
import { registerValidateIbanTool } from './tools/validate-iban.js';
import { registerCardNetworksResource } from './resources/card-networks.js';
import { registerCardPreviewResource } from './resources/card-preview.js';
import { registerIbanPreviewResource } from './resources/iban-preview.js';
import { registerCheckPaymentDetailsPrompt } from './prompts/check-payment-details.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: pkg.name,
    version: pkg.version,
  });

  registerValidateCardNumberTool(server);
  registerDetectCardTypeTool(server);
  registerValidateIbanTool(server);
  registerCardNetworksResource(server);
  registerCardPreviewResource(server);
  registerIbanPreviewResource(server);
  registerCheckPaymentDetailsPrompt(server);

  return server;
}
