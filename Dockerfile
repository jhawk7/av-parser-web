# Stage 1: Build
FROM node:22-slim AS build

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Flag to the set-env script to use placeholders
ENV DOCKER_BUILD=true

# Build the frontend application
RUN pnpm build

# Build the Node.js server
RUN pnpm build:server

# Stage 2: Serve
FROM node:22-slim

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

WORKDIR /app

# Copy built application and compiled server code
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist-server /app/dist-server
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./

# Install production dependencies as root to avoid permission issues during install
RUN pnpm install --prod --frozen-lockfile

# Now change the ownership of the /app directory to the node user recursively
RUN chown -R node:node /app

# Switch to the node user for runtime
USER node

# The app listens on 8080 by default
EXPOSE 8080

# Start the Node.js server using the compiled file
# Using pnpm run serve:dist which now points to node dist-server/server.js
CMD ["pnpm", "run", "serve:dist"]
