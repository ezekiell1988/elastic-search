// Ver estructura real de los índices

import esClient from '../config/elasticsearch.js';

async function inspectIndexes() {
    try {
        // Clientes
        console.log('📋 ESTRUCTURA DE CLIENTES:');
        const cliente = await esClient.search({
            index: 'clickeat_clientes',
            size: 1
        });
        console.log(JSON.stringify(cliente.hits.hits[0]._source, null, 2));

        // Facturas
        console.log('\n📋 ESTRUCTURA DE FACTURAS:');
        const factura = await esClient.search({
            index: 'clickeat_facturas',
            size: 1,
            query: {
                exists: { field: 'id_cliente' }
            }
        });
        console.log(JSON.stringify(factura.hits.hits[0]._source, null, 2));

        // Detalles
        console.log('\n📋 ESTRUCTURA DE FACTURA_DETALLES:');
        const detalle = await esClient.search({
            index: 'clickeat_factura_detalles',
            size: 1
        });
        console.log(JSON.stringify(detalle.hits.hits[0]._source, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectIndexes();
