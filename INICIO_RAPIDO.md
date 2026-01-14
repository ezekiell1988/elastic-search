# ⚡ Guía Rápida de Inicio

## 🎯 Objetivo
Demostrar cómo Elasticsearch puede identificar clientes inactivos mediante consultas complejas tipo: **"mujer, pepperoni, San José, ya no compra en 3 meses"**

## 🚀 Inicio Rápido (5 minutos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear índices en Elasticsearch
```bash
npm run setup
```

### 3. Generar datos de prueba
```bash
npm run seed
```
⏱️ Esto toma ~2-5 minutos y genera:
- 3,000 clientes
- ~24,000 facturas
- 150 productos

### 4. Iniciar servidor
```bash
npm start
```

### 5. Probar consultas
En otra terminal:
```bash
npm run query
```

## 📊 Demo para el Cliente

### Escenario 1: "Quiero mujeres de San José que compraban pepperoni y ya no compran"

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90,
    "size": 100
  }'
```

**Resultado**: Lista de clientes con:
- Nombre, teléfono, email
- Días sin comprar
- Total gastado históricamente
- Productos/ingredientes favoritos

### Escenario 2: "Búsqueda conversacional"

```bash
curl -X POST http://localhost:3000/api/customers/free-text-search \
  -H "Content-Type: application/json" \
  -d '{
    "searchText": "mujer pepperoni san jose 3 meses",
    "size": 50
  }'
```

### Escenario 3: "Dame un Excel con toda la lista"

```bash
curl -X POST http://localhost:3000/api/customers/export \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90
  }' \
  --output clientes_inactivos.xlsx
```

**Resultado**: Archivo Excel con:
- ✅ Lista completa de clientes
- ✅ Colores por nivel de inactividad
- ✅ Filtros automáticos
- ✅ Hoja de resumen con métricas

## 💡 Casos de Uso Adicionales

### Clientes VIP que dejaron de comprar
```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "customerSegment": "vip",
    "minDaysSinceLastPurchase": 60,
    "minTotalSpent": 300
  }'
```

### Estadísticas generales
```bash
curl http://localhost:3000/api/customers/inactive-stats
```

## 📈 Escalabilidad

### Para generar 800k clientes:

Edita `src/scripts/seed-data.js`:
```javascript
const NUM_CUSTOMERS_PER_COMPANY = 270000; // 270k * 3 = 810k
```

Luego:
```bash
npm run seed
```

⚠️ Esto tomará ~30-60 minutos dependiendo de tu conexión a Elasticsearch.

## 🎨 Características Destacadas

1. **Multi-compañía**: Datos aislados por empresa
2. **Identificación por teléfono**: Para clientes sin login
3. **Búsquedas sub-segundo**: Incluso con millones de registros
4. **Texto libre o estructurado**: Flexibilidad total
5. **Exportación lista**: Excel formateado para campañas

## 🔗 Endpoints Principales

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/customers/search` | Búsqueda avanzada con filtros |
| `POST /api/customers/free-text-search` | Búsqueda conversacional |
| `POST /api/customers/export` | Exportar a Excel |
| `GET /api/customers/inactive-stats` | Estadísticas agregadas |
| `GET /api/customers/:id` | Detalles de cliente específico |

## 🐛 Troubleshooting

### Error de conexión a Elasticsearch
1. Verifica `.env` tiene las credenciales correctas
2. Prueba la conexión: `node -e "import('./src/config/elasticsearch.js').then(m => m.verifyConnection())"`

### Índices ya existen
```bash
# Eliminar índices viejos
curl -X DELETE "https://tu-cluster.elastic.co/customers"
curl -X DELETE "https://tu-cluster.elastic.co/invoices"
curl -X DELETE "https://tu-cluster.elastic.co/products"

# Recrear
npm run setup
```

### Puerto 3000 ocupado
Cambia en `.env`:
```
PORT=3001
```

## 📚 Más Información

- [README completo](README.md)
- [Ejemplos de consultas](EJEMPLOS_CONSULTAS.md)
- [Colección Postman](postman-collection.json)

## 🎯 Próximos Pasos

1. ✅ Probar con datos de prueba
2. ⬜ Integrar con datos reales
3. ⬜ Configurar envío de emails
4. ⬜ Dashboard de visualización
5. ⬜ Automatización de campañas

---

**¿Preguntas?** Revisa el [README](README.md) o contacta al equipo.
