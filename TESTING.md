# Testing Medusa MCP Server

This guide shows how to test the MCP server using curl and the included test client.

## ⚠️ Important: curl Limitations with SSE

**curl cannot be used for full MCP testing** because:
- SSE connections must stay open to maintain the session
- curl closes the connection after receiving initial data
- The server deletes sessions when connections close
- Result: "Session not found" error when trying to send messages

**Use the included Node.js test client instead** (see "Recommended Testing" below).

---

## Recommended Testing

### Using the Test Client Script

```bash
# Start server
TRANSPORT_MODE=http HTTP_PORT=3000 MCP_BEARER_TOKEN=my-token npm start

# Run test client
node test-mcp-client.js http://localhost:3000 my-token

# Or test your deployed server
node test-mcp-client.js http://your-domain.com your-token
```

The test client:
- ✅ Maintains persistent SSE connection
- ✅ Automatically extracts session ID
- ✅ Lists all available tools
- ✅ Calls a sample tool
- ✅ Shows full request/response flow

---

## Quick Health Check with curl

You can still use curl for health checks (no SSE needed):

```bash
curl http://localhost:3000/health | jq '.'
```

**Expected Response:**

```json
{
  "status": "ok",
  "transport": "http/sse",
  "auth": "enabled",  # or "disabled" if no token set
  "activeConnections": 0
}
```

---

## Test 2: Establish SSE Connection

Open a new terminal and establish an SSE connection:

```bash
# Without authentication (dev mode)
curl -N "$SERVER_URL/sse"

# With authentication
curl -N -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/sse"
```

