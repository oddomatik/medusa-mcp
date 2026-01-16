[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sgfgov-medusa-mcp-badge.png)](https://mseep.ai/app/sgfgov-medusa-mcp)


# `medusa-mcp`

## Overview

`medusa-mcp` is a **Model Context Protocol (MCP) server** designed for integration with the Medusa JavaScript SDK. It provides a scalable backend layer for managing and interacting with Medusa’s data models, enabling automation, orchestration, and intelligent service extensions.

---

## 🧩 What is an MCP Server?

An **MCP server** is a modular, extensible backend that:

- Enables **real-time service orchestration**
- Supports **standardized, high-throughput communication**
- Acts as a **bridge between AI/automation tools and real-world systems**

These servers are used in areas like AI, IoT, and enterprise software to connect various services and automate tasks using standardized protocols like JSON-RPC.

### 🔑 Key Features

- **Modular Architecture** – Composable services for flexibility  
- **High Efficiency** – Optimized for speed and scale  
- **Extensible Design** – Add new capabilities easily  
- **Cross-Environment Deployment** – Cloud, on-prem, or hybrid  
- **AI-Ready Interfaces** – Integrate LLMs and tools seamlessly  

### 🧠 Role in AI Systems

MCP servers allow AI agents to:

- Access real-time data from APIs, files, or databases  
- Automate business processes (e.g., order fulfillment, pricing updates)  
- Interact with external services in a secure and controlled way  

---






---

## 🚀 Medusa JS + MCP

Using `medusa-mcp`, Medusa JS can:

- Automate workflows (e.g., inventory or pricing adjustments)
- Connect with external tools (email, analytics, etc.)
- Use AI agents to analyze trends and trigger actions  
- Enable scalable, modular architecture for commerce platforms

---

## ✨ Features

- ✅ **Model Context Protocol (MCP)** support  
- 📈 **Scalable** infrastructure  
- 🧱 **Extensible** plugin architecture  
- 🔗 **Integrated** with Medusa JS SDK  

---

## 🛠️ Installation

Clone the repository and install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

### 🐳 Docker Deployment

Build the Docker image:

```bash
docker build -t medusa-mcp .
```

Run in STDIO mode (default):

```bash
docker run -e MEDUSA_BACKEND_URL=https://your-backend.com \
  -e MEDUSA_USERNAME=admin@example.com \
  -e MEDUSA_PASSWORD=your-password \
  medusa-mcp
```

Run in HTTP mode with authentication:

```bash
docker run -e TRANSPORT_MODE=http \
  -e HTTP_PORT=3000 \
  -e MCP_BEARER_TOKEN=your-secret-token \
  -e MEDUSA_BACKEND_URL=https://your-backend.com \
  -e MEDUSA_USERNAME=admin@example.com \
  -e MEDUSA_PASSWORD=your-password \
  -p 3000:3000 \
  medusa-mcp
```

---

## ▶️ Usage

### STDIO Mode (Local/Default)

For local development with MCP clients:

```bash
npm start
```

Test using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector ./dist/index.js
```

> **Note:** Restart the Inspector and your browser after each rebuild.

### HTTP Mode (Remote/Production)

For remote access with bearer token authentication:

```bash
# Development (no authentication)
TRANSPORT_MODE=http HTTP_PORT=3000 npm start

# Production (with authentication)
TRANSPORT_MODE=http HTTP_PORT=3000 MCP_BEARER_TOKEN=your-secret-token npm start
```

Server runs at: [http://localhost:3000](http://localhost:3000)

📖 **See [AUTH_README.md](AUTH_README.md) for complete authentication documentation and API reference.**

---

## 🌍 Environment Variables

| Variable              | Description                                           | Required |
|-----------------------|-------------------------------------------------------|----------|
| `MEDUSA_BACKEND_URL`  | Your Medusa backend URL                               | Yes      |
| `MEDUSA_USERNAME`     | Medusa admin username (for admin tools)               | Yes      |
| `MEDUSA_PASSWORD`     | Medusa admin password (for admin tools)               | Yes      |
| `PUBLISHABLE_KEY`     | Your Medusa publishable API key (for store)           | No       |
| `TRANSPORT_MODE`      | Transport mode: `stdio` (default) or `http`           | No       |
| `HTTP_PORT`           | HTTP server port (default: 3000, only for HTTP mode)  | No       |
| `MCP_BEARER_TOKEN`    | Bearer token for HTTP authentication                  | No*      |

\* Required for production HTTP mode

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

---

## 🧠 Architecture Diagram

Here's how the `medusa-mcp` server fits into a typical setup with Medusa JS and external systems:

```

       +-------------------------+
       |     AI Assistant /      |
       |     LLM / Automation    |
       +-----------+-------------+
                   |
                   v
    +--------------+--------------+
    |     MCP Server (medusa-mcp) |
    |-----------------------------|
    | - JSON-RPC Communication    |
    | - AI-Ready Interface        |
    | - Plugin Support            |
    +------+----------------------+
                   |                             
                   +
                   |                                                         
                   v                                                         
         +-------------------+
         | Medusa Backend    |
         | (Products, Orders)|
         +-------------------+
                   |
                   |
                   v
           +--------------+
           | Medusa Store |
           | Frontend     |
           +--------------+
                   |
                   |
                   v
      +-------------------------+
      | External Services / API |
      | (e.g., Payments, Email) |
      +-------------------------+
```


## 🧪 Customization

To tailor the server to your Medusa setup:

> Replace `admin.json` and `store.json` with your own OAS definitions for fine-grained control.

- Replace the OpenAPI schemas in the `oas/` folder:
  - `admin.json` – Admin endpoints
  - `store.json` – Storefront endpoints

Use the [`@medusajs/medusa-oas-cli`](https://www.npmjs.com/package/@medusajs/medusa-oas-cli) to regenerate these files.

You can also **fork this project** to build your own custom MCP-powered Medusa integration.

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) guide.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
