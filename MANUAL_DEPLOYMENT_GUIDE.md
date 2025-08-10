# Guía de Despliegue Manual Sin Docker

## Resumen de la Arquitectura

Tu proyecto tiene los siguientes componentes que deben instalarse manualmente:

1. **Astro Frontend** (Puerto 3000)
2. **Servicio de Autenticación Node.js** (Puerto 3001) 
3. **Moodle** (Puerto 8080)
4. **Base de datos MariaDB/MySQL**
5. **Nginx** (Puerto 80/443)

## Prerrequisitos del Servidor

- Sistema operativo: Linux (Ubuntu 20.04+ recomendado)
- Usuario con permisos sudo
- Acceso SSH al servidor

## 1. Instalación de Dependencias Base

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git unzip software-properties-common

# Instalar Node.js (versión 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalaciones
node --version
npm --version
```

## 2. Instalación de MariaDB/MySQL

```bash
# Instalar MariaDB
sudo apt install -y mariadb-server mariadb-client

# Configurar MariaDB
sudo mysql_secure_installation

# Crear base de datos y usuario para Moodle
sudo mysql -u root -p
```

SQL para ejecutar en MySQL:
```sql
CREATE DATABASE moodle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'moodle'@'localhost' IDENTIFIED BY 'moodle_pass';
GRANT ALL PRIVILEGES ON moodle.* TO 'moodle'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Instalación de PHP y Apache/Nginx para Moodle

```bash
# Instalar PHP y extensiones necesarias para Moodle
sudo apt install -y php8.1 php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-zip php8.1-gd php8.1-mbstring php8.1-xmlrpc php8.1-soap php8.1-intl php8.1-ldap php8.1-cli

# Instalar Apache
sudo apt install -y apache2

# Habilitar módulos de Apache
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
```

## 4. Instalación Manual de Moodle

```bash
# Crear directorio para Moodle
sudo mkdir -p /var/www/moodle
sudo mkdir -p /var/moodledata

# Descargar Moodle 4.3
cd /tmp
wget https://download.moodle.org/download.php/direct/stable43/moodle-4.3.3.tgz
tar -xzf moodle-4.3.3.tgz
sudo cp -R moodle/* /var/www/moodle/

# Configurar permisos
sudo chown -R www-data:www-data /var/www/moodle
sudo chown -R www-data:www-data /var/moodledata
sudo chmod -R 755 /var/www/moodle
sudo chmod -R 777 /var/moodledata
```

## 5. Configuración de Moodle

Crear archivo de configuración `/var/www/moodle/config.php`:

```php
<?php
unset($CFG);
global $CFG;
$CFG = new stdClass();

$CFG->dbtype    = 'mariadb';
$CFG->dblibrary = 'native';
$CFG->dbhost    = 'localhost';
$CFG->dbname    = 'moodle';
$CFG->dbuser    = 'moodle';
$CFG->dbpass    = 'moodle_pass';
$CFG->prefix    = 'mdl_';
$CFG->dboptions = array(
    'dbpersist' => 0,
    'dbport' => '',
    'dbsocket' => '',
    'dbcollation' => 'utf8mb4_unicode_ci',
);

$CFG->wwwroot   = 'http://TU_SERVIDOR/learning';
$CFG->dataroot  = '/var/moodledata';
$CFG->admin     = 'admin';

$CFG->directorypermissions = 0777;

require_once(__DIR__ . '/lib/setup.php');
?>
```

## 6. Configuración de Apache para Moodle

Crear archivo `/etc/apache2/sites-available/moodle.conf`:

```apache
<VirtualHost *:8080>
    DocumentRoot /var/www/moodle
    
    <Directory /var/www/moodle>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/moodle_error.log
    CustomLog ${APACHE_LOG_DIR}/moodle_access.log combined
</VirtualHost>
```

```bash
# Habilitar el sitio
sudo a2ensite moodle.conf
sudo systemctl restart apache2

# Cambiar puerto de Apache
sudo sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf
sudo systemctl restart apache2
```

## 7. Despliegue del Frontend Astro

