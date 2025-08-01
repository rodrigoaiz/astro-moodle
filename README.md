# Astro + Moodle Integration Platform

Una plataforma educativa moderna que integra un frontend desarrollado en Astro con Moodle LMS, implementando autenticación sincronizada y widgets interactivos para una experiencia de usuario superior.

## 🚀 Características Principales

- **🎨 Frontend moderno**: Interfaz desarrollada en Astro con diseño responsive y gradientes modernos
- **🔐 Autenticación sincronizada**: Sistema de login unificado con validación real contra Moodle
- **📱 Widget de autenticación**: Widget flotante en tiempo real con estados dinámicos
- **🖼️ Widget de contenido Moodle**: Integración directa de contenido Moodle en el frontend
- **🛡️ Seguridad robusta**: Autenticación con tokens CSRF y validación completa
- **🌐 LMS completo**: Moodle 4.3.3 configurado y optimizado
- **⚡ API RESTful**: Endpoints seguros para gestión de sesiones y usuarios
- **🐳 Arquitectura en contenedores**: Docker Compose para despliegue simplificado
- **🔄 Proxy inteligente**: Nginx configurado para enrutamiento y balanceo
- **💾 Base de datos confiable**: MariaDB con persistencia y backups automáticos

## 📋 Requisitos del Sistema

**Software base:**
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM mínimo (8GB recomendado)
- 20GB espacio en disco

**Puertos requeridos:**
- Puerto 4324 (HTTP principal, configurable)
- Puerto 4325 (Adminer, configurable)

**Compatible con:**
- Linux (Ubuntu 20.04+, RHEL 8+, Debian 11+)
- macOS 11+ con Docker Desktop
- Windows 10+ con Docker Desktop y WSL2

## 🏗️ Arquitectura del Sistema

La plataforma utiliza una arquitectura de microservicios con 6 contenedores Docker:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│   Astro App     │    │   Auth Service  │
│   Puerto: 4324  │    │   Puerto: 3000  │    │   Puerto: 3000  │
│   (Balanceador) │    │   (Frontend)    │    │   (API Auth)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ├───────────────────────┼───────────────────────┼──────────
         │              Docker Network (astro-moodle)    │
         ├───────────────────────┼───────────────────────┘
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Moodle LMS    │    │   MariaDB       │    │   Adminer       │
│   Puerto: 8080  │    │   Puerto: 3306  │    │   Puerto: 4325  │
│   (Bitnami)     │    │   (Database)    │    │   (DB Admin)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Componentes:

- **Nginx**: Proxy reverso que maneja enrutamiento (`/` → Astro, `/learning/` → Moodle, `/api/` → Auth)
- **Astro**: Frontend moderno con widgets interactivos de autenticación y contenido
- **Auth Service**: API Node.js que valida sesiones reales de Moodle con tokens CSRF
- **Moodle**: LMS completo (Bitnami 4.3.3) con configuración personalizada
- **MariaDB**: Base de datos con tabla de sesiones y usuarios sincronizada
- **Adminer**: Interface web para administración de base de datos

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

## 🌐 URLs y Acceso a la Plataforma

Una vez levantados los servicios, la plataforma estará disponible en:

### URLs Principales

- **🏠 Página Principal**: `http://localhost:4324/`
- **📚 Moodle LMS**: `http://localhost:4324/learning/`
- **🔐 Login Moodle**: `http://localhost:4324/learning/login/`
- **🔧 API de Autenticación**: `http://localhost:4324/api/`
- **💾 Adminer (Base de Datos)**: `http://localhost:4325/`

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

## 🔐 Sistema de Autenticación Avanzado

### Características Principales

- **✅ Autenticación real**: Validación completa contra Moodle con tokens CSRF
- **🔄 Sincronización automática**: Estado de sesión compartido entre frontend y Moodle
- **🛡️ Seguridad robusta**: Sin bypasses, validación completa de credenciales
- **📱 Widget interactivo**: Interface visual en tiempo real del estado de autenticación
- **🎯 UX optimizada**: Flujo de login sin redirecciones innecesarias

### Flujo de Autenticación

```text
1. Usuario visita página principal (localhost:4324)
   ↓
2. Widget de autenticación verifica estado automáticamente
   ↓
3. Si no está autenticado: Botón "Iniciar Sesión en Moodle"
   ↓
4. Usuario hace login real en Moodle (/learning/login/)
   ↓
5. Después del login, regresa a la página principal
   ↓
6. Click en "Verificar Sesión" actualiza el estado
   ↓
7. Widget muestra información del usuario autenticado
```

### API Endpoints

