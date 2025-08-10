#!/bin/bash

# Script para desplegar las aplicaciones Node.js
# Ejecutar después de haber subido el código al servidor

set -e

echo "=== Despliegue de Aplicaciones Node.js ==="

# Verificar que el directorio existe
if [ ! -d "/var/www/astro-moodle" ]; then
    echo "Error: El directorio /var/www/astro-moodle no existe"
    echo "Por favor, sube tu código primero"
    exit 1
fi

cd /var/www/astro-moodle

echo "=== Instalando dependencias del frontend Astro ==="
cd astro
npm install
echo "Construyendo aplicación Astro..."
npm run build

echo "=== Instalando dependencias del servicio de autenticación ==="
cd ../auth
npm install

# Leer configuración guardada
if [ -f "/root/moodle-config.txt" ]; then
    DB_PASSWORD=$(grep "Password de BD:" /root/moodle-config.txt | cut -d' ' -f4)
else
    echo "Error: No se encontró la configuración. Ejecuta install-dependencies.sh primero"
    exit 1
fi

echo "=== Configurando variables de entorno ==="
cat > .env << EOF
DB_HOST=localhost
DB_USER=moodle
DB_PASS=$DB_PASSWORD
DB_NAME=moodle
DB_PORT=3306
PORT=3001
EOF

echo "=== Creando configuración PM2 ==="
cd /var/www/astro-moodle
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'astro-frontend',
      cwd: './astro',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
        PORT: 4321
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'auth-service',
      cwd: './auth',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
EOF

echo "=== Configurando permisos ==="
chown -R www-data:www-data /var/www/astro-moodle

echo "=== Iniciando aplicaciones con PM2 ==="
su - www-data -s /bin/bash -c "cd /var/www/astro-moodle && pm2 start ecosystem.config.js"

echo "=== Configurando PM2 para inicio automático ==="
su - www-data -s /bin/bash -c "pm2 startup"
su - www-data -s /bin/bash -c "pm2 save"

echo "=== Aplicaciones Node.js desplegadas correctamente ==="
echo ""
echo "Estado de las aplicaciones:"
su - www-data -s /bin/bash -c "pm2 status"
