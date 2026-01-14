# Exportaciones de Excel

Este directorio contiene los archivos Excel generados por la API.

Los archivos se nombran automáticamente como:
`clientes_inactivos_YYYY-MM-DD.xlsx`

## Formato del Excel

Cada archivo incluye:

### Hoja 1: "Clientes Inactivos"
- Lista completa de clientes
- Formato condicional por días sin comprar:
  - 🔴 Rojo: >180 días (crítico)
  - 🟡 Amarillo: >120 días (alerta)  
  - 🟠 Naranja: >90 días (atención)
- Filtros automáticos
- Columnas congeladas

### Hoja 2: "Resumen"
- Total de clientes inactivos
- Promedio de días sin comprar
- Ingresos potenciales perdidos
- Fecha de generación

## Limpiar archivos antiguos

```bash
rm exports/*.xlsx
```