| Endpoint | Método | Descripción | Respuesta |
|----------|--------|-------------|-----------|
| `/api/health` | GET | Estado del servicio | `{"status":"ok","database":"connected"}` |
| `/api/auth` | GET | Verificar sesión activa | `{"authenticated":true/false,"user":{...}}` |
| `/api/auth` | POST | Autenticar usuario | `{"success":true,"sessionId":"..."}` |
| `/api/logout` | POST | Cerrar sesión | `{"success":true}` |

## 🎨 Widgets Interactivos

### Widget de Autenticación

**Ubicación**: Esquina superior derecha de la página principal

**Estados dinámicos**:

#### 🔄 Estado de Carga

```text
┌─────────────────────┐
│  Verificando        │
│  sesión...          │
└─────────────────────┘
```

#### 🔐 Usuario No Autenticado

```text
┌─────────────────────┐
│  Iniciar Sesión     │
│  en Moodle          │
│                     │
│  [Verificar Sesión] │
└─────────────────────┘
```

#### ✅ Usuario Autenticado

```text
┌─────────────────────┐
│  👤 J               │
│  Juan Pérez         │
│  juan@example.com   │
│                     │
│  [Cerrar Sesión]    │
└─────────────────────┘
```

### Widget de Contenido Moodle

El `MoodleWidgetReact` permite integrar contenido de Moodle directamente en el frontend:

- **🖼️ Iframe inteligente**: Carga contenido de Moodle con autenticación sincronizada
- **🔄 Estados contextuales**: Muestra diferentes UIs según el estado de autenticación
- **📱 Responsive**: Se adapta a diferentes tamaños de pantalla
- **🎯 Configurable**: Altura, título, descripción y URLs personalizables

**Ejemplo de uso**:

```tsx
<MoodleWidgetReact
  src="http://localhost:4324/learning/mod/assign/view.php?id=2"
  title="Actividades Destacadas"
  description="Explora las tareas y actividades más recientes"
  height="h-64 md:h-96"
  showInHero={true}
/>
```

## 📁 Estructura del Proyecto

```text
.
├── astro/                    # 🎨 Frontend en Astro
│   ├── src/
│   │   ├── components/
│   │   │   ├── MoodleWidgetReact.tsx     # Widget principal de contenido Moodle
│   │   │   └── AuthWidgetReact.tsx       # Widget de autenticación (legacy)
│   │   ├── pages/
│   │   │   └── index.astro               # Página principal con widgets
│   │   └── layouts/
│   │       └── BaseLayout.astro          # Layout base responsive
│   ├── package.json
│   └── Dockerfile
├── auth/                     # 🔐 Servicio de autenticación
│   ├── server_new.js                     # API Node.js con validación CSRF
│   ├── package.json
│   └── Dockerfile
├── nginx/                    # 🌐 Configuración del proxy
│   └── nginx.conf                        # Enrutamiento y balanceo
├── moodle-extra-config/      # ⚙️ Configuración personalizada de Moodle
│   └── moodle_settings.php               # wwwroot y configuraciones proxy
├── data/                     # 💾 Scripts SQL iniciales (opcional)
├── logs/                     # 📋 Logs persistentes
│   └── nginx/
├── docker-compose.yml        # 🐳 Orquestación de contenedores
└── README.md                # 📖 Documentación
```

## 🛠️ Desarrollo y Personalización

### Configuración de Desarrollo

**Frontend (Astro):**

```bash
cd astro/
npm install
npm run dev  # Desarrollo local en puerto 3000
```

**API de Autenticación:**

```bash
cd auth/
npm install
npm start    # Requiere conexión a base de datos
```

**Reconstruir después de cambios:**

```bash
# Reconstruir contenedor específico
docker compose build astro
docker compose build auth

# Reiniciar servicios
docker compose up -d
```

### Personalización de Widgets

**MoodleWidgetReact** - Props disponibles:

- `src`: URL del contenido de Moodle a mostrar
- `title`: Título del widget
- `description`: Descripción del contenido
- `height`: Clase CSS para altura (`h-64`, `h-96`, etc.)
- `showInHero`: Mostrar en la sección hero
- `fallbackMessage`: Mensaje cuando no hay autenticación

**Ejemplo de integración:**

```tsx
<MoodleWidgetReact
  client:load
  src="http://localhost:4324/learning/course/view.php?id=2"
  title="Mi Curso"
  description="Accede a tu curso favorito"
  height="h-80"
  showInHero={false}
/>
```

## 📊 Monitoreo y Logging

### Verificar Estado del Sistema

```bash
# Estado de todos los contenedores
docker compose ps

# Uso de recursos en tiempo real
docker stats

# Health check de la API
curl http://localhost:4324/api/health

# Verificar acceso a Moodle
curl -I http://localhost:4324/learning/
```

