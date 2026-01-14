// Script para resetear SOLO el índice y checkpoint de facturas
// sin afectar las demás tablas

import esClient from '../config/elasticsearch.js';
import fs from 'fs';

async function resetFacturasOnly() {
    try {
        console.log('🔄 Reseteando SOLO facturas (sin afectar otras tablas)...\n');
        
        // 1. Eliminar índice de facturas
        console.log('🗑️  Eliminando índice clickeat_facturas...');
        const exists = await esClient.indices.exists({ index: 'clickeat_facturas' });
        if (exists) {
            await esClient.indices.delete({ index: 'clickeat_facturas' });
            console.log('✅ Índice eliminado\n');
        }
        
        // 2. Actualizar checkpoint SOLO para facturas
        console.log('📝 Actualizando checkpoint...');
        const checkpointPath = '.sync-checkpoint.json';
        
        if (fs.existsSync(checkpointPath)) {
            const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
            
            // Resetear SOLO tbFactura
            if (checkpoint.tables && checkpoint.tables.tbFactura) {
                checkpoint.tables.tbFactura.last_sync = null;
                checkpoint.tables.tbFactura.last_fecha = null;
                checkpoint.tables.tbFactura.records_added = 0;
                checkpoint.tables.tbFactura.records_updated = 0;
                checkpoint.tables.tbFactura.last_records_processed = 0;
                
                fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
                console.log('✅ Checkpoint de facturas reseteado');
                console.log('✅ Otras tablas NO fueron afectadas\n');
            }
        } else {
            console.log('⚠️  Archivo checkpoint no existe\n');
        }
        
        console.log('✅ Proceso completado');
        console.log('\n📋 Ahora ejecuta: npm run sync:facturas');
        console.log('   Esto recreará el índice con el campo fecha_facturado correcto\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetFacturasOnly();
