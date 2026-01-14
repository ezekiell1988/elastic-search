-- Estadísticas de facturas pagadas vs no pagadas
SELECT 
  Pagado,
  COUNT(*) AS Total_Facturas,
  CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbFactura WHERE Fecha_facturado IS NOT NULL) AS DECIMAL(5,2)) AS Porcentaje
FROM tbFactura
WHERE Fecha_facturado IS NOT NULL
GROUP BY Pagado
ORDER BY Pagado DESC;

-- Total general
SELECT 
  COUNT(*) AS Total_Facturas,
  SUM(CASE WHEN Pagado = 1 THEN 1 ELSE 0 END) AS Facturas_Pagadas,
  SUM(CASE WHEN Pagado = 0 THEN 1 ELSE 0 END) AS Facturas_No_Pagadas,
  CAST(SUM(CASE WHEN Pagado = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) AS Porcentaje_Pagadas
FROM tbFactura
WHERE Fecha_facturado IS NOT NULL;