### Logs por Servicio

```bash
# Logs de autenticación
docker compose logs auth

# Logs de Nginx (errores y acceso)
docker compose logs nginx

# Logs de Moodle
docker compose logs moodle

# Seguir logs en tiempo real
docker compose logs -f auth nginx
```

### Archivos de Log Persistentes

- **Nginx Access**: `./logs/nginx/access.log`
- **Nginx Error**: `./logs/nginx/error.log`
- **Contenedores**: `docker compose logs [servicio]`

## 🔧 Solución de Problemas Comunes

### Error de Conexión a Base de Datos

```bash
# Verificar estado de MariaDB
docker compose ps db

# Revisar logs de la base de datos
docker compose logs db

# Reiniciar servicios dependientes
docker compose restart db auth moodle
```

### Error de API (404/500)

```bash
# Verificar servicio de autenticación
docker compose logs auth

# Verificar configuración de Nginx
docker compose logs nginx

# Reconstruir contenedores
docker compose build auth nginx
docker compose up -d
```

### Moodle no Carga Correctamente

```bash
# Verificar configuración de wwwroot
docker compose exec moodle cat /bitnami/moodle/conf/moodle_settings.php

# Verificar proxy de Nginx
curl -v http://localhost:4324/learning/

# Limpiar caché y reiniciar
docker compose restart moodle nginx
```

## 🚀 Estado del Proyecto y Roadmap

### ✅ Hito 3 - Completado

- [x] **Autenticación real**: Validación completa con tokens CSRF contra Moodle
- [x] **Widget de autenticación**: Interface visual en tiempo real
- [x] **Widget de contenido**: Integración de contenido Moodle en frontend
- [x] **API robusta**: Endpoints seguros para gestión de sesiones
- [x] **Arquitectura escalable**: 6 contenedores Docker orquestados
- [x] **UX optimizada**: Flujo de login sin redirecciones innecesarias
- [x] **Seguridad mejorada**: Eliminación de bypasses peligrosos

### � Próximas Mejoras (Roadmap)

**Corto plazo:**
- [ ] Configuración para diferentes entornos (dev/staging/prod)
- [ ] Certificados SSL automáticos con Let's Encrypt
- [ ] Backup automático de base de datos
- [ ] Métricas y monitoreo avanzado

**Mediano plazo:**
- [ ] Autenticación SSO con proveedores externos (Google, Microsoft)
- [ ] Sistema de notificaciones en tiempo real
- [ ] Dashboard avanzado con analytics
- [ ] PWA (Progressive Web App)

**Largo plazo:**
- [ ] Multitenancy para múltiples instituciones
- [ ] API GraphQL complementaria
- [ ] Integración con sistemas LTI externos
- [ ] Mobile app nativa

## 📄 Información Técnica

### Tecnologías Utilizadas

- **Frontend**: Astro 4.x + React 18 + TailwindCSS
- **Backend**: Node.js 18+ + Express.js
- **Base de datos**: MariaDB 10.11
- **LMS**: Moodle 4.3.3 (Bitnami)
- **Proxy**: Nginx Alpine
- **Contenedores**: Docker + Docker Compose
- **Administración**: Adminer para gestión de BD

### Características de Seguridad

- ✅ Autenticación real con validación CSRF
- ✅ Sin hardcoded credentials en código
- ✅ Cookies seguras y HTTPOnly
- ✅ Headers de seguridad en Nginx
- ✅ Aislamiento de red entre contenedores
- ✅ Variables de entorno para credenciales

### Rendimiento y Escalabilidad

- ⚡ Frontend estático compilado (Astro)
- ⚡ Proxy inverso con cache (Nginx)
- ⚡ Conexiones persistentes a BD
- ⚡ Lazy loading de componentes React
- ⚡ Optimización de imágenes automática

## 📞 Soporte y Contribuciones

### Reportar Problemas

Para soporte técnico, crear un issue incluyendo:

- Descripción detallada del problema
- Logs relevantes (`docker compose logs`)
- Pasos para reproducir el error
- Información del entorno (OS, Docker version)
- Screenshots si es problema visual

### Contribuir al Proyecto

1. Fork del repositorio
2. Crear branch para la feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Add nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Desarrollo Local

```bash
# Clonar repositorio
git clone <repository-url>
cd astro-moodle

# Levantar servicios
docker compose up -d

# Ver logs de desarrollo
docker compose logs -f astro auth
```

---

**📧 Contacto**: Para consultas específicas, crear un issue en el repositorio del proyecto.

**📜 Licencia**: Este proyecto está bajo la Licencia MIT - ver `LICENSE` para detalles.
