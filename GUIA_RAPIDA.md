# 🚀 Guía Completa: Migración ClickEat a Elasticsearch

## ✅ Resumen Ejecutivo

Hemos creado un sistema completo para:
1. ✅ Ejecutar archivos .sql personalizados en SQL Server
2. ✅ Analizar el schema de las tablas de ClickEat
3. ✅ Migrar datos de SQL Server a Elasticsearch
4. ✅ Crear índices optimizados con mappings

**Resultados de la Migración:**
- ⏱️ Duración: 7.73s
- 👥 1,000 clientes migrados
- 🧾 5,000 órdenes migradas
- 📊 6,000 documentos totales en Elasticsearch

---

## 📁 Archivos Creados

### Scripts Node.js

1. **`src/scripts/execute-sql.js`**
   - Ejecuta archivos .sql en SQL Server
   - Soporta múltiples batches (separados por `GO`)
   - Muestra resultados en tabla

2. **`src/scripts/migrate-simple.js`**
   - Migración simplificada y funcional
   - Usa las columnas reales de la BD
   - Crea índices en Elasticsearch
   - ✅ **ESTE ES EL QUE FUNCIONA**

3. **`src/scripts/migrate-clickeat-data.js`**
   - Migración compleja con relaciones anidadas
   - Requiere ajustes según estructura real

### Archivos SQL

1. **`sql-queries/get-schema.sql`**
   - Consulta el schema completo de las 8 tablas principales
   - Muestra columnas, tipos, nullable, defaults
   - Lista foreign keys y relaciones

2. **`sql-queries/get-sample-data.sql`**
   - Extrae datos de muestra
   - Útil para análisis y pruebas

3. **`sql-queries/test-columns.sql`**
   - Script rápido para ver columnas reales
   - Obtiene 1 fila de ejemplo

### Documentación

1. **`MIGRACION_CLICKEAT.md`** - Guía detallada completa
2. **`MAPEO_COLUMNAS.md`** - Mapeo de columnas SQL ↔ ES
3. **`sql-queries/README.md`** - Documentación de scripts SQL
4. **`GUIA_RAPIDA.md`** - Este archivo (guía rápida)

---

## 🎯 Uso Rápido

### 1. Ejecutar un Archivo SQL

```bash
# Método 1: usando npm
npm run sql get-schema.sql

# Método 2: usando node
node src/scripts/execute-sql.js get-schema.sql

# Método 3: con ruta completa
node src/scripts/execute-sql.js /ruta/completa/archivo.sql
```

### 2. Migrar Datos a Elasticsearch

```bash
# Migración simplificada (RECOMENDADO)
npm run migrate:simple

# Migración compleja (requiere ajustes)
npm run migrate
```

### 3. Crear Tus Propios Scripts SQL

1. Crea un archivo `.sql` en `sql-queries/`
2. Escribe tu consulta SQL
3. Usa `GO` para separar múltiples comandos
4. Ejecuta con `npm run sql tuarchivo.sql`

**Ejemplo:**
```sql
-- mi-consulta.sql
SELECT TOP 10 * FROM tbClientes
WHERE Estado = 1;
GO

SELECT COUNT(*) AS Total FROM tbFactura;
GO
```

---

## 📊 Estructura de Datos Migrada

### Índice: `clickeat_clientes_v2`

```json
{
  "id_cliente": 3016,
  "nombre": "Juan Pérez",
  "cedula": "1-1234-5678",
  "telefono": "+50688888888",
  "correo": "juan@example.com",
  "fecha_creacion": "2020-06-11T12:08:32.090Z",
  "estado": 1,
  "id_compania": 1,
  "balance": 0,
  "puntos": 0
}
```

### Índice: `clickeat_ordenes_v2`

```json
{
  "id_factura": 1,
  "id_cliente": 3016,
  "nombre_cliente": "Juan Pérez",
  "correo_cliente": "juan@example.com",
  "fecha_facturado": "2021-09-06T10:14:59.013Z",
  "fecha_entregado": "2021-09-06T15:00:00.000Z",
  "estado_factura": 5,
  "monto_total": 750,
  "impuesto_ventas": 86.28,
  "costo_entrega": 0,
  "descuento": 0,
  "moneda": "Colones",
  "pagado": true,
  "id_restaurante": 125,
  "id_compania": 3
}
```

---

## 🔍 Consultas de Ejemplo en Elasticsearch

### Buscar clientes por nombre

```json
GET /clickeat_clientes_v2/_search
{
  "query": {
    "match": {
      "nombre": "Juan"
    }
  }
}
```

### Clientes activos

```json
GET /clickeat_clientes_v2/_search
{
  "query": {
    "term": {
      "estado": 1
    }
  }
}
```

### Órdenes por fecha

