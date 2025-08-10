# Despliegue Manual Sin Docker - Guía Rápida

Este proyecto puede desplegarse manualmente sin Docker siguiendo estos pasos secuenciales.

## 📋 Prerrequisitos

- Servidor Linux (Ubuntu 20.04+ recomendado)
- Acceso root/sudo
- Al menos 2GB RAM y 10GB espacio en disco

## 🚀 Despliegue Rápido (4 pasos)

### 1. Preparar el servidor
```bash
# Subir todos los archivos del proyecto al servidor en /var/www/astro-moodle
chmod +x *.sh

# Ejecutar instalación de dependencias (como root)
sudo ./install-dependencies.sh
```

### 2. Desplegar aplicaciones Node.js
```bash
# Ejecutar después de subir el código
sudo ./deploy-nodejs.sh
```

### 3. Configurar Nginx
```bash
# Configurar reverse proxy
sudo ./setup-nginx.sh
```

### 4. Verificar sistema
```bash
# Comprobar que todo funciona
sudo ./verify-system.sh
```

## 📁 Estructura en el servidor

```
/var/www/astro-moodle/          # Tu código
├── astro/                      # Frontend Astro
├── auth/                       # Servicio auth
└── ecosystem.config.js         # Config PM2

/var/www/moodle/                # Instalación Moodle
/var/moodledata/               # Datos Moodle
```

## 🔧 Comandos de administración

```bash
# Gestión completa del stack
moodle-stack {start|stop|restart|status}

# PM2 (aplicaciones Node.js)
su - www-data -c "pm2 status"
su - www-data -c "pm2 logs"
su - www-data -c "pm2 restart all"

# Servicios del sistema
systemctl status nginx apache2 mariadb
systemctl restart nginx
```

## 🌐 URLs de acceso

- **Frontend**: `http://TU_SERVIDOR/`
- **Moodle**: `http://TU_SERVIDOR/learning`
- **API**: `http://TU_SERVIDOR/api/`

## 📊 Monitoreo

```bash
# Verificar estado general
moodle-stack status

# Ver logs en tiempo real
tail -f /var/log/nginx/moodle_*.log
tail -f /var/log/apache2/moodle_*.log
su - www-data -c "pm2 logs --lines 100"
```

## 🔒 Archivos importantes

- `/root/moodle-config.txt` - Contraseñas y configuración
- `/var/www/moodle/config.php` - Configuración Moodle
- `/var/www/astro-moodle/auth/.env` - Variables entorno auth
- `/etc/nginx/sites-enabled/moodle-project` - Config Nginx

## 🆘 Solución de problemas

### Si el frontend no carga:
```bash
su - www-data -c "pm2 restart astro-frontend"
curl -I http://localhost:4321
```

### Si la API no responde:
```bash
su - www-data -c "pm2 restart auth-service"
curl -I http://localhost:3001
```

### Si Moodle no carga:
```bash
systemctl restart apache2
curl -I http://localhost:8080
```

### Si nada funciona:
```bash
moodle-stack restart
sudo ./verify-system.sh
```

## 🔄 Actualizaciones

Para actualizar tu código:
```bash
# 1. Detener aplicaciones
su - www-data -c "pm2 stop all"

# 2. Actualizar código en /var/www/astro-moodle

# 3. Reconstruir frontend
cd /var/www/astro-moodle/astro
npm run build

# 4. Reiniciar aplicaciones
su - www-data -c "pm2 restart all"
```

## 📝 Notas importantes

1. **Seguridad**: Cambia todas las contraseñas por defecto
2. **Firewall**: Configura para permitir puertos 80, 443
3. **Backup**: Respalda `/var/moodledata` y la base de datos regularmente
4. **SSL**: Considera agregar HTTPS con Let's Encrypt
5. **Recursos**: Monitorea CPU/RAM con `htop`

---

Para la guía completa paso a paso, consulta: `MANUAL_DEPLOYMENT_GUIDE.md`
