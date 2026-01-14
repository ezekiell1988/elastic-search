# 🏢 ARQUITECTURA MULTI-COMPAÑÍA - CLICKEAT

## 🎯 OBJETIVO

Todos los índices de ClickEat están diseñados para soportar múltiples compañías (multi-tenant), permitiendo:
- Filtrado eficiente por una o varias compañías
- Análisis consolidado de todas las compañías
- Reportes comparativos entre regiones/países
- Aislamiento de datos por compañía (seguridad)

---

## 📊 ESTRUCTURA DE CAMPOS POR COMPAÑÍA

### **Formato Estándar en Todos los Índices**

```json
{
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  }
}
```

### **Excepción: Índice por Teléfono (Multi-Compañía)**

Un mismo teléfono puede tener compras en múltiples compañías:

```json
{
  "companias": [
    {
      "id_compania": 3,
      "nombre_compania": "ClickEat Costa Rica",
      "ordenes": 45,
      "monto_total": 900000.00
    },
    {
      "id_compania": 5,
      "nombre_compania": "ClickEat Colombia",
      "ordenes": 13,
      "monto_total": 250000.00
    }
  ],
  "compania_principal": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica"
  }
}
```

---

## 🔍 TABLA DE SOPORTE MULTI-COMPAÑÍA

| Índice | Campo Compañía | Tipo | Multi-Compañía |
|--------|----------------|------|----------------|
| **clickeat_clientes** | `compania` | Objeto | ❌ No |
| **clickeat_facturas** | `compania` | Objeto | ❌ No |
| **clickeat_productos** | `compania` | Objeto | ❌ No |
| **clickeat_restaurantes** | `compania` | Objeto | ❌ No |
| **clickeat_companias** | `id_compania` | ID único | N/A |
| **clickeat_ventas_por_producto** | `compania` | Objeto | ❌ No |
| **clickeat_ventas_por_restaurante** | `compania` | Objeto | ❌ No |
| **clickeat_ventas_por_cliente** | `compania` | Objeto | ❌ No |
| **clickeat_ventas_por_telefono** | `companias` | Array | ✅ **Sí** |

---

## 📋 EJEMPLOS DE CONSULTAS MULTI-COMPAÑÍA

### 1️⃣ **Filtrar por UNA compañía específica**

```json
GET /clickeat_ventas_por_producto/_search
{
  "query": {
    "term": {
      "compania.id_compania": 3
    }
  },
  "size": 100
}
```

**Resultado**: Solo productos de ClickEat Costa Rica (id_compania = 3)

---

### 2️⃣ **Filtrar por MÚLTIPLES compañías**

```json
GET /clickeat_ventas_por_cliente/_search
{
  "query": {
    "terms": {
      "compania.id_compania": [3, 5, 7]
    }
  }
}
```

**Resultado**: Clientes de Costa Rica, Colombia y México

---

### 3️⃣ **Excluir compañías específicas**

```json
GET /clickeat_ventas_por_restaurante/_search
{
  "query": {
    "bool": {
      "must_not": [
        {
          "term": {
            "compania.id_compania": 1
          }
        }
      ]
    }
  }
}
```

**Resultado**: Todos los restaurantes EXCEPTO de compañía 1

---

### 4️⃣ **Búsqueda por nombre de compañía**

```json
GET /clickeat_ventas_por_producto/_search
{
  "query": {
    "match": {
      "compania.nombre_compania": "Costa Rica"
    }
  }
}
```

**Resultado**: Productos de cualquier compañía con "Costa Rica" en el nombre

---

### 5️⃣ **Agregación por compañía (Reporte Consolidado)**

