FROM node:22.12-alpine AS builder

COPY . /app
WORKDIR /app

# Install Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Install dependencies and build TypeScript code
RUN yarn install --frozen-lockfile && yarn build

# Set environment variables
ENV NODE_ENV=production

# Expose HTTP port (default: 3000)
EXPOSE 3000

# Run the server
# To use HTTP mode: docker run -e TRANSPORT_MODE=http -e MCP_BEARER_TOKEN=your-token -p 3000:3000 medusa-mcp
# To use STDIO mode (default): docker run medusa-mcp
CMD ["node", "dist/index.js"]
