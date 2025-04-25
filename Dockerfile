FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn workspace @firealert/server build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose the port
EXPOSE 3000

# Start the application
CMD ["yarn", "workspace", "@firealert/server", "start"] 