# 🔄 SISTEMA DE SINCRONIZACIÓN INCREMENTAL + ÍNDICES AGREGADOS

## 🎯 OBJETIVOS AVANZADOS

1. **Sincronización Incremental**: Solo migrar datos nuevos/modificados
2. **Índices Agregados**: Ventas pre-calculadas por producto, restaurante, cliente y teléfono
3. **Sistema de Tracking**: Detectar cambios desde última sincronización
4. **🏢 Multi-Compañía**: Todos los índices incluyen campos de compañía para filtrado

---

## 🏢 ARQUITECTURA MULTI-COMPAÑÍA

✅ **Todos los índices incluyen información de compañía**  
✅ **Filtrado eficiente por una o múltiples compañías**  
✅ **Reportes consolidados y comparativos entre regiones**  
✅ **Índice por teléfono soporta múltiples compañías por usuario**

Ver documentación completa: [ARQUITECTURA_MULTICOMPANIA.md](./ARQUITECTURA_MULTICOMPANIA.md)

---

## 📊 ESTRUCTURA COMPLETA (8 TABLAS + 4 AGREGADOS)

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
| 11 | **clickeat_ventas_por_cliente** | tbFactura + tbClientes | Diaria/Incremental | Segmentación y comportamiento de clientes |
| 12 | **clickeat_ventas_por_telefono** | tbFactura (incluye guests) | Diaria/Incremental | Análisis por teléfono + conversión guests |

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
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
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
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
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

### 3. clickeat_ventas_por_cliente

**Fuente**: Agregación de datos de tbFactura, tbClientes, tbClientesDireccion  
**Propósito**: Segmentación de clientes y análisis de comportamiento de compra

```json
{
  "id_cliente": 12345,
  "nombre_cliente": "Juan Pérez",
  "email": "juan.perez@email.com",
  "telefono": "+506-8888-9999",
  "fecha_registro": "2023-05-15T10:30:00Z",
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
  "segmento": "VIP",
  "comportamiento_compra": {
    "total_ordenes": 45,
    "gasto_total": 900000.00,
    "ticket_promedio": 20000.00,
    "frecuencia_compra": "quincenal",
    "primera_compra": "2023-05-20T12:00:00Z",
    "ultima_compra": "2025-12-20T19:30:00Z",
    "dias_sin_compra": 24
  },
  "ventas_por_periodo": {
    "ultimos_7_dias": { "monto": 0.00, "ordenes": 0 },
    "ultimos_30_dias": { "monto": 60000.00, "ordenes": 3 },
    "ultimos_90_dias": { "monto": 180000.00, "ordenes": 9 }
  },
  "productos_favoritos": [
    {
      "id_producto": 456,
      "nombre_producto": "Pizza Pepperoni",
      "veces_ordenado": 12,
      "monto_total": 240000.00,
      "porcentaje_preferencia": 26.7,
      "ingredientes_preferidos": ["Pepperoni", "Queso Extra"]
    },
    {
      "id_producto": 789,
      "nombre_producto": "Hamburguesa BBQ",
      "veces_ordenado": 8,
      "monto_total": 160000.00,
      "porcentaje_preferencia": 17.8
    }
  ],
  "restaurantes_preferidos": [
    {
      "id_restaurante": 125,
      "nombre_restaurante": "Pizza Express Centro",
      "veces_ordenado": 20,
      "monto_total": 400000.00,
      "zona": "Centro"
    },
    {
      "id_restaurante": 200,
      "nombre_restaurante": "Burger Palace",
      "veces_ordenado": 15,
      "monto_total": 300000.00,
      "zona": "Escazú"
    }
  ],
  "patrones_temporales": {
    "horarios_preferidos": {
      "almuerzo": 15,
      "cena": 30
    },
    "dias_preferidos": {
      "viernes": 12,
      "sabado": 15,
      "domingo": 10
    },
    "estacionalidad": {
      "enero": 3,
      "febrero": 4,
      "diciembre": 6
    }
  },
  "direcciones_entrega": [
    {
      "zona": "Centro",
      "direccion": "Av. Central, San José",
      "veces_usado": 25
    },
    {
      "zona": "Chapinero",
      "direccion": "Oficina - Torre Norte",
      "veces_usado": 20
    }
  ],
  "metricas_retencion": {
    "lifetime_value": 900000.00,
    "tiempo_como_cliente_dias": 611,
    "probabilidad_reactivacion": 0.78,
    "riesgo_churn": 0.22,
    "categoria_lealtad": "Muy Alto"
  },
  "recomendaciones": {
    "productos_sugeridos": [
      "Pizza Hawaiana",
      "Hamburguesa Deluxe"
    ],
    "restaurantes_sugeridos": [
      "Pizza Palace Escazú"
    ],
    "ofertas_personalizadas": [
      "20% descuento en Pizzas los viernes",
      "Combo familiar para domingos"
    ]
  },
  "fecha_actualizacion": "2026-01-13T10:30:00Z"
}
```

