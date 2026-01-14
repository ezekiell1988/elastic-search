# 🚀 INICIO RÁPIDO - 5 Minutos

## ¿Qué vas a lograr?
Identificar clientes inactivos, VIPs en riesgo y generar estrategias de reactivación automáticamente.

---

## Opción 1: Usar Datos Reales (ClickEat DB)

### Paso 1: Migración Rápida (8 segundos)
```bash
npm run migrate:simple
```

Esto migra:
- 1,000 clientes
- 5,000 órdenes

### Paso 2: Análisis de Reactivación
```bash
npm run query:reactivation
```

**¡Listo!** Verás:
- ✅ Última compra por cliente
- ✅ Clientes inactivos (>30 días)
- ✅ Segmentación (Activos, En Riesgo, Inactivos, Perdidos)
- ✅ Top clientes por valor
- ✅ VIPs en riesgo 🚨

---

## Opción 2: Migración Completa (1-2 horas)

### Para Producción: Migrar TODO

```bash
npm run migrate:full
```

Esto migra:
- 773,700 clientes
- 1,069,417 órdenes
- 2,427 productos

**Con checkpoints automáticos** - si se interrumpe, puedes reanudar:

```bash
npm run migrate:resume
```

### Validar Migración

```bash
npm run migrate:validate
```

Verifica que todos los datos coincidan entre SQL Server y Elasticsearch.

---

## 📊 Ver Resultados

### Análisis Completo
```bash
npm run query:reactivation
```

### Salida Esperada:

```
╔══════════════════════════════════════════════════════════════╗
║       📊 ANÁLISIS DE REACTIVACIÓN DE CLIENTES 📊           ║
║                   ClickEat Database                          ║
╚══════════════════════════════════════════════════════════════╝

🔍 Detectando índices disponibles...
✅ Usando índice: clickeat_ordenes_v2


═════════════════════════════════════════════════════════
📅 1. ÚLTIMA COMPRA POR CLIENTE (Top 10)
═════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ Cliente ID │ Nombre               │ Última Compra    │ Días │ Órdenes │ Total  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 12345      │ Juan Pérez           │ 15/12/2024       │   15 │     45  │ ₡89500 │
│ 67890      │ María González       │ 10/12/2024       │   20 │     32  │ ₡65200 │
└─────────────────────────────────────────────────────────────────────────────┘


═════════════════════════════════════════════════════════
⚠️  2. CLIENTES INACTIVOS (Más de 30 días)
═════════════════════════════════════════════════════════

Total de clientes inactivos: 15,234

┌──────────────────────────────────────────────────────────────────────────────────┐
│ ID      │ Nombre               │ Última Compra    │ Días │ Órdenes │ Gasto Total │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 98765   │ Carlos Ramírez       │ 15/08/2024       │  137 │     28  │ ₡520000    │
└──────────────────────────────────────────────────────────────────────────────────┘


═════════════════════════════════════════════════════════
📊 3. SEGMENTACIÓN DE CLIENTES POR ACTIVIDAD
═════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────┐
│ Segmento              │ Clientes │ Total Ventas (30d)    │
├────────────────────────────────────────────────────────────┤
│ 🟢 Activos (0-30d)     │   45,230 │ ₡125,450,000         │
│ 🟡 En Riesgo (30-90d)  │   12,456 │ ₡18,230,000          │
│ 🔴 Inactivos (90-180d) │    8,934 │ N/A                   │
│ ⚫ Perdidos (+180d)     │   15,678 │ N/A                   │
└────────────────────────────────────────────────────────────┘

💡 RECOMENDACIONES:

   • Campaña de retención: 12,456 clientes en riesgo
     Descuentos del 15-20% en próxima compra

   • Campaña de reactivación: 8,934 clientes inactivos
     Cupones especiales + recordatorio de productos favoritos


═════════════════════════════════════════════════════════
🚨 5. CLIENTES VIP EN RIESGO (Alto valor + Inactivos)
═════════════════════════════════════════════════════════

Total de VIPs en riesgo: 23

┌─────────────────────────────────────────────────────────────────────────────────┐
│ ID      │ Nombre               │ Total Gastado │ Órdenes │ Días sin comprar │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 45678   │ Roberto Vargas       │ ₡2,340,000   │     156 │               67 │
└─────────────────────────────────────────────────────────────────────────────────┘

🎯 ACCIÓN INMEDIATA:
   • Contacto personalizado por gerente de cuenta
   • Descuento VIP exclusivo del 30%
   • Regalo especial en próxima compra


✅ Análisis completado exitosamente
```

