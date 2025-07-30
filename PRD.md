# PRD.md (Product Requirements Document)

## Documento de Requisitos del Producto (PRD): Plataforma Web Integrada Astro + Moodle

## 1. Visión General

### 1.1 Nombre del Producto

Plataforma Web Integrada Astro + Moodle

### 1.2 Objetivo

Desarrollar una plataforma web que combine un sitio institucional moderno y atractivo (Astro) con un robusto sistema de gestión de aprendizaje (Moodle), permitiendo una experiencia de usuario unificada y facilitando el acceso a contenidos educativos.

### 1.3 Alcance

Este proyecto cubre el diseño, desarrollo, implementación y despliegue de la infraestructura base de la plataforma utilizando contenedores Docker. Incluye la integración básica entre el frontend y el backend LMS, específicamente en cuanto al enrutamiento y la autenticación.

## 2. Objetivos del Producto

* **Principal:** Proveer una infraestructura escalable y mantenible para alojar un sitio web institucional con un LMS integrado.
* **Secundarios:**
  * Facilitar el despliegue mediante Docker.
  * Aislar los servicios (Astro, Moodle, DB) para mejorar la seguridad y el mantenimiento.
  * Exponer los servicios a través de puertos específicos y controlados.
  * Garantizar que Moodle funcione correctamente detrás de un proxy inverso.
  * Establecer una base para futuras integraciones de autenticación unificada.

## 3. Usuarios Objetivo

* **Administradores del Sitio:** Personal técnico encargado de gestionar el contenido del sitio y el LMS.
* **Usuarios Finales/Estudiantes:** Personas que acceden al sitio para obtener información y participar en cursos o actividades del LMS.

## 4. Requisitos Funcionales

### 4.1 Infraestructura y Despliegue

* **RF-1:** El sistema DEBE estar completamente dockerizado.
* **RF-2:** DEBE utilizar `docker compose` para orquestar los servicios.
* **RF-3:** DEBE exponer solo los puertos estrictamente necesarios (4324, 4325).
* **RF-4:** DEBE persistir los datos del LMS y la base de datos en volúmenes Docker.

### 4.2 Servicios

* **RF-5:** DEBE incluir un contenedor para el frontend Astro.
* **RF-6:** DEBE incluir un contenedor para el LMS Moodle (Bitnami).
* **RF-7:** DEBE incluir un contenedor para la base de datos MariaDB (Bitnami).
* **RF-8:** DEBE incluir un contenedor Nginx como proxy inverso.
* **RF-9:** DEBE incluir un contenedor para un servicio de autenticación simple.
* **RF-10:** DEBE incluir un contenedor para Adminer (gestión de DB).

### 4.3 Enrutamiento y Acceso

* **RF-11:** El proxy inverso (Nginx) DEBE enrutar `/` al frontend Astro.
* **RF-12:** El proxy inverso (Nginx) DEBE enrutar `/learning` al LMS Moodle.
* **RF-13:** El proxy inverso (Nginx) DEBE enrutar `/api` al servicio de autenticación.
* **RF-14:** El LMS Moodle DEBE ser accesible públicamente en `http://<host>:4324/learning`.
* **RF-15:** La herramienta de administración de DB DEBE ser accesible en `http://<host>:4325`.

### 4.4 Configuración y Funcionalidad

* **RF-16:** Moodle DEBE configurarse automáticamente para funcionar correctamente detrás del proxy Nginx (manejo de `wwwroot`, puertos, paths).
* **RF-17:** El servicio de autenticación DEBE poder verificar si una sesión de Moodle es válida (consultando la DB).
* **RF-18:** El frontend Astro DEBE poder consumir el endpoint del servicio de autenticación (`/api/me`).

## 5. Requisitos No Funcionales

* **RNF-1:** Seguridad: Los servicios internos (Astro, Auth, Moodle interno, DB) NO DEBEN ser accesibles directamente desde el exterior.
* **RNF-2:** Rendimiento: La arquitectura DEBE permitir escalar componentes individualmente en el futuro.
* **RNF-3:** Mantenibilidad: La estructura del proyecto DEBE ser clara y modular.
* **RNF-4:** Disponibilidad: El sistema DEBE reiniciar automáticamente los contenedores en caso de fallos menores.

## 6. Suposiciones y Dependencias

* El entorno de despliegue tiene Docker y Docker Compose instalados.
* Se cuenta con una IP pública o dominio configurado para acceder al servicio.
* El desarrollo inicial del frontend Astro será estático o con SSR básico.

## 7. Hitos

* **Hito 1:** ✅ **COMPLETADO** - Infraestructura base Dockerizada y funcional.
* **Hito 2:** ✅ **COMPLETADO** - Moodle instalado, configurado y accesible en `/learning` con estilos.
  * ✅ Moodle 4.3.3 instalado y funcionando
  * ✅ Accesible en `/learning` con navegación completa
  * ✅ Estilos, CSS, JavaScript y assets funcionando correctamente
  * ✅ Arquitectura de proxy nginx optimizada
  * ✅ Credenciales: admin/admin123
* **Hito 3:** 🚧 **EN PROGRESO** - Frontend Astro accesible en `/` y conectado al servicio de autenticación.
* **Hito 4:** ⏳ **PENDIENTE** - Documentación del proyecto (README) y requisitos (PRD) completada.

## 8. Estado Actual del Proyecto

### ✅ Completado

* Infraestructura Docker completa funcionando
* Todos los servicios levantados y comunicándose
* Base de datos MariaDB configurada y saludable
* Moodle 4.3.3 instalado exitosamente
* Proxy inverso Nginx funcionando
* Enrutamiento configurado (`/` → astro, `/learning` → moodle, `/api` → auth)
* Adminer accesible en puerto 4325
* **Moodle completamente funcional en `/learning` con estilos y assets**
* **Configuración de proxy nginx para assets de Moodle**
* **Arquitectura híbrida robusta: nginx captura URLs transparentemente**

### 🚧 En Proceso

* Desarrollo del frontend Astro
* Configuración de autenticación unificada

### ⏳ Pendiente

* Integración completa del frontend Astro con el backend
* Pruebas de integración completas
* Documentación final

## 9. Arquitectura Final Implementada

### Infraestructura de Contenedores
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

### Enrutamiento Nginx
* **`/`** → Frontend Astro (Puerto 3000)
* **`/learning/`** → Moodle LMS (Puerto 8080)
* **`/api/`** → Servicio de Autenticación (Puerto 3000)
* **Assets Moodle**: `/theme/`, `/lib/`, `/pix/`, `/login/`, `/admin/`, etc. → Moodle LMS

### URLs Operativas
* **Frontend Principal**: http://132.248.218.76:4324/
* **Moodle LMS**: http://132.248.218.76:4324/learning/
* **API Auth**: http://132.248.218.76:4324/api/
* **Adminer DB**: http://132.248.218.76:4325/

### Credenciales de Acceso
* **Moodle Admin**: `admin` / `admin123`
* **Base de Datos**: `moodle` / `moodle_pass`
* **Root DB**: `root` / `root_pass`
