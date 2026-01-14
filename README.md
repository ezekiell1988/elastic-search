# 🎯 Sistema de Reactivación de Clientes - ClickEat Database

Sistema completo para migrar, analizar y reactivar clientes inactivos usando Elasticsearch. Incluye migración masiva desde SQL Server, validación de datos y análisis avanzado de comportamiento de clientes.

---

## ⚡ Quick Start

### Opción A: Migración desde SQL Server (ClickEat)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env con credenciales SQL Server y Elasticsearch
cp .env.example .env

# 3. Ver estructura de base de datos
npm run sql sql-queries/get-schema.sql

# 4. Migración rápida (pruebas: 1K clientes, 5K órdenes)
npm run migrate:simple

# 5. Validar datos migrados
npm run migrate:validate

# 6. Análisis de reactivación de clientes
npm run query:reactivation
```

### Opción B: Demo con Datos Sintéticos

```bash
# 1. Instalar dependencias
npm install

# 2. Crear índices
npm run setup

# 3. Generar 800K+ clientes de prueba
npm run seed

# 4. Iniciar servidor web
npm start

# 5. Probar consultas
npm run query
```

---

## 🌟 Características Principales

### 🔄 Migración de Datos
- ✅ **Migración masiva** desde SQL Server (773K clientes, 1M+ órdenes)
- ✅ **Sistema de checkpoints** para reanudar migraciones interrumpidas
- ✅ **Validación automática** de integridad de datos
- ✅ **Batching optimizado** (5K SQL → 1K ES con reintentos)

### 📊 Análisis de Clientes
- ✅ **Última compra por cliente** con días de inactividad
- ✅ **Segmentación automática** (Activos, En Riesgo, Inactivos, Perdidos)
- ✅ **Detección de VIPs en riesgo** (alto valor + inactivos)
- ✅ **Top clientes por valor** con estado de actividad
- ✅ **Recomendaciones de campaña** automáticas

### 🔍 Búsquedas Avanzadas
- ✅ **Búsquedas complejas** con múltiples filtros
- ✅ **Búsqueda de texto libre** (conversacional)
- ✅ **Filtros por género, ubicación, productos, rango de fechas**
- ✅ **Exportación a Excel** con formato y resumen

### 🛠️ Herramientas
- ✅ **Ejecutor de scripts SQL** con soporte para delimiter GO
- ✅ **API REST** completa para integraciones
- ✅ **Base de datos multicompañía**
- ✅ **Identificación por teléfono** para usuarios no logueados

---

## 📚 Documentación Completa

### Guías Principales
- **[RESUMEN_SISTEMA.md](RESUMEN_SISTEMA.md)** - 📌 Resumen completo del sistema y estado actual
- **[REACTIVACION_CLIENTES.md](REACTIVACION_CLIENTES.md)** - 🎯 Guía completa del sistema de reactivación
- **[MIGRACION_MASIVA.md](MIGRACION_MASIVA.md)** - 🔄 Migración de millones de registros
- **[MAPEO_COLUMNAS.md](MAPEO_COLUMNAS.md)** - 📋 Mapeo SQL Server → Elasticsearch

### Guías Rápidas
- **[GUIA_RAPIDA.md](GUIA_RAPIDA.md)** - Inicio rápido con datos sintéticos
- **[MIGRACION_CLICKEAT.md](MIGRACION_CLICKEAT.md)** - Migración desde ClickEat DB
- **[EJEMPLOS_CONSULTAS.md](EJEMPLOS_CONSULTAS.md)** - Ejemplos de consultas

---

## 🚀 Comandos Disponibles

### Análisis de Base de Datos (SQL Server)
```bash
npm run sql sql-queries/get-schema.sql        # Ver estructura de tablas
npm run sql sql-queries/get-sample-data.sql   # Ver datos de muestra
npm run sql sql-queries/test-columns.sql      # Verificar columnas
```

### Migración desde SQL Server
```bash
npm run migrate:simple      # Migración rápida (1K clientes, 5K órdenes)
npm run migrate:full        # Migración completa (773K clientes, 1M+ órdenes)
npm run migrate:resume      # Reanudar migración interrumpida
npm run migrate:validate    # Validar datos migrados vs SQL Server
```

### Consultas y Análisis
```bash
npm run query:clickeat      # Consultas generales sobre datos migrados
npm run query:reactivation  # ⭐ Análisis completo de reactivación de clientes
```

### Demo con Datos Sintéticos
```bash
npm run setup               # Crear índices de demo
npm run seed                # Generar datos de prueba (800K+ clientes)
npm run query               # Probar consultas de demo
npm start                   # Iniciar servidor web demo (puerto 3000)
```

---

## 📊 Sistema de Reactivación de Clientes

El sistema incluye **5 consultas especializadas** para identificar y reactivar clientes:

### 1️⃣ Última Compra por Cliente
```bash
npm run query:reactivation
```

Muestra los clientes más recientes con:
- Fecha de última compra
- Días de inactividad
- Total de órdenes
- Monto total gastado
- Código de colores: 🟢 Activo | 🟡 En Riesgo | 🔴 Inactivo

### 2️⃣ Clientes Inactivos
Identifica clientes que no han comprado en más de X días (configurable).

**Salida de ejemplo:**
```
⚠️  CLIENTES INACTIVOS (Más de 30 días)
Total: 15,234 clientes

