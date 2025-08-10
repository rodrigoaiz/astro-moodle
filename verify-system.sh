#!/bin/bash

# Script final de verificación y pruebas
# Ejecutar después de completar toda la instalación

set -e

echo "=== Verificación del Sistema ==="

# Leer configuración
if [ -f "/root/moodle-config.txt" ]; then
    SERVER_IP=$(grep "IP del servidor:" /root/moodle-config.txt | cut -d' ' -f4)
else
    SERVER_IP=$(hostname -I | awk '{print $1}')
fi

echo "Servidor: $SERVER_IP"
echo ""

echo "=== Verificando servicios del sistema ==="

# Verificar MariaDB
echo -n "MariaDB: "
if systemctl is-active --quiet mariadb; then
    echo "✅ Activo"
else
    echo "❌ Inactivo"
    systemctl status mariadb --no-pager -l
fi

# Verificar Apache
echo -n "Apache: "
if systemctl is-active --quiet apache2; then
    echo "✅ Activo"
    # Verificar que responde en puerto 8080
    if curl -s -f http://localhost:8080 > /dev/null; then
        echo "  Puerto 8080: ✅ Responde"
    else
        echo "  Puerto 8080: ❌ No responde"
    fi
else
    echo "❌ Inactivo"
    systemctl status apache2 --no-pager -l
fi

# Verificar Nginx
echo -n "Nginx: "
if systemctl is-active --quiet nginx; then
    echo "✅ Activo"
    # Verificar que responde en puerto 80
    if curl -s -f http://localhost > /dev/null; then
        echo "  Puerto 80: ✅ Responde"
    else
        echo "  Puerto 80: ❌ No responde"
    fi
else
    echo "❌ Inactivo"
    systemctl status nginx --no-pager -l
fi

echo ""
echo "=== Verificando aplicaciones Node.js ==="

# Verificar PM2 y aplicaciones
if command -v pm2 > /dev/null; then
    echo "PM2 instalado: ✅"
    echo ""
    echo "Estado de aplicaciones PM2:"
    su - www-data -s /bin/bash -c "pm2 status" || echo "No hay procesos PM2 ejecutándose"
    
    echo ""
    echo "Verificando puertos de Node.js:"
    
    # Verificar frontend Astro (puerto 4321)
    echo -n "Frontend Astro (4321): "
    if netstat -tuln | grep -q ":4321 "; then
        echo "✅ Puerto abierto"
        if curl -s -f http://localhost:4321 > /dev/null; then
            echo "  Respuesta HTTP: ✅"
        else
            echo "  Respuesta HTTP: ❌"
        fi
    else
        echo "❌ Puerto cerrado"
    fi
    
    # Verificar servicio auth (puerto 3001)
    echo -n "Servicio Auth (3001): "
    if netstat -tuln | grep -q ":3001 "; then
        echo "✅ Puerto abierto"
        if curl -s -f http://localhost:3001 > /dev/null; then
            echo "  Respuesta HTTP: ✅"
        else
            echo "  Respuesta HTTP: ❌"
        fi
    else
        echo "❌ Puerto cerrado"
    fi
else
    echo "PM2: ❌ No instalado"
fi

echo ""
echo "=== Verificando conectividad externa ==="

# Verificar acceso desde el exterior
echo -n "Frontend principal: "
if curl -s -I http://$SERVER_IP | grep -q "200 OK"; then
    echo "✅ Accesible"
else
    echo "❌ No accesible"
    echo "  Respuesta completa:"
    curl -I http://$SERVER_IP 2>&1 | head -5
fi

echo -n "Moodle (/learning): "
if curl -s -I http://$SERVER_IP/learning | grep -q -E "(200 OK|302 Found|301 Moved)"; then
    echo "✅ Accesible"
else
    echo "❌ No accesible"
    echo "  Respuesta completa:"
    curl -I http://$SERVER_IP/learning 2>&1 | head -5
fi

echo -n "API (/api/): "
if curl -s -I http://$SERVER_IP/api/ | grep -q -E "(200 OK|404 Not Found)"; then
    echo "✅ Accesible"
else
    echo "❌ No accesible"
    echo "  Respuesta completa:"
    curl -I http://$SERVER_IP/api/ 2>&1 | head -5
fi

echo ""
echo "=== Verificando archivos de configuración ==="

# Verificar archivos importantes
files_to_check=(
    "/var/www/moodle/config.php"
    "/var/www/astro-moodle/auth/.env"
    "/var/www/astro-moodle/ecosystem.config.js"
    "/etc/nginx/sites-enabled/moodle-project"
    "/etc/apache2/sites-enabled/moodle.conf"
)

for file in "${files_to_check[@]}"; do
    echo -n "$(basename $file): "
    if [ -f "$file" ]; then
        echo "✅ Existe"
    else
        echo "❌ No existe"
    fi
done

echo ""
echo "=== Verificando logs ==="

# Verificar logs importantes
logs_to_check=(
    "/var/log/nginx/moodle_access.log"
    "/var/log/nginx/moodle_error.log"
    "/var/log/apache2/moodle_access.log"
    "/var/log/apache2/moodle_error.log"
)

for log in "${logs_to_check[@]}"; do
    echo -n "$(basename $log): "
    if [ -f "$log" ]; then
        echo "✅ Existe"
        # Mostrar últimas líneas si hay errores
        if [[ "$log" == *"error"* ]]; then
            error_count=$(wc -l < "$log" 2>/dev/null || echo "0")
            if [ "$error_count" -gt 0 ]; then
                echo "  ⚠️ $error_count líneas de error. Últimas 3:"
                tail -3 "$log" | sed 's/^/    /'
            fi
        fi
    else
        echo "❌ No existe"
    fi
done

echo ""
echo "=== Verificación de espacio en disco ==="
df -h | grep -E "(Filesystem|/dev/)" | head -5

echo ""
echo "=== Verificación de memoria ==="
free -h

echo ""
echo "=== Resumen final ==="

# Contar servicios activos
active_services=0
total_services=3

systemctl is-active --quiet mariadb && ((active_services++))
systemctl is-active --quiet apache2 && ((active_services++))
systemctl is-active --quiet nginx && ((active_services++))

echo "Servicios activos: $active_services/$total_services"

if [ $active_services -eq $total_services ]; then
    echo "✅ Todos los servicios están funcionando correctamente"
    echo ""
    echo "🎉 El sistema está listo para usar!"
    echo ""
    echo "URLs de acceso:"
    echo "- 🏠 Frontend: http://$SERVER_IP"
    echo "- 📚 Moodle: http://$SERVER_IP/learning"
    echo "- 🔐 API: http://$SERVER_IP/api/"
    echo ""
    echo "Para administrar el sistema:"
    echo "- Inicio/parada: moodle-stack {start|stop|restart|status}"
    echo "- Logs PM2: su - www-data -c 'pm2 logs'"
    echo "- Logs Nginx: tail -f /var/log/nginx/moodle_*.log"
    echo "- Logs Apache: tail -f /var/log/apache2/moodle_*.log"
else
    echo "❌ Algunos servicios no están funcionando correctamente"
    echo "Ejecuta: moodle-stack status"
    echo "Para más detalles de los errores"
fi

echo ""
echo "Configuración guardada en: /root/moodle-config.txt"
