# 📋 PLAN DE MIGRACIÓN COMPLETA - ClickEat

## 🎯 OBJETIVO
Migrar las **8 TABLAS** de ClickEat a Elasticsearch con datos anidados completos para análisis avanzado de reactivación de clientes.

---

## 📊 LAS 8 TABLAS Y SUS VOLÚMENES

| # | Tabla | Registros | Tipo | Target Index | Prioridad |
|---|-------|-----------|------|--------------|-----------|
| 1 | **tbClientes** | 773,700 | Principal | clickeat_clientes | 🔴 Alta |
| 2 | **tbClientesDireccion** | ~1.5M | Anidado | → clientes.direcciones[] | 🟡 Media |
| 3 | **tbFactura** | 879,962* | Principal | clickeat_ordenes | 🔴 Alta |
| 4 | **tbFacturaDetalle** | ~5M | Anidado | → ordenes.productos[] | 🟡 Media |
| 5 | **tbFacturaIngredientes** | ~500K | Anidado | → ordenes.ingredientes[] | 🟢 Baja |
| 6 | **tbCatalogo** | 2,427 | Principal | clickeat_productos | 🟡 Media |
| 7 | **tbCompania** | ~100 | Principal | clickeat_companias | 🟢 Baja |
| 8 | **tbRestaurantes** | ~500 | Principal | clickeat_restaurantes | 🟢 Baja |

**(*) Solo facturas con Pagado = 1**

---

## 🎭 ESTRATEGIA DE MIGRACIÓN

### 🟦 FASE 1: MIGRACIÓN BÁSICA (Para Reactivación)
**Objetivo:** Tener reactivación funcionando rápidamente
**Tiempo estimado:** ~20 minutos

```bash
npm run migrate:phase1
```

**Incluye:**
- ✅ tbClientes → Campos básicos (sin direcciones)
- ✅ tbFactura → Campos básicos (sin productos/ingredientes)  
- ✅ tbCatalogo → Productos básicos

**Resultado:** Sistema de reactivación 100% funcional

### 🟨 FASE 2: MIGRACIÓN COMPLETA (Datos Anidados)
**Objetivo:** Análisis completo con productos, direcciones
**Tiempo estimado:** ~45 minutos

```bash
npm run migrate:phase2
```

**Incluye:**
- 🔄 tbClientes + tbClientesDireccion → Con direcciones anidadas
- 🔄 tbFactura + tbFacturaDetalle → Con productos anidados
- ➕ tbCompania → Información de companias
- ➕ tbRestaurantes → Información de restaurantes

**Resultado:** Análisis completo: qué compran, dónde viven, etc.

### 🟩 FASE 3: MIGRACIÓN AVANZADA (Ingredientes + Metadatos)
**Objetivo:** Análisis de ingredientes y configuraciones
**Tiempo estimado:** ~15 minutos

```bash
npm run migrate:phase3  
```

**Incluye:**
- 🔄 tbFactura + tbFacturaIngredientes → Con ingredientes
- 🔄 tbCompania → Campos completos (194 columnas)
- 🔄 Optimización de índices

**Resultado:** Sistema completo con análisis de ingredientes

---

## 📋 DOCUMENTOS ELASTICSEARCH RESULTANTES

### clickeat_clientes
```json
{
  "id_cliente": 12345,
  "nombre": "Juan Pérez",
  "correo": "juan@email.com",
  "telefono": "+506-8888-8888", 
  "cedula": "123456789",
  "estado": 1,
  "fecha_creacion": "2023-01-15T10:30:00Z",
  "id_compania": 3,
  "balance": 5000.00,
  "puntos": 120.50,
  "direcciones": [                    // ← FASE 2
    {
      "id_direccion": 1,
      "nombre_contacto": "Juan Pérez",
      "telefono_contacto": "+506-7777-7777",
      "direccion": "100m norte del BCR",
      "provincia": "San José", 
      "canton": "San José",
      "distrito": "Carmen"
    }
  ]
}
```

