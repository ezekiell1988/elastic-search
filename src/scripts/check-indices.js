#!/usr/bin/env node

import esClient from '../config/elasticsearch.js';

async function checkIndices() {
  try {
    console.log('🔍 Verificando índices de ClickEat...\n');
    
    const indices = ['clickeat_clientes', 'clickeat_ordenes', 'clickeat_productos', 
                     'clickeat_clientes_v2', 'clickeat_ordenes_v2'];
    
    for (const index of indices) {
      try {
        const exists = await esClient.indices.exists({ index });
        if (exists) {
          const count = await esClient.count({ index });
          console.log(`✅ ${index.padEnd(25)} - ${count.count.toLocaleString()} registros`);
        } else {
          console.log(`❌ ${index.padEnd(25)} - No existe`);
        }
      } catch (err) {
        console.log(`❌ ${index.padEnd(25)} - No existe`);
      }
    }
    
    console.log('\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkIndices();
