# STAGE 1: Base - Install dependencies and build the app
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN npm run build

# STAGE 2: Runner - Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# --- 💡 MODIFIED SECTION START ---

# Copy package.json and the FULL node_modules from base stage
# This is less optimized for size but ensures all deps (incl. prisma CLI and bcryptjs) are present
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

# Copy the standalone output (which contains the compiled app)
COPY --from=base /app/.next/standalone ./

# --- 💡 MODIFIED SECTION END ---

# Copy static/public assets
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
# Copy Prisma schema and migrations
COPY --from=base /app/prisma ./prisma

# Add a startup script to run migrations
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT 3000

# This script will run migrations first, then start the app
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]

# The default command that entrypoint.sh will run
CMD ["node", "server.js"]