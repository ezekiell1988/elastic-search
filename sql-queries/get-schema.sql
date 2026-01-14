-- =========================================================
-- CONSULTA DE SCHEMA DE TABLAS - ClickEat Database
-- =========================================================
-- Este script consulta el schema completo de las tablas principales
-- para entender la estructura antes de migrar a Elasticsearch
-- =========================================================

-- Tablas a analizar:
-- 1. tbFactura (Facturas/Órdenes)
-- 2. tbFacturaDetalle (Productos en la factura)
-- 3. tbFacturaIngredientes (Ingredientes personalizados)
-- 4. tbClientes (Clientes)
-- 5. tbClientesDireccion (Direcciones de clientes)
-- 6. tbCatalogo (Catálogo de productos)
-- 7. tbCompania (Compañías/Empresas)
-- 8. tbRestaurantes (Restaurantes)

PRINT '========================================';
PRINT 'ANÁLISIS DE SCHEMA - TABLAS CLICKEAT';
PRINT '========================================';
PRINT '';

-- =========================================================
-- 1. TABLA: tbFactura
-- =========================================================
PRINT '1. SCHEMA DE tbFactura';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbFactura'
ORDER BY c.ORDINAL_POSITION;

-- Contar registros
SELECT COUNT(*) AS 'Total_Registros' FROM tbFactura;

PRINT '';
GO

-- =========================================================
-- 2. TABLA: tbFacturaDetalle
-- =========================================================
PRINT '2. SCHEMA DE tbFacturaDetalle';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbFacturaDetalle'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbFacturaDetalle;

PRINT '';
GO

-- =========================================================
-- 3. TABLA: tbFacturaIngredientes
-- =========================================================
PRINT '3. SCHEMA DE tbFacturaIngredientes';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbFacturaIngredientes'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbFacturaIngredientes;

PRINT '';
GO

-- =========================================================
-- 4. TABLA: tbClientes
-- =========================================================
PRINT '4. SCHEMA DE tbClientes';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbClientes'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbClientes;

PRINT '';
GO

-- =========================================================
-- 5. TABLA: tbClientesDireccion
-- =========================================================
PRINT '5. SCHEMA DE tbClientesDireccion';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbClientesDireccion'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbClientesDireccion;

PRINT '';
GO

-- =========================================================
-- 6. TABLA: tbCatalogo
-- =========================================================
PRINT '6. SCHEMA DE tbCatalogo';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbCatalogo'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbCatalogo;

PRINT '';
GO

-- =========================================================
-- 7. TABLA: tbCompania
-- =========================================================
PRINT '7. SCHEMA DE tbCompania';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbCompania'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbCompania;

PRINT '';
GO

-- =========================================================
-- 8. TABLA: tbRestaurantes
-- =========================================================
PRINT '8. SCHEMA DE tbRestaurantes';
PRINT '----------------------------------------';

SELECT 
    c.COLUMN_NAME AS 'Columna',
    c.DATA_TYPE AS 'Tipo',
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR)
        ELSE CAST(c.NUMERIC_PRECISION AS VARCHAR)
    END AS 'Longitud',
    c.IS_NULLABLE AS 'Nullable',
    ISNULL(c.COLUMN_DEFAULT, '') AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'tbRestaurantes'
ORDER BY c.ORDINAL_POSITION;

SELECT COUNT(*) AS 'Total_Registros' FROM tbRestaurantes;

PRINT '';
GO

-- =========================================================
-- RELACIONES ENTRE TABLAS (Foreign Keys)
-- =========================================================
PRINT '========================================';
PRINT 'FOREIGN KEYS Y RELACIONES';
PRINT '========================================';

SELECT 
    FK.TABLE_NAME AS 'Tabla',
    CU.COLUMN_NAME AS 'Columna_FK',
    PK.TABLE_NAME AS 'Tabla_Referenciada',
    PT.COLUMN_NAME AS 'Columna_Referenciada',
    C.CONSTRAINT_NAME AS 'Nombre_Constraint'
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS C
INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS FK 
    ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS PK 
    ON C.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE CU 
    ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE PT 
    ON PT.CONSTRAINT_NAME = PK.CONSTRAINT_NAME
WHERE FK.TABLE_NAME IN (
    'tbFactura', 
    'tbFacturaDetalle', 
    'tbFacturaIngredientes',
    'tbClientes',
    'tbClientesDireccion',
    'tbCatalogo',
    'tbCompania',
    'tbRestaurantes'
)
ORDER BY FK.TABLE_NAME, CU.COLUMN_NAME;

GO

PRINT '';
PRINT '========================================';
PRINT 'ANÁLISIS COMPLETADO';
PRINT '========================================';
