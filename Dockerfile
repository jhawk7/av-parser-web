# Stage 1: Build
FROM node:22-slim AS build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Flag to the set-env script to use placeholders
ENV DOCKER_BUILD=true

# Build the application
RUN pnpm build

# Stage 2: Serve
FROM node:22-slim

# Install pnpm (needed to run serve:dist)
RUN npm install -g pnpm

WORKDIR /app

# Copy built application and server code
# We use --chown to ensure the files are owned by the node user
COPY --from=build --chown=node:node /app/dist /app/dist
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/server.ts /app/tsconfig.json ./

# Install production dependencies only as the node user
USER node
RUN pnpm install --prod --frozen-lockfile

# The app listens on 8080 by default
EXPOSE 8080

# Start the Node.js server
CMD ["pnpm", "run", "serve:dist"]
