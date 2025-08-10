#!/bin/bash

# Script para configurar Nginx como reverse proxy
# Ejecutar después del despliegue de las aplicaciones Node.js

set -e

echo "=== Configuración de Nginx ==="

# Obtener IP del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "IP del servidor detectada: $SERVER_IP"
echo ""
read -p "¿Es correcta esta IP? Si no, ingresa la IP/dominio correcto (o presiona Enter): " CUSTOM_SERVER
if [ ! -z "$CUSTOM_SERVER" ]; then
    SERVER_IP="$CUSTOM_SERVER"
fi

echo "=== Creando configuración de Nginx ==="
cat > /etc/nginx/sites-available/moodle-project << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Logs
    access_log /var/log/nginx/moodle_access.log;
    error_log /var/log/nginx/moodle_error.log;

    # Frontend Astro
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API de autenticación
    location /api/ {
        rewrite ^/api/(.*)$ /\$1 break;
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        
        # CORS headers si es necesario
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
        
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # Moodle (subdirectorio /learning)
    location /learning/ {
        proxy_pass http://localhost:8080/;
        proxy_redirect http://localhost:8080/ \$scheme://\$host/learning/;
        proxy_redirect http://$SERVER_IP/ \$scheme://\$host/learning/;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Original-URI \$request_uri;
        proxy_set_header X-Forwarded-Prefix /learning;
        
        # Configuración para archivos grandes
        client_max_body_size 100M;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }

    # Capturar assets y páginas de Moodle que se escapan sin /learning
    location ~ ^/(theme|lib|pix|draftfile\.php|pluginfile\.php|login|admin|course|user|my|grade|message|calendar|badges|cohort|tag|question|mod|blocks|filter|enrol|auth|local|report|webservice|search|competency|analytics|privacy|h5p|contentbank|communication)/ {
        proxy_pass http://localhost:8080;
        proxy_redirect http://localhost:8080/ \$scheme://\$host/learning/;
        proxy_redirect http://$SERVER_IP/ \$scheme://\$host/learning/;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Original-URI \$request_uri;
        proxy_set_header X-Forwarded-Prefix /learning;
        
        # Configuración para archivos grandes
        client_max_body_size 100M;
    }

    # Página de estado del sistema
    location /system-status {
        access_log off;
        return 200 "System OK";
        add_header Content-Type text/plain;
    }
}
EOF

echo "=== Habilitando configuración ==="
ln -sf /etc/nginx/sites-available/moodle-project /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "=== Verificando configuración de Nginx ==="
nginx -t

if [ $? -eq 0 ]; then
    echo "Configuración de Nginx válida"
    
    echo "=== Reiniciando Nginx ==="
    systemctl restart nginx
    
    echo "=== Estado de los servicios ==="
    systemctl status nginx --no-pager -l
    
    echo ""
    echo "=== Configuración completada ==="
    echo ""
    echo "URLs de acceso:"
    echo "- Frontend: http://$SERVER_IP"
    echo "- Moodle: http://$SERVER_IP/learning"
    echo "- API: http://$SERVER_IP/api/"
    echo "- Estado: http://$SERVER_IP/system-status"
    echo ""
    echo "Para verificar que todo funcione:"
    echo "curl -I http://$SERVER_IP"
    echo "curl -I http://$SERVER_IP/learning"
    echo "curl -I http://$SERVER_IP/api/health"
else
    echo "Error en la configuración de Nginx. Revisa la sintaxis."
    exit 1
fi
