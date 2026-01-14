# 📈 ÍNDICES AGREGADOS CLICKEAT - ANÁLISIS AVANZADO

## 🎯 RESUMEN DE LOS 4 ÍNDICES AGREGADOS

Los índices agregados nos permitirán realizar análisis profundos del negocio de ClickEat, incluyendo análisis de usuarios guest:

### 1. 🍕 **clickeat_ventas_por_producto**
**Objetivo**: Análisis de productos y sus ingredientes asociados

#### **Datos Agregados**:
```json
{
  "id_producto": 1234,
  "nombre_producto": "Pizza Margherita",
  "categoria": "Pizza",
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
  "total_vendido": 1250,
  "ingreso_total": 2500000,
  "precio_promedio": 2000,
  "restaurantes_que_venden": ["Rest1", "Rest2", "Rest3"],
  "ingredientes_populares": [
    {"nombre": "Mozzarella", "frecuencia": 1250},
    {"nombre": "Tomate", "frecuencia": 1200},
    {"nombre": "Albahaca", "frecuencia": 950}
  ],
  "ventas_por_mes": {
    "2025-01": 120,
    "2025-02": 135,
    "2025-03": 110
  },
  "horarios_pico": {
    "almuerzo": 450,
    "cena": 800
  }
}
```

#### **Consultas Útiles**:
- Productos más vendidos por período
- Ingredientes más populares/raros
- Combinaciones de ingredientes exitosas
- Productos con mayor margen
- Tendencias de ventas por producto

---

### 2. 🏪 **clickeat_ventas_por_restaurante**
**Objetivo**: Performance y análisis por restaurante/zona

#### **Datos Agregados**:
```json
{
  "id_restaurante": 567,
  "nombre_restaurante": "Pizza Express Centro",
  "zona": "Centro",
  "ciudad": "Bogotá",
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
  "total_ordenes": 2450,
  "ingreso_total": 4900000,
  "ticket_promedio": 2000,
  "productos_estrella": [
    {"nombre": "Pizza Margherita", "cantidad": 450},
    {"nombre": "Lasaña", "cantidad": 320}
  ],
  "horarios_operacion": {
    "apertura": "10:00",
    "cierre": "22:00",
    "horario_pico": "19:00-21:00"
  },
  "performance_mensual": {
    "2025-01": {"ordenes": 195, "ingresos": 390000},
    "2025-02": {"ordenes": 220, "ingresos": 440000}
  },
  "rating_promedio": 4.3,
  "tiempo_entrega_promedio": 35
}
```

#### **Consultas Útiles**:
- Performance comparativo entre restaurantes
- Productos estrella por restaurante
- Zonas de mayor demanda
- Horarios pico por ubicación
- Restaurantes más rentables

---

### 3. 👥 **clickeat_ventas_por_cliente** ← **NUEVO**
**Objetivo**: Comportamiento y segmentación de clientes

#### **Datos Agregados**:
```json
{
  "id_cliente": 12345,
  "nombre_cliente": "Juan Pérez",
  "email": "juan@email.com",
  
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  },
  
  "segmento": "VIP",
  "total_ordenes": 45,
  "gasto_total": 900000,
  "ticket_promedio": 20000,
  "frecuencia_compra": "quincenal",
  "primera_compra": "2023-05-15",
  "ultima_compra": "2025-12-20",
  "dias_sin_compra": 24,
  "productos_favoritos": [
    {"nombre": "Pizza Pepperoni", "veces_ordenado": 12},
    {"nombre": "Hamburguesa BBQ", "veces_ordenado": 8}
  ],
  "restaurantes_preferidos": [
    {"nombre": "Pizza Express Centro", "veces_ordenado": 20},
    {"nombre": "Burger Palace", "veces_ordenado": 15}
  ],
  "ingredientes_preferidos": [
    {"nombre": "Pepperoni", "frecuencia": 0.85},
    {"nombre": "Queso Extra", "frecuencia": 0.70}
  ],
  "horarios_preferidos": {
    "almuerzo": 15,
    "cena": 30
  },
  "zonas_entrega": ["Centro", "Chapinero"],
  "lifetime_value": 900000,
  "probabilidad_reactivacion": 0.78
}
```

#### **Consultas Útiles**:
- Segmentación de clientes (VIP, Frecuentes, Ocasionales, Inactivos)
- Clientes con mayor lifetime value
- Patrones de reactivación personalizados
- Productos recomendados por historial
- Análisis de retención y churn
- Campañas dirigidas por segmento

---

## 🔄 ESTRATEGIAS DE CONSTRUCCIÓN

