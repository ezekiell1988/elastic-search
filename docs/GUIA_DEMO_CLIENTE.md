# 🎬 Guía de Demostración para el Cliente

## 📝 Contexto del Problema

**Cliente necesita:**
- Identificar clientes que dejaron de comprar
- Consultas tipo: "mujer, pepperoni, San José, ya no compra en 3 meses"
- Exportar listas a Excel para campañas de email
- Manejar 800k usuarios y millones de facturas
- Base de datos multi-compañía
- Clientes identificados por teléfono (pueden comprar sin login)

**Solución propuesta: Elasticsearch**

## 🎯 Objetivos de la Demo

1. ✅ Mostrar consultas complejas en sub-segundo
2. ✅ Demostrar búsqueda conversacional (texto libre)
3. ✅ Exportar a Excel formateado
4. ✅ Visualizar estadísticas agregadas
5. ✅ Probar con datos realistas (3,000 clientes de prueba)

## 🚀 Preparación (Antes de la Reunión)

### 1. Setup inicial
```bash
npm install
npm run setup
npm run seed
```

### 2. Verificar que todo funciona
```bash
npm run query
```

Deberías ver resultados de consultas de prueba.

### 3. Tener el servidor corriendo
```bash
npm start
```

## 🎭 Script de Demostración

### Parte 1: Introducción (2 min)

**Tú dices:**
> "Voy a mostrarles cómo Elasticsearch puede resolver el problema de reactivación de clientes. El sistema puede manejar 800 mil clientes y millones de facturas, retornando resultados en milisegundos."

**Mostrar:**
- Abrir terminal con `npm start` corriendo
- Explicar que es una API REST que se puede integrar con cualquier sistema

### Parte 2: Consulta Estructurada (5 min)

**Tú dices:**
> "Imaginemos que quieren contactar a mujeres de San José que compraban pepperoni y llevan más de 3 meses sin comprar."

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90,
    "size": 10
  }' | jq
```

**Señalar en los resultados:**
- ✅ Total de clientes encontrados
- ✅ Tiempo de respuesta (took: XXms)
- ✅ Información completa: nombre, teléfono, email
- ✅ Días sin comprar
- ✅ Historial de gasto
- ✅ Productos e ingredientes favoritos

**Tú dices:**
> "Esta información es oro para marketing. Pueden hacer una campaña específica: 'Te extrañamos María, tu Pizza Pepperoni favorita tiene 20% de descuento'"

### Parte 3: Búsqueda Conversacional (3 min)

**Tú dices:**
> "También pueden buscar de forma conversacional, como si estuvieran hablando:"

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/api/customers/free-text-search \
  -H "Content-Type: application/json" \
  -d '{
    "searchText": "hombre cartago hawaiana 6 meses",
    "size": 5
  }' | jq
```

**Señalar:**
- Elasticsearch entiende el contexto
- No necesitas sintaxis específica
- Resultados ordenados por relevancia (score)

### Parte 4: Casos de Uso Adicionales (4 min)

#### Clientes VIP que dejaron de comprar

**Tú dices:**
> "Pueden enfocarse en sus mejores clientes que están en riesgo:"

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "customerSegment": "vip",
    "minDaysSinceLastPurchase": 60,
    "minTotalSpent": 300,
    "size": 10
  }' | jq
```

#### Estadísticas Agregadas

**Tú dices:**
> "El sistema también genera estadísticas para entender patrones:"

```bash
curl http://localhost:3000/api/customers/inactive-stats | jq
```

**Mostrar:**
- Distribución por género
- Ciudades con más inactivos
- Productos más populares entre inactivos
- Estadísticas de gasto

### Parte 5: Exportación a Excel (3 min)

**Tú dices:**
> "Y lo mejor, pueden exportar cualquier consulta directamente a Excel para sus campañas de email:"

**Ejecutar:**
```bash
curl -X POST http://localhost:3000/api/customers/export \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90
  }' \
  --output demo_clientes.xlsx
```

**Abrir el Excel y mostrar:**
- ✅ Lista completa con todos los datos
- ✅ Colores automáticos por nivel de inactividad:
  - 🔴 Rojo: >180 días (crítico)
  - 🟡 Amarillo: >120 días (alerta)
  - 🟠 Naranja: >90 días (atención)
- ✅ Filtros automáticos en columnas
- ✅ Hoja de resumen con métricas clave
- ✅ Listo para importar a sistema de emails

**Tú dices:**
> "Este Excel lo pueden importar directamente a su plataforma de email marketing o CRM."

### Parte 6: Escalabilidad (2 min)

**Tú dices:**
> "Esta demo tiene 3,000 clientes, pero el sistema está diseñado para 800 mil clientes y millones de facturas. Elasticsearch mantiene las búsquedas rápidas sin importar el volumen."

**Mostrar en código:**
```javascript
// src/scripts/seed-data.js
const NUM_CUSTOMERS_PER_COMPANY = 270000; // Escalable a 810k
```

**Explicar:**
- Índices optimizados
- Datos desnormalizados para velocidad
- Serverless: escala automáticamente
- Sin degradación de rendimiento

### Parte 7: Multi-compañía (2 min)

**Tú dices:**
> "El sistema es multi-compañía, perfecto si manejan varias marcas:"

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMP001",
    "minDaysSinceLastPurchase": 90,
    "size": 5
  }' | jq
```

