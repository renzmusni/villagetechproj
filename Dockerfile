# Multi-stage build for HOA Community Platform
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY src/platform/package.json src/platform/package-lock.json* ./src/platform/
COPY src/admin/package.json src/admin/package-lock.json* ./src/admin/
COPY src/residence/package.json src/residence/package-lock.json* ./src/residence/
COPY src/sentinel/package.json src/sentinel/package-lock.json* ./src/sentinel/

RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the platform
WORKDIR /app/src/platform
RUN npm run build

# Build the admin app
WORKDIR /app/src/admin
RUN npm run build

# Build the residence app
WORKDIR /app/src/residence
RUN npm run build

# Build the sentinel app
WORKDIR /app/src/sentinel
RUN npm run build

# Production image, copy all the files and run the platform
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built applications
COPY --from=builder --chown=nextjs:nodejs /app/src/platform/dist ./src/platform/dist
COPY --from=builder --chown=nextjs:nodejs /app/src/admin/dist ./src/admin/dist
COPY --from=builder --chown=nextjs:nodejs /app/src/residence/dist ./src/residence/dist
COPY --from=builder --chown=nextjs:nodejs /app/src/sentinel/dist ./src/sentinel/dist

# Copy package.json files
COPY --from=deps /app/src/platform/package.json ./src/platform/package.json
COPY --from=deps /app/src/admin/package.json ./src/admin/package.json
COPY --from=deps /app/src/residence/package.json ./src/residence/package.json
COPY --from=deps /app/src/sentinel/package.json ./src/sentinel/package.json

# Install only production dependencies
WORKDIR /app/src/platform
RUN npm ci --only=production

WORKDIR /app/src/admin
RUN npm ci --only=production

WORKDIR /app/src/residence
RUN npm ci --only=production

WORKDIR /app/src/sentinel
RUN npm ci --only=production

USER nextjs

EXPOSE 3000 3001 3002 3003

# Start the platform services
CMD ["npm", "run", "start:all"]