**What to expect:**
- The connection will stay open (it's Server-Sent Events)
- You'll see data chunks with session ID and messages
- Keep this terminal open for the next steps

**Example output:**

```
event: endpoint
data: /message

event: message
data: {"sessionId":"abc-123-def-456"}
```

Note the `sessionId` from the output - you'll need it for sending messages.

---

## Test 3: Send MCP Messages

In a **separate terminal**, send JSON-RPC messages to the MCP server:

### 3.1 List Available Tools

```bash
SESSION_ID="abc-123-def-456"  # Replace with actual session ID from Test 2

curl -X POST "$SERVER_URL/message?sessionId=$SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  MacBook-Pro:~ brian$ curl -N -H "Authorization: Bearer KP2V9Jor2NDjQ4GTlYHeHQxYvZbjlha6" http://moswsws84k4wc444sscckgow.10.10.0.30.sslip.io/sse
event: endpoint
data: /message?sessionId=4a33d8ba-4b91-4ace-8717-2320b46e222d

curl: (18) transfer closed with outstanding read data remaining
MacBook-Pro:~ brian$ curl -N -H "Authorization: Bearer KP2V9Jor2NDjQ4GTlYHeHQxYvZbjlha6" http://moswsws84k4wc444sscckgow.10.10.0.30.sslip.io/ss
MacBook-Pro:~ brian$ curl -X POST -H "Authorization: Bearer KP2V9Jor2NDjQ4GTlYHeHQxYvZbjlha6" http://moswsws84k4wc444sscckgow.10.10.0.30.sslip.io/message?sessionId=4a33d8ba-4b91-4ace-8717-2320b46e222d -H "Content-Type: application/json"   -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' | jq '.'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100    96    0    29  100    67     29     67  0:00:01 --:--:--  0:00:01   492
{
  "error": "Session not found"
}
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "AdminListProducts",
        "description": "This tool helps store administrators. List products",
        "inputSchema": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "limit": {
              "type": "number"
            }
            // ... more parameters
          }
        }
      }
      // ... more tools
    ]
  }
}
```

### 3.2 Call a Specific Tool (List Products)

```bash
curl -X POST "$SERVER_URL/message?sessionId=$SESSION_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "AdminListProducts",
      "arguments": {
        "limit": 10
      }
    },
    "id": 2
  }' | jq '.'
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"products\": [...], \"count\": 10}"
      }
    ]
  }
}
```

---

## Test 4: Authentication Errors

### 4.1 Missing Bearer Token (401)

```bash
curl -i "$SERVER_URL/sse"
```

**Expected:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Unauthorized: Invalid or missing bearer token"}
```

### 4.2 Invalid Bearer Token (401)

```bash
curl -i -H "Authorization: Bearer wrong-token" "$SERVER_URL/sse"
```

**Expected:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Unauthorized: Invalid or missing bearer token"}
```

### 4.3 Missing Session ID (400)

```bash
curl -X POST "$SERVER_URL/message" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**Expected:**

```json
{"error":"Missing sessionId parameter"}
```

### 4.4 Invalid Session ID (404)

```bash
curl -X POST "$SERVER_URL/message?sessionId=invalid-session" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**Expected:**

```json
{"error":"Session not found"}
```

---

## Complete Testing Workflow

### Step-by-Step Example

1. **Start the server with authentication:**

```bash
TRANSPORT_MODE=http \
HTTP_PORT=3000 \
MCP_BEARER_TOKEN=test-token-123 \
MEDUSA_BACKEND_URL=https://your-medusa-backend.com \
npm start
```

2. **Health check:**

```bash
curl http://localhost:3000/health | jq '.'
```

3. **Establish SSE connection (Terminal 1):**

```bash
curl -N -H "Authorization: Bearer test-token-123" http://localhost:3000/sse
```

4. **Note the session ID from the output**, e.g., `abc-123-def`

5. **List tools (Terminal 2):**

```bash
curl -X POST "http://localhost:3000/message?sessionId=abc-123-def" \
  -H "Authorization: Bearer test-token-123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | jq '.result.tools[0]'
```

6. **Call a tool (Terminal 2):**

```bash
curl -X POST "http://localhost:3000/message?sessionId=abc-123-def" \
  -H "Authorization: Bearer test-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "getProducts",
      "arguments": {"limit": 5}
    },
    "id": 2
  }' | jq '.'
```

---

## Automated Test Script

We've included a test script for authentication testing:

```bash
# Make it executable
chmod +x test-http-auth.sh

# Run tests
SERVER_URL=http://localhost:3000 \
MCP_BEARER_TOKEN=test-token-123 \
./test-http-auth.sh
```

---

## Testing in Docker

### 1. Build the image:

```bash
docker build -t medusa-mcp .
```

### 2. Run the container:

```bash
docker run -d \
  --name medusa-mcp-test \
  -e TRANSPORT_MODE=http \
  -e HTTP_PORT=3000 \
  -e MCP_BEARER_TOKEN=docker-test-token \
  -e MEDUSA_BACKEND_URL=https://your-backend.com \
  -e MEDUSA_USERNAME=admin@example.com \
  -e MEDUSA_PASSWORD=your-password \
  -p 3000:3000 \
  medusa-mcp
```

### 3. Check container logs:

```bash
docker logs -f medusa-mcp-test
```

**Expected output:**

```
Starting Medusa Store MCP Server in HTTP mode on port 3000...
Bearer token authentication enabled
Initializing Medusa MCP Server...
Medusa MCP Server listening on http://localhost:3000
SSE endpoint: http://localhost:3000/sse
Message endpoint: http://localhost:3000/message?sessionId=<sessionId>
Health check: http://localhost:3000/health
```

### 4. Test the containerized server:

```bash
# Health check
curl http://localhost:3000/health | jq '.'

# Establish SSE
curl -N -H "Authorization: Bearer docker-test-token" http://localhost:3000/sse
```

### 5. Clean up:

```bash
docker stop medusa-mcp-test
docker rm medusa-mcp-test
```

---

## Common Issues

### Issue: "Connection refused"

**Cause:** Server not running or wrong port

**Fix:**
```bash
# Check if server is running
ps aux | grep "node dist/index.js"

# Check which port it's listening on
lsof -i :3000
```

### Issue: "401 Unauthorized"

**Cause:** Wrong or missing bearer token

**Fix:**
```bash
# Check your token matches
echo $MCP_BEARER_TOKEN

# Verify Authorization header format
curl -v -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/health"
```

### Issue: "Session not found"

**Cause:** SSE connection closed or wrong session ID

**Fix:**
- Re-establish the SSE connection
- Copy the new session ID
- Update your curl commands

---

## Production Testing

For testing in production/Coolify deployment:

```bash
# Replace with your actual deployed URL
PROD_URL="https://medusa-mcp.your-domain.com"
PROD_TOKEN="your-production-token"

# Health check
curl "$PROD_URL/health"

# SSE connection (keep open)
curl -N -H "Authorization: Bearer $PROD_TOKEN" "$PROD_URL/sse"

# Send message (in another terminal)
SESSION_ID="your-session-id"
curl -X POST "$PROD_URL/message?sessionId=$SESSION_ID" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | jq '.'
```

---

## MCP Protocol Reference

### JSON-RPC Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": { },
  "id": 1
}
```

### Common MCP Methods

- `tools/list` - List all available tools
- `tools/call` - Execute a specific tool
- `resources/list` - List available resources
- `prompts/list` - List available prompts

### Tool Call Format

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  },
  "id": 2
}
```
