# Mapeo de Columnas Completo - Base de Datos ClickEat

Este documento muestra el mapeo entre las columnas de SQL Server y la estructura esperada en Elasticsearch.

**📋 TABLAS A MIGRAR (8 TABLAS):**
1. **tbClientes** (773,700 registros)
2. **tbClientesDireccion** (~1.5M registros) → anidado en clientes
3. **tbFactura** (879,962 registros pagados) 
4. **tbFacturaDetalle** (~5M registros) → anidado en facturas
5. **tbFacturaIngredientes** (~500K registros) → anidado en facturas
6. **tbCatalogo** (2,427 productos)
7. **tbCompania** (~100 registros)
8. **tbRestaurantes** (~500 registros)

---

## 1. tbClientes → clickeat_clientes

**Estructura SQL Server confirmada:**
- `Id_cliente` (int, PK, identity) → `id_cliente`
- `Nombre` (nvarchar 200) → `nombre` 
- `Cedula` (nvarchar 100, nullable) → `cedula`
- `Telefono` (nvarchar 200) → `telefono`
- `Correo` (nvarchar 200) → `correo`
- `Estado` (int) → `estado`
- `FechaCreacion` (datetime) → `fecha_creacion`
- `Id_compania` (int) → `id_compania`
- `BalanceCliente` (decimal) → `balance`
- `Puntos` (decimal) → `puntos`

**Direcciones anidadas (desde tbClientesDireccion):**
- `direcciones[]` (nested object array)
  - `id_direccion` (int)
  - `nombre_contacto` (nvarchar 50)
  - `telefono_contacto` (nvarchar 50)
  - `direccion` (nvarchar 255)
  - `provincia` (nvarchar 100)
  - `canton` (nvarchar 100) 
  - `distrito` (nvarchar 100)

---

## 2. tbFactura → clickeat_ordenes

**Estructura SQL Server confirmada:**
- `Id_factura` (int, PK) → `id_factura`
- `Id_cliente` (int) → `id_cliente`
- `Nombre` (nvarchar, nombre cliente/receptor) → `nombre_cliente`
- `Correo_facturacion` (nvarchar) → `correo_cliente`
- `Fecha_facturado` (datetime) → `fecha_facturado` ⚠️ SOLO SI Pagado = 1
- `Fecha_entregado` (datetime) → `fecha_entregado`
- `EstadoFactura` (int) → `estado_factura`
- `MontoTotal` (decimal) → `monto_total`
- `ImpuestoVentas` (decimal) → `impuesto_ventas`
- `Costo_entrega` (decimal) → `costo_entrega`
- `Descuento` (decimal) → `descuento`
- `Moneda` (nvarchar) → `moneda`
- `Pagado` (bit) → `pagado` ⚠️ FILTRO: Solo migrar si Pagado = 1
- `Id_restaurante` (int) → `id_restaurante`
- `Id_compania` (int) → `id_compania`

**Productos anidados (desde tbFacturaDetalle):**
- `productos[]` (nested object array)
  - `id_detalle` (int)
  - `id_producto` (int)
  - `nombre_producto` (nvarchar)
  - `cantidad` (decimal)
  - `precio` (decimal, precio unitario)
  - `monto_total` (decimal, cantidad × precio)

**Ingredientes anidados (desde tbFacturaIngredientes):**
- `ingredientes[]` (nested object array)
  - `id_ingrediente` (int)
  - `nombre_ingrediente` (nvarchar)
  - `cantidad` (decimal)

---

## 3. tbCatalogo → clickeat_productos

**Estructura SQL Server confirmada:**
- `Id_producto` (int, PK, identity) → `id_producto`
- `Codigo` (nvarchar 255, nullable) → `codigo`
- `NombreCatalogo` (nvarchar 500) → `nombre`
- `Descripcion` (nvarchar 500, nullable) → `descripcion`
- `Foto_producto` (nvarchar 255) → `foto_url`
- `Precio_venta` → `precio_venta` (por confirmar)
- `Id_compania` → `id_compania` (por confirmar)
- `Estado` → `estado` (por confirmar)

---

## 4. tbClientesDireccion → (anidado en clientes)

**Estructura SQL Server confirmada:**
- `Id_direccion` (int, PK)
- `Id_cliente` (int, FK) ← Relación con tbClientes
- `Nombre_contacto` (nvarchar 50)
- `Telefono_contacto` (nvarchar 50)  
- `Direccion` (nvarchar 255)
- `Provincia` (nvarchar 50)
- `Canton` (nvarchar 50)
- `Distrito` (nvarchar 50)
- + otros campos por confirmar...

**Mapeo:** Se incluirá como array anidado en el documento del cliente.

---

## 5. tbCompania → clickeat_companias

**Estructura SQL Server confirmada (194 columnas!):**
- `Id_compania` (int, PK) → `id_compania`
- `Nombre_compania` (nvarchar 200) → `nombre_compania`
- `Nombrecorto_compania` (nvarchar 20) → `nombre_corto`
- `Idioma_principal` (nvarchar 20) → `idioma_principal`
- `Idioma_secundario` (nvarchar 20) → `idioma_secundario`
- + 189 columnas adicionales (direcciones, contactos, configuraciones, etc.)

