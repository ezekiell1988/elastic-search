-- Ver primero las columnas disponibles
SELECT TOP 5 * FROM tbFactura WHERE Fecha_facturado IS NOT NULL;

-- Ver estadísticas de pagado
SELECT 
    Pagado,
    COUNT(*) AS Total,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Porcentaje
FROM tbFactura
WHERE Fecha_facturado IS NOT NULL
GROUP BY Pagado
ORDER BY Pagado;