ID      │ Nombre               │ Días │ Órdenes │ Gasto Total
98765   │ Carlos Ramírez       │  137 │     28  │ ₡520,000
54321   │ Ana López            │  101 │     15  │ ₡380,000
```

### 3️⃣ Segmentación Automática
Divide clientes en 4 segmentos:
- 🟢 **Activos (0-30 días)** - Clientes recientes
- 🟡 **En Riesgo (30-90 días)** - Necesitan campaña de retención
- 🔴 **Inactivos (90-180 días)** - Necesitan reactivación
- ⚫ **Perdidos (+180 días)** - Necesitan reconquista

Incluye **recomendaciones automáticas** de campaña para cada segmento.

### 4️⃣ Top Clientes por Valor
Identifica los 20 clientes más valiosos y su estado de actividad:
- Total gastado histórico
- Número de órdenes
- Ticket promedio
- Días desde última compra

### 5️⃣ Clientes VIP en Riesgo 🚨
**ALERTA CRÍTICA**: Detecta clientes de alto valor (>₡500,000) que llevan más de 45 días sin comprar.

**Acciones recomendadas:**
- Contacto personalizado por gerente
- Descuento VIP exclusivo 30%
- Regalo especial en próxima compra

---

## 🎯 Estrategias de Campaña

### Para Clientes en Riesgo (30-90 días)
```
📧 Email: "Te extrañamos, [Nombre]"
💰 Oferta: 15-20% de descuento
⏰ Urgencia: Válido por 7 días
```

### Para Clientes Inactivos (90-180 días)
```
📧 Email: "¡Vuelve y recibe un regalo!"
💰 Oferta: 25% descuento + envío gratis
🎁 Bonus: Producto favorito con descuento adicional
⏰ Urgencia: Válido por 5 días
```

### Para Clientes Perdidos (+180 días)
```
📧 Email: "¿Qué pasó? Queremos mejorar"
📋 Encuesta: Formulario de satisfacción
💰 Oferta: 30-40% descuento en todo
🎁 Regalo: Producto gratis en compra mínima
⏰ Urgencia: Oferta única por 3 días
```

### Para VIPs en Riesgo
```
📞 Llamada: Contacto personal del gerente
💰 Oferta: Descuento VIP exclusivo 30%
🎁 Regalo: Producto premium gratis
🌟 Beneficio: Acceso anticipado a nuevos productos
```

---

## 📋 Requisitos

- Node.js 18+
- SQL Server (para migración desde ClickEat)
- Elasticsearch Cloud o local configurado
- Archivo `.env` con credenciales

---

## ⚙️ Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` con:

```env
# Elasticsearch
ELASTIC_CLOUD_ID=your-cloud-id
ELASTIC_API_KEY=your-api-key

# SQL Server (para migración ClickEat)
DB_HOST_CLICKEAT=138.59.16.150
DB_PORT_CLICKEAT=1433
DB_DATABASE_CLICKEAT=dev_clickeat
DB_USER_CLICKEAT=your-user
DB_PASSWORD_CLICKEAT=your-password
```

### 3. Opción A: Migrar desde SQL Server

### 3. Opción A: Migrar desde SQL Server

```bash
# Ver estructura de la base de datos
npm run sql sql-queries/get-schema.sql

# Migración rápida de prueba
npm run migrate:simple

# Validar datos
npm run migrate:validate

# Análisis de reactivación
npm run query:reactivation
```

### 3. Opción B: Generar Datos de Demo

```bash
# Crear índices
npm run setup

# Generar datos (puede tomar varios minutos)
npm run seed
```

Este comando crea tres índices:
- `customers` - Clientes con estadísticas agregadas
- `invoices` - Facturas (encabezado)
- `products` - Catálogo de productos

Por defecto genera:
- **1,000 clientes** por compañía (3 compañías = 3,000 clientes)
- **~8 facturas** promedio por cliente
- **50 productos** por compañía

**Para generar más datos** (800k clientes), edita `src/scripts/seed-data.js`:

```javascript
const NUM_CUSTOMERS_PER_COMPANY = 270000; // 270k * 3 = 810k clientes
```

## 🔍 Uso

### Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Probar consultas

```bash
npm run query
```

Este script ejecuta consultas de ejemplo y muestra los resultados.

## 📡 API Endpoints

### 1. Búsqueda Avanzada

**POST** `/api/customers/search`

Búsqueda estructurada con filtros específicos.

**Request:**
```json
{
  "gender": "mujer",
  "city": "San José",
  "ingredients": ["pepperoni"],
  "products": ["Pizza Pepperoni"],
  "minDaysSinceLastPurchase": 90,
  "maxDaysSinceLastPurchase": 180,
  "companyId": "COMP001",
  "customerSegment": "regular",
  "minTotalSpent": 50,
  "from": 0,
  "size": 100,
  "sortBy": "days_since_last_purchase",
  "sortOrder": "desc"
}
```

**Response:**
```json
{
  "total": 1523,
  "customers": [
    {
      "customer_id": "COMP001-+50612345678",
      "name": "María González",
      "phone": "+50612345678",
      "email": "maria@example.com",
      "gender": "mujer",
      "city": "San José",
      "days_since_last_purchase": 125,
      "total_purchases": 15,
      "total_spent": 450.75,
      "favorite_products": ["Pizza Pepperoni", "Pizza Hawaiana"],
      "favorite_ingredients": ["pepperoni", "jamón", "piña"]
    }
  ],
  "took": 45
}
```

### 2. Búsqueda de Texto Libre

**POST** `/api/customers/free-text-search`

Búsqueda conversacional - escribe como hablarías.

**Request:**
```json
{
  "searchText": "mujer pepperoni san jose",
  "minDaysSinceLastPurchase": 90,
  "from": 0,
  "size": 50
}
```

### 3. Estadísticas de Inactivos

**GET** `/api/customers/inactive-stats?companyId=COMP001`

Obtiene agregaciones y estadísticas de clientes inactivos.

**Response:**
```json
{
  "total": 5420,
  "aggregations": {
    "by_gender": {
      "buckets": [
        { "key": "mujer", "doc_count": 2710 },
        { "key": "hombre", "doc_count": 2650 }
      ]
    },
    "by_city": {
      "buckets": [
        { "key": "San José", "doc_count": 1250 },
        { "key": "Alajuela", "doc_count": 980 }
      ]
    },
    "top_favorite_products": {
      "buckets": [
        { "key": "Pizza Pepperoni", "doc_count": 3210 }
      ]
    }
  }
}
```

