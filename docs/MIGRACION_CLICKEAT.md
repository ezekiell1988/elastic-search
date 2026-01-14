# Migración ClickEat: SQL Server → Elasticsearch

Guía completa para ejecutar scripts SQL y migrar datos desde SQL Server a Elasticsearch.

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Instalación](#instalación)
3. [Scripts Disponibles](#scripts-disponibles)
4. [Ejecución de Scripts SQL](#ejecución-de-scripts-sql)
5. [Migración de Datos](#migración-de-datos)
6. [Estructura de Datos](#estructura-de-datos)

## 🔧 Requisitos

- Node.js 16+
- Acceso a SQL Server de ClickEat
- Cuenta de Elasticsearch Cloud
- Variables de entorno configuradas en `.env`

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Dependencias principales:
# - mssql: Conexión a SQL Server
# - @elastic/elasticsearch: Cliente de Elasticsearch
# - dotenv: Variables de entorno
```

## 🛠️ Scripts Disponibles

### 1. Ejecutar Archivos SQL

```bash
# Método 1: usando npm
npm run sql <archivo.sql>

# Método 2: directamente con node
node src/scripts/execute-sql.js <archivo.sql>

# Ejemplos:
npm run sql get-schema.sql
npm run sql get-sample-data.sql
```

**Script:** [src/scripts/execute-sql.js](src/scripts/execute-sql.js)

**Características:**
- ✅ Soporta múltiples batches (separados por `GO`)
- ✅ Muestra resultados en formato tabla
- ✅ Manejo de errores detallado
- ✅ Conexión automática a SQL Server

### 2. Migración Completa a Elasticsearch

```bash
# Ejecutar migración completa
npm run migrate

# o
node src/scripts/migrate-clickeat-data.js
```

**Script:** [src/scripts/migrate-clickeat-data.js](src/scripts/migrate-clickeat-data.js)

**Proceso:**
1. ✅ Conecta a SQL Server y Elasticsearch
2. ✅ Crea índices con mappings optimizados
3. ✅ Migra clientes con direcciones y estadísticas
4. ✅ Migra productos del catálogo
5. ✅ Migra órdenes con detalles e ingredientes
6. ✅ Muestra estadísticas finales

## 📄 Archivos SQL

### `get-schema.sql`

Consulta el schema de todas las tablas principales:
- Columnas, tipos de datos, nullable, defaults
- Conteo de registros por tabla
- Foreign keys y relaciones

**Uso:**
```bash
npm run sql get-schema.sql
```

### `get-sample-data.sql`

Extrae datos de muestra para análisis:
- TOP 100 clientes con direcciones
- TOP 100 facturas con detalles
- TOP 200 productos de facturas
- Análisis de comportamiento de clientes

**Uso:**
```bash
npm run sql get-sample-data.sql
```

## 🔄 Migración de Datos

### Paso 1: Analizar el Schema

```bash
# Ver estructura de tablas
npm run sql get-schema.sql
```

Esto te mostrará:
- Columnas de cada tabla
- Tipos de datos
- Relaciones entre tablas
- Total de registros

### Paso 2: Revisar Datos de Muestra

```bash
# Ver datos de ejemplo
npm run sql get-sample-data.sql
```

### Paso 3: Ejecutar Migración

```bash
# Migrar todos los datos a Elasticsearch
npm run migrate
```

**Salida esperada:**
```
╔════════════════════════════════════════════╗
║  MIGRACIÓN SQL SERVER → ELASTICSEARCH      ║
║  ClickEat Database                         ║
╚════════════════════════════════════════════╝

🔌 Conectando a SQL Server...
✅ Conectado a SQL Server

🔍 Verificando conexión a Elasticsearch...
✅ Elasticsearch: green

📋 Creando índices en Elasticsearch...
✅ Índice creado: clickeat_clientes
✅ Índice creado: clickeat_ordenes
✅ Índice creado: clickeat_productos

👥 Migrando clientes...
✅ 1234 clientes migrados

📦 Migrando productos...
✅ 567 productos migrados

🧾 Migrando órdenes...
✅ 5000 órdenes migradas

╔════════════════════════════════════════════╗
║  MIGRACIÓN COMPLETADA                      ║
╚════════════════════════════════════════════╝

⏱️  Duración: 12.45s
👥 Clientes: 1234
📦 Productos: 567
🧾 Órdenes: 5000
📊 Total registros: 6801
```

## 📊 Estructura de Datos

### Índice: `clickeat_clientes`

```json
{
  "id_cliente": 123,
  "nombre": "Juan Pérez",
  "cedula": "1-1234-5678",
  "telefono": "+506 8888-8888",
  "correo": "juan@example.com",
  "fecha_registro": "2024-01-15T10:30:00Z",
  "estado": 1,
  "direcciones": [
    {
      "id_direccion": 1,
      "nombre_contacto": "Juan Pérez",
      "telefono_contacto": "+506 8888-8888",
      "direccion": "San José, Centro",
      "provincia": "San José",
      "canton": "San José",
      "distrito": "Carmen"
    }
  ],
  "estadisticas": {
    "total_ordenes": 45,
    "ultima_compra": "2025-01-10T14:20:00Z",
    "dias_sin_comprar": 3,
    "total_gastado": 125000.50,
    "promedio_por_orden": 2777.78
  }
}
```

### Índice: `clickeat_ordenes`

```json
{
  "id_factura": 1001,
  "id_cliente": 123,
  "nombre_cliente": "Juan Pérez",
  "correo_cliente": "juan@example.com",
  "fecha_factura": "2025-01-10T14:20:00Z",
  "fecha_entrega": "2025-01-10T15:00:00Z",
  "estado_pedido": "Entregado",
  "monto_total": 15500.00,
  "monto_subtotal": 14000.00,
  "monto_envio": 1500.00,
  "monto_descuento": 0,
  "moneda": "CRC",
  "tipo_pago": "Tarjeta",
  "id_restaurante": 10,
  "nombre_restaurante": "Restaurante Central",
  "id_compania": 1,
  "nombre_compania": "ClickEat",
  "productos": [
    {
      "id_detalle": 5001,
      "id_producto": 250,
      "nombre_producto": "Pizza Margherita",
      "descripcion": "Pizza con salsa de tomate, mozzarella y albahaca",
      "cantidad": 1,
      "precio_unitario": 7000.00,
      "monto_total": 7000.00,
      "comentario": "Sin cebolla",
      "ingredientes": [
        {
          "id_ingrediente": 1,
          "nombre": "Queso extra",
          "cantidad": 1,
          "precio": 500.00
        }
      ]
    }
  ]
}
```

### Índice: `clickeat_productos`

```json
{
  "id_producto": 250,
  "codigo": "PIZZA-MARG-001",
  "nombre": "Pizza Margherita",
  "descripcion": "Pizza con salsa de tomate, mozzarella y albahaca",
  "precio_venta": 7000.00,
  "tipo_nodo": "PRODUCTO",
  "id_compania": 1,
  "estado": 1,
  "foto_producto": "images/pizza-margherita.jpg",
  "padre": 20
}
```

## 🔍 Consultas de Ejemplo en Elasticsearch

Una vez migrados los datos, puedes consultar en Elasticsearch:

### Buscar clientes por nombre
```json
GET /clickeat_clientes/_search
{
  "query": {
    "match": {
      "nombre": "Juan"
    }
  }
}
```

### Clientes inactivos (más de 30 días sin comprar)
```json
GET /clickeat_clientes/_search
{
  "query": {
    "range": {
      "estadisticas.dias_sin_comprar": {
        "gte": 30
      }
    }
  }
}
```

### Órdenes por rango de fecha
```json
GET /clickeat_ordenes/_search
{
  "query": {
    "range": {
      "fecha_factura": {
        "gte": "2025-01-01",
        "lte": "2025-01-31"
      }
    }
  }
}
```

### Productos de una orden específica
```json
GET /clickeat_ordenes/_search
{
  "query": {
    "nested": {
      "path": "productos",
      "query": {
        "match": {
          "productos.nombre_producto": "Pizza"
        }
      }
    }
  }
}
```

## 🔧 Configuración

Asegúrate de tener configuradas estas variables en tu archivo `.env`:

```env
# Elasticsearch
ELASTIC_SEARCH_ENDPOINT=https://your-cluster.es.region.cloud.elastic.co:443
ELASTIC_SEARCH_API_KEY=your-api-key

# SQL Server ClickEat
DB_HOST_CLICKEAT=138.59.16.150
DB_USER_CLICKEAT=clickeat
DB_PASSWORD_CLICKEAT=your-password
DB_DATABASE_CLICKEAT=dev_clickeat
DB_PORT_CLICKEAT=1433
DB_DRIVER_CLICKEAT=ODBC Driver 18 for SQL Server
```

## 📝 Notas Importantes

1. **Límites de Migración:**
   - Clientes: Todos
   - Productos: Solo activos (Estado = 1)
   - Órdenes: TOP 5000 más recientes

2. **Estructura Nested:**
   - Las direcciones están anidadas en clientes
   - Los productos están anidados en órdenes
   - Los ingredientes están anidados en productos

3. **Índices Previos:**
   - El script elimina y recrea los índices en cada ejecución
   - Esto asegura un schema limpio y actualizado

4. **Performance:**
   - Usa bulk insert para mejor rendimiento
   - Procesa en batches para evitar timeouts

## 🆘 Solución de Problemas

### Error de conexión a SQL Server
```
Error: Failed to connect to <host>:<port>
```
**Solución:** Verifica las credenciales en `.env` y la conectividad de red.

### Error de conexión a Elasticsearch
```
Error: Unable to connect to Elasticsearch
```
**Solución:** Verifica el endpoint y API key en `.env`.

### Timeout en consultas
```
RequestError: Timeout: Request failed to complete
```
**Solución:** Aumenta `requestTimeout` en la configuración.

## 📚 Referencias

- [SQL Scripts README](sql-queries/README.md)
- [Documentación de mssql](https://www.npmjs.com/package/mssql)
- [Elasticsearch Node.js Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
