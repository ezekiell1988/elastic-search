-- Script para obtener los nombres exactos de columnas
-- de las tablas principales

PRINT 'Columnas de tbClientes:';
SELECT TOP 1 * FROM tbClientes;
GO

PRINT 'Columnas de tbFactura:';
SELECT TOP 1 * FROM tbFactura;
GO

PRINT 'Columnas de tbFacturaDetalle:';
SELECT TOP 1 * FROM tbFacturaDetalle;
GO
