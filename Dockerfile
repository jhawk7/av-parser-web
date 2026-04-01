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

# Stage 2: Serve (Non-Root)
FROM nginxinc/nginx-unprivileged:alpine

# Copy built files from Stage 1
COPY --from=build /app/dist/av-parser-web/browser /usr/share/nginx/html

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh

# Use root temporarily to set script permissions
USER root
RUN chmod +x /entrypoint.sh
USER 101

# The unprivileged image listens on 8080 by default
EXPOSE 8080

# Use the entrypoint script to inject config at runtime
ENTRYPOINT ["/entrypoint.sh"]
