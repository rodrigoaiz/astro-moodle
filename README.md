# Astro + Moodle Docker Stack

Este proyecto proporciona un entorno Dockerizado para ejecutar un sitio web moderno con:

* **Frontend:** [Astro](https://astro.build/) (sitio estático o con SSR).
* **Backend LMS:** [Moodle](https://moodle.org/) para gestión de aprendizaje.
* **Autenticación:** Un servicio Node.js simple para verificar sesiones de Moodle.
* **Base de Datos:** MariaDB administrada por Bitnami.
* **Proxy Inverso:** Nginx para enrutar solicitudes y exponer servicios en puertos específicos.
* **Herramienta de Administración:** Adminer para gestionar la base de datos.

Ideal para integrar un sitio institucional moderno con un LMS sin necesidad de configuraciones complejas manuales.

## 🚀 Inicio Rápido

1. **Clona el repositorio:**

    ```bash
    git clone <tu-repo-url>
    cd <nombre-del-repo>
    ```

2. **Construye y ejecuta los contenedores:**

    ```bash
    docker compose up -d
    ```

3. **Accede a los servicios:**
    * **Sitio Astro:** `http://<tu-ip>:4324`
    * **Moodle:** `http://<tu-ip>:4324/learning`
    * **Adminer (DB):** `http://<tu-ip>:4325`

4. **Instala Moodle:** En tu primer acceso a `http://<tu-ip>:4324/learning`, sigue el instalador de Moodle para configurar el sitio y crear el usuario administrador.

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
