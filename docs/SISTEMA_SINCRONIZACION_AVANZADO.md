# 🔄 SISTEMA DE SINCRONIZACIÓN INCREMENTAL + ÍNDICES AGREGADOS

## 🎯 OBJETIVOS AVANZADOS

1. **Sincronización Incremental**: Solo migrar datos nuevos/modificados
2. **Índices Agregados**: Ventas pre-calculadas por producto y restaurante
3. **Sistema de Tracking**: Detectar cambios desde última sincronización

---

## 📊 ESTRUCTURA COMPLETA (8 TABLAS + 2 AGREGADOS)

### 📋 TABLAS PRINCIPALES (Sincronización Incremental)
| # | Tabla | Registros | Campo Fecha | Índice ES | Sincronización |
|---|-------|-----------|-------------|-----------|----------------|
| 1 | tbClientes | 773,700 | FechaCreacion | clickeat_clientes | ✅ Incremental |
| 2 | tbClientesDireccion | ~1.5M | *(por confirmar)* | (anidado) | ✅ Incremental |
| 3 | tbFactura | 879,962 | Fecha_facturado | clickeat_ordenes | ✅ Incremental |
| 4 | tbFacturaDetalle | ~5M | *(FK a Factura)* | (anidado) | ✅ Incremental |
| 5 | tbFacturaIngredientes | ~500K | *(FK a Factura)* | (anidado) | ✅ Incremental |
| 6 | tbCatalogo | 2,427 | *(por confirmar)* | clickeat_productos | ✅ Incremental |
| 7 | tbCompania | ~100 | *(por confirmar)* | clickeat_companias | ✅ Incremental |
| 8 | tbRestaurantes | ~500 | *(por confirmar)* | clickeat_restaurantes | ✅ Incremental |

### 📈 ÍNDICES AGREGADOS (Pre-calculados)
| # | Índice | Fuente | Actualización | Propósito |
|---|--------|-------|---------------|-----------|
| 9 | **clickeat_ventas_por_producto** | tbFactura + tbFacturaDetalle + tbFacturaIngredientes | Diaria/Incremental | Análisis productos + ingredientes |
| 10 | **clickeat_ventas_por_restaurante** | tbFactura + tbRestaurantes + tbCompania | Diaria/Incremental | Análisis por restaurante/zona |

---

## 🔄 SISTEMA DE SINCRONIZACIÓN INCREMENTAL

### Archivo de Control: `.sync-checkpoint.json`
```json
{
  "last_sync": "2026-01-13T10:30:00Z",
  "tables": {
    "tbClientes": {
      "last_sync": "2026-01-13T10:30:00Z",
      "last_id": 773700,
      "count_added": 0,
      "count_updated": 5
    },
    "tbFactura": {
      "last_sync": "2026-01-13T10:30:00Z", 
      "last_fecha": "2026-01-13T09:45:00Z",
      "count_added": 12,
      "count_updated": 0
    },
    "tbClientesDireccion": {
      "last_sync": "2026-01-13T10:30:00Z",
      "count_added": 3,
      "count_updated": 1
    }
  }
}
```

### Queries de Sincronización Incremental

#### 1. Nuevos Clientes
```sql
SELECT * FROM tbClientes 
WHERE FechaCreacion > @last_sync_timestamp
   OR Id_cliente > @last_max_id
ORDER BY Id_cliente;
```

#### 2. Nuevas Direcciones 
```sql
SELECT cd.* FROM tbClientesDireccion cd
INNER JOIN tbClientes c ON cd.Id_cliente = c.Id_cliente
WHERE c.FechaCreacion > @last_sync_timestamp
   OR cd.Id_direccion > @last_max_direccion_id
ORDER BY cd.Id_direccion;
```

#### 3. Nuevas Facturas (Solo Pagadas)
```sql
SELECT * FROM tbFactura
WHERE Pagado = 1 
  AND Fecha_facturado IS NOT NULL
  AND Fecha_facturado > @last_sync_timestamp
ORDER BY Fecha_facturado, Id_factura;
```

#### 4. Productos de Facturas Nuevas
```sql
SELECT fd.* FROM tbFacturaDetalle fd
INNER JOIN tbFactura f ON fd.Id_factura = f.Id_factura
WHERE f.Pagado = 1 
  AND f.Fecha_facturado > @last_sync_timestamp;
```

---

## 📈 ÍNDICES AGREGADOS

### 1. clickeat_ventas_por_producto
```json
{
  "id_producto": 789,
  "codigo_producto": "HAM-001",
  "nombre_producto": "Hamburguesa Clásica",
  "ventas_totales": {
    "cantidad_vendida": 2450,
    "monto_total": 11025000.00,
    "numero_ordenes": 1225,
    "ticket_promedio": 9000.00
  },
  "ventas_por_periodo": {
    "ultimos_30_dias": {
      "cantidad": 89,
      "monto": 400500.00,
      "ordenes": 45
    },
    "ultimos_90_dias": {
      "cantidad": 267,
      "monto": 1201500.00,
      "ordenes": 134
    }
  },
  "ingredientes_asociados": [
    {
      "id_ingrediente": 101,
      "nombre_ingrediente": "Carne 150g",
      "frecuencia": 1225,
      "porcentaje": 100.0
    },
    {
      "id_ingrediente": 102,
      "nombre_ingrediente": "Queso cheddar", 
      "frecuencia": 1100,
      "porcentaje": 89.8
    }
  ],
  "restaurantes_que_venden": [
    {
      "id_restaurante": 125,
      "nombre_restaurante": "Burger Palace Escazú",
      "cantidad_vendida": 450,
      "participacion": 18.4
    }
  ],
  "clientes_frecuentes": [
    {
      "id_cliente": 12345,
      "nombre_cliente": "Juan Pérez",
      "veces_comprado": 15,
      "ultima_compra": "2025-12-15T14:30:00Z"
    }
  ],
  "fecha_actualizacion": "2026-01-13T10:30:00Z"
}
```