```json
GET /clickeat_ventas_por_restaurante/_search
{
  "size": 0,
  "aggs": {
    "por_compania": {
      "terms": {
        "field": "compania.nombre_compania",
        "size": 50
      },
      "aggs": {
        "ingresos_totales": {
          "sum": {
            "field": "ventas_totales.monto_total"
          }
        },
        "ordenes_totales": {
          "sum": {
            "field": "ventas_totales.numero_ordenes"
          }
        },
        "ticket_promedio": {
          "avg": {
            "field": "ventas_totales.ticket_promedio"
          }
        }
      }
    }
  }
}
```

**Resultado**:
```json
{
  "aggregations": {
    "por_compania": {
      "buckets": [
        {
          "key": "ClickEat Costa Rica",
          "doc_count": 171,
          "ingresos_totales": { "value": 45000000.00 },
          "ordenes_totales": { "value": 15000 },
          "ticket_promedio": { "value": 3000.00 }
        },
        {
          "key": "ClickEat Colombia",
          "doc_count": 145,
          "ingresos_totales": { "value": 38000000.00 },
          "ordenes_totales": { "value": 12000 },
          "ticket_promedio": { "value": 3166.67 }
        }
      ]
    }
  }
}
```

---

### 6️⃣ **Clientes VIP por compañía**

```json
GET /clickeat_ventas_por_cliente/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "compania.id_compania": 3
          }
        },
        {
          "term": {
            "segmento": "VIP"
          }
        }
      ]
    }
  },
  "sort": [
    {
      "comportamiento_compra.gasto_total": {
        "order": "desc"
      }
    }
  ],
  "size": 50
}
```

**Resultado**: Top 50 clientes VIP de Costa Rica, ordenados por gasto total

---

### 7️⃣ **Productos top por país**

```json
GET /clickeat_ventas_por_producto/_search
{
  "size": 0,
  "aggs": {
    "por_pais": {
      "terms": {
        "field": "compania.pais",
        "size": 10
      },
      "aggs": {
        "productos_top": {
          "top_hits": {
            "sort": [
              {
                "ventas_totales.monto_total": {
                  "order": "desc"
                }
              }
            ],
            "size": 5,
            "_source": {
              "includes": [
                "nombre_producto",
                "ventas_totales.monto_total",
                "ventas_totales.cantidad_vendida"
              ]
            }
          }
        }
      }
    }
  }
}
```

**Resultado**: Top 5 productos por cada país

---

### 8️⃣ **Usuarios que compraron en múltiples compañías**

```json
GET /clickeat_ventas_por_telefono/_search
{
  "query": {
    "script": {
      "script": {
        "source": "doc['companias'].size() > 1"
      }
    }
  }
}
```

**Resultado**: Teléfonos con compras en más de una compañía

---

## 🔐 SEGURIDAD Y AISLAMIENTO DE DATOS

### **Opción 1: Filtrado a Nivel de Aplicación**

```javascript
// En tu API/Backend
const COMPANY_ID = request.user.companyId; // Del token JWT

const query = {
  query: {
    bool: {
      must: [
        { term: { 'compania.id_compania': COMPANY_ID } },
        // ... otros filtros del usuario
      ]
    }
  }
};
```

### **Opción 2: Elasticsearch Security (Document Level Security)**

```json
{
  "role": "clickeat_costarica_readonly",
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["clickeat_*"],
      "privileges": ["read"],
      "query": {
        "term": {
          "compania.id_compania": 3
        }
      }
    }
  ]
}
```

**Ventajas:**
- Usuario solo ve datos de su compañía
- No puede acceder a datos de otras compañías aunque intente
- Seguridad a nivel de índice de Elasticsearch

---

## 📊 REPORTES MULTI-COMPAÑÍA

### **Dashboard Ejecutivo - Todas las Compañías**

```json
{
  "metricas_globales": {
    "total_companias": 8,
    "ordenes_totales": 879962,
    "clientes_activos": 773700,
    "ingresos_totales": 1500000000.00
  },
  "por_compania": [
    {
      "compania": "ClickEat Costa Rica",
      "ordenes": 250000,
      "clientes": 220000,
      "ingresos": 450000000.00,
      "crecimiento_mensual": "12%"
    },
    {
      "compania": "ClickEat Colombia",
      "ordenes": 210000,
      "clientes": 180000,
      "ingresos": 380000000.00,
      "crecimiento_mensual": "15%"
    }
  ]
}
```

