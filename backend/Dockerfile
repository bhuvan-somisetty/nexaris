# ---------- Build stage ----------
FROM node:20-slim AS builder
WORKDIR /app

# OpenSSL is required by Prisma's query engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Prisma client + schema/migrations needed at runtime for `migrate deploy`
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Apply migrations, then start the NestJS server (entry is dist/src/main.js)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
