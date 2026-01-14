import client from '../config/elasticsearch.js';
import { customerIndex, invoiceIndex, productIndex } from '../config/indices.js';

async function setupIndices() {
  console.log('🔧 Configurando índices de Elasticsearch...\n');

  const indices = [customerIndex, invoiceIndex, productIndex];

  for (const indexConfig of indices) {
    const indexName = indexConfig.index;
    
    try {
      // Verificar si el índice existe
      const exists = await client.indices.exists({ index: indexName });
      
      if (exists) {
        console.log(`⚠️  El índice "${indexName}" ya existe. ¿Deseas eliminarlo? (y/n)`);
        console.log(`   Ejecuta: curl -X DELETE "${process.env.ELASTIC_SEARCH_ENDPOINT}/${indexName}"`);
        console.log(`   O borra manualmente desde Kibana\n`);
        continue;
      }

      // Crear el índice
      await client.indices.create({
        index: indexName,
        body: {
          mappings: indexConfig.mappings,
          settings: indexConfig.settings || {}
        }
      });

      console.log(`✅ Índice "${indexName}" creado exitosamente`);
      
    } catch (error) {
      console.error(`❌ Error creando índice "${indexName}":`, error.message);
    }
  }

  console.log('\n✨ Setup de índices completado');
  process.exit(0);
}

setupIndices().catch(console.error);