### 2. clickeat_ventas_por_restaurante
```json
{
  "id_restaurante": 125,
  "nombre_restaurante": "Burger Palace Escazú",
  "id_compania": 3,
  "nombre_compania": "ClickEat Costa Rica",
  "ventas_totales": {
    "monto_total": 45000000.00,
    "numero_ordenes": 5000,
    "clientes_unicos": 1500,
    "ticket_promedio": 9000.00,
    "frecuencia_promedio": 3.33
  },
  "ventas_por_periodo": {
    "hoy": { "monto": 125000.00, "ordenes": 15 },
    "ultimos_7_dias": { "monto": 980000.00, "ordenes": 120 },
    "ultimos_30_dias": { "monto": 3500000.00, "ordenes": 450 }
  },
  "productos_top": [
    {
      "id_producto": 789,
      "nombre_producto": "Hamburguesa Clásica",
      "cantidad_vendida": 450,
      "monto_total": 4050000.00,
      "participacion": 9.0
    }
  ],
  "clientes_top": [
    {
      "id_cliente": 12345,
      "nombre_cliente": "Juan Pérez",
      "ordenes": 25,
      "monto_total": 225000.00,
      "ultima_orden": "2025-12-15T14:30:00Z"
    }
  ],
  "zonas_entrega": [
    {
      "provincia": "San José",
      "canton": "Escazú", 
      "ordenes": 2800,
      "participacion": 56.0
    }
  ],
  "fecha_actualizacion": "2026-01-13T10:30:00Z"
}
```

---

## 🔧 COMANDOS DE SINCRONIZACIÓN

### Migración Inicial (Primera vez)
```bash
npm run sync:initial        # Migra todas las 8 tablas + crea agregados
npm run sync:build-indexes  # Crea índices agregados iniciales
```

### Sincronización Incremental (Diaria/Programada)
```bash
npm run sync:incremental    # Solo datos nuevos desde última sync
npm run sync:rebuild-stats  # Recalcula agregados con nuevos datos
```

### Sincronización Específica
```bash
npm run sync:clientes       # Solo nuevos clientes + direcciones
npm run sync:ordenes        # Solo nuevas órdenes + productos + ingredientes
npm run sync:productos      # Solo cambios en catálogo
npm run sync:restaurantes   # Solo cambios en restaurantes/companias
```

### Recálculo de Agregados
```bash
npm run rebuild:ventas-producto    # Recalcula ventas por producto
npm run rebuild:ventas-restaurante # Recalcula ventas por restaurante
npm run rebuild:all-stats          # Recalcula todos los agregados
```

---

## 📅 AUTOMATIZACIÓN

### Cron Job Diario (2:00 AM)
```bash
#!/bin/bash
# sync-daily.sh
cd /Users/ezequielbaltodanocubillo/Documents/ezekl/elastic-search

# Sincronización incremental
npm run sync:incremental

# Recalcular agregados
npm run rebuild:ventas-producto
npm run rebuild:ventas-restaurante

# Optimizar índices
npm run es:optimize

echo "✅ Sincronización completada: $(date)"
```

### Cron Job Semanal (Domingos 1:00 AM)
```bash
#!/bin/bash
# sync-weekly.sh
# Recalculo completo para verificar consistencia
npm run rebuild:all-stats
npm run verify:data-consistency
```

---

## 🎯 NUEVAS CAPACIDADES DE ANÁLISIS

### Por Producto
- 📊 **Top productos por ventas/cantidad**
- 🥘 **Ingredientes más populares**  
- 👥 **Clientes que más compran cada producto**
- 🏪 **Qué restaurantes venden más de cada producto**
- 📈 **Tendencias de venta por producto**

### Por Restaurante
- 📍 **Performance por ubicación/zona**
- 🎯 **Productos estrella de cada restaurante**
- 👑 **Clientes VIP de cada restaurante**
- 📊 **Comparación entre restaurantes de la misma compania**
- 🕒 **Análisis de horarios pico por restaurante**

### Reactivación Avanzada
- 🎯 **Qué productos compraban los clientes inactivos**
- 📍 **En qué restaurantes/zonas están concentrados**
- 🥘 **Qué ingredientes preferían**
- 🏢 **Qué companias tenían mayor lealtad**

---

## ⚠️ CONSIDERACIONES TÉCNICAS

### Performance
- **Índices agregados**: Pre-calculados para consultas rápidas
- **Sincronización incremental**: Solo procesa cambios
- **Optimización nocturna**: Reorganiza índices automáticamente

### Storage
- **8 tablas principales**: ~2 GB
- **2 índices agregados**: ~500 MB adicionales
- **Total estimado**: ~2.5 GB

### Monitoreo
- **Logs de sincronización**: Timestamp de cada sincronización
- **Métricas de cambios**: Cuántos registros nuevos/modificados
- **Alertas**: Si sincronización falla o encuentra inconsistencias

---

## 🚀 PRÓXIMOS PASOS

1. **¿Empezamos con migración inicial completa?** (8 tablas)
2. **¿Desarrollamos sistema de sincronización incremental?**
3. **¿Creamos índices agregados de productos y restaurantes?**
4. **¿Configuramos automatización diaria?**

¿Por dónde comenzamos? 🤔