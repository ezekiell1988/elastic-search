-- Verificar índices en tablas clave
SELECT 
  OBJECT_NAME(i.object_id) AS Tabla,
  i.name AS Indice,
  i.type_desc AS Tipo,
  COL_NAME(ic.object_id, ic.column_id) AS Columna,
  i.is_primary_key AS Es_PK,
  i.is_unique AS Es_Unico
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE OBJECT_NAME(i.object_id) IN ('tbClientes', 'tbFactura', 'tbFacturaDetalle', 'tbCatalogo')
  AND i.type_desc != 'HEAP'
ORDER BY Tabla, i.index_id, ic.key_ordinal;
