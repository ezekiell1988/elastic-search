# ==============================================================================
# Multi-stage Dockerfile for Elasticsearch Customer Reactivation Demo
# ==============================================================================
# Build optimizado para producción con Node.js 20 LTS
# ==============================================================================

# Stage 1: Base
FROM node:20-alpine AS base

# Metadata
LABEL maintainer="ezekiel@ezekl.com"
LABEL description="Elasticsearch Customer Reactivation API"
LABEL version="1.0.0"

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    curl \
    tzdata

# Actualizar npm a la última versión
RUN npm install -g npm@11.7.0

# Establecer zona horaria
ENV TZ=America/Costa_Rica

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ==============================================================================
# Stage 2: Dependencies
FROM base AS deps

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar todas las dependencias (producción y desarrollo)
RUN npm ci

# ==============================================================================
# Stage 3: Builder
FROM base AS builder

WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Remover archivos innecesarios
RUN rm -rf \
    .git \
    .github \
    certs \
    exports \
    *.md \
    .env.example

# ==============================================================================
# Stage 4: Production
FROM base AS production

WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production \
    PORT=9002

# Copiar solo dependencias de producción
COPY --from=deps /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copiar código de la app desde builder
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Crear directorios necesarios con permisos correctos
RUN mkdir -p /app/exports /app/logs && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 9002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Comando por defecto
CMD ["node", "src/index.js"]
