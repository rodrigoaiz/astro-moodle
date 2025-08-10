#!/bin/bash

# Script para preparar el proyecto para despliegue manual
# Ejecutar en local antes de subir al servidor

set -e

echo "=== Preparando proyecto para despliegue manual ==="

# Crear directorio de despliegue
DEPLOY_DIR="./manual-deployment"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "Creando paquete de despliegue en: $DEPLOY_DIR"

# Copiar archivos necesarios para el servidor
echo "Copiando archivos del proyecto..."

# Copiar carpetas principales
cp -r astro $DEPLOY_DIR/
cp -r auth $DEPLOY_DIR/

# Copiar archivos de configuración
cp -r nginx $DEPLOY_DIR/
cp -r moodle-extra-config $DEPLOY_DIR/

# Copiar scripts de despliegue
cp install-dependencies.sh $DEPLOY_DIR/
cp deploy-nodejs.sh $DEPLOY_DIR/
cp setup-nginx.sh $DEPLOY_DIR/
cp verify-system.sh $DEPLOY_DIR/

# Copiar documentación
cp MANUAL_DEPLOYMENT_GUIDE.md $DEPLOY_DIR/
cp DEPLOYMENT_QUICKSTART.md $DEPLOY_DIR/
cp README.md $DEPLOY_DIR/

# Hacer ejecutables los scripts
chmod +x $DEPLOY_DIR/*.sh

echo "Limpiando archivos innecesarios..."

# Limpiar node_modules si existen
rm -rf $DEPLOY_DIR/astro/node_modules
rm -rf $DEPLOY_DIR/auth/node_modules

# Limpiar archivos de desarrollo
find $DEPLOY_DIR -name ".DS_Store" -delete 2>/dev/null || true
find $DEPLOY_DIR -name "*.log" -delete 2>/dev/null || true
find $DEPLOY_DIR -name ".env.local" -delete 2>/dev/null || true

echo "Creando archivo de instrucciones..."

cat > $DEPLOY_DIR/INSTRUCCIONES_DESPLIEGUE.md << 'EOF'
# Instrucciones de Despliegue Manual

## 📦 Contenido de este paquete

Este paquete contiene todo lo necesario para desplegar tu proyecto sin Docker:

- `astro/` - Frontend Astro
- `auth/` - Servicio de autenticación Node.js
- `nginx/` - Configuración Nginx de referencia
- `moodle-extra-config/` - Configuración adicional de Moodle
- Scripts de instalación automatizados
- Documentación completa

## 🚀 Pasos de instalación

1. **Subir archivos al servidor**
   ```bash
   scp -r manual-deployment/ usuario@servidor:/var/www/astro-moodle/
   ```

2. **Conectar al servidor**
   ```bash
   ssh usuario@servidor
   cd /var/www/astro-moodle
   ```

3. **Ejecutar instalación automática** (como root)
   ```bash
   sudo ./install-dependencies.sh
   sudo ./deploy-nodejs.sh
   sudo ./setup-nginx.sh
   sudo ./verify-system.sh
   ```

## 📚 Documentación

- `DEPLOYMENT_QUICKSTART.md` - Guía rápida
- `MANUAL_DEPLOYMENT_GUIDE.md` - Guía completa paso a paso

## ✅ Verificación

Después de la instalación, tu sitio estará disponible en:
- Frontend: `http://TU_SERVIDOR/`
- Moodle: `http://TU_SERVIDOR/learning`
- API: `http://TU_SERVIDOR/api/`
EOF

echo "Creando script de transferencia al servidor..."

cat > $DEPLOY_DIR/transfer-to-server.sh << 'EOF'
#!/bin/bash

# Script para transferir archivos al servidor
# Edita las variables según tu servidor

SERVER_USER="root"
SERVER_IP="TU_IP_DEL_SERVIDOR"
SERVER_PATH="/var/www/astro-moodle"

echo "=== Transferencia al Servidor ==="
echo "Servidor: $SERVER_USER@$SERVER_IP"
echo "Ruta: $SERVER_PATH"
echo ""

read -p "¿Son correctos estos datos? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Edita las variables en este script antes de continuar"
    exit 1
fi

echo "Creando directorio en el servidor..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $SERVER_PATH"

echo "Transfiriendo archivos..."
rsync -avz --progress \
  --exclude=node_modules \
  --exclude=.git \
  --exclude="*.log" \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

echo ""
echo "✅ Transferencia completada"
echo ""
echo "Próximos pasos:"
echo "1. Conectar al servidor: ssh $SERVER_USER@$SERVER_IP"
echo "2. Ir al directorio: cd $SERVER_PATH"
echo "3. Ejecutar instalación: sudo ./install-dependencies.sh"
EOF

chmod +x $DEPLOY_DIR/transfer-to-server.sh

echo "Creando archivo de verificación de integridad..."

# Crear checksums para verificar integridad
find $DEPLOY_DIR -type f -name "*.sh" -o -name "*.js" -o -name "*.json" -o -name "*.php" | sort | xargs md5sum > $DEPLOY_DIR/checksums.md5

echo "Creando archivo comprimido para transferencia..."

# Crear archivo tar.gz para fácil transferencia
cd $(dirname $DEPLOY_DIR)
tar -czf manual-deployment.tar.gz $(basename $DEPLOY_DIR)
cd - > /dev/null

echo ""
echo "🎉 ¡Preparación completada!"
echo ""
echo "📁 Archivos preparados en: $DEPLOY_DIR"
echo "📦 Archivo comprimido: manual-deployment.tar.gz"
echo ""
echo "📋 Contenido del paquete:"
find $DEPLOY_DIR -type f | sort | sed 's|^./manual-deployment/|  - |'
echo ""
echo "🚀 Próximos pasos:"
echo "1. Editar transfer-to-server.sh con los datos de tu servidor"
echo "2. Ejecutar: ./$DEPLOY_DIR/transfer-to-server.sh"
echo "3. O subir manualmente: manual-deployment.tar.gz"
echo ""
echo "📖 Documentación completa en:"
echo "   - $DEPLOY_DIR/INSTRUCCIONES_DESPLIEGUE.md"
echo "   - $DEPLOY_DIR/DEPLOYMENT_QUICKSTART.md"
