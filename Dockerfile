# Estágio 1: Builder para construção da aplicação
FROM node:18-alpine AS builder
WORKDIR /app

# Configurações específicas para sharp
RUN npm config set sharp_libvips_binary_host "https://github.com/lovell/sharp-libvips/releases/download"
RUN npm config set sharp_dist_base_url "https://github.com/lovell/sharp-libvips/releases/download"

# Instala dependências systemáticas para sharp
RUN apk add --no-cache \
    vips-dev \
    vips-tools \
    vips \
    libc6-compat

# Copia arquivos de dependências
COPY package*.json ./
COPY package-lock.json ./

# Instala dependências incluindo devDependencies para construção
RUN npm ci && npm cache clean --force

# Copia todo o código fonte
COPY . .

# Constrói a aplicação
RUN npm run build

# Estágio 2: Runtime otimizado para produção
FROM node:18-alpine AS production
WORKDIR /app

# Instala dependências systemáticas para runtime
RUN apk add --no-cache \
    vips \
    libc6-compat

# Configura variáveis de ambiente para sharp
ENV NODE_ENV=production
ENV PLATFORM=linux
ENV PORT=8080
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copia os arquivos construídos e apenas o necessário
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/services ./services
COPY --from=builder /app/api ./api
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/types ./types

# Expõe a porta
EXPOSE 8080

# Configura health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Executa a aplicação
CMD ["npm", "run", "server"]