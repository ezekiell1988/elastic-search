-- ===================================================
-- ANÁLISIS DE IMPACTO DE MIGRACIÓN
-- ===================================================

-- 1. Total de registros a migrar
SELECT 
  'CLIENTES' AS Entidad,
  COUNT(*) AS Total_Registros,
  CAST(COUNT(*) / 5000.0 AS DECIMAL(10,2)) AS Batches_SQL,
  CAST(COUNT(*) / 5000.0 * 2 AS DECIMAL(10,2)) AS Tiempo_Estimado_Segundos
FROM tbClientes

UNION ALL

SELECT 
  'ORDENES (PAGADAS)',
  COUNT(*),
  CAST(COUNT(*) / 5000.0 AS DECIMAL(10,2)),
  CAST(COUNT(*) / 5000.0 * 3 AS DECIMAL(10,2))
FROM tbFactura
WHERE Fecha_facturado IS NOT NULL AND Pagado = 1

UNION ALL

SELECT 
  'PRODUCTOS',
  COUNT(*),
  CAST(COUNT(*) / 5000.0 AS DECIMAL(10,2)),
  CAST(COUNT(*) / 5000.0 * 2 AS DECIMAL(10,2))
FROM tbCatalogo;

-- 2. Tamaño aproximado de datos
SELECT 
  'TAMAÑO_ESTIMADO' AS Metrica,
  CAST(SUM(row_count * avg_record_size_in_bytes) / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS MB_Aproximados
FROM (
  SELECT 
    SUM(p.rows) AS row_count,
    8000 AS avg_record_size_in_bytes
  FROM sys.tables t
  INNER JOIN sys.partitions p ON t.object_id = p.object_id
  WHERE t.name IN ('tbClientes', 'tbFactura', 'tbCatalogo')
    AND p.index_id IN (0,1)
) AS sizes;

-- 3. Pico de carga estimado (queries concurrentes)
SELECT 
  'PICO_CARGA' AS Metrica,
  '5000 registros cada 1-3 segundos' AS Descripcion,
  'SELECT con OFFSET/FETCH NEXT' AS Tipo_Query,
  'Impacto: BAJO (solo lectura)' AS Impacto;

-- 4. Índices que se usarán
SELECT 
  OBJECT_NAME(i.object_id) AS Tabla,
  i.name AS Indice,
  i.type_desc AS Tipo,
  CASE 
    WHEN i.name LIKE '%Id_cliente%' OR i.name LIKE '%Id_factura%' OR i.name LIKE '%PK%' THEN 'UTILIZADO'
    ELSE 'NO UTILIZADO'
  END AS Uso_Migracion
FROM sys.indexes i
WHERE OBJECT_NAME(i.object_id) IN ('tbClientes', 'tbFactura', 'tbFacturaDetalle', 'tbCatalogo')
  AND i.type_desc != 'HEAP'
ORDER BY Tabla, Indice;