---

## 🎯 Próximos Pasos

### 1. Revisar VIPs en Riesgo
Los clientes más valiosos que están dejando de comprar.

**Acción:**
- Llamar personalmente
- Ofrecer descuento VIP 30%
- Dar regalo en próxima compra

### 2. Campaña para Clientes en Riesgo
Clientes que van camino a la inactividad.

**Acción:**
- Email: "Te extrañamos"
- Descuento 15-20%
- Urgencia: 7 días

### 3. Reactivar Clientes Inactivos
Clientes que llevan 3-6 meses sin comprar.

**Acción:**
- Email: "Vuelve y recibe regalo"
- Descuento 25% + envío gratis
- Recordar productos favoritos

---

## 📈 Medir Resultados

### Después de tu primera campaña:

```bash
# Ejecutar análisis nuevamente
npm run query:reactivation

# Comparar:
# - ¿Cuántos clientes salieron de "En Riesgo"?
# - ¿Cuántos inactivos compraron?
# - ¿Cuántos VIPs se reactivaron?
```

---

## 🔄 Automatizar (Opcional)

### Ejecutar Todos los Días a las 8 AM

**Linux/Mac:**
```bash
crontab -e

# Agregar:
0 8 * * * cd /ruta/a/proyecto && npm run query:reactivation >> logs/reactivation.log 2>&1
```

**Windows (PowerShell como Admin):**
```powershell
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run query:reactivation" -WorkingDirectory "C:\ruta\a\proyecto"
$trigger = New-ScheduledTaskTrigger -Daily -At 8am
Register-ScheduledTask -TaskName "Reactivacion-Clientes" -Action $action -Trigger $trigger
```

---

## 🆘 ¿Problemas?

### "No se encontraron índices"
```bash
# Solución: Ejecutar migración primero
npm run migrate:simple
```

### "Connection error"
```bash
# Solución: Verificar .env
cat .env

# Asegurar que existan:
# - ELASTIC_CLOUD_ID
# - ELASTIC_API_KEY
# - DB_HOST_CLICKEAT
# - DB_USER_CLICKEAT
# - DB_PASSWORD_CLICKEAT
```

### "Migración lenta"
```bash
# Normal en migración completa (1-2 horas)
# Si se interrumpe, puedes reanudar:
npm run migrate:resume
```

---

## 📚 Más Información

- **[RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md)** - Para presentar al equipo ejecutivo
- **[REACTIVACION_CLIENTES.md](REACTIVACION_CLIENTES.md)** - Guía completa de estrategias
- **[RESUMEN_SISTEMA.md](RESUMEN_SISTEMA.md)** - Estado técnico del proyecto
- **[CHECKLIST.md](CHECKLIST.md)** - Verificar que todo funcione

---

## 🎉 ¡Listo!

Con estos comandos ya puedes:
- ✅ Identificar clientes inactivos
- ✅ Detectar VIPs en riesgo
- ✅ Segmentar tu base automáticamente
- ✅ Generar estrategias de campaña
- ✅ Medir y optimizar resultados

**¿Dudas?** Revisa la documentación completa en los archivos mencionados arriba.

**¿Listo para empezar?** Ejecuta:
```bash
npm run migrate:simple && npm run query:reactivation
```

---

**Total de tiempo**: 5 minutos para ver tus primeros resultados 🚀
