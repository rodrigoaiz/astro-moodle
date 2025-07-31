# astro/Dockerfile
# Multi-stage build para optimizar imagen de producción
FROM node:20-alpine AS build

WORKDIR /app

# Copiar package.json Y package-lock.json para aprovechar cache de Docker
COPY package*.json ./

# Usar npm ci para instalación exacta y reproducible
RUN npm ci

# Copiar código fuente
COPY . .

# Construir aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS production

WORKDIR /app

# Instalar solo el servidor HTTP
RUN npm install -g http-server

# Copiar solo los archivos construidos desde la etapa de build
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["http-server", "dist", "--port", "3000", "--host", "0.0.0.0"]
