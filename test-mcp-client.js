#!/usr/bin/env node

/**
 * Simple MCP client for testing HTTP/SSE transport
 * 
 * Usage:
 *   node test-mcp-client.js <server-url> <bearer-token>
 *   
 * Example:
 *   node test-mcp-client.js http://localhost:3000 my-secret-token
 */

const http = require('http');
const https = require('https');

const SERVER_URL = process.argv[2] || 'http://localhost:3000';
const BEARER_TOKEN = process.argv[3] || '';

if (!SERVER_URL) {
    console.error('Usage: node test-mcp-client.js <server-url> [bearer-token]');
    process.exit(1);
}

const url = new URL(SERVER_URL);
const client = url.protocol === 'https:' ? https : http;

let sessionId = null;
let messageId = 1;

console.log(`Testing MCP Server at: ${SERVER_URL}`);
console.log(`Bearer Token: ${BEARER_TOKEN ? '✓ Set' : '✗ Not set'}\n`);

// Step 1: Health check
console.log('='.repeat(60));
console.log('Step 1: Health Check');
console.log('='.repeat(60));

const healthReq = client.request(`${SERVER_URL}/health`, {
    method: 'GET'
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', JSON.parse(data));
        console.log('');
        
        // Step 2: Establish SSE connection
        establishSSE();
    });
});

healthReq.on('error', (error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
});

healthReq.end();

function establishSSE() {
    console.log('='.repeat(60));
    console.log('Step 2: Establish SSE Connection');
    console.log('='.repeat(60));
    
    const sseReq = client.request(`${SERVER_URL}/sse`, {
        method: 'GET',
        headers: {
            'Authorization': BEARER_TOKEN ? `Bearer ${BEARER_TOKEN}` : ''
        }
    }, (res) => {
        console.log('SSE Connection Status:', res.statusCode);
        
        if (res.statusCode !== 200) {
            res.on('data', (chunk) => {
                console.error('Error:', chunk.toString());
            });
            res.on('end', () => process.exit(1));
            return;
        }
        
        console.log('SSE Connection established!\n');
        
        let buffer = '';
        
        res.on('data', (chunk) => {
            buffer += chunk.toString();
            
            // Parse SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep last partial line
            
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    // Event type
                    continue;
                } else if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.sessionId) {
                            sessionId = parsed.sessionId;
                            console.log('Received Session ID:', sessionId);
                            console.log('');
                            
                            // Step 3: Send messages
                            setTimeout(() => {
                                sendMessage('tools/list', {});
                            }, 1000);
                        } else {
                            console.log('SSE Message:', JSON.stringify(parsed, null, 2));
                        }
                    } catch (e) {
                        // Not JSON data
                        console.log('SSE Data:', data);
                    }
                }
            }
        });
        
        res.on('end', () => {
            console.log('\nSSE connection closed by server');
            process.exit(0);
        });
    });
    
    sseReq.on('error', (error) => {
        console.error('SSE connection failed:', error.message);
        process.exit(1);
    });
    
    sseReq.end();
}

function sendMessage(method, params = {}) {
    console.log('='.repeat(60));
    console.log(`Step 3: Send Message - ${method}`);
    console.log('='.repeat(60));
    
    if (!sessionId) {
        console.error('No session ID available');
        return;
    }
    
    const message = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: messageId++
    };
    
    const messageBody = JSON.stringify(message);
    console.log('Sending:', messageBody);
    
    const messageReq = client.request(`${SERVER_URL}/message?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
            'Authorization': BEARER_TOKEN ? `Bearer ${BEARER_TOKEN}` : '',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(messageBody)
        }
    }, (res) => {
        console.log('Response Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('Response:', JSON.stringify(response, null, 2));
                
                // If we got tools list, try calling one
                if (method === 'tools/list' && response.result && response.result.tools) {
                    const firstTool = response.result.tools[0];
                    if (firstTool) {
                        console.log(`\nFound ${response.result.tools.length} tools. Testing first tool: ${firstTool.name}\n`);
                        
                        setTimeout(() => {
                            sendMessage('tools/call', {
                                name: firstTool.name,
                                arguments: {}
                            });
                        }, 1000);
                    }
                } else {
                    // Done testing
                    setTimeout(() => {
                        console.log('\n' + '='.repeat(60));
                        console.log('Testing Complete!');
                        console.log('='.repeat(60));
                        process.exit(0);
                    }, 1000);
                }
            } catch (e) {
                console.log('Response (not JSON):', data);
            }
        });
    });
    
    messageReq.on('error', (error) => {
        console.error('Message request failed:', error.message);
    });
    
    messageReq.write(messageBody);
    messageReq.end();
}
