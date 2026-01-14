#!/usr/bin/env node

/**
 * LIMPIEZA DE ÍNDICES
 * Elimina todos los índices de ClickEat de Elasticsearch
 */

import esClient from '../config/elasticsearch.js';

async function cleanupIndices() {
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🗑️  LIMPIEZA DE ÍNDICES                  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const indicesToDelete = [
      'clickeat_clientes',
      'clickeat_ordenes',
      'clickeat_productos',
      'clickeat_clientes_v2',
      'clickeat_ordenes_v2'
    ];

    let deletedCount = 0;
    let notFoundCount = 0;

    for (const index of indicesToDelete) {
      try {
        const exists = await esClient.indices.exists({ index });
        
        if (exists) {
          // Obtener el conteo antes de eliminar
          const count = await esClient.count({ index });
          await esClient.indices.delete({ index });
          console.log(`✅ Eliminado: ${index.padEnd(25)} (${count.count.toLocaleString()} registros)`);
          deletedCount++;
        } else {
          console.log(`⚪ No existe: ${index}`);
          notFoundCount++;
        }
      } catch (err) {
        console.log(`⚪ No existe: ${index}`);
        notFoundCount++;
      }
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  RESUMEN                                   ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`   Eliminados: ${deletedCount}`);
    console.log(`   No existían: ${notFoundCount}`);
    console.log(`   Total verificados: ${indicesToDelete.length}\n`);
    
    if (deletedCount > 0) {
      console.log('✅ Elasticsearch limpio y listo para migración completa\n');
    } else {
      console.log('ℹ️  No había índices para eliminar\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.meta && error.meta.body) {
      console.error('Detalles:', JSON.stringify(error.meta.body, null, 2));
    }
    process.exit(1);
  }
}

// Ejecutar
cleanupIndices()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
