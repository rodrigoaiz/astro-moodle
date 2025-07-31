#!/bin/bash

# Script para reconstruir Astro automáticamente
# Autor: GitHub Copilot
# Fecha: $(date +"%Y-%m-%d")

# Colores para output bonito
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

# Función para mostrar banner
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                     🚀 ASTRO REBUILD SCRIPT 🚀                   ║"
    echo "║                                                                  ║"
    echo "║            Automatiza la reconstrucción de Astro                ║"
    echo "║                     con Docker Compose                          ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para mostrar spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Función para mostrar progreso
show_progress() {
    local step=$1
    local total=$2
    local message=$3
    local percentage=$((step * 100 / total))

    echo -e "\n${CYAN}═══ Paso $step/$total ═══${NC}"
    echo -e "${BLUE}▶ $message${NC}"

    # Barra de progreso
    local filled=$((percentage / 5))
    local empty=$((20 - filled))
    printf "${GREEN}["
    for ((i=1; i<=filled; i++)); do printf "█"; done
    for ((i=1; i<=empty; i++)); do printf "░"; done
    printf "] %d%%${NC}\n" $percentage
}

# Función para verificar si estamos en el directorio correcto
check_directory() {
    if [[ ! -f "docker-compose.yml" ]] || [[ ! -d "astro" ]]; then
        echo -e "${RED}❌ Error: Este script debe ejecutarse desde el directorio raíz del proyecto astro-moodle${NC}"
        echo -e "${YELLOW}💡 Asegúrate de estar en: /home/rodrigo/astro-moodle${NC}"
        exit 1
    fi
}

# Función para verificar Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Error: Docker no está instalado${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Error: Docker no está ejecutándose${NC}"
        exit 1
    fi
}

# Función principal de reconstrucción
rebuild_astro() {
    show_banner

    echo -e "${YELLOW}🔍 Verificando prerrequisitos...${NC}"
    check_directory
    check_docker
    echo -e "${GREEN}✅ Todos los prerrequisitos están listos${NC}"

    # Paso 1: Construcción de archivos estáticos
    show_progress 1 4 "Construyendo archivos estáticos de Astro"
    echo -e "${CYAN}📦 Ejecutando: npm run build${NC}"

    cd astro
    if npm run build; then
        echo -e "${GREEN}✅ Build de Astro completado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error en el build de Astro${NC}"
        exit 1
    fi
    cd ..

    # Paso 2: Reconstrucción de imagen Docker
    show_progress 2 4 "Reconstruyendo imagen Docker"
    echo -e "${CYAN}🐳 Ejecutando: docker compose build --no-cache astro${NC}"

    if docker compose build --no-cache astro; then
        echo -e "${GREEN}✅ Imagen Docker reconstruida exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al reconstruir imagen Docker${NC}"
        exit 1
    fi

    # Paso 3: Levantando contenedor
    show_progress 3 4 "Levantando contenedor actualizado"
    echo -e "${CYAN}🚀 Ejecutando: docker compose up astro -d${NC}"

    if docker compose up astro -d; then
        echo -e "${GREEN}✅ Contenedor levantado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al levantar contenedor${NC}"
        exit 1
    fi

    # Paso 4: Verificación
    show_progress 4 4 "Verificando el funcionamiento"
    echo -e "${CYAN}🔎 Verificando disponibilidad del frontend...${NC}"

    sleep 3  # Dar tiempo al contenedor para inicializar

    if curl -s -o /dev/null -w "%{http_code}" http://132.248.218.76:4324/ | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend disponible en http://132.248.218.76:4324/${NC}"
    else
        echo -e "${YELLOW}⚠️ El frontend podría tardar unos segundos más en estar disponible${NC}"
    fi

    # Mostrar estado final
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 ¡RECONSTRUCCIÓN COMPLETADA EXITOSAMENTE! 🎉${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"

    echo -e "\n${CYAN}📊 Información del sistema:${NC}"
    echo -e "${BLUE}🌐 Frontend:${NC} http://132.248.218.76:4324/"
    echo -e "${BLUE}🔐 API Auth:${NC} http://132.248.218.76:4324/api/auth"
    echo -e "${BLUE}📚 Moodle:${NC} http://132.248.218.76:4324/learning/"

    echo -e "\n${YELLOW}💡 Comandos útiles:${NC}"
    echo -e "${BLUE}• Ver logs del contenedor:${NC} docker compose logs astro -f"
    echo -e "${BLUE}• Reiniciar solo astro:${NC} docker compose restart astro"
    echo -e "${BLUE}• Ver estado:${NC} docker compose ps"

    echo -e "\n${GREEN}🚀 ¡Listo para usar!${NC}\n"
}

# Función para mostrar ayuda
show_help() {
    echo -e "${CYAN}Uso: $0 [OPCIÓN]${NC}"
    echo -e "${BLUE}Opciones:${NC}"
    echo -e "  ${GREEN}rebuild${NC}  Reconstruir Astro (por defecto)"
    echo -e "  ${GREEN}help${NC}     Mostrar esta ayuda"
    echo -e "  ${GREEN}status${NC}   Mostrar estado de contenedores"
    echo ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo -e "  $0           # Reconstruir Astro"
    echo -e "  $0 rebuild   # Reconstruir Astro"
    echo -e "  $0 status    # Ver estado"
    echo -e "  $0 help      # Mostrar ayuda"
}

# Función para mostrar estado
show_status() {
    echo -e "${CYAN}📊 Estado de contenedores Docker:${NC}\n"
    docker compose ps

    echo -e "\n${CYAN}🌐 Verificando conectividad:${NC}"

    # Verificar frontend
    if curl -s -o /dev/null -w "%{http_code}" http://132.248.218.76:4324/ | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend:${NC} http://132.248.218.76:4324/ - ${GREEN}ACTIVO${NC}"
    else
        echo -e "${RED}❌ Frontend:${NC} http://132.248.218.76:4324/ - ${RED}NO DISPONIBLE${NC}"
    fi

    # Verificar API
    if curl -s -o /dev/null -w "%{http_code}" http://132.248.218.76:4324/api/auth | grep -q "200"; then
        echo -e "${GREEN}✅ API Auth:${NC} http://132.248.218.76:4324/api/auth - ${GREEN}ACTIVA${NC}"
    else
        echo -e "${RED}❌ API Auth:${NC} http://132.248.218.76:4324/api/auth - ${RED}NO DISPONIBLE${NC}"
    fi

    # Verificar Moodle
    if curl -s -o /dev/null -w "%{http_code}" http://132.248.218.76:4324/learning/ | grep -q "200"; then
        echo -e "${GREEN}✅ Moodle:${NC} http://132.248.218.76:4324/learning/ - ${GREEN}ACTIVO${NC}"
    else
        echo -e "${RED}❌ Moodle:${NC} http://132.248.218.76:4324/learning/ - ${RED}NO DISPONIBLE${NC}"
    fi
}

# Función principal
main() {
    case "${1:-rebuild}" in
        "rebuild")
            rebuild_astro
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Opción no reconocida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal con todos los argumentos
main "$@"
