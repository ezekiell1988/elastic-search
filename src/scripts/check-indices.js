#!/usr/bin/env node

import esClient from '../config/elasticsearch.js';
import fs from 'fs';

async function checkIndices() {
  try {
    console.log('\n🔍 Verificando índices de ClickEat (8 tablas + 4 agregados)...');
    
    console.log('📊 ÍNDICES PRINCIPALES (5):');
    const mainIndices = [
      'clickeat_clientes',        // tbClientes + tbClientesDireccion (anidado)
      'clickeat_facturas',        // tbFactura + tbFacturaDetalle + tbFacturaIngredientes (anidados)
      'clickeat_productos',       // tbCatalogo
      'clickeat_companias',       // tbCompania  
      'clickeat_restaurantes'     // tbRestaurantes
    ];
    
    for (const index of mainIndices) {
      await checkSingleIndex(index);
    }

    console.log('\n📈 ÍNDICES AGREGADOS (4):');
    const aggregatedIndices = [
      'clickeat_ventas_por_producto',    // Análisis productos + ingredientes
      'clickeat_ventas_por_restaurante', // Performance por restaurante/zona
      'clickeat_ventas_por_cliente',     // Comportamiento y segmentación de clientes
      'clickeat_ventas_por_telefono'     // Análisis por teléfono (incluye guests)
    ];
    
    for (const index of aggregatedIndices) {
      await checkSingleIndex(index);
    }

    console.log('\n💾 ARCHIVOS DE CONTROL:');
    checkControlFiles();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkSingleIndex(index) {
  try {
    const exists = await esClient.indices.exists({ index });
    if (exists) {
      const count = await esClient.count({ index });
      const health = await esClient.cluster.health({ index });
      const status = health.status === 'green' ? '🟢' : health.status === 'yellow' ? '🟡' : '🔴';
      console.log(`✅ ${index.padEnd(35)} - ${count.count.toLocaleString().padStart(10)} registros ${status}`);
    } else {
      console.log(`❌ ${index.padEnd(35)} - No existe`);
    }
  } catch (err) {
    console.log(`❌ ${index.padEnd(35)} - Error: ${err.message}`);
  }
}

function checkControlFiles() {
  const checkpointFile = '.sync-checkpoint.json';
  
  if (fs.existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      console.log(`✅ ${checkpointFile.padEnd(35)} - Última sync: ${checkpoint.last_incremental_sync || 'Nunca'}`);
      
      // Mostrar resumen de tablas
      const tables = Object.keys(checkpoint.tables || {});
      console.log(`📋 Tablas configuradas: ${tables.length}/8`);
    } catch (error) {
      console.log(`⚠️  ${checkpointFile.padEnd(35)} - Error leyendo archivo`);
    }
  } else {
    console.log(`❌ ${checkpointFile.padEnd(35)} - No existe (primera ejecución)`);
  }
}

checkIndices();