### **Fuente de Datos**: 
Todas las agregaciones se construyen desde el índice principal `clickeat_facturas` que contiene:
- tbFactura (879,962 órdenes pagadas)
- tbFacturaDetalle (productos por orden)
- tbFacturaIngredientes (ingredientes personalizados)

### **Frecuencia de Actualización**:
- **Diaria**: Actualización incremental (2:00 AM)
- **Semanal**: Recálculo completo de segmentaciones
- **Mensual**: Análisis de tendencias y forecasting

### **Optimizaciones**:
- Pre-cálculo de métricas más consultadas
- Agregaciones por períodos (día, semana, mes)
- Índices optimizados para queries frecuentes

---

## 🎯 CASOS DE USO EMPRESARIALES

### **Para Marketing**:
- Segmentación de clientes para campañas dirigidas
- Productos a promocionar por zona/restaurante
- Horarios óptimos para ofertas

### **Para Operaciones**:
- Optimización de inventario por restaurante
- Identificación de productos de baja rotación
- Análisis de capacidad por zona

### **Para Reactivación**:
- Clientes inactivos con alta probabilidad de retorno
- Ofertas personalizadas por historial de compra
- Productos/restaurantes recomendados

### **Para Análisis Financiero**:
- Restaurantes más rentables
- Productos con mejor margen
- Clientes de mayor valor (VIP)

---

## 🚀 PRÓXIMOS PASOS

1. **Implementar agregaciones**: Desarrollar lógica de construcción
2. **Definir segmentaciones**: Criterios para VIP, frecuente, etc.
3. **Crear dashboards**: Visualizaciones para cada índice
4. **Automatizar actualizaciones**: Jobs diarios/semanales
5. **APIs de consulta**: Endpoints para cada tipo de análisis

**🎯 Con estos 3 índices agregados, ClickEat tendrá análisis completo a nivel de producto, restaurante y cliente.**

---

### 4. 📱 **clickeat_ventas_por_telefono** ← **NUEVO**

**Propósito**: Análisis de ventas por número de teléfono, incluyendo usuarios guest sin cuenta

**¿Por qué es importante?**
- **Captura compras guest**: Muchos usuarios compran sin registrarse
- **Identifica conversión**: Detecta cuando un guest se convierte en cliente registrado
- **Análisis sin sesgo**: El teléfono es el verdadero identificador único
- **Detecta duplicados**: Múltiples cuentas con el mismo teléfono
- **Marketing efectivo**: Reactivación funciona mejor por teléfono (WhatsApp, SMS)

#### 📊 Estructura del Documento

```json
{
  "telefono": "+506-8888-9999",
  "telefono_normalizado": "50688889999",
  "tipo_usuario": "convertido",  // guest, registrado, convertido, multiple
  
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
  },
  
  "identidades": [
    {
      "id_cliente": 12345,
      "nombre": "Juan Pérez García",
      "email": "juan.perez@gmail.com",
      "fecha_registro": "2023-05-15T10:30:00Z",
      "tipo": "principal"
    },
    {
      "id_cliente": null,
      "nombre": "Juan Perez",
      "email": "jperez@hotmail.com",
      "fecha_registro": "2023-03-10T18:45:00Z",
      "tipo": "guest"
    }
  ],
  
  "historial_compras": {
    "total_ordenes": 58,
    "ordenes_como_guest": 12,
    "ordenes_registrado": 46,
    "fecha_primera_compra": "2023-03-10T18:45:00Z",
    "fecha_ultima_compra": "2025-12-20T19:30:00Z",
    "dias_sin_compra": 24,
    "fecha_conversion": "2023-05-15T10:30:00Z",
    "dias_hasta_conversion": 66
  },
  
  "metricas_financieras": {
    "gasto_total": 1150000.00,
    "gasto_como_guest": 250000.00,
    "gasto_registrado": 900000.00,
    "ticket_promedio": 19827.59,
    "ticket_promedio_guest": 20833.33,
    "ticket_promedio_registrado": 19565.22
  },
  
  "comportamiento_compra": {
    "frecuencia_compra": "quincenal",
    "horarios_preferidos": {
      "almuerzo": 18,
      "cena": 40
    },
    "dias_preferidos": {
      "viernes": 15,
      "sabado": 20,
      "domingo": 12
    }
  },
  
  "productos_favoritos": [
    {
      "id_producto": 456,
      "nombre_producto": "Pizza Pepperoni",
      "veces_ordenado": 18,
      "monto_total": 360000.00,
      "ordenes_guest": 4,
      "ordenes_registrado": 14
    }
  ],
  
  "restaurantes_frecuentes": [
    {
      "id_restaurante": 125,
      "nombre_restaurante": "Pizza Express Centro",
      "ordenes": 28,
      "monto_total": 560000.00
    }
  ],
  
  "direcciones_entrega": [
    {
      "zona": "Centro",
      "direccion": "Av. Central, San José",
      "veces_usado": 30,
      "usado_como_guest": 5,
      "usado_registrado": 25
    }
  ],
  
  "analisis_identidad": {
    "numero_identidades": 2,
    "nombres_usados": ["Juan Pérez García", "Juan Perez"],
    "emails_usados": ["juan.perez@gmail.com", "jperez@hotmail.com"],
    "hay_inconsistencias": true,
    "es_cuenta_unica": false
  },
  
  "segmentacion": {
    "segmento_actual": "VIP",
    "lifetime_value": 1150000.00,
    "probabilidad_recompra": 0.85,
    "riesgo_churn": 0.15,
    "valor_conversion": 900000.00  // Cuánto gastó después de registrarse
  },
  
  "insights": {
    "patron_principal": "Compró como guest 12 veces antes de registrarse",
    "cambio_post_conversion": "Aumentó frecuencia de compra 2.3x",
    "productos_descubiertos_guest": ["Pizza Pepperoni"],
    "lealtad_post_registro": "Muy Alta",
    "canal_preferido": "WhatsApp"
  },
  
  "recomendaciones": {
    "accion_principal": "Mantener engagement - Cliente VIP convertido",
    "ofertas_sugeridas": [
      "Programa de puntos exclusivo",
      "Descuento por referir amigos"
    ],
    "riesgo_detalle": "Bajo - Cliente muy activo post-conversión"
  },
  
  "fecha_actualizacion": "2026-01-13T10:30:00Z"
}
```

