-- =========================================================
-- CONSULTA DE DATOS DE MUESTRA - ClickEat Database
-- =========================================================
-- Este script extrae datos de las tablas principales
-- para análisis y migración a Elasticsearch
-- =========================================================

-- =========================================================
-- 1. CLIENTES CON SUS DIRECCIONES
-- =========================================================
SELECT TOP 100
    c.Id_cliente,
    c.Nombre,
    c.Cedula,
    c.Telefono,
    c.Correo,
    c.Fecha_registro,
    c.Estado,
    d.Id_direccion,
    d.Nombre_contacto,
    d.Telefono_contacto,
    d.Direccion,
    d.Provincia,
    d.Canton,
    d.Distrito
FROM tbClientes c
LEFT JOIN tbClientesDireccion d ON c.Id_cliente = d.Id_cliente
ORDER BY c.Fecha_registro DESC;

GO

-- =========================================================
-- 2. FACTURAS CON DETALLES Y CLIENTE
-- =========================================================
SELECT TOP 100
    f.Id_factura,
    f.Id_cliente,
    c.Nombre AS Nombre_cliente,
    c.Correo AS Correo_cliente,
    f.Fecha_factura,
    f.Fecha_entrega,
    f.Estado_pedido,
    f.Monto_total,
    f.Monto_subtotal,
    f.Monto_envio,
    f.Monto_descuento,
    f.Moneda,
    f.Tipo_pago,
    f.Id_restaurante,
    r.Nombre_restaurante,
    f.Id_compania,
    comp.Nombre_compania
FROM tbFactura f
INNER JOIN tbClientes c ON f.Id_cliente = c.Id_cliente
LEFT JOIN tbRestaurantes r ON f.Id_restaurante = r.Id_restaurante
LEFT JOIN tbCompania comp ON f.Id_compania = comp.Id_compania
ORDER BY f.Fecha_factura DESC;

GO

-- =========================================================
-- 3. DETALLES DE FACTURAS CON PRODUCTOS
-- =========================================================
SELECT TOP 200
    fd.Id_detalle,
    fd.Id_factura,
    fd.Id_producto,
    cat.NombreCatalogo AS Nombre_producto,
    cat.Descripcion AS Descripcion_producto,
    fd.Cantidad,
    fd.Precio_unitario,
    fd.MontoTotal,
    fd.Comentario
FROM tbFacturaDetalle fd
INNER JOIN tbCatalogo cat ON fd.Id_producto = cat.Id_producto
ORDER BY fd.Id_factura DESC;

GO

-- =========================================================
-- 4. INGREDIENTES DE PRODUCTOS EN FACTURAS
-- =========================================================
SELECT TOP 200
    fi.Id_ingrediente,
    fi.Id_detalle,
    fi.Id_producto,
    cat.NombreCatalogo AS Nombre_ingrediente,
    fi.Cantidad,
    fi.Precio,
    fi.MontoTotal
FROM tbFacturaIngredientes fi
INNER JOIN tbCatalogo cat ON fi.Id_producto = cat.Id_producto
ORDER BY fi.Id_detalle DESC;

GO

-- =========================================================
-- 5. CATÁLOGO DE PRODUCTOS
-- =========================================================
SELECT TOP 500
    Id_producto,
    Codigo,
    NombreCatalogo,
    Descripcion,
    Precio_venta,
    TipoNodo,
    Id_compania,
    Estado,
    Foto_producto,
    Padre
FROM tbCatalogo
WHERE Estado = 1
ORDER BY NombreCatalogo;

GO

-- =========================================================
-- 6. RESTAURANTES
-- =========================================================
SELECT 
    Id_restaurante,
    Nombre_restaurante,
    Telefono,
    Correo_restaurante,
    Tipo,
    Horario_atencion,
    Estado,
    Id_compania
FROM tbRestaurantes
WHERE Estado = 1;

GO

-- =========================================================
-- 7. COMPAÑÍAS
-- =========================================================
SELECT 
    Id_compania,
    Nombre_compania,
    Nombrecorto_compania,
    Telefono,
    Correo,
    Estado
FROM tbCompania
WHERE Estado = 1;

GO

-- =========================================================
-- 8. ANÁLISIS DE CLIENTES - ÚLTIMA COMPRA Y FRECUENCIA
-- =========================================================
SELECT TOP 100
    c.Id_cliente,
    c.Nombre,
    c.Correo,
    c.Telefono,
    c.Fecha_registro,
    COUNT(f.Id_factura) AS Total_ordenes,
    MAX(f.Fecha_factura) AS Ultima_compra,
    DATEDIFF(DAY, MAX(f.Fecha_factura), GETDATE()) AS Dias_sin_comprar,
    SUM(f.Monto_total) AS Total_gastado,
    AVG(f.Monto_total) AS Promedio_por_orden
FROM tbClientes c
LEFT JOIN tbFactura f ON c.Id_cliente = f.Id_cliente
GROUP BY 
    c.Id_cliente,
    c.Nombre,
    c.Correo,
    c.Telefono,
    c.Fecha_registro
HAVING COUNT(f.Id_factura) > 0
ORDER BY Ultima_compra DESC;

GO
