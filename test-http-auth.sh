#!/bin/bash

# Test script for HTTP authentication

echo "========================================="
echo "Testing Medusa MCP Server HTTP Authentication"
echo "========================================="
echo ""

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
BEARER_TOKEN="${MCP_BEARER_TOKEN:-test-token-123}"

echo "Server URL: $SERVER_URL"
echo "Bearer Token: ${BEARER_TOKEN:0:10}..." # Show only first 10 chars
echo ""

# Test 1: Health check (no auth required)
echo "Test 1: Health Check (no auth)"
echo "------------------------------"
curl -s "$SERVER_URL/health" | jq '.' || echo "Failed to parse JSON"
echo ""
echo ""

# Test 2: SSE endpoint without auth (should fail)
echo "Test 2: SSE Connection Without Auth (should fail with 401)"
echo "-----------------------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/sse")
if [ "$HTTP_CODE" == "401" ]; then
    echo "✓ Correctly rejected (HTTP $HTTP_CODE)"
else
    echo "✗ Expected 401, got HTTP $HTTP_CODE"
fi
echo ""

# Test 3: SSE endpoint with invalid token (should fail)
echo "Test 3: SSE Connection With Invalid Token (should fail with 401)"
echo "----------------------------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-token" "$SERVER_URL/sse")
if [ "$HTTP_CODE" == "401" ]; then
    echo "✓ Correctly rejected (HTTP $HTTP_CODE)"
else
    echo "✗ Expected 401, got HTTP $HTTP_CODE"
fi
echo ""

# Test 4: SSE endpoint with valid token (should succeed)
echo "Test 4: SSE Connection With Valid Token (should succeed)"
echo "--------------------------------------------------------"
echo "Note: This will establish an SSE connection. Press Ctrl+C to stop."
echo ""
echo "Command: curl -N -H \"Authorization: Bearer \$BEARER_TOKEN\" \$SERVER_URL/sse"
echo ""
echo "Starting connection in 3 seconds..."
sleep 3

curl -N -H "Authorization: Bearer $BEARER_TOKEN" "$SERVER_URL/sse"
