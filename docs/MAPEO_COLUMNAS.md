# Mapeo de Columnas - Base de Datos ClickEat

Este documento muestra el mapeo entre las columnas de SQL Server y la estructura esperada en Elasticsearch.

**📋 TABLAS A MIGRAR:**
- tbClientes (+ direcciones)
- tbFactura (+ detalle + ingredientes) 
- tbCatalogo (productos)
- tbCompania
- tbRestaurantes

---

## 1. tbClientes

**Columnas encontradas:**
- `Id_cliente`
- `Nombre`
- `Cedula`
- `Telefono`
- `Correo`
- `Estado`
- `FechaCreacion` (NO `Fecha_registro`)
- `Id_compania`
- `BalanceCliente`
- `Puntos`

## tbFactura

**Columnas encontradas:**
- `Id_factura`
- `Id_cliente`
- `Moneda`
- `Tipo_cambio`
- `Descuento`
- `ImpuestoVentas`
- `MontoTotal` (NO `Monto_total`)
- `Pagado`
- `Fecha_facturado` (NO `Fecha_factura`)
- `Fecha_pagado`
- `Fecha_entregado`
- `Costo_entrega` (NO `Monto_envio`)
- `Costo_mensajeria`
- `EstadoFactura` (NO `Estado_pedido`)
- `Id_restaurante`
- `Id_compania`
- `Nombre` (nombre del cliente/receptor)
- `Correo_facturacion`

## tbFacturaDetalle

**Columnas encontradas:**
- `Id_detalle`
- `Id_factura`
- `Id_producto`
- `Comentario`
- `MontoTotal`
- `Cantidad`
- `Precio` (precio unitario)
- `ImpuestoVenta`
- `ImpuestoServicio`
- `Descuento`
- `Nombre_producto`

## tbClientesDireccion

**Columnas a verificar:**
- `Id_direccion`
- `Id_cliente`
- `Nombre_contacto`
- `Telefono_contacto`
- `Direccion`
- `Provincia`
- `Canton`
- `Distrito`

## Notas Importantes

1. **Nombres de columnas:** SQL Server usa mayúsculas/minúsculas mezcladas, no snake_case
2. **Fechas:** Usar `FechaCreacion` en lugar de `Fecha_registro`
3. **Montos:** Las columnas de monto están en PascalCase: `MontoTotal`, `Costo_entrega`
4. **Estado:** `EstadoFactura` para facturas, `Estado` para clientes