**Explicar:**
- Datos aislados por compañía
- Misma infraestructura
- Identificación por teléfono + compañía

## 🎤 Preguntas Frecuentes (Prepararse)

### "¿Qué tan rápido es realmente?"
**Respuesta:** Con 800k clientes, búsquedas típicas: 50-300ms. Es sub-segundo incluso con consultas complejas.

### "¿Cómo se integra con nuestro sistema?"
**Respuesta:** Es una API REST estándar. Se puede consumir desde cualquier lenguaje. También puedo crear integraciones específicas con su CRM o sistema de emails.

### "¿Qué pasa si un cliente no tiene cuenta?"
**Respuesta:** El sistema usa el teléfono como identificador único. Capturan el teléfono en el checkout y así trackean compras sin necesidad de login.

### "¿Podemos buscar por otros criterios?"
**Respuesta:** Totalmente. El sistema permite filtrar por:
- Ubicación (ciudad, estado)
- Demografía (género, edad si la tienen)
- Comportamiento de compra (productos, ingredientes)
- Segmento de cliente (VIP, regular, ocasional)
- Rangos de gasto
- Cualquier combinación de lo anterior

### "¿Cuánto cuesta Elasticsearch?"
**Respuesta:** 
- Elasticsearch Serverless escala automáticamente
- Pagan por uso (queries + almacenamiento)
- Para 800k clientes: ~$200-500/mes estimado
- Incluye alta disponibilidad y backups automáticos

### "¿Cómo actualizamos los datos?"
**Respuesta:** Tienen dos opciones:
1. Batch nocturno: Reindexar diariamente
2. Real-time: Stream de cambios desde su DB

Puedo implementar cualquiera.

### "¿Podemos probar con nuestros datos?"
**Respuesta:** Sí, necesitaría:
- Esquema de su base de datos
- Dump de datos (anonimizados está bien)
- 2-3 días para adaptar el schema

## 📊 Métricas para Destacar

- ⚡ **Velocidad**: Búsquedas en 50-300ms
- 📈 **Escala**: 800k+ clientes, millones de facturas
- 🎯 **Precisión**: Búsquedas relevantes con scoring
- 💰 **ROI**: Reactivar 5% de inactivos = $XXX en ingresos
- 🔄 **Flexibilidad**: Consultas naturales o estructuradas
- 📤 **Exportación**: Excel listo en segundos

## ✅ Checklist Pre-Demo

- [ ] Servidor corriendo (`npm start`)
- [ ] Terminal limpia con buen tamaño de fuente
- [ ] `jq` instalado para formatear JSON
- [ ] Excel abierto (Microsoft Excel, no Numbers)
- [ ] Tener ejemplos de consultas a mano
- [ ] Conexión a internet estable
- [ ] Backup: Video/screenshots por si algo falla

## 🎬 Cierre de la Demo (2 min)

**Tú dices:**
> "En resumen, Elasticsearch les permite:
> 1. ✅ Identificar clientes inactivos en segundos
> 2. ✅ Hacer consultas tan simples o complejas como necesiten
> 3. ✅ Exportar listas para campañas inmediatas
> 4. ✅ Escalar a millones de registros sin perder velocidad
> 5. ✅ Manejar múltiples compañías en una sola plataforma
>
> ¿Tienen alguna pregunta o quieren que probemos algún escenario específico?"

## 📞 Próximos Pasos a Proponer

1. **Prueba de concepto con datos reales** (1 semana)
2. **Integración con su sistema actual** (2 semanas)
3. **Dashboard de visualización** (opcional, 1 semana)
4. **Automatización de campañas** (2 semanas)

---

## 🔥 Tips para el Éxito

1. ⏱️ Practica antes - la demo debe fluir sin pausas
2. 🎯 Enfócate en el valor de negocio, no en la tecnología
3. 💰 Habla de ROI: cuántos clientes pueden reactivar
4. 🚀 Muestra velocidad - enfatiza los milisegundos
5. 📊 Usa datos visuales - el Excel es impactante
6. 🤝 Relaciona con sus dolores actuales
7. 🔮 Pinta la visión: "Imaginen esto con 800k clientes"

**¡Éxito en tu demo! 🎉**
