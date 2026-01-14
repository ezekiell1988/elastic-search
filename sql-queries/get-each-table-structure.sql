-- tbClientes
SELECT 
  'tbClientes' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbClientes'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbFactura  
SELECT 
  'tbFactura' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbFactura'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbFacturaDetalle
SELECT 
  'tbFacturaDetalle' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbFacturaDetalle'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbClientesDireccion
SELECT 
  'tbClientesDireccion' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbClientesDireccion'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbCompania
SELECT 
  'tbCompania' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbCompania'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbRestaurantes
SELECT 
  'tbRestaurantes' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbRestaurantes'
AND ty.name != 'sysname'
ORDER BY c.column_id;

-- tbFacturaIngredientes
SELECT 
  'tbFacturaIngredientes' as Tabla,
  c.name AS Columna,
  ty.name AS Tipo,
  c.max_length AS Longitud
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.system_type_id = ty.system_type_id
WHERE t.name = 'tbFacturaIngredientes'
AND ty.name != 'sysname'
ORDER BY c.column_id;