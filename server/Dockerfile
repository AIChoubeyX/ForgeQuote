# Multi-stage production Dockerfile for ForgeQuote Backend
# Stage 1: Dependencies cache and production module installation
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies reproducibly
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Runtime image
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=4000

# Create document storage and runtime directories with correct permissions
RUN mkdir -p /app/private-documents && chown -R node:node /app

# Copy production node_modules from dependency stage
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy application source code and migrations
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node scripts ./scripts

# Drop to unprivileged user
USER node

# Expose API port
EXPOSE 4000

# Health check to ensure service availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:4000/api/health || exit 1

# Start the Node.js application server
CMD ["node", "src/server.js"]

