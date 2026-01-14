#!/bin/bash

# ==============================================================================
# Script de Configuración del Servidor para Elasticsearch API
# ==============================================================================
# Ejecutar en el servidor: bash setup-server.sh
# ==============================================================================

set -e

echo "=========================================="
echo "🚀 Configuración del Servidor"
echo "=========================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/home/azureuser/projects/elasticsearch-api"
NGINX_CONF="/etc/nginx/sites-available/elastic-search.ezekl.com"
SSL_DIR="/etc/nginx/ssl/elastic-search.ezekl.com"

# ==============================================================================
# 1. Verificar requisitos
# ==============================================================================
echo -e "\n${YELLOW}[1/8]${NC} Verificando requisitos..."

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado${NC}"
else
    echo -e "${GREEN}✅ Docker ya está instalado${NC}"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Nginx no está instalado${NC}"
    echo "Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✅ Nginx instalado${NC}"
else
    echo -e "${GREEN}✅ Nginx ya está instalado${NC}"
fi

# ==============================================================================
# 2. Crear directorios del proyecto
# ==============================================================================
echo -e "\n${YELLOW}[2/8]${NC} Creando estructura de directorios..."

sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
mkdir -p $PROJECT_DIR/{exports,logs}

echo -e "${GREEN}✅ Directorios creados${NC}"

# ==============================================================================
# 3. Configurar SSL
# ==============================================================================
echo -e "\n${YELLOW}[3/8]${NC} Configurando SSL..."

sudo mkdir -p $SSL_DIR
sudo chmod 700 $SSL_DIR

echo -e "${YELLOW}ℹ️  Los certificados deben copiarse manualmente:${NC}"
echo "   1. Desde tu máquina local, ejecuta:"
echo "      scp -i certs/id_rsa.pem certs/clickeat.cer azureuser@172.191.128.24:/tmp/origin-cert.pem"
echo "      scp -i certs/id_rsa.pem certs/clickeat.key azureuser@172.191.128.24:/tmp/origin-key.pem"
echo ""
echo "   2. Luego, en el servidor, ejecuta:"
echo "      sudo mv /tmp/origin-cert.pem $SSL_DIR/"
echo "      sudo mv /tmp/origin-key.pem $SSL_DIR/"
echo "      sudo chmod 644 $SSL_DIR/origin-cert.pem"
echo "      sudo chmod 600 $SSL_DIR/origin-key.pem"
echo "      sudo chown root:root $SSL_DIR/*"
echo ""
read -p "Presiona ENTER cuando hayas copiado los certificados..."

# Verificar certificados
if [ -f "$SSL_DIR/origin-cert.pem" ] && [ -f "$SSL_DIR/origin-key.pem" ]; then
    echo -e "${GREEN}✅ Certificados SSL configurados${NC}"
else
    echo -e "${RED}❌ Certificados SSL no encontrados${NC}"
    exit 1
fi

# ==============================================================================
# 4. Configurar Nginx
# ==============================================================================
echo -e "\n${YELLOW}[4/8]${NC} Configurando Nginx..."

echo -e "${YELLOW}ℹ️  La configuración de Nginx debe copiarse manualmente:${NC}"
echo "   1. Desde tu máquina local, ejecuta:"
echo "      scp -i certs/id_rsa.pem certs/elastic-search.ezekl.com.nginx.conf azureuser@172.191.128.24:/tmp/"
echo ""
echo "   2. Luego, en el servidor, ejecuta:"
echo "      sudo mv /tmp/elastic-search.ezekl.com.nginx.conf $NGINX_CONF"
echo ""
read -p "Presiona ENTER cuando hayas copiado la configuración de Nginx..."

# Crear symlink
if [ -f "$NGINX_CONF" ]; then
    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    echo -e "${GREEN}✅ Symlink creado${NC}"
else
    echo -e "${RED}❌ Configuración de Nginx no encontrada${NC}"
    exit 1
fi

# Verificar configuración
echo "Verificando configuración de Nginx..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuración de Nginx válida${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recargado${NC}"
else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
    exit 1
fi

# ==============================================================================
# 5. Configurar Firewall
# ==============================================================================
echo -e "\n${YELLOW}[5/8]${NC} Configurando firewall..."

sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Solo habilitar si no está activo
if ! sudo ufw status | grep -q "Status: active"; then
    echo "Habilitando firewall..."
    echo "y" | sudo ufw enable
fi

echo -e "${GREEN}✅ Firewall configurado${NC}"
sudo ufw status verbose

# ==============================================================================
# 6. Verificar Docker Network
# ==============================================================================
echo -e "\n${YELLOW}[6/8]${NC} Verificando Docker..."

# Verificar que Docker está corriendo
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker no está corriendo, iniciando...${NC}"
    sudo systemctl start docker
    sleep 2
fi

echo -e "${GREEN}✅ Docker funcionando correctamente${NC}"

# ==============================================================================
# 7. Crear archivo .env de ejemplo
# ==============================================================================
echo -e "\n${YELLOW}[7/8]${NC} Creando archivo .env de ejemplo..."

cat > $PROJECT_DIR/.env.example << 'EOF'
# Elasticsearch Configuration
ELASTIC_SEARCH_ENDPOINT=https://your-cluster.es.region.cloud.elastic.co:443
ELASTIC_SEARCH_API_KEY=your-api-key-base64

# Server Configuration
NODE_ENV=production
PORT=9002
EOF

echo -e "${GREEN}✅ Archivo .env.example creado en $PROJECT_DIR${NC}"
echo -e "${YELLOW}⚠️  Recuerda configurar el archivo .env con tus credenciales reales${NC}"

# ==============================================================================
# 8. Resumen
# ==============================================================================
echo -e "\n=========================================="
echo -e "${GREEN}✅ Configuración Completada${NC}"
echo "=========================================="
echo ""
echo "📋 Resumen:"
echo "  - Directorio del proyecto: $PROJECT_DIR"
echo "  - Nginx configurado: $NGINX_CONF"
echo "  - SSL configurado: $SSL_DIR"
echo "  - Firewall activo: 22, 80, 443"
echo ""
echo "🔧 Próximos pasos:"
echo "  1. Configurar GitHub Secrets en tu repositorio"
echo "  2. Editar $PROJECT_DIR/.env con tus credenciales"
echo "  3. Hacer push a main para iniciar deployment automático"
echo ""
echo "📝 Comandos útiles:"
echo "  - Ver logs de Nginx: sudo tail -f /var/log/nginx/elastic-search.ezekl.com-error.log"
echo "  - Ver contenedores: docker ps"
echo "  - Ver logs del contenedor: docker logs elasticsearch-api-blue"
echo ""
echo "🌐 URLs:"
echo "  - Producción: https://elastic-search.ezekl.com"
echo "  - Health: https://elastic-search.ezekl.com/health"
echo ""
echo "=========================================="