### 4. clickeat_ventas_por_telefono

**Fuente**: Agregación de datos de tbFactura, tbClientes (incluye guests sin ID)  
**Propósito**: Análisis completo por teléfono, capturando usuarios guest y detectando conversiones

```json
{
  "telefono": "+506-8888-9999",
  "telefono_normalizado": "50688889999",
  "tipo_usuario": "convertido",
  
  "identidades": [
    {
      "id_cliente": 12345,
      "nombre": "Juan Pérez García",
      "email": "juan.perez@gmail.com",
      "tipo": "principal"
    },
    {
      "id_cliente": null,
      "nombre": "Juan Perez",
      "email": "jperez@hotmail.com",
      "tipo": "guest"
    }
  ],
  
  "historial_compras": {
    "total_ordenes": 58,
    "ordenes_como_guest": 12,
    "ordenes_registrado": 46,
    "fecha_primera_compra": "2023-03-10T18:45:00Z",
    "fecha_ultima_compra": "2025-12-20T19:30:00Z",
    "fecha_conversion": "2023-05-15T10:30:00Z",
    "dias_hasta_conversion": 66
  },
  
  "metricas_financieras": {
    "gasto_total": 1150000.00,
    "gasto_como_guest": 250000.00,
    "gasto_registrado": 900000.00,
    "ticket_promedio": 19827.59
  },
  
  "productos_favoritos": [
    {
      "id_producto": 456,
      "nombre_producto": "Pizza Pepperoni",
      "veces_ordenado": 18,
      "ordenes_guest": 4,
      "ordenes_registrado": 14
    }
  ],
  
  "analisis_identidad": {
    "numero_identidades": 2,
    "nombres_usados": ["Juan Pérez García", "Juan Perez"],
    "emails_usados": ["juan.perez@gmail.com", "jperez@hotmail.com"],
    "hay_inconsistencias": true
  },
  
  "segmentacion": {
    "segmento_actual": "VIP",
    "lifetime_value": 1150000.00,
    "valor_conversion": 900000.00
  },
  
  "fecha_actualizacion": "2026-01-13T10:30:00Z"
}
```

---

## 📈 COMPARATIVA DE ÍNDICES AGREGADOS

| Índice | Registros Base | Frecuencia Update | Uso Principal |
|--------|----------------|-------------------|---------------|
| **clickeat_ventas_por_producto** | 879,962 facturas | Diario | Marketing de productos |
| **clickeat_ventas_por_restaurante** | 879,962 facturas + 171 restaurantes | Diario | Análisis operacional |  
| **clickeat_ventas_por_cliente** | 879,962 facturas + 773,700 clientes | Semanal | CRM registrados |
| **clickeat_ventas_por_telefono** | 879,962 facturas (incluye guests) | Diario | CRM completo + Conversión |

---

## 🎯 CASOS DE USO IMPLEMENTADOS

### **Reactivación Inteligente**
```json
{
  "query_reactivacion": {
    "clientes_objetivo": "segmento:VIP AND dias_sin_compra:[30 TO 60]",
    "productos_recomendados": "productos_favoritos",
    "restaurante_sugerido": "restaurantes_preferidos[0]",
    "oferta_personalizada": "20% descuento en tu producto favorito"
  }
}
```

### **Conversión de Guests**
```json
{
  "query_conversion": {
    "target": "tipo_usuario:guest AND ordenes_como_guest:[3 TO *]",
    "incentivo": "Registrate y obtén 20% + puntos retroactivos",
    "canal": "WhatsApp",
    "productos_mencionados": "productos_favoritos[0]"
  }
}
```

### **Análisis de Performance**
```json
{
  "query_performance": {
    "restaurante_top": "ORDER BY ventas_totales.monto_total DESC",
    "productos_estrella": "productos_top[0] WHERE participacion > 10.0",
    "clientes_vip": "segmento:VIP ORDER BY lifetime_value DESC"
  }
}
```

### **Segmentación Automática**
```json
{
  "segmentacion": {
    "VIP": "gasto_total > 500000 AND total_ordenes > 20",
    "Frecuente": "total_ordenes > 10 AND dias_sin_compra < 30", 
    "En_Riesgo": "segmento:(VIP OR Frecuente) AND dias_sin_compra > 45",
    "Guest_Valioso": "tipo_usuario:guest AND gasto_como_guest > 100000"
  }
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