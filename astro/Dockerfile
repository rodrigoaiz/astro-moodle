# astro/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build  # Construye el sitio estático

# Sirve con un servidor simple (nginx o http-server)
RUN npm install -g http-server

EXPOSE 3000

CMD ["http-server", "dist", "--port", "3000", "--host", "0.0.0.0"]
