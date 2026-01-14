#!/bin/bash

echo "🧪 Verificando instalación del proyecto..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Test 1: Node.js instalado
echo -n "1. Node.js instalado... "
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} ($VERSION)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 2: npm instalado
echo -n "2. npm instalado... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} (v$VERSION)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 3: Archivo .env existe
echo -n "3. Archivo .env configurado... "
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo -e "${YELLOW}   Crea un archivo .env con tus credenciales${NC}"
    ((FAILED++))
fi

# Test 4: node_modules existe
echo -n "4. Dependencias instaladas... "
if [ -d node_modules ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Ejecuta: npm install"
    ((FAILED++))
fi

# Test 5: Verificar conexión a Elasticsearch
echo -n "5. Conexión a Elasticsearch... "
if [ -d node_modules ]; then
    RESULT=$(node -e "import('./src/config/elasticsearch.js').then(m => m.verifyConnection()).catch(() => process.exit(1))" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo -e "${YELLOW}   Verifica credenciales en .env${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Instala dependencias primero"
    ((FAILED++))
fi

# Test 6: Puerto 3000 disponible
echo -n "6. Puerto 3000 disponible... "
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Puerto ocupado"
    echo -e "${YELLOW}   Cambia PORT en .env o detén el proceso${NC}"
else
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
fi

# Test 7: Estructura de directorios
echo -n "7. Estructura de directorios... "
if [ -d src/config ] && [ -d src/routes ] && [ -d src/services ] && [ -d src/scripts ] && [ -d src/utils ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 8: Archivos principales
echo -n "8. Archivos principales... "
MISSING=""
if [ ! -f src/index.js ]; then MISSING="$MISSING src/index.js"; fi
if [ ! -f src/config/elasticsearch.js ]; then MISSING="$MISSING src/config/elasticsearch.js"; fi
if [ ! -f src/services/customerService.js ]; then MISSING="$MISSING src/services/customerService.js"; fi

if [ -z "$MISSING" ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo -e "${YELLOW}   Faltan: $MISSING${NC}"
    ((FAILED++))
fi

# Resumen
echo ""
echo "════════════════════════════════════════"
echo "Resumen: $PASSED pasados, $FAILED fallidos"
echo "════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ ¡Todo listo!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Crear índices: ${GREEN}npm run setup${NC}"
    echo "  2. Generar datos: ${GREEN}npm run seed${NC}"
    echo "  3. Iniciar servidor: ${GREEN}npm start${NC}"
    echo "  4. Probar consultas: ${GREEN}npm run query${NC}"
    echo ""
else
    echo -e "${RED}⚠ Hay problemas que resolver${NC}"
    echo ""
    echo "Revisa los errores arriba y:"
    echo "  • Instala Node.js desde: https://nodejs.org/"
    echo "  • Ejecuta: ${GREEN}npm install${NC}"
    echo "  • Verifica .env con credenciales correctas"
    echo ""
fi

exit $FAILED
