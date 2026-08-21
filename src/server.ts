import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerValidateCardNumberTool } from "./tools/validate-card-number.js";
import { registerDetectCardTypeTool } from "./tools/detect-card-type.js";
import { registerValidateIbanTool } from "./tools/validate-iban.js";
import { registerCardNetworksResource } from "./resources/card-networks.js";
import { registerCheckPaymentDetailsPrompt } from "./prompts/check-payment-details.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "payments-toolkit-mcp",
    version: "1.0.0",
  });

  registerValidateCardNumberTool(server);
  registerDetectCardTypeTool(server);
  registerValidateIbanTool(server);
  registerCardNetworksResource(server);
  registerCheckPaymentDetailsPrompt(server);

  return server;
}
