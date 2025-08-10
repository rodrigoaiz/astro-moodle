#!/bin/bash

# Script de instalación automática para despliegue manual
# Este script instala todas las dependencias necesarias

set -e

echo "=== Instalación Automática - Proyecto Astro-Moodle ==="
echo "Este script instalará todos los componentes necesarios"
echo ""

# Verificar que se ejecute como root o con sudo
if [[ $EUID -ne 0 ]]; then
   echo "Este script debe ejecutarse como root o con sudo" 
   exit 1
fi

# Variables de configuración
DB_PASSWORD="moodle_pass_$(date +%s)"
MOODLE_ADMIN_PASSWORD="admin_$(date +%s)"
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "=== Configuración ==="
echo "IP del servidor: $SERVER_IP"
echo "Password de BD: $DB_PASSWORD"
echo "Password admin Moodle: $MOODLE_ADMIN_PASSWORD"
echo ""
read -p "¿Continuar con la instalación? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "=== Actualizando sistema ==="
apt update && apt upgrade -y

echo "=== Instalando dependencias base ==="
apt install -y curl wget git unzip software-properties-common

echo "=== Instalando Node.js 18 ==="
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "=== Instalando MariaDB ==="
apt install -y mariadb-server mariadb-client

echo "=== Configurando MariaDB ==="
# Configuración segura automática
mysql -e "UPDATE mysql.user SET Password = PASSWORD('$DB_PASSWORD') WHERE User = 'root'"
mysql -e "DELETE FROM mysql.user WHERE User=''"
mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1')"
mysql -e "DROP DATABASE IF EXISTS test"
mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%'"
mysql -e "FLUSH PRIVILEGES"

# Crear base de datos para Moodle
mysql -u root -p$DB_PASSWORD -e "
CREATE DATABASE moodle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'moodle'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON moodle.* TO 'moodle'@'localhost';
FLUSH PRIVILEGES;
"

echo "=== Instalando PHP y extensiones ==="
apt install -y php8.1 php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-zip php8.1-gd php8.1-mbstring php8.1-xmlrpc php8.1-soap php8.1-intl php8.1-ldap php8.1-cli

echo "=== Instalando Apache ==="
apt install -y apache2
a2enmod rewrite
a2enmod ssl
a2enmod headers

echo "=== Configurando Apache para puerto 8080 ==="
sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf
systemctl restart apache2

echo "=== Descargando e instalando Moodle ==="
mkdir -p /var/www/moodle
mkdir -p /var/moodledata

cd /tmp
wget -q https://download.moodle.org/download.php/direct/stable43/moodle-4.3.3.tgz
tar -xzf moodle-4.3.3.tgz
cp -R moodle/* /var/www/moodle/

# Configurar permisos
chown -R www-data:www-data /var/www/moodle
chown -R www-data:www-data /var/moodledata
chmod -R 755 /var/www/moodle
chmod -R 777 /var/moodledata

echo "=== Creando configuración de Moodle ==="
cat > /var/www/moodle/config.php << EOF
<?php
unset(\$CFG);
global \$CFG;
\$CFG = new stdClass();

\$CFG->dbtype    = 'mariadb';
\$CFG->dblibrary = 'native';
\$CFG->dbhost    = 'localhost';
\$CFG->dbname    = 'moodle';
\$CFG->dbuser    = 'moodle';
\$CFG->dbpass    = '$DB_PASSWORD';
\$CFG->prefix    = 'mdl_';
\$CFG->dboptions = array(
    'dbpersist' => 0,
    'dbport' => '',
    'dbsocket' => '',
    'dbcollation' => 'utf8mb4_unicode_ci',
);

\$CFG->wwwroot   = 'http://$SERVER_IP/learning';
\$CFG->dataroot  = '/var/moodledata';
\$CFG->admin     = 'admin';

\$CFG->directorypermissions = 0777;

require_once(__DIR__ . '/lib/setup.php');
?>
EOF

echo "=== Configurando Apache VirtualHost para Moodle ==="
cat > /etc/apache2/sites-available/moodle.conf << EOF
<VirtualHost *:8080>
    DocumentRoot /var/www/moodle
    
    <Directory /var/www/moodle>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog \${APACHE_LOG_DIR}/moodle_error.log
    CustomLog \${APACHE_LOG_DIR}/moodle_access.log combined
</VirtualHost>
EOF

a2ensite moodle.conf
systemctl restart apache2

echo "=== Instalando PM2 ==="
npm install -g pm2

echo "=== Instalando Nginx ==="
apt install -y nginx

echo "=== Configurando servicios para inicio automático ==="
systemctl enable nginx
systemctl enable apache2
systemctl enable mariadb

echo "=== Creando script de gestión ==="
cat > /usr/local/bin/moodle-stack << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "Iniciando servicios..."
        systemctl start mariadb
        systemctl start apache2
        su - www-data -s /bin/bash -c "cd /var/www/astro-moodle && pm2 start ecosystem.config.js"
        systemctl start nginx
        echo "Servicios iniciados"
        ;;
    stop)
        echo "Deteniendo servicios..."
        systemctl stop nginx
        su - www-data -s /bin/bash -c "pm2 stop all"
        systemctl stop apache2
        systemctl stop mariadb
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
        systemctl status mariadb --no-pager -l
        systemctl status apache2 --no-pager -l
        su - www-data -s /bin/bash -c "pm2 status"
        systemctl status nginx --no-pager -l
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/moodle-stack

echo "=== Instalación completada ==="
echo ""
echo "Información importante:"
echo "- Password de BD: $DB_PASSWORD"
echo "- Password admin Moodle: $MOODLE_ADMIN_PASSWORD"
echo "- IP del servidor: $SERVER_IP"
echo ""
echo "Próximos pasos:"
echo "1. Subir tu código a /var/www/astro-moodle"
echo "2. Configurar las aplicaciones Node.js"
echo "3. Configurar Nginx"
echo "4. Inicializar Moodle en http://$SERVER_IP:8080"
echo ""
echo "Guarda esta información en un lugar seguro!"

# Guardar configuración en archivo
cat > /root/moodle-config.txt << EOF
=== Configuración del Sistema ===
Fecha de instalación: $(date)
IP del servidor: $SERVER_IP
Password de BD: $DB_PASSWORD
Password admin Moodle: $MOODLE_ADMIN_PASSWORD
Usuario BD: moodle
Nombre BD: moodle
EOF

echo "Configuración guardada en /root/moodle-config.txt"
