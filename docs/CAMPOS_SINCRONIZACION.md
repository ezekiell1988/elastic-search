# 🔄 CAMPOS DE SINCRONIZACIÓN DETECTADOS

Basado en el análisis de la base de datos, estos son los campos para sincronización incremental:

## 📅 CAMPOS DE FECHA ENCONTRADOS

### tbClientes
- **`FechaCreacion`** (datetime) ✅ **USAR PARA SYNC**

### tbFactura  
- **`Fecha_facturado`** (datetime) ✅ **USAR PARA SYNC** (principal)
- `Fecha_Acceso` (smalldatetime)
- `Fecha_envio` (datetime) 
- `Fecha_pagado` (datetime)
- `Fecha_anulado` (datetime)
- `Fecha_entregado` (datetime)

### tbCompania
- `Facebook_pixel_token_vencimiento` (datetime)

### tbCatalogo, tbRestaurantes, etc.
- No se detectaron campos de fecha obvios

---

## 🎯 ESTRATEGIA DE SINCRONIZACIÓN POR TABLA

### 1. tbClientes (Principal)
```sql
-- Nuevos clientes desde última sync
SELECT * FROM tbClientes 
WHERE FechaCreacion > @last_sync_timestamp
ORDER BY FechaCreacion, Id_cliente
```

### 2. tbClientesDireccion (Anidado)
```sql
-- Direcciones de clientes nuevos/modificados
SELECT cd.* FROM tbClientesDireccion cd
INNER JOIN tbClientes c ON cd.Id_cliente = c.Id_cliente
WHERE c.FechaCreacion > @last_sync_timestamp
   OR cd.Id_direccion > @last_max_direccion_id
ORDER BY cd.Id_direccion
```

### 3. tbFactura (Principal)
```sql
-- Nuevas facturas pagadas desde última sync
SELECT * FROM tbFactura
WHERE Pagado = 1 
  AND Fecha_facturado IS NOT NULL
  AND Fecha_facturado > @last_sync_timestamp
ORDER BY Fecha_facturado, Id_factura
```

### 4. tbFacturaDetalle (Anidado)
```sql
-- Productos de facturas nuevas
SELECT fd.* FROM tbFacturaDetalle fd
INNER JOIN tbFactura f ON fd.Id_factura = f.Id_factura
WHERE f.Pagado = 1 
  AND f.Fecha_facturado > @last_sync_timestamp
ORDER BY fd.Id_factura, fd.Id_detalle
```

### 5. tbFacturaIngredientes (Anidado)
```sql
-- Ingredientes de facturas nuevas  
SELECT fi.* FROM tbFacturaIngredientes fi
INNER JOIN tbFacturaDetalle fd ON fi.Id_detalle = fd.Id_detalle
INNER JOIN tbFactura f ON fd.Id_factura = f.Id_factura
WHERE f.Pagado = 1 
  AND f.Fecha_facturado > @last_sync_timestamp
ORDER BY fi.Id_detalle
```

### 6. tbCatalogo, tbCompania, tbRestaurantes (Sin campos fecha)
**Estrategia alternativa: Sincronización por ID máximo**

```sql
-- tbCatalogo: por ID máximo
SELECT * FROM tbCatalogo 
WHERE Id_producto > @last_max_id
ORDER BY Id_producto

-- tbCompania: por ID máximo  
SELECT * FROM tbCompania
WHERE Id_compania > @last_max_id
ORDER BY Id_compania

-- tbRestaurantes: por ID máximo
SELECT * FROM tbRestaurantes
WHERE Id_restaurante > @last_max_id  
ORDER BY Id_restaurante
```

---

## 📁 ARCHIVO DE CHECKPOINT