### **Análisis Comparativo Entre Compañías**

```json
{
  "comparativa": {
    "metrica": "ticket_promedio",
    "ranking": [
      {
        "compania": "ClickEat México",
        "ticket_promedio": 4200.00,
        "posicion": 1
      },
      {
        "compania": "ClickEat Colombia",
        "ticket_promedio": 3800.00,
        "posicion": 2
      },
      {
        "compania": "ClickEat Costa Rica",
        "ticket_promedio": 3500.00,
        "posicion": 3
      }
    ]
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Migración de Datos**
- [ ] Verificar que todas las tablas SQL incluyan `id_compania`
- [ ] Migrar campo `id_compania` a todos los índices de Elasticsearch
- [ ] Agregar datos de compañía (nombre, país) desde tabla `tbCompania`
- [ ] Validar integridad: No debe haber documentos sin compañía

### **Índices Agregados**
- [ ] `clickeat_ventas_por_producto` incluye campo `compania`
- [ ] `clickeat_ventas_por_restaurante` incluye campo `compania`
- [ ] `clickeat_ventas_por_cliente` incluye campo `compania`
- [ ] `clickeat_ventas_por_telefono` incluye array `companias` + `compania_principal`

### **Queries y APIs**
- [ ] Todos los endpoints aceptan parámetro `company_id` (opcional)
- [ ] Queries sin filtro de compañía muestran todas las compañías
- [ ] Implementar validación de permisos por compañía
- [ ] Agregar logs de acceso por compañía

### **Testing**
- [ ] Probar filtrado por 1 compañía específica
- [ ] Probar filtrado por múltiples compañías
- [ ] Probar consultas sin filtro (todas las compañías)
- [ ] Verificar agregaciones por compañía
- [ ] Validar performance con muchas compañías

### **Documentación**
- [ ] Actualizar ejemplos de queries con filtros de compañía
- [ ] Documentar estructura de campo `compania`
- [ ] Crear guía de mejores prácticas multi-tenant
- [ ] Actualizar diagramas de arquitectura

---

## 🎯 BENEFICIOS DE LA ARQUITECTURA MULTI-COMPAÑÍA

✅ **Escalabilidad**: Agregar nuevas compañías sin cambios en código  
✅ **Flexibilidad**: Reportes consolidados o individuales  
✅ **Seguridad**: Aislamiento de datos entre compañías  
✅ **Performance**: Filtros optimizados a nivel de índice  
✅ **Análisis**: Benchmarking entre regiones/países  
✅ **Mantenimiento**: Un solo cluster para todas las compañías  

---

## 🚀 PRÓXIMOS PASOS

1. **Validar datos de compañía en SQL Server**
   ```sql
   SELECT id_compania, nombre_compania, COUNT(*) as total_ordenes
   FROM tbFactura
   GROUP BY id_compania, nombre_compania
   ORDER BY total_ordenes DESC;
   ```

2. **Implementar filtros en API**
   - Endpoint: `/api/productos?company_id=3`
   - Endpoint: `/api/productos?company_ids=3,5,7`
   - Endpoint: `/api/productos` (todas las compañías)

3. **Crear dashboards por compañía**
   - Kibana dashboard con filtro de compañía
   - Alertas específicas por compañía
   - Reportes programados por compañía

4. **Testing de performance**
   - Benchmark con 1 compañía vs todas
   - Optimizar queries multi-compañía
   - Evaluar necesidad de índices separados por compañía

---

**🎉 Con esta arquitectura, ClickEat puede escalar a N compañías manteniendo performance, seguridad y flexibilidad de análisis.**