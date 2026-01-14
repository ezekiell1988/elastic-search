# SQL Scripts - ClickEat Database

Esta carpeta contiene scripts SQL para analizar y extraer datos de la base de datos ClickEat.

## Scripts Disponibles

### 1. `get-schema.sql`
Consulta el schema completo de las tablas principales:
- tbFactura (Facturas/Órdenes)
- tbFacturaDetalle (Productos en la factura)
- tbFacturaIngredientes (Ingredientes personalizados)
- tbClientes (Clientes)
- tbClientesDireccion (Direcciones de clientes)
- tbCatalogo (Catálogo de productos)
- tbCompania (Compañías/Empresas)
- tbRestaurantes (Restaurantes)

**Uso:**
```bash
npm run sql get-schema.sql
# o
node src/scripts/execute-sql.js get-schema.sql
```

### 2. `get-sample-data.sql`
Extrae datos de muestra de las tablas principales para análisis:
- Clientes con sus direcciones
- Facturas con detalles y cliente
- Detalles de facturas con productos
- Ingredientes de productos
- Catálogo de productos
- Restaurantes y compañías
- Análisis de clientes (última compra, frecuencia, etc.)

**Uso:**
```bash
npm run sql get-sample-data.sql
# o
node src/scripts/execute-sql.js get-sample-data.sql
```

## Cómo Ejecutar Scripts SQL

### Método 1: Usando npm
```bash
npm run sql <nombre-archivo.sql>
```

### Método 2: Usando node directamente
```bash
node src/scripts/execute-sql.js <nombre-archivo.sql>
```

### Método 3: Con ruta absoluta
```bash
node src/scripts/execute-sql.js /ruta/completa/al/archivo.sql
```

## Crear Nuevos Scripts

1. Crea un nuevo archivo `.sql` en esta carpeta
2. Usa `GO` para separar múltiples batches de comandos
3. Ejecuta usando los métodos descritos arriba

**Ejemplo de estructura:**
```sql
-- Consulta 1
SELECT * FROM tabla1;
GO

-- Consulta 2
SELECT * FROM tabla2;
GO
```

## Configuración

La conexión a la base de datos se configura en el archivo `.env`:
```
DB_HOST_CLICKEAT=<host>
DB_USER_CLICKEAT=<usuario>
DB_PASSWORD_CLICKEAT=<contraseña>
DB_DATABASE_CLICKEAT=<base de datos>
DB_PORT_CLICKEAT=<puerto>
```

## Notas

- Los scripts usan la biblioteca `mssql` para conectarse a SQL Server
- Soporta múltiples batches separados por `GO`
- Muestra resultados en formato tabla para fácil visualización
- Timeout de conexión: 30 segundos
- Timeout de consulta: 30 segundos
