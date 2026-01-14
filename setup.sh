#!/bin/bash

echo "🚀 Configurando Demo de Reactivación de Clientes"
echo "================================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Instala desde: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

echo ""
echo "✅ Dependencias instaladas"
echo ""

# Verificar .env
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado"
    echo "   Crea un archivo .env con:"
    echo "   ELASTIC_SEARCH_ENDPOINT=tu_endpoint"
    echo "   ELASTIC_SEARCH_API_KEY=tu_api_key"
    exit 1
fi

echo "✅ Archivo .env configurado"
echo ""

# Setup de índices
echo "🔧 Creando índices en Elasticsearch..."
npm run setup

if [ $? -ne 0 ]; then
    echo "❌ Error creando índices"
    echo "   Verifica tus credenciales en .env"
    exit 1
fi

echo ""
echo "✅ Índices creados"
echo ""

# Preguntar si quiere generar datos
echo "¿Deseas generar datos de prueba ahora? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "🌱 Generando datos de prueba..."
    echo "   Esto puede tomar varios minutos..."
    npm run seed
    
    if [ $? -ne 0 ]; then
        echo "❌ Error generando datos"
        exit 1
    fi
    
    echo ""
    echo "✅ Datos generados exitosamente"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "✨ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "  1. Iniciar servidor: npm start"
echo "  2. Probar consultas: npm run query"
echo "  3. Usar API: http://localhost:3000"
echo ""
echo "📖 Ver README.md para más información"
echo "════════════════════════════════════════════════"
