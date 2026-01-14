// Script para eliminar y recrear el índice de facturas con el campo correcto

import esClient from '../config/elasticsearch.js';

async function recreateFacturasIndex() {
    try {
        console.log('🗑️  Eliminando índice clickeat_facturas...');
        
        const exists = await esClient.indices.exists({ index: 'clickeat_facturas' });
        
        if (exists) {
            await esClient.indices.delete({ index: 'clickeat_facturas' });
            console.log('✅ Índice eliminado correctamente\n');
        } else {
            console.log('ℹ️  El índice no existe, continuando...\n');
        }
        
        console.log('📋 Ahora ejecuta: npm run sync:facturas');
        console.log('   Esto recreará el índice con el campo fecha_facturado correcto\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

recreateFacturasIndex();