```bash
# Crear directorio para el proyecto
sudo mkdir -p /var/www/astro-moodle
cd /var/www/astro-moodle

# Clonar o copiar tu código
# (Aquí deberás subir tu código al servidor)

# Instalar dependencias del frontend Astro
cd astro
npm install

# Construir la aplicación
npm run build

# Instalar PM2 para gestionar procesos Node.js
sudo npm install -g pm2

# Servir la aplicación Astro en modo preview
pm2 start "npm run preview" --name "astro-frontend"
```

## 8. Despliegue del Servicio de Autenticación

```bash
# Ir al directorio del servicio auth
cd /var/www/astro-moodle/auth

# Instalar dependencias
npm install

# Configurar variables de entorno
cat > .env << EOF
DB_HOST=localhost
DB_USER=moodle
DB_PASS=moodle_pass
DB_NAME=moodle
DB_PORT=3306
PORT=3001
EOF

# Iniciar el servicio con PM2
pm2 start server.js --name "auth-service"
```

## 9. Instalación y Configuración de Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración personalizada
sudo nano /etc/nginx/sites-available/moodle-project
```

Contenido del archivo de configuración Nginx:

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    # Frontend Astro
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API de autenticación
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Moodle
    location /learning/ {
        proxy_pass http://localhost:8080/;
        proxy_redirect http://localhost:8080/ $scheme://$host/learning/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Forwarded-Prefix /learning;
    }

    # Assets de Moodle que se escapan
    location ~ ^/(theme|lib|pix|draftfile\.php|pluginfile\.php|login|admin|course|user|my|grade|message|calendar|badges|cohort|tag|question|mod|blocks|filter|enrol|auth|local|report|webservice|search|competency|analytics|privacy|h5p|contentbank|communication)/ {
        proxy_pass http://localhost:8080;
        proxy_redirect http://localhost:8080/ $scheme://$host/learning/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Forwarded-Prefix /learning;
    }
}
```

```bash
# Habilitar la configuración
sudo ln -s /etc/nginx/sites-available/moodle-project /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 10. Configurar Servicios para Inicio Automático

```bash
# PM2 para inicio automático
pm2 startup
pm2 save

# Servicios del sistema
sudo systemctl enable nginx
sudo systemctl enable apache2
sudo systemctl enable mariadb
```

## 11. Script de Inicio/Parada

Crear un script para gestionar todos los servicios:

```bash
# Crear script de gestión
sudo nano /usr/local/bin/moodle-stack
```

Contenido del script:

```bash
#!/bin/bash

case "$1" in
    start)
        echo "Iniciando servicios..."
        sudo systemctl start mariadb
        sudo systemctl start apache2
        pm2 start all
        sudo systemctl start nginx
        echo "Servicios iniciados"
        ;;
    stop)
        echo "Deteniendo servicios..."
        sudo systemctl stop nginx
        pm2 stop all
        sudo systemctl stop apache2
        sudo systemctl stop mariadb
        echo "Servicios detenidos"
        ;;
    restart)
        echo "Reiniciando servicios..."
        $0 stop
        sleep 3
        $0 start
        ;;
    status)
        echo "Estado de los servicios:"
        sudo systemctl status mariadb --no-pager -l
        sudo systemctl status apache2 --no-pager -l
        pm2 status
        sudo systemctl status nginx --no-pager -l
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/moodle-stack
```

## 12. Verificación y Testing

```bash
# Verificar que todos los servicios están corriendo
moodle-stack status

# Probar conectividad
curl -I http://localhost
curl -I http://localhost/learning
curl -I http://localhost/api/health
```

## Notas Importantes

1. **Seguridad**: Cambia todas las contraseñas por defecto
2. **Firewall**: Configura el firewall para permitir solo los puertos necesarios
3. **Backup**: Implementa un sistema de respaldo para la base de datos y archivos
4. **Logs**: Monitorea los logs en `/var/log/` regularmente
5. **SSL**: Considera instalar un certificado SSL para HTTPS

## Estructura de Archivos Final

```
/var/www/astro-moodle/
├── astro/                 # Frontend Astro
└── auth/                  # Servicio de autenticación

/var/www/moodle/           # Instalación de Moodle
/var/moodledata/           # Datos de Moodle
```

## Comandos Útiles para Administración

```bash
# Ver logs de PM2
pm2 logs

# Reiniciar aplicaciones Node.js
pm2 restart all

# Ver estado de servicios
systemctl status nginx apache2 mariadb

# Reiniciar Nginx
sudo systemctl reload nginx
```