### .sync-checkpoint.json
```json
{
  "version": "1.0",
  "last_full_sync": "2026-01-13T10:30:00Z",
  "last_incremental_sync": "2026-01-14T02:00:00Z",
  "tables": {
    "tbClientes": {
      "sync_method": "date_field",
      "date_field": "FechaCreacion", 
      "last_sync": "2026-01-14T02:00:00Z",
      "last_max_id": 773700,
      "records_added": 25,
      "records_updated": 0
    },
    "tbClientesDireccion": {
      "sync_method": "client_relation",
      "depends_on": "tbClientes",
      "last_sync": "2026-01-14T02:00:00Z", 
      "last_max_id": 1456789,
      "records_added": 15,
      "records_updated": 3
    },
    "tbFactura": {
      "sync_method": "date_field",
      "date_field": "Fecha_facturado",
      "filter": "Pagado = 1",
      "last_sync": "2026-01-14T02:00:00Z",
      "last_fecha": "2026-01-14T01:45:23Z",
      "records_added": 89,
      "records_updated": 0
    },
    "tbFacturaDetalle": {
      "sync_method": "factura_relation", 
      "depends_on": "tbFactura",
      "last_sync": "2026-01-14T02:00:00Z",
      "records_added": 234,
      "records_updated": 0
    },
    "tbFacturaIngredientes": {
      "sync_method": "factura_relation",
      "depends_on": "tbFactura", 
      "last_sync": "2026-01-14T02:00:00Z",
      "records_added": 156,
      "records_updated": 0
    },
    "tbCatalogo": {
      "sync_method": "max_id",
      "last_sync": "2026-01-14T02:00:00Z",
      "last_max_id": 2427,
      "records_added": 0,
      "records_updated": 0
    },
    "tbCompania": {
      "sync_method": "max_id",
      "last_sync": "2026-01-14T02:00:00Z", 
      "last_max_id": 150,
      "records_added": 0,
      "records_updated": 0
    },
    "tbRestaurantes": {
      "sync_method": "max_id",
      "last_sync": "2026-01-14T02:00:00Z",
      "last_max_id": 545,
      "records_added": 2,
      "records_updated": 0
    }
  },
  "aggregated_indexes": {
    "clickeat_ventas_por_producto": {
      "last_rebuild": "2026-01-14T02:15:00Z",
      "records_processed": 879962,
      "products_updated": 2427
    },
    "clickeat_ventas_por_restaurante": {
      "last_rebuild": "2026-01-14T02:20:00Z", 
      "records_processed": 879962,
      "restaurants_updated": 545
    }
  }
}
```

---

## 🔧 COMANDOS DE SINCRONIZACIÓN

### package.json (nuevos scripts)
```json
{
  "scripts": {
    "sync:detect-changes": "node src/scripts/detect-changes.js",
    "sync:incremental": "node src/scripts/sync-incremental.js",
    "sync:initial": "node src/scripts/sync-initial.js",
    "sync:rebuild-aggregates": "node src/scripts/rebuild-aggregates.js",
    
    "sync:clientes": "node src/scripts/sync-incremental.js --table=tbClientes",
    "sync:facturas": "node src/scripts/sync-incremental.js --table=tbFactura", 
    "sync:productos": "node src/scripts/sync-incremental.js --table=tbCatalogo",
    
    "rebuild:ventas-producto": "node src/scripts/rebuild-product-stats.js",
    "rebuild:ventas-restaurante": "node src/scripts/rebuild-restaurant-stats.js"
  }
}
```

---

## 📊 PRÓXIMAS CAPACIDADES

### Análisis de Productos con Ingredientes
- Productos más vendidos por período
- Ingredientes más populares/raros
- Combinaciones de ingredientes exitosas
- Clientes que prefieren ciertos ingredientes

### Análisis por Restaurante
- Performance comparativo entre restaurantes
- Productos estrella por restaurante
- Zonas de mayor demanda
- Horarios pico por restaurante

### Reactivación Inteligente  
- "Clientes que compraban X producto en Y restaurante"
- "Ingredientes favoritos de clientes inactivos"
- "Ofertas personalizadas basadas en historial"

¿Empezamos implementando el sistema de sincronización incremental? 🚀