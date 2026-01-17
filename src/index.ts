import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import MedusaStoreService from "./services/medusa-store";
import MedusaAdminService from "./services/medusa-admin";

// Bearer token for authentication (from environment variable)
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3000", 10);
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || "stdio"; // "stdio" or "http"

// Simple bearer token validation middleware
function validateBearerToken(authHeader: string | undefined): boolean {
    if (!BEARER_TOKEN) {
        // If no token is configured, allow all requests (development mode)
        return true;
    }
    
    if (!authHeader) {
        return false;
    }
    
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
        return false;
    }
    
    return match[1] === BEARER_TOKEN;
}

async function createMcpServer(): Promise<McpServer> {
    console.error("Creating new MCP server instance...");
    const medusaStoreService = new MedusaStoreService();
    const medusaAdminService = new MedusaAdminService();
    let tools = [];
    
    try {
        await medusaAdminService.init();
        tools = [
            ...medusaStoreService.defineTools(),
            ...medusaAdminService.defineTools()
        ];
    } catch (error) {
        console.error("Error initializing Medusa Admin Services:", error);
        tools = [...medusaStoreService.defineTools()];
    }

    const server = new McpServer(
        {
            name: "Medusa Store MCP Server",
            version: "1.0.0"
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );

    tools.forEach((tool) => {
        server.tool(
            tool.name,
            tool.description,
            tool.inputSchema,
            tool.handler
        );
    });

    return server;
}

async function startStdioServer(): Promise<void> {
    console.error("Starting Medusa Store MCP Server in STDIO mode...");
    const server = await createMcpServer();
    
    const transport = new StdioServerTransport();
    console.error("Connecting server to STDIO transport...");
    await server.connect(transport);
    
    console.error("Medusa MCP Server running on stdio");
}

async function startHttpServer(): Promise<void> {
    console.error(`Starting Medusa Store MCP Server in HTTP mode on port ${HTTP_PORT}...`);
    
    if (BEARER_TOKEN) {
        console.error("Bearer token authentication enabled");
    } else {
        console.error("WARNING: No bearer token configured (MCP_BEARER_TOKEN). All requests will be allowed.");
    }
    
    // Create a single MCP server instance
    const server = await createMcpServer();
    
    // Create StreamableHTTPServerTransport with session ID generation (stateful mode)
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
    });
    
    // Connect the server to the transport
    await server.connect(transport);
    console.error("MCP server connected to Streamable HTTP transport");
    
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        
        // CORS headers for browser clients
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-MCP-Session-Id");
        
        // Handle preflight requests
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        
        // Health check endpoint (no auth required)
        if (req.method === "GET" && url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ 
                status: "ok", 
                transport: "streamable-http",
                auth: BEARER_TOKEN ? "enabled" : "disabled"
            }));
            return;
        }
        
        // Validate bearer token for MCP endpoint
        if (!validateBearerToken(req.headers.authorization)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing bearer token" }));
            return;
        }
        
        // MCP endpoint - handle all MCP protocol requests
        if (url.pathname === "/mcp") {
            try {
                // Read request body for POST requests
                let parsedBody: unknown = undefined;
                
                if (req.method === "POST") {
                    let body = "";
                    for await (const chunk of req) {
                        body += chunk.toString();
                    }
                    
                    if (body) {
                        try {
                            parsedBody = JSON.parse(body);
                        } catch (error) {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid JSON" }));
                            return;
                        }
                    }
                }
                
                // Handle the request using the transport
                await transport.handleRequest(req, res, parsedBody);
            } catch (error) {
                console.error("Error handling MCP request:", error);
                if (!res.headersSent) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Internal server error" }));
                }
            }
            return;
        }
        
        // Default 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    });
    
    httpServer.listen(HTTP_PORT, () => {
        console.error(`Medusa MCP Server listening on http://localhost:${HTTP_PORT}`);
        console.error(`MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
        console.error(`Health check: http://localhost:${HTTP_PORT}/health`);
        console.error(`Transport: Streamable HTTP (MCP specification compliant)`);
    });
}

async function main(): Promise<void> {
    if (TRANSPORT_MODE === "http") {
        await startHttpServer();
    } else {
        await startStdioServer();
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