### 4. Detalles de Cliente

**GET** `/api/customers/:customerId`

Obtiene información completa de un cliente y sus últimas facturas.

### 5. Exportar a Excel

**POST** `/api/customers/export`

Usa los mismos parámetros que `/search` o `/free-text-search`.

**Ejemplo con curl:**
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

El archivo Excel incluye:
- ✅ Lista completa de clientes con todos los datos
- ✅ Formato condicional (colores por nivel de inactividad)
- ✅ Filtros automáticos
- ✅ Hoja de resumen con métricas clave

## 🎯 Casos de Uso

### Caso 1: Clientes que compraban pepperoni

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90,
    "size": 100
  }'
```

### Caso 2: Mujeres de San José inactivas

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "minDaysSinceLastPurchase": 90,
    "size": 100
  }'
```

### Caso 3: Clientes VIP que dejaron de comprar

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "customerSegment": "vip",
    "minDaysSinceLastPurchase": 60,
    "minTotalSpent": 300,
    "size": 50
  }'
```

### Caso 4: Búsqueda conversacional

```bash
curl -X POST http://localhost:3000/api/customers/free-text-search \
  -H "Content-Type: application/json" \
  -d '{
    "searchText": "hombre cartago hawaiana 6 meses",
    "minDaysSinceLastPurchase": 180
  }'
