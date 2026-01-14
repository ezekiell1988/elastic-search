-- Detectar campos de fecha en todas las tablas para sincronización incremental
SELECT 
  t.name AS Tabla,
  c.name AS Columna,
  ty.name AS Tipo_Dato,
  CASE 
    WHEN c.name LIKE '%fecha%' OR c.name LIKE '%date%' OR c.name LIKE '%time%' THEN '✅ CANDIDATO'
    WHEN ty.name IN ('datetime', 'datetime2', 'date', 'timestamp') THEN '✅ CANDIDATO' 
    ELSE ''
  END AS Para_Sync
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
AND (
  c.name LIKE '%fecha%' 
  OR c.name LIKE '%date%' 
  OR c.name LIKE '%time%'
  OR c.name LIKE '%created%'
  OR c.name LIKE '%modified%'
  OR c.name LIKE '%updated%'
  OR ty.name IN ('datetime', 'datetime2', 'date', 'timestamp')
)
ORDER BY t.name, c.column_id;