```json
GET /clickeat_ordenes_v2/_search
{
  "query": {
    "range": {
      "fecha_facturado": {
        "gte": "2021-01-01",
        "lte": "2021-12-31"
      }
    }
  },
  "sort": [
    {
      "fecha_facturado": "desc"
    }
  ]
}
```

### Órdenes pagadas mayores a 1000

```json
GET /clickeat_ordenes_v2/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "pagado": true } },
        { "range": { "monto_total": { "gte": 1000 } } }
      ]
    }
  }
}
```

### Estadísticas de órdenes

```json
GET /clickeat_ordenes_v2/_search
{
  "size": 0,
  "aggs": {
    "total_ventas": {
      "sum": {
        "field": "monto_total"
      }
    },
    "promedio_orden": {
      "avg": {
        "field": "monto_total"
      }
    },
    "ordenes_por_mes": {
      "date_histogram": {
        "field": "fecha_facturado",
        "calendar_interval": "month"
      },
      "aggs": {
        "ventas_mes": {
          "sum": {
            "field": "monto_total"
          }
        }
      }
    }
  }
}
```

---

## ⚙️ Configuración

### Archivo `.env`

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

---

## 🛠️ Scripts NPM Disponibles

```bash
# Ejecutar servidor Express
npm start

# Ejecutar archivo SQL
npm run sql <archivo.sql>

# Migración simplificada (✅ recomendado)
npm run migrate:simple

# Migración compleja
npm run migrate

# Modo desarrollo con nodemon
npm run dev

# Setup de índices demo
npm run setup

# Seed con datos de prueba
npm run seed

# Consultas de prueba
npm run query
```

---

## 📋 Tablas Migradas

| Tabla | Registros | Índice Elasticsearch |
|-------|-----------|---------------------|
| `tbClientes` | 1,000 (TOP) | `clickeat_clientes_v2` |
| `tbFactura` | 5,000 (TOP) | `clickeat_ordenes_v2` |

**Nota:** La migración actual incluye las TOP N registros más recientes. Para migrar todos los datos, modifica los queries en `migrate-simple.js` removiendo la cláusula `TOP`.

---

## 🎓 Próximos Pasos

### 1. Migrar Más Datos

Edita `src/scripts/migrate-simple.js` y cambia:
```javascript
// De:
SELECT TOP 1000 ...

// A:
SELECT ...  // Sin límite
```

### 2. Agregar Más Tablas

Crea funciones similares para:
- `tbFacturaDetalle` (productos)
- `tbFacturaIngredientes`
- `tbClientesDireccion`
- `tbCatalogo` (productos)
- `tbRestaurantes`
- `tbCompania`

### 3. Crear Relaciones Anidadas

Modifica los mappings para incluir objetos nested:
```javascript
{
  mappings: {
    properties: {
      productos: {
        type: 'nested',
        properties: {
          // ...
        }
      }
    }
  }
}
```

### 4. Automatizar la Migración

Crea un cron job o tarea programada:
```bash
# Cada noche a las 2 AM
0 2 * * * cd /ruta/proyecto && npm run migrate:simple
```

---

## 🐛 Solución de Problemas

### Error: "Invalid column name"

**Causa:** El nombre de la columna no existe en la tabla.

**Solución:** Ejecuta el script de schema para ver los nombres reales:
```bash
npm run sql get-schema.sql
```

### Error: "Connection timeout"

**Causa:** No se puede conectar a SQL Server.

**Solución:** 
1. Verifica las credenciales en `.env`
2. Verifica conectividad de red
3. Aumenta `connectTimeout` en el config

### Error: "Index already exists"

**Causa:** El índice ya existe en Elasticsearch.

**Solución:** El script automáticamente elimina índices existentes. Si persiste, elimina manualmente:
```json
DELETE /clickeat_clientes_v2
DELETE /clickeat_ordenes_v2
```

---

## 📚 Documentación Adicional

- [MIGRACION_CLICKEAT.md](MIGRACION_CLICKEAT.md) - Guía completa detallada
- [MAPEO_COLUMNAS.md](MAPEO_COLUMNAS.md) - Mapeo de columnas
- [sql-queries/README.md](sql-queries/README.md) - Documentación SQL

---

## ✨ Características del Sistema

✅ Ejecución de scripts SQL personalizados
✅ Análisis automático de schema
✅ Migración incremental de datos
✅ Índices optimizados con mappings
✅ Soporte para Elasticsearch Serverless
✅ Bulk insert para mejor performance
✅ Manejo de errores detallado
✅ Logs informativos con emojis
✅ Documentación completa

---

## 📞 Soporte

Para más información sobre:
- **SQL Server:** Consulta `sql-queries/README.md`
- **Elasticsearch:** Consulta `MIGRACION_CLICKEAT.md`
- **Mapeo de Datos:** Consulta `MAPEO_COLUMNAS.md`

---

**¡Listo! 🎉** Ahora tienes un sistema completo para migrar datos de ClickEat a Elasticsearch.