```

## 🏗️ Estructura del Proyecto

```
├── src/
│   ├── config/
│   │   ├── elasticsearch.js      # Cliente de Elasticsearch
│   │   └── indices.js             # Definición de esquemas
│   ├── routes/
│   │   └── customerRoutes.js      # Endpoints de la API
│   ├── services/
│   │   └── customerService.js     # Lógica de consultas
│   ├── scripts/
│   │   ├── setup-indices.js       # Crear índices
│   │   ├── seed-data.js           # Generar datos
│   │   └── test-queries.js        # Probar consultas
│   ├── utils/
│   │   ├── dataGenerator.js       # Generador de datos fake
│   │   └── excelExporter.js       # Exportación a Excel
│   └── index.js                   # Servidor Express
├── .env                           # Credenciales
├── .gitignore
├── package.json
└── README.md
```

## 📊 Modelo de Datos

### Índice: `customers`

Datos desnormalizados y enriquecidos para búsquedas rápidas:

```javascript
{
  customer_id: "COMP001-+50612345678",  // Compañía + Teléfono
  company_id: "COMP001",
  phone: "+50612345678",                // Llave única por compañía
  name: "María González",
  email: "maria@example.com",
  gender: "mujer",
  city: "San José",
  
  // Temporalidad
  last_purchase_date: "2023-08-15",
  days_since_last_purchase: 125,
  
  // Estadísticas
  total_purchases: 15,
  total_spent: 450.75,
  average_ticket: 30.05,
  
  // Preferencias (desnormalizadas para búsqueda)
  favorite_products: ["Pizza Pepperoni", "Pizza Hawaiana"],
  favorite_ingredients: ["pepperoni", "jamón", "piña"],
  product_categories: ["pizzas", "bebidas"],
  
  // Segmentación
  customer_segment: "regular",          // vip, regular, ocasional, inactivo
  is_inactive: true,
  
  // Texto completo
  search_text: "María González mujer San José Pizza Pepperoni pepperoni"
}
```

### Índice: `invoices`

```javascript
{
  invoice_id: "INV-ABC123",
  company_id: "COMP001",
  customer_phone: "+50612345678",
  customer_id: "COMP001-+50612345678",
  invoice_date: "2023-08-15",
  total_amount: 35.50,
  
  // Desnormalizado para búsquedas
  product_names: ["Pizza Pepperoni", "Coca Cola"],
  product_ids: ["PROD-001", "PROD-050"],
  ingredient_names: ["pepperoni", "queso mozzarella"],
  categories: ["pizzas", "bebidas"]
}
```

## 🎨 Características Avanzadas de Elasticsearch

### 1. Análisis de Texto en Español

Los índices usan un analizador personalizado para español con:
- Stemming (raíces de palabras)
- Stop words en español
- Tokenización inteligente

### 2. Campos Multi-Campo

Campos como `name` tienen dos versiones:
- `name` (text) - Para búsqueda full-text
- `name.keyword` (keyword) - Para ordenamiento y agregaciones

### 3. Búsquedas Booleanas Complejas

Combina:
- `must` - Debe cumplir (AND)
- `filter` - Debe cumplir pero no afecta score
- `should` - Puede cumplir (OR con boost)
- `minimum_should_match` - Al menos N clausulas should

### 4. Agregaciones

Estadísticas en tiempo real:
- Histogramas temporales
- Top N de productos/ingredientes
- Distribución por género/ciudad
- Stats numéricas (avg, min, max, sum)

## 🔧 Personalización

### Ajustar cantidad de datos

Edita [src/scripts/seed-data.js](src/scripts/seed-data.js):

```javascript
const NUM_CUSTOMERS_PER_COMPANY = 270000;  // Por compañía
const NUM_PRODUCTS_PER_COMPANY = 50;
const AVG_INVOICES_PER_CUSTOMER = 8;
```

### Agregar más compañías

Edita [src/utils/dataGenerator.js](src/utils/dataGenerator.js):

```javascript
const companies = [
  { id: 'COMP001', name: 'Pizza Express CR' },
  { id: 'COMP002', name: 'Sabor Italiano' },
  { id: 'COMP003', name: 'Fast Food Nacional' },
  { id: 'COMP004', name: 'Tu Nueva Compañía' }  // Agregar aquí
];
```

### Cambiar umbral de inactividad

En las consultas, ajusta `minDaysSinceLastPurchase`:
- 30 días - Clientes muy activos
- 60 días - Comenzando a alejarse
- 90 días - Inactivos (default)
- 180 días - Muy inactivos

## 📈 Métricas de Rendimiento

Con 3,000 clientes y ~24,000 facturas:
- Búsqueda simple: **~30-50ms**
- Búsqueda compleja con múltiples filtros: **~80-150ms**
- Agregaciones: **~100-200ms**
- Exportación Excel (1000 registros): **~2-3 segundos**

Con 800k clientes:
- Búsquedas permanecen rápidas gracias a índices de Elasticsearch
- Latencia típica: **50-300ms**

## 🎓 Aprende Más

### Conceptos clave de Elasticsearch:
- **Inverted Index**: Índice invertido para búsquedas rápidas
- **Sharding**: Distribución de datos
- **Replicas**: Redundancia y alta disponibilidad
- **Analyzers**: Procesamiento de texto
- **Aggregations**: Análisis de datos

### Recursos:
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

## 🤝 Presentación al Cliente

### Puntos Clave:

1. **Escalabilidad**: Sistema probado con 800k+ clientes
2. **Velocidad**: Consultas en milisegundos
3. **Flexibilidad**: Búsquedas conversacionales o estructuradas
4. **Exportación**: Excel listo para campañas de email
5. **Multi-compañía**: Datos aislados por empresa
6. **Sin login requerido**: Identificación por teléfono

### Demo en vivo:

```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Hacer consultas
npm run query
```

### Mostrar en Postman/Insomnia:

1. Importar colección con los endpoints
2. Ejecutar búsqueda en vivo
3. Descargar Excel
4. Mostrar estadísticas

## 📝 Licencia

MIT

---

**¿Preguntas?** Abre un issue o contacta al equipo de desarrollo.