⚠️ **NOTA:** Esta tabla tiene muchos campos. Migraremos solo los esenciales inicialmente.

---

## 6. tbRestaurantes → clickeat_restaurantes

**Estructura por confirmar:**
- `Id_restaurante` (int, PK) → `id_restaurante`
- `Nombre_restaurante` → `nombre_restaurante`
- `Direccion` → `direccion`
- `Id_compania` (int, FK) → `id_compania`
- + campos adicionales por confirmar...

---

## 7. tbFacturaDetalle → (anidado en ordenes)

**Estructura SQL Server confirmada:**
- `Id_detalle` (int, PK)
- `Id_factura` (int, FK) ← Relación con tbFactura
- `Id_producto` (int, FK)
- `Nombre_producto` (nvarchar)
- `Cantidad` (decimal)
- `Precio` (decimal, precio unitario)
- `MontoTotal` (decimal, cantidad × precio)
- `Comentario` (nvarchar)
- `ImpuestoVenta` (decimal)
- `ImpuestoServicio` (decimal)
- `Descuento` (decimal)

**Mapeo:** Se incluirá como array anidado en el documento de la factura.

---

## 8. tbFacturaIngredientes → (anidado en ordenes)

**Estructura por confirmar:**
- `Id_detalle` (int, FK a tbFacturaDetalle)
- `Id_ingrediente` (int)
- `Nombre_ingrediente` (nvarchar)
- `Cantidad` (decimal)
- + campos adicionales por confirmar...

**Mapeo:** Se incluirá como array anidado en el documento de la factura.

---

## ⚠️ FILTROS CRÍTICOS DE MIGRACIÓN

### 1. Solo Facturas Pagadas
```sql
WHERE f.Pagado = 1 AND f.Fecha_facturado IS NOT NULL
```
**Resultado:** 879,962 facturas (82.3% del total)  
**Excluye:** 187,143 intentos fallidos + 2,312 sin dato

### 2. Solo Clientes Activos
```sql
WHERE c.Estado = 1  -- Por confirmar valor de "activo"
```

### 3. Solo Productos Activos
```sql
WHERE p.Estado = 1  -- Por confirmar valor de "activo"
```

---

## 📊 VOLUMEN DE DATOS ESTIMADO (8 TABLAS)

| # | Tabla | Registros | Elasticsearch Index | Tipo | Prioridad |
|---|-------|-----------|-------------------|------|-----------|
| 1 | **tbClientes** | 773,700 | clickeat_clientes | Principal | 🔴 Alta |
| 2 | **tbClientesDireccion** | ~1.5M | (anidado en clientes) | Anidado | 🟡 Media |
| 3 | **tbFactura** | 879,962 | clickeat_ordenes | Principal | 🔴 Alta |
| 4 | **tbFacturaDetalle** | ~5M | (anidado en ordenes) | Anidado | 🟡 Media |
| 5 | **tbFacturaIngredientes** | ~500K | (anidado en ordenes) | Anidado | 🟢 Baja |
| 6 | **tbCatalogo** | 2,427 | clickeat_productos | Principal | 🟡 Media |
| 7 | **tbCompania** | ~100 | clickeat_companias | Principal | 🟢 Baja |
| 8 | **tbRestaurantes** | ~500 | clickeat_restaurantes | Principal | 🟢 Baja |

**Total estimado:** ~8M registros → ~1.6M documentos ES (con anidación)

---

## 💡 ESTRATEGIA DE MIGRACIÓN

### Fase 1: Migración Básica (Para Reactivación)
1. ✅ **tbClientes** → Solo campos básicos, sin direcciones
2. ✅ **tbFactura** → Solo campos básicos, sin productos ni ingredientes  
3. ✅ **tbCatalogo** → Productos básicos

### Fase 2: Migración Completa (Datos Anidados)
1. **tbClientes + tbClientesDireccion** → Con direcciones anidadas
2. **tbFactura + tbFacturaDetalle + tbFacturaIngredientes** → Con productos e ingredientes
3. **tbCompania** → Solo campos esenciales
4. **tbRestaurantes** → Información básica

### Fase 3: Migración Avanzada (Metadatos)
1. **tbCompania** → Campos completos (194 columnas)
2. **Relaciones** → Enlaces entre restaurantes, companias, etc.
3. **Optimización** → Desnormalización para consultas rápidas

---

## Notas Importantes

1. **Nombres de columnas:** SQL Server usa PascalCase: `MontoTotal`, `FechaCreacion`
2. **Fechas:** Usar nombres reales: `FechaCreacion`, `Fecha_facturado`
3. **Filtro crítico:** Solo `Pagado = 1` para análisis de reactivación correcto
4. **Anidación:** Direcciones, productos e ingredientes van como nested objects
5. **Prioridad:** Migrar primero clientes y facturas para reactivación
6. **tbCompania:** Tabla muy grande (194 columnas), migrar solo campos esenciales