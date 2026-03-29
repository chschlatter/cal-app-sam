import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { EventsModelNoLock } from "../../model/events.model-DynNoLock";
import { PricingService } from "../../lib/pricing";

const app = new Hono();

// ── McpServer Factory (stateless: new instance per request) ──────────────
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "cal-booking",
    version: "1.0.0",
  });
  const events = new EventsModelNoLock();

  server.registerTool(
    "list_bookings",
    {
      description: "List all bookings in a date range",
      inputSchema: {
        start: z.string().describe("Start date YYYY-MM-DD (inclusive)"),
        end: z.string().describe("End date YYYY-MM-DD (inclusive)"),
      },
    },
    async ({ start, end }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await events.list(start, end), null, 2) }],
    })
  );

  server.registerTool(
    "get_booking",
    {
      description: "Retrieve a single booking by ID",
      inputSchema: { id: z.string().describe("Booking ID") },
    },
    async ({ id }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await events.get(id), null, 2) }],
    })
  );

  server.registerTool(
    "calculate_price",
    {
      description: "Calculate rental cost for a date range (CHF, with tariff breakdown)",
      inputSchema: {
        start: z.string().describe("Start date YYYY-MM-DD"),
        end: z.string().describe("End date YYYY-MM-DD"),
      },
    },
    async ({ start, end }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(
        PricingService.getInstance().calculateCostAndNights(start, end), null, 2
      )}],
    })
  );

  server.registerTool(
    "get_tariffs",
    {
      description: "Return the full tariff price table (price per night per tariff, with validity dates)",
    },
    () => ({
      content: [{ type: "text" as const, text: JSON.stringify(
        PricingService.getInstance().getPriceData(), null, 2
      )}],
    })
  );

  server.registerTool(
    "check_availability",
    {
      description: "Check if a date range is free of bookings",
      inputSchema: {
        start: z.string().describe("Start date YYYY-MM-DD"),
        end: z.string().describe("End date YYYY-MM-DD"),
      },
    },
    async ({ start, end }) => {
      const conflicts = await events.list(start, end);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(
          { available: conflicts.length === 0, conflicts }, null, 2
        )}],
      };
    }
  );

  return server;
}

// ── Routes ───────────────────────────────────────────────────────────────
app.post("/:token", async (c) => {
  if (c.req.param("token") !== process.env.CLAUDE_TOKEN)
    throw new HTTPException(403, { message: "Forbidden" });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,      // application/json, no SSE
  });

  const server = createMcpServer();
  await server.connect(transport);

  return transport.handleRequest(c.req.raw);
});

app.get("/:token", (c) => c.body(null, 405)); // SSE not supported

export default app;