#### 🎯 Casos de Uso Específicos

##### 1. **Identificar Guests Potenciales para Convertir**
```json
{
  "query": {
    "tipo_usuario": "guest",
    "ordenes_como_guest": { "gte": 3 },
    "gasto_como_guest": { "gte": 50000 }
  },
  "accion": "Ofrecer beneficios por registrarse",
  "incentivo": "20% descuento en próxima orden + puntos retroactivos"
}
```

##### 2. **Detectar Cuentas Duplicadas**
```json
{
  "query": {
    "tipo_usuario": "multiple",
    "numero_identidades": { "gte": 2 }
  },
  "accion": "Consolidar cuentas",
  "beneficio": "Unificar historial y puntos de lealtad"
}
```

##### 3. **Análisis de Conversión**
```json
{
  "query": {
    "tipo_usuario": "convertido",
    "dias_hasta_conversion": { "lte": 90 }
  },
  "analisis": "Qué motivó la conversión rápida",
  "aplicacion": "Replicar estrategia con otros guests"
}
```

##### 4. **Reactivación por WhatsApp**
```json
{
  "query": {
    "dias_sin_compra": { "gte": 30, "lte": 60 },
    "gasto_total": { "gte": 200000 }
  },
  "canal": "WhatsApp Business",
  "mensaje": "Hola [nombre]! Tu [producto_favorito] te extraña 😊"
}
```

#### 📊 Métricas Clave

| Métrica | Descripción | Uso |
|---------|-------------|-----|
| **Tasa de Conversión** | % de guests que se registran | Medir efectividad de incentivos |
| **Tiempo hasta Conversión** | Días entre primera compra y registro | Optimizar momento de oferta |
| **Valor Post-Conversión** | Gasto después de registrarse | ROI de estrategia de conversión |
| **Guests Activos** | Compradores frecuentes sin cuenta | Target principal para conversión |
| **Multiplicidad** | Mismo teléfono, múltiples cuentas | Limpieza de datos |

#### 🔄 Actualización

- **Frecuencia**: Diaria (incluye compras del día)
- **Fuentes**: tbFactura, tbClientes, tbClientesDireccion
- **Proceso**: Agrupa por teléfono normalizado, identifica patrones
- **Validación**: Detecta inconsistencias en nombres/emails

---

## 📊 COMPARATIVA COMPLETA - 4 ÍNDICES AGREGADOS

| Índice | Enfoque | Multi-Compañía | Incluye Guests | Actualización | Uso Principal |
|--------|---------|----------------|----------------|---------------|---------------|
| **ventas_por_producto** | Productos | ✅ Campo `compania` | ✅ Sí | Diaria | Marketing productos |
| **ventas_por_restaurante** | Ubicación | ✅ Campo `compania` | ✅ Sí | Diaria | Operaciones |
| **ventas_por_cliente** | Cliente ID | ✅ Campo `compania` | ❌ No | Semanal | CRM registrados |
| **ventas_por_telefono** | Teléfono | ✅ **Array `companias`** | ✅ **Sí** | Diaria | CRM completo + Conversión |

