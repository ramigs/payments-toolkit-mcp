import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerValidateCardNumberTool } from "./tools/validate-card-number.js";
import { registerDetectCardTypeTool } from "./tools/detect-card-type.js";
import { registerValidateIbanTool } from "./tools/validate-iban.js";
import { registerCardNetworksResource } from "./resources/card-networks.js";

const server = new McpServer({
  name: "payments-toolkit-mcp",
  version: "1.0.0",
});

registerValidateCardNumberTool(server);
registerDetectCardTypeTool(server);
registerValidateIbanTool(server);
registerCardNetworksResource(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("payments-toolkit-mcp server running on stdio");