### clickeat_ordenes  
```json
{
  "id_factura": 45678,
  "id_cliente": 12345,
  "nombre_cliente": "Juan Pérez", 
  "correo_cliente": "juan@email.com",
  "fecha_facturado": "2025-07-20T14:30:00Z",
  "fecha_entregado": "2025-07-20T15:45:00Z",
  "estado_factura": 5,
  "monto_total": 15000.00,
  "impuesto_ventas": 1950.00,
  "costo_entrega": 800.00,
  "descuento": 0.00,
  "moneda": "CRC",
  "pagado": true,                     // ← Solo true (filtrado)
  "id_restaurante": 125,
  "id_compania": 3,
  "productos": [                      // ← FASE 2
    {
      "id_detalle": 1,
      "id_producto": 789,
      "nombre_producto": "Hamburguesa Clásica",
      "cantidad": 2,
      "precio": 4500.00,
      "monto_total": 9000.00
    },
    {
      "id_detalle": 2, 
      "id_producto": 790,
      "nombre_producto": "Coca Cola 355ml",
      "cantidad": 2,
      "precio": 750.00,
      "monto_total": 1500.00
    }
  ],
  "ingredientes": [                   // ← FASE 3
    {
      "id_ingrediente": 101,
      "nombre_ingrediente": "Carne 150g",
      "cantidad": 2
    },
    {
      "id_ingrediente": 102, 
      "nombre_ingrediente": "Queso cheddar",
      "cantidad": 2
    }
  ]
}
```

### clickeat_productos
```json
{
  "id_producto": 789,
  "codigo": "HAM-001",
  "nombre": "Hamburguesa Clásica", 
  "descripcion": "Carne, queso, lechuga, tomate",
  "foto_url": "/images/hamburguesa.jpg",
  "precio_venta": 4500.00,
  "id_compania": 3,
  "estado": 1
}
```

### clickeat_companias
```json
{
  "id_compania": 3,
  "nombre_compania": "ClickEat Costa Rica",
  "nombre_corto": "ClickEat CR", 
  "idioma_principal": "ES",
  "idioma_secundario": "EN"
  // + 189 campos más en FASE 3
}
```

### clickeat_restaurantes
```json
{
  "id_restaurante": 125,
  "nombre_restaurante": "Burger Palace Escazú",
  "direccion": "Plaza Atlantis, Escazú",
  "id_compania": 3
  // + campos adicionales
}
```

---

## ⚡ COMANDOS DE MIGRACIÓN

### Preparación
```bash
# Limpiar indices existentes
npm run migrate:clean

# Verificar conexiones
npm run test:connections
```

### Ejecución por Fases
```bash
# FASE 1: Básico (20 min)
npm run migrate:phase1
npm run query:reactivation  # Verificar que funciona

# FASE 2: Completo (45 min)  
npm run migrate:phase2
npm run query:advanced     # Análisis con productos/direcciones

# FASE 3: Avanzado (15 min)
npm run migrate:phase3
npm run query:ingredients  # Análisis con ingredientes
```

### Migración Completa (Todo junto)
```bash
# Una sola ejecución (~80 minutos)
npm run migrate:full:complete
```

---

## 🔍 NUEVAS CAPACIDADES DE ANÁLISIS

### Con Datos Básicos (FASE 1)
- ✅ Clientes inactivos por días
- ✅ Última compra por cliente
- ✅ Segmentación por actividad
- ✅ Top clientes por valor

### Con Datos Completos (FASE 2)
- ➕ **Análisis geográfico:** ¿Dónde viven los clientes inactivos?
- ➕ **Productos favoritos:** ¿Qué compraban antes de inactivarse?
- ➕ **Restaurantes preferidos:** ¿De cuáles ordenaban más?
- ➕ **Análisis de companias:** ¿Qué marcas prefieren?

### Con Datos Avanzados (FASE 3)
- ➕ **Ingredientes populares:** Alergias, preferencias
- ➕ **Configuraciones avanzadas:** Horarios, zonas de entrega
- ➕ **Análisis profundo:** Comportamientos complejos

---

## 📊 IMPACT ESTIMATION

### Storage Elasticsearch
- **FASE 1:** ~500 MB (básico)
- **FASE 2:** ~2 GB (con anidados)
- **FASE 3:** ~2.5 GB (completo)

### Tiempo de Migración
- **FASE 1:** ~20 minutos
- **FASE 2:** ~45 minutos  
- **FASE 3:** ~15 minutos
- **TOTAL:** ~80 minutos

### Impacto en SQL Server
- **Conexiones:** 1 persistente (pool)
- **Queries por segundo:** ~3-5 (con delays)
- **Impacto:** BAJO (solo lectura)

---

## 🚀 PRÓXIMOS PASOS

1. **Ahora:** ¿Empezamos con FASE 1 para tener reactivación con datos básicos?
2. **O prefieres:** ¿Migración completa directamente (FASE 2)?
3. **Desarrollar:** Scripts específicos para cada fase
4. **Configurar:** Comandos npm para cada fase
5. **Validar:** Queries de verificación para cada fase

**¿Con cuál fase quieres empezar?** 🤔