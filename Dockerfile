FROM node:22.12-alpine AS builder

COPY . /app
WORKDIR /app

# Install Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Install dependencies and build TypeScript code
RUN yarn install --frozen-lockfile && yarn build

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
