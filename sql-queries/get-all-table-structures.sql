-- Obtener estructura de todas las tablas a migrar
SELECT 
  t.name AS Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud,
  c.is_nullable AS Permite_NULL,
  c.is_identity AS Es_Identity
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name IN (
  'tbFactura',
  'tbFacturaDetalle', 
  'tbFacturaIngredientes',
  'tbClientes',
  'tbClientesDireccion',
  'tbCatalogo',
  'tbCompania',
  'tbRestaurantes'
)
AND ty.name != 'sysname'
ORDER BY t.name, c.column_id;