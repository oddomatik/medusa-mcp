import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
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

async function initializeServer(): Promise<{ server: McpServer; tools: any[] }> {
    console.error("Initializing Medusa MCP Server...");
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

    return { server, tools };
}

async function startStdioServer(): Promise<void> {
    console.error("Starting Medusa Store MCP Server in STDIO mode...");
    const { server } = await initializeServer();
    
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
    
    const { server } = await initializeServer();
    
    // Map to track active SSE connections by session ID
    const transports = new Map<string, SSEServerTransport>();
    
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        
        // CORS headers for browser clients
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        // Handle preflight requests
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        
        // Validate bearer token
        if (!validateBearerToken(req.headers.authorization)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing bearer token" }));
            return;
        }
        
        // SSE endpoint - establish connection
        if (req.method === "GET" && url.pathname === "/sse") {
            const transport = new SSEServerTransport("/message", res);
            await transport.start();
            
            transports.set(transport.sessionId, transport);
            console.error(`SSE connection established: ${transport.sessionId}`);
            
            // Connect the MCP server to this transport
            await server.connect(transport);
            
            // Clean up on disconnect
            transport.onclose = () => {
                console.error(`SSE connection closed: ${transport.sessionId}`);
                transports.delete(transport.sessionId);
            };
            
            return;
        }
        
        // Message endpoint - receive messages
        if (req.method === "POST" && url.pathname === "/message") {
            const sessionId = url.searchParams.get("sessionId");
            
            if (!sessionId) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
                return;
            }
            
            const transport = transports.get(sessionId);
            if (!transport) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Session not found" }));
                return;
            }
            
            // Read the request body
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            
            req.on("end", async () => {
                try {
                    const parsedBody = JSON.parse(body);
                    await transport.handlePostMessage(req, res, parsedBody);
                } catch (error) {
                    console.error("Error handling message:", error);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Internal server error" }));
                }
            });
            
            return;
        }
        
        // Health check endpoint
        if (req.method === "GET" && url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ 
                status: "ok", 
                transport: "http/sse",
                auth: BEARER_TOKEN ? "enabled" : "disabled",
                activeConnections: transports.size
            }));
            return;
        }
        
        // Default 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    });
    
    httpServer.listen(HTTP_PORT, () => {
        console.error(`Medusa MCP Server listening on http://localhost:${HTTP_PORT}`);
        console.error(`SSE endpoint: http://localhost:${HTTP_PORT}/sse`);
        console.error(`Message endpoint: http://localhost:${HTTP_PORT}/message?sessionId=<sessionId>`);
        console.error(`Health check: http://localhost:${HTTP_PORT}/health`);
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
