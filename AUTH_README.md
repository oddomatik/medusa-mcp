# Medusa MCP Server - Authentication Guide

## Overview

The Medusa MCP Server supports two transport modes:
- **STDIO**: For local MCP clients (default)
- **HTTP/SSE**: For remote clients with bearer token authentication

## Configuration

### Environment Variables

```bash
# Transport mode: "stdio" (default) or "http"
TRANSPORT_MODE=http

# HTTP server port (default: 3000)
HTTP_PORT=3000

# Bearer token for authentication (required for production)
MCP_BEARER_TOKEN=your-secret-token-here

# Medusa backend configuration
MEDUSA_BACKEND_URL=https://your-medusa-backend.com
MEDUSA_USERNAME=admin@example.com
MEDUSA_PASSWORD=your-password
```

## Running in HTTP Mode

### Development (No Authentication)

```bash
# No bearer token - allows all requests
TRANSPORT_MODE=http HTTP_PORT=3000 npm start
```

### Production (With Authentication)

```bash
# With bearer token - requires authentication
TRANSPORT_MODE=http \
HTTP_PORT=3000 \
MCP_BEARER_TOKEN=your-secret-token-here \
npm start
```

### Docker

Update the Dockerfile `CMD` to:

```dockerfile
CMD ["sh", "-c", "TRANSPORT_MODE=http HTTP_PORT=3000 node dist/index.js"]
```

Set environment variables in your Docker deployment:

```bash
docker run -e TRANSPORT_MODE=http \
  -e HTTP_PORT=3000 \
  -e MCP_BEARER_TOKEN=your-secret-token \
  -e MEDUSA_BACKEND_URL=https://your-backend.com \
  -p 3000:3000 \
  medusa-mcp
```

## API Endpoints

### 1. Health Check

```bash
GET /health
```

No authentication required. Returns server status.

**Example:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "transport": "http/sse",
  "auth": "enabled",
  "activeConnections": 2
}
```

### 2. SSE Connection (Establish)

```bash
GET /sse
Authorization: Bearer your-secret-token
```

Establishes a Server-Sent Events connection for receiving messages from the MCP server.

**Example:**

```bash
curl -N -H "Authorization: Bearer your-secret-token" \
  http://localhost:3000/sse
```

**Response:**

The server will return an SSE stream with a session ID in the first event.

### 3. Send Message

```bash
POST /message?sessionId=<session-id>
Authorization: Bearer your-secret-token
Content-Type: application/json
```

Sends a JSON-RPC message to the MCP server.

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' \
  "http://localhost:3000/message?sessionId=abc123"
```

## Client Integration

### JavaScript/TypeScript Client

```typescript
const BEARER_TOKEN = "your-secret-token";
const SERVER_URL = "http://localhost:3000";

// Establish SSE connection
const eventSource = new EventSource(`${SERVER_URL}/sse`, {
  headers: {
    'Authorization': `Bearer ${BEARER_TOKEN}`
  }
});

let sessionId: string;

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // First message contains session ID
  if (data.sessionId) {
    sessionId = data.sessionId;
    console.log('Connected with session:', sessionId);
  } else {
    // Handle MCP responses
    console.log('Received:', data);
  }
};

// Send a message
async function sendMessage(message: any) {
  const response = await fetch(
    `${SERVER_URL}/message?sessionId=${sessionId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  );
  return response.json();
}

// Example: List available tools
await sendMessage({
  jsonrpc: "2.0",
  method: "tools/list",
  id: 1
});
```

## Security Best Practices

1. **Always set a strong bearer token in production**
   - Use a cryptographically secure random string
   - Minimum 32 characters
   - Never commit tokens to version control

2. **Use HTTPS in production**
   - Place the MCP server behind a reverse proxy (nginx, Cloudflare, etc.)
   - Enforce TLS/SSL encryption

3. **Rotate tokens regularly**
   - Change bearer tokens periodically
   - Implement token rotation without downtime using multiple valid tokens

4. **Monitor and log authentication attempts**
   - Track failed authentication attempts
   - Set up alerts for suspicious activity

5. **Use environment-specific tokens**
   - Different tokens for development, staging, and production
   - Never share tokens between environments

## Troubleshooting

### 401 Unauthorized

- Check that you're sending the correct bearer token
- Ensure the `Authorization` header is properly formatted: `Bearer <token>`
- Verify the token matches the `MCP_BEARER_TOKEN` environment variable

### Session Not Found (404)

- The SSE connection may have been closed
- Re-establish the SSE connection to get a new session ID
- Check that you're using the correct session ID from the SSE stream

### No Response from Server

- Verify the server is running: `curl http://localhost:3000/health`
- Check firewall rules and port accessibility
- Review server logs for errors

## Migration from STDIO to HTTP

If you're currently using STDIO mode and want to migrate to HTTP:

1. Update your environment variables to include `TRANSPORT_MODE=http`
2. Set a secure `MCP_BEARER_TOKEN`
3. Configure the `HTTP_PORT` (default: 3000)
4. Update your client code to use HTTP/SSE instead of STDIO
5. Test thoroughly in a staging environment before deploying to production

## Switching Back to STDIO

To revert to STDIO mode:

```bash
# Remove or set TRANSPORT_MODE to "stdio"
TRANSPORT_MODE=stdio npm start

# Or simply omit TRANSPORT_MODE (defaults to stdio)
npm start
```
