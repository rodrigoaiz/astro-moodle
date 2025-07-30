# Astro + Moodle Integration Platform

Una plataforma educativa moderna que integra un frontend desarrollado en Astro con Moodle LMS, utilizando Docker para una implementación robusta y escalable.

## 🚀 Características

- **Frontend moderno**: Interfaz desarrollada en Astro para mejor rendimiento
- **LMS robusto**: Moodle 4.3.3 para gestión de aprendizaje
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
.
├── astro                 # Código fuente y Dockerfile del frontend Astro
├── auth                  # Código fuente y Dockerfile del servicio de autenticación
├── data                  # (Opcional) Scripts SQL iniciales para la DB
├── docker-compose.yml    # Orquestación de contenedores Docker
├── logs                  # Logs persistentes de Nginx (acceso y errores)
├── moodle-extra-config   # Configuración adicional para Moodle (wwwroot, proxy)
└── nginx                 # Configuración personalizada de Nginx
