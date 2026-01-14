# 🚀 ClickEat Elasticsearch - Sistema Multiplataforma

Sistema completo de migración y sincronización incremental para ClickEat, compatible con **Windows, Mac y Linux**.

## 📁 ESTRUCTURA DEL PROYECTO

```
elastic-search/
├── src/scripts/           # 🔧 Scripts principales
│   ├── sync-manager.js         # Sistema de sincronización incremental
│   ├── setup-complete-system.js   # Configuración completa multiplataforma
│   ├── utils.js               # Menú interactivo de utilidades
│   ├── check-indices.js       # Verificación de índices
│   ├── demo-days-calculation.js   # Demo de cálculo dinámico
│   ├── migrate-simple.js      # Migración de prueba (5K registros)
│   ├── migrate-full.js        # Migración completa (879K registros)
│   └── query-customer-reactivation.js  # Consultas de reactivación
├── docs/                  # 📚 Documentación completa
│   ├── MAPEO_COLUMNAS_COMPLETO.md
│   ├── SISTEMA_SINCRONIZACION_AVANZADO.md
│   ├── CAMPOS_SINCRONIZACION.md
│   └── ESTADO_IMPLEMENTACION_COMPLETA.md
├── help.bat              # 🪟 Ayuda para Windows
├── help.sh               # 🐧 Ayuda para Unix/Mac
└── .sync-checkpoint.json # 📊 Estado de sincronización
```

## 🎯 COMANDOS PRINCIPALES

### 🔧 **Menú Interactivo (RECOMENDADO)**
```bash
npm run utils
```
Menú con todas las opciones disponibles de forma visual e interactiva.

### 📊 **Verificación y Detección**
```bash
npm run check:indices       # Estado actual de índices Elasticsearch
npm run sync:detect         # Detectar cambios pendientes de migración
npm run verify              # Verificación completa del sistema
```

### 🔄 **Sincronización**
```bash
npm run sync:incremental    # Sincronización completa incremental
npm run sync:clientes       # Solo sincronizar clientes
npm run sync:facturas       # Solo sincronizar facturas  
npm run sync:productos      # Solo sincronizar productos
npm run sync:rebuild        # Reconstruir índices agregados
```

### ⚙️ **Configuración**
```bash
npm run setup:complete      # Configuración completa del sistema
npm run setup               # Solo configurar índices base
```

### 🧮 **Demos y Pruebas**
```bash
npm run demo:days           # Demo de cálculo dinámico de días
npm run query:reactivation  # Ejecutar consultas de reactivación
```

### 🗑️ **Limpieza**
```bash
npm run migrate:clean       # Limpiar todos los índices
```

## 🚀 INICIO RÁPIDO

### 1. **Configuración Completa** (Primera vez)
```bash
npm run setup:complete
```

### 2. **Verificar Estado** (Uso diario)
```bash
npm run utils
```

### 3. **Sincronización** (Manual)
```bash
npm run sync:incremental
```

## 📊 CAPACIDADES DEL SISTEMA

### ✅ **Migración Inteligente**
- **Filtro crítico**: Solo órdenes pagadas (`Pagado = 1`)
- **8 tablas completas**: tbFactura, tbClientes, tbCatalogo, etc.
- **Objetos anidados**: Direcciones, ingredientes, detalles
- **879,962 órdenes** válidas (vs 1.06M con filtro previo)

### ✅ **Sincronización Incremental**
- **Detección automática** de cambios por tabla
- **Checkpoint tracking** con `.sync-checkpoint.json`
- **Estrategias múltiples**: date_field, max_id, relaciones
- **Estimación de tiempo** automática

### ✅ **Análisis Avanzado**
- **Reactivación inteligente** basada en historial
- **Productos con ingredientes** asociados
- **Performance por restaurante** y zona
- **Cálculo dinámico** de días sin compra

### ✅ **Multiplataforma**
- **Windows**: Archivos .bat, Task Scheduler
- **Mac/Linux**: Scripts .sh, crontab
- **Node.js puro**: Sin dependencias de SO

## 🔄 SINCRONIZACIÓN AUTOMÁTICA

### **Windows** (Task Scheduler)
```bat
# Ejecutar sync-daily.bat generado automáticamente
# O configurar manualmente con:
# Programa: node
# Argumentos: src/scripts/sync-manager.js sync
# Horario: Diario 2:00 AM
```

### **Mac/Linux** (Crontab)
```bash
# Agregar a crontab:
0 2 * * * cd /ruta/proyecto && npm run sync:incremental >> sync.log 2>&1
```

## 📈 ESTADO ACTUAL DETECTADO

```
🔢 Total registros nuevos: 1,656,268
⏱️  Tiempo estimado migración: ~9.2 horas

📋 TABLAS DETECTADAS:
   📁 tbClientes: 773,700 registros (FechaCreacion)
   📁 tbFactura: 879,962 registros (Fecha_facturado, Pagado=1)  
   📁 tbCatalogo: 2,427 productos
   📁 tbCompania: 8 compañías
   📁 tbRestaurantes: 171 restaurantes

📅 ÚLTIMA SINCRONIZACIÓN: Nunca (sistema nuevo)
```

## 🛠️ RESOLUCIÓN DE PROBLEMAS

### **Error de conexión SQL**
```bash
# Verificar variables de entorno:
echo $DB_HOST_CLICKEAT
echo $DB_DATABASE_CLICKEAT
```

### **Error de Elasticsearch**
```bash
# Verificar conexión:
npm run check:indices
```

### **Permisos en Windows**
```cmd
# Ejecutar como administrador:
# PowerShell -> "Ejecutar como administrador"
npm run utils
```

### **Logs de sincronización**
```bash
# Ver logs automáticos:
cat sync.log

# O desde el menú:
npm run utils  # Opción 9
```

## 🎯 CARACTERÍSTICAS TÉCNICAS

- **Node.js ES Modules**: Compatibilidad moderna
- **SQL Server**: Conexión con pool optimizado  
- **Elasticsearch Serverless**: Índices escalables
- **Colores en terminal**: Experiencia visual mejorada
- **Manejo de errores**: Recuperación automática
- **Cross-platform**: Windows/Mac/Linux

## 📚 DOCUMENTACIÓN ADICIONAL

- **[MAPEO_COLUMNAS_COMPLETO.md](docs/MAPEO_COLUMNAS_COMPLETO.md)** - Estructura de las 8 tablas
- **[SISTEMA_SINCRONIZACION_AVANZADO.md](docs/SISTEMA_SINCRONIZACION_AVANZADO.md)** - Arquitectura técnica
- **[CAMPOS_SINCRONIZACION.md](docs/CAMPOS_SINCRONIZACION.md)** - Queries y estrategias
- **[ESTADO_IMPLEMENTACION_COMPLETA.md](docs/ESTADO_IMPLEMENTACION_COMPLETA.md)** - Estado del proyecto

## 🔗 ENLACES ÚTILES

| Comando | Descripción | Plataforma |
|---------|-------------|------------|
| `npm run utils` | Menú interactivo | 🌐 Todas |
| `./help.sh` | Ayuda rápida | 🐧 Mac/Linux |
| `help.bat` | Ayuda rápida | 🪟 Windows |
| `npm run setup:complete` | Setup inicial | 🌐 Todas |

---

**💡 TIP**: Usa `npm run utils` para un menú visual interactivo con todas las opciones disponibles.

🚀 **¡Sistema listo para usar en cualquier plataforma!**