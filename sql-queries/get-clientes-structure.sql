-- Solo tbClientes
SELECT 
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud,
  c.is_nullable AS Permite_NULL
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbClientes'
AND ty.name != 'sysname'
ORDER BY c.column_id;