**✨ Ventaja Clave**: 
- Todos los índices soportan filtrado por una o múltiples compañías
- El índice por teléfono es el único que puede tener múltiples compañías por registro
- Captura el 100% de las ventas, incluyendo el ~20-30% de compras guest

---

## 🚀 PRÓXIMOS PASOS

1. **Implementar agregaciones**: Desarrollar lógica de construcción
2. **Definir segmentaciones**: Criterios para VIP, frecuente, etc.
3. **Crear dashboards**: Visualizaciones para cada índice
4. **Automatizar actualizaciones**: Jobs diarios/semanales
5. **APIs de consulta**: Endpoints para cada tipo de análisis
6. **Integración WhatsApp**: Campañas automáticas por teléfono

**🎯 Con estos 4 índices agregados, ClickEat tendrá análisis completo a nivel de producto, restaurante, cliente registrado y usuario total (incluye guests).**

---

## 🏢 FILTRADO POR COMPAÑÍA (MULTI-TENANT)

### ✅ Todos los índices soportan filtrado por compañía

**Estructura de campos de compañía:**

```json
{
  "compania": {
    "id_compania": 3,
    "nombre_compania": "ClickEat Costa Rica",
    "pais": "Costa Rica"
  }
}
```

### 📋 Ejemplos de Filtrado por Compañía

#### **1. Filtrar productos de una compañía específica**
```json
GET /clickeat_ventas_por_producto/_search
{
  "query": {
    "term": {
      "compania.id_compania": 3
    }
  }
}
```

#### **2. Filtrar por múltiples compañías**
```json
GET /clickeat_ventas_por_producto/_search
{
  "query": {
    "terms": {
      "compania.id_compania": [3, 5, 7]
    }
  }
}
```

#### **3. Análisis comparativo entre compañías**
```json
GET /clickeat_ventas_por_restaurante/_search
{
  "size": 0,
  "aggs": {
    "por_compania": {
      "terms": {
        "field": "compania.nombre_compania"
      },
      "aggs": {
        "ingresos_totales": {
          "sum": {
            "field": "ingreso_total"
          }
        },
        "ordenes_totales": {
          "sum": {
            "field": "total_ordenes"
          }
        }
      }
    }
  }
}
```

#### **4. Top productos por compañía**
```json
GET /clickeat_ventas_por_producto/_search
{
  "query": {
    "term": {
      "compania.id_compania": 3
    }
  },
  "sort": [
    {
      "ingreso_total": "desc"
    }
  ],
  "size": 10
}
```

#### **5. Clientes VIP por compañía**
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
  }
}
```

#### **6. Usuarios que compraron en múltiples compañías** (índice de teléfono)
```json
GET /clickeat_ventas_por_telefono/_search
{
  "query": {
    "range": {
      "companias": {
        "size": {
          "gte": 2
        }
      }
    }
  }
}
```

### 🎯 Casos de Uso Multi-Compañía

#### **Reporte Consolidado - Todas las Compañías**
```json
{
  "reporte": "ventas_totales",
  "periodo": "2025-12",
  "companias": "todas",
  "metricas": [
    "ingresos_totales",
    "ordenes_totales",
    "clientes_activos",
    "productos_vendidos"
  ]
}
```

#### **Análisis Individual - Una Compañía**
```json
{
  "compania_id": 3,
  "nombre": "ClickEat Costa Rica",
  "filtros": {
    "todos_los_indices": true
  },
  "resultado": "Solo datos de ClickEat Costa Rica"
}
```

#### **Comparativa Regional**
```json
{
  "comparar": [
    "ClickEat Costa Rica",
    "ClickEat Colombia", 
    "ClickEat México"
  ],
  "metricas": [
    "ticket_promedio",
    "productos_top",
    "horarios_pico",
    "tasa_reactivacion"
  ]
}
```

### ⚙️ Configuración de Seguridad por Compañía

**Elasticsearch Security (opcional):**

```json
{
  "role": "clickeat_costarica_readonly",
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

**Beneficios:**
- ✅ **Aislamiento de datos**: Cada compañía solo ve sus datos
- ✅ **Queries optimizadas**: Filtros a nivel de índice
- ✅ **Reportes consolidados**: Fácil sumar datos de todas las compañías
- ✅ **Análisis comparativo**: Benchmarking entre regiones/países

---