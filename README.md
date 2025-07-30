# Astro + Moodle Integration Platform

Una plataforma educativa moderna que integra un frontend desarrollado en Astro con Moodle LMS, utilizando Docker para una implementación robusta y escalable.

## 🚀 Características

- **Frontend moderno**: Interfaz desarrollada en Astro para mejor rendimiento
- **LMS robusto**: Moodle 4.3.3 para gestión de aprendizaje
- **Autenticación integrada**: Sistema de autenticación unificado entre frontend y Moodle
- **API RESTful**: Endpoints para verificación de sesiones y gestión de usuarios
- **Arquitectura en contenedores**: Docker Compose para fácil despliegue
- **Proxy inteligente**: Nginx para enrutamiento y balanceo
- **Base de datos optimizada**: MariaDB para almacenamiento confiable
- **Administración web**: Adminer para gestión de base de datos

## 📋 Requisitos Previos

- Docker Engine 20.10+
- Docker Compose 2.0+
- Puerto 4324 disponible (configurable)
- Puerto 4325 disponible (configurable)

Ideal para integrar un sitio institucional moderno con un LMS sin necesidad de configuraciones complejas manuales.

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│   Astro App     │    │   Auth Service  │
│   Port: 4324    │    │   Port: 3000    │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ├───────────────────────┼───────────────────────┼──────────
         │              Docker Network (172.18.0.0/16)  │
         ├───────────────────────┼───────────────────────┘
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Moodle LMS    │    │   MariaDB       │    │   Adminer       │
│   Port: 8080    │    │   Port: 3306    │    │   Port: 4325    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd astro-moodle
```

### 2. Configurar variables de entorno (opcional)

```bash
# Copiar archivo de ejemplo si existe
cp .env.example .env

# Editar configuración
nano .env
```

Variables disponibles:
- `HTTP_PORT=4324` - Puerto principal de la aplicación
- `ADMIN_PORT=4325` - Puerto para Adminer

### 3. Construir e iniciar los servicios

```bash
# Construir e iniciar todos los servicios
docker compose up -d

# Verificar que todos los contenedores estén funcionando
docker compose ps
```

### 4. Verificar la instalación

La instalación estará completa cuando todos los servicios muestren estado "healthy" o "running":

```bash
docker compose ps
```

## 🌐 Acceso a la Plataforma

### URLs Principales

- **Frontend Principal**: `http://localhost:4324/`
- **Moodle LMS**: `http://localhost:4324/learning/`
- **API de Autenticación**: `http://localhost:4324/api/`
- **Adminer (Base de Datos)**: `http://localhost:4325/`

### API de Autenticación

La plataforma incluye una API RESTful para gestión de autenticación:

| Endpoint | Método | Descripción | Respuesta |
|----------|--------|-------------|-----------|
| `/api/health` | GET | Estado del servicio de autenticación | `{"status":"ok","database":"connected"}` |
| `/api/check-session` | GET | Verificar si el usuario tiene sesión activa | `{"loggedIn":true/false,"user":{...}}` |
| `/api/user` | GET | Obtener información del usuario actual | `{"id":1,"username":"admin",...}` |
| `/api/logout` | POST | Cerrar sesión del usuario | `{"success":true}` |

**Ejemplos de uso:**

```bash
# Verificar estado del servicio
curl http://localhost:4324/api/health

# Verificar sesión (requiere cookies de Moodle)
curl -b "MoodleSession=..." http://localhost:4324/api/check-session

# Obtener información del usuario
curl -b "MoodleSession=..." http://localhost:4324/api/user
```

### Credenciales de Acceso

**Moodle Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`

**Base de Datos (Adminer):**
- Sistema: `MySQL`
- Servidor: `db`
- Usuario: `moodle`
- Contraseña: `moodle_pass`
- Base de datos: `moodle`

## 📁 Estructura del Proyecto

```text
```text
.
├── astro                 # Código fuente y Dockerfile del frontend Astro
├── auth                  # Código fuente y Dockerfile del servicio de autenticación
├── data                  # (Opcional) Scripts SQL iniciales para la DB
├── docker-compose.yml    # Orquestación de contenedores Docker
├── logs                  # Logs persistentes de Nginx (acceso y errores)
├── moodle-extra-config   # Configuración adicional para Moodle (wwwroot, proxy)
└── nginx                 # Configuración personalizada de Nginx
```

## 🔐 Sistema de Autenticación

### Arquitectura de Autenticación

La plataforma implementa un sistema de autenticación unificado que permite al frontend Astro verificar y utilizar las sesiones de Moodle:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth Service  │    │   Moodle LMS    │
│   (Astro)       │────│   (Node.js)     │────│   (PHP)         │
│   Verificación  │    │   API REST      │    │   Autenticación │
│   de sesiones   │    │   /api/*        │    │   /learning/*   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MariaDB       │
                    │   mdl_sessions  │
                    │   mdl_user      │
                    └─────────────────┘
```

### Flujo de Autenticación

1. **Inicio de sesión**: El usuario se autentica en Moodle (`/learning/login/`)
2. **Cookie de sesión**: Moodle genera una cookie `MoodleSession`
3. **Verificación**: El frontend puede verificar la sesión via `/api/check-session`
4. **Datos del usuario**: El frontend obtiene información del usuario via `/api/user`
5. **Sincronización**: Ambas aplicaciones comparten el estado de autenticación

### Configuración del Servicio de Autenticación

El servicio de autenticación se configura mediante variables de entorno:

```yaml
# docker-compose.yml
auth:
  environment:
    - DB_HOST=db
    - DB_USER=moodle
    - DB_PASS=moodle_pass
    - DB_NAME=moodle
    - DB_PORT=3306
```

## 🛠️ Desarrollo y Personalización

### Modificar el Frontend (Astro)

```bash
# Entrar al directorio del frontend
cd astro/

# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Reconstruir contenedor
docker compose build astro
```

### Modificar el Servicio de Autenticación

```bash
# Entrar al directorio del servicio
cd auth/

# Instalar dependencias
npm install

# Desarrollo local (requiere base de datos)
npm start

# Reconstruir contenedor
docker compose build auth
```

### Logs y Debugging

```bash
# Ver logs de todos los servicios
docker compose logs

# Ver logs específicos
docker compose logs astro
docker compose logs auth
docker compose logs moodle
docker compose logs nginx

# Seguir logs en tiempo real
docker compose logs -f auth
```

## 📊 Monitoreo y Mantenimiento

### Verificar Estado de Servicios

```bash
# Estado general de contenedores
docker compose ps

# Uso de recursos
docker stats

# Verificar conectividad de la API
curl http://localhost:4324/api/health

# Verificar acceso a Moodle
curl -I http://localhost:4324/learning/
```

### Respaldos

```bash
# Respaldar base de datos
docker compose exec db mysqldump -u moodle -pmoodle_pass moodle > backup_$(date +%Y%m%d).sql

# Respaldar datos de Moodle
docker compose exec moodle tar -czf /backup/moodle_data_$(date +%Y%m%d).tar.gz /bitnami/moodle
```

## 🔧 Solución de Problemas

### Problemas Comunes

**Error: "Cannot connect to database"**
```bash
# Verificar que MariaDB esté corriendo
docker compose ps db

# Revisar logs de la base de datos
docker compose logs db

# Reiniciar servicios
docker compose restart db auth
```

**Error: "API endpoints return 404"**
```bash
# Verificar configuración de Nginx
docker compose logs nginx

# Verificar servicio de autenticación
docker compose logs auth

# Reconstruir contenedores
docker compose build auth nginx
docker compose up -d
```

**Moodle no carga correctamente**
```bash
# Verificar configuración de wwwroot
docker compose logs moodle

# Verificar proxy de Nginx
curl -I http://localhost:4324/learning/

# Limpiar caché y reiniciar
docker compose restart moodle nginx
```

### Logs Útiles

```bash
# Logs de autenticación
docker compose logs auth | grep "GET\|POST\|ERROR"

# Logs de Nginx (errores)
docker compose logs nginx | grep "error"

# Logs de acceso de Nginx
docker compose exec nginx tail -f /var/log/nginx/access.log
```

## 🚀 Próximos Pasos

### Hito 3 - Completado ✅

- [x] Integración de autenticación entre Astro y Moodle
- [x] API RESTful para gestión de sesiones
- [x] Verificación de usuarios autenticados
- [x] Sistema de logout unificado

### Posibles Mejoras Futuras

1. **Autenticación SSO**: Implementar Single Sign-On con proveedores externos
2. **Roles y permisos**: Sistema granular de autorización
3. **Notificaciones**: Sistema de notificaciones en tiempo real
4. **Dashboard avanzado**: Panel de control con métricas y estadísticas
5. **API GraphQL**: Migración o complemento con GraphQL
6. **PWA**: Convertir el frontend en Progressive Web App
7. **Multitenancy**: Soporte para múltiples instituciones

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor, abrir un issue primero para discutir los cambios propuestos.

## 📞 Soporte

Para soporte técnico, crear un issue en el repositorio del proyecto con:
- Descripción detallada del problema
- Logs relevantes
- Pasos para reproducir el error
- Información del entorno (OS, Docker version, etc.)
