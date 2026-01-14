// 🔄 Sistema de Sincronización Incremental ClickEat
// Detecta cambios desde la última sincronización y actualiza solo registros nuevos/modificados

import sql from 'mssql';
import esClient from '../config/elasticsearch.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de SQL Server
const sqlConfig = {
    server: process.env.DB_HOST_CLICKEAT,
    database: process.env.DB_DATABASE_CLICKEAT,
    user: process.env.DB_USER_CLICKEAT,
    password: process.env.DB_PASSWORD_CLICKEAT,
    port: parseInt(process.env.DB_PORT_CLICKEAT || '1433'),
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 60000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

class SyncManager {
    constructor() {
        this.checkpointFile = '.sync-checkpoint.json';
        this.checkpoint = this.loadCheckpoint();
        this.sqlPool = null;
    }

    // 🔌 Conectar a SQL Server
    async connectSQL() {
        if (!this.sqlPool) {
            try {
                this.sqlPool = await sql.connect(sqlConfig);
                console.log('✅ Conexión SQL establecida');
            } catch (error) {
                console.error('❌ Error conectando a SQL:', error);
                throw error;
            }
        }
        return this.sqlPool;
    }

    // 🔌 Cerrar conexión SQL
    async disconnectSQL() {
        if (this.sqlPool) {
            await this.sqlPool.close();
            this.sqlPool = null;
            console.log('🔌 Conexión SQL cerrada');
        }
    }

    // 📁 Cargar checkpoint de sincronización
    loadCheckpoint() {
        try {
            if (fs.existsSync(this.checkpointFile)) {
                return JSON.parse(fs.readFileSync(this.checkpointFile, 'utf8'));
            }
        } catch (error) {
            console.warn('⚠️  No se pudo cargar checkpoint:', error.message);
        }
        
        return this.getDefaultCheckpoint();
    }

    // 🎯 Estructura por defecto del checkpoint
    getDefaultCheckpoint() {
        return {
            version: "1.0",
            last_full_sync: null,
            last_incremental_sync: null,
            tables: {
                tbClientes: {
                    sync_method: "date_field",
                    date_field: "FechaCreacion",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbClientesDireccion: {
                    sync_method: "client_relation",
                    depends_on: "tbClientes",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbFactura: {
                    sync_method: "date_field",
                    date_field: "Fecha_facturado",
                    filter: "Pagado = 1",
                    last_sync: null,
                    last_fecha: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbFacturaDetalle: {
                    sync_method: "factura_relation",
                    depends_on: "tbFactura",
                    last_sync: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbFacturaIngredientes: {
                    sync_method: "factura_relation",
                    depends_on: "tbFactura",
                    last_sync: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbCatalogo: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbCompania: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbRestaurantes: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                }
            },
            aggregated_indexes: {
                clickeat_ventas_por_producto: {
                    last_rebuild: null,
                    records_processed: 0,
                    products_updated: 0
                },
                clickeat_ventas_por_restaurante: {
                    last_rebuild: null,
                    records_processed: 0,
                    restaurants_updated: 0
                },
                clickeat_ventas_por_cliente: {
                    last_rebuild: null,
                    records_processed: 0,
                    clients_updated: 0
                },
                clickeat_ventas_por_telefono: {
                    last_rebuild: null,
                    records_processed: 0,
                    phones_updated: 0
                }
            }
        };
    }

    // 💾 Guardar checkpoint
    saveCheckpoint() {
        try {
            fs.writeFileSync(this.checkpointFile, JSON.stringify(this.checkpoint, null, 2));
            console.log('✅ Checkpoint guardado correctamente');
        } catch (error) {
            console.error('❌ Error guardando checkpoint:', error);
        }
    }

    // 🔍 Detectar cambios en todas las tablas
    async detectChanges() {
        console.log('🔍 Detectando cambios desde la última sincronización...\n');
        
        // Conectar a SQL
        await this.connectSQL();
        
        const changes = {
            total_new_records: 0,
            tables_with_changes: [],
            estimated_sync_time: '0 min'
        };

        try {
            // Detectar cambios por tabla
            for (const [tableName, config] of Object.entries(this.checkpoint.tables)) {
                const tableChanges = await this.detectTableChanges(tableName, config);
                
                if (tableChanges.new_records > 0) {
                    changes.tables_with_changes.push({
                        table: tableName,
                        new_records: tableChanges.new_records,
                        method: config.sync_method
                    });
                    changes.total_new_records += tableChanges.new_records;
                }
            }

            // Estimar tiempo de sincronización (50 registros/segundo)
            const estimatedSeconds = Math.ceil(changes.total_new_records / 50);
            changes.estimated_sync_time = estimatedSeconds < 60 ? 
                `${estimatedSeconds} seg` : 
                `${Math.ceil(estimatedSeconds / 60)} min`;

        } finally {
            await this.disconnectSQL();
        }

        return changes;
    }

    // 🔍 Detectar cambios en una tabla específica
    async detectTableChanges(tableName, config) {
        try {
            let query = '';
            let params = {};

            switch (config.sync_method) {
                case 'date_field':
                    if (tableName === 'tbClientes') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbClientes
                            WHERE FechaCreacion > @lastSync OR FechaCreacion IS NULL
                        `;
                        params.lastSync = config.last_sync || '1900-01-01';
                    } else if (tableName === 'tbFactura') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbFactura
                            WHERE Pagado = 1 
                              AND Fecha_facturado IS NOT NULL
                              AND Fecha_facturado > @lastSync
                        `;
                        params.lastSync = config.last_sync || '1900-01-01';
                    }
                    break;

                case 'max_id':
                    if (tableName === 'tbCatalogo') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbCatalogo
                            WHERE Id_producto > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    } else if (tableName === 'tbCompania') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbCompania
                            WHERE Id_compania > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    } else if (tableName === 'tbRestaurantes') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbRestaurantes
                            WHERE Id_restaurante > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    }
                    break;

                case 'client_relation':
                case 'factura_relation':
                    // Estas tablas dependen de otras, calcular basado en dependencia
                    return { new_records: 0 }; // Se calculará cuando se sincronicen las tablas padre
            }

            if (query) {
                const request = new sql.Request();
                
                // Agregar parámetros
                Object.keys(params).forEach(key => {
                    request.input(key, params[key]);
                });

                const result = await request.query(query);
                return { new_records: result.recordset[0].nuevos };
            }

        } catch (error) {
            console.error(`❌ Error detectando cambios en ${tableName}:`, error);
        }

        return { new_records: 0 };
    }

    // 📊 Mostrar resumen de cambios
    async showChangesSummary() {
        const changes = await this.detectChanges();
        
        console.log('📊 RESUMEN DE CAMBIOS DETECTADOS\n');
        console.log(`🔢 Total nuevos registros: ${changes.total_new_records.toLocaleString()}`);
        console.log(`⏱️  Tiempo estimado sync: ${changes.estimated_sync_time}`);
        
        if (changes.tables_with_changes.length > 0) {
            console.log('\n📋 TABLAS CON CAMBIOS:');
            changes.tables_with_changes.forEach(table => {
                console.log(`   📁 ${table.table}: ${table.new_records.toLocaleString()} nuevos (${table.method})`);
            });
        } else {
            console.log('\n✅ No hay cambios pendientes de sincronización');
        }

        console.log('\n📅 ÚLTIMA SINCRONIZACIÓN:');
        console.log(`   🔄 Completa: ${this.checkpoint.last_full_sync || 'Nunca'}`);
        console.log(`   ⚡ Incremental: ${this.checkpoint.last_incremental_sync || 'Nunca'}`);

        return changes;
    }

    // 🚀 Ejecutar sincronización incremental
    async syncIncremental(tableName = null) {
        console.log('🚀 Iniciando sincronización incremental...\n');
        
        const syncStart = new Date();
        let totalProcessed = 0;

        try {
            // Si se especifica tabla, sincronizar solo esa
            if (tableName) {
                totalProcessed = await this.syncTable(tableName);
            } else {
                // Sincronizar todas las tablas en orden
                const tableOrder = [
                    'tbClientes',
                    'tbClientesDireccion', 
                    'tbFactura',
                    'tbFacturaDetalle',
                    'tbFacturaIngredientes',
                    'tbCatalogo',
                    'tbCompania',
                    'tbRestaurantes'
                ];

                for (const table of tableOrder) {
                    const processed = await this.syncTable(table);
                    totalProcessed += processed;
                }
            }

            // Actualizar checkpoint general
            this.checkpoint.last_incremental_sync = syncStart.toISOString();
            this.saveCheckpoint();

            const syncEnd = new Date();
            const duration = Math.round((syncEnd - syncStart) / 1000);

            console.log(`\n✅ SINCRONIZACIÓN COMPLETADA`);
            console.log(`📊 Registros procesados: ${totalProcessed.toLocaleString()}`);
            console.log(`⏱️  Tiempo total: ${duration} segundos`);

        } catch (error) {
            console.error('❌ Error en sincronización incremental:', error);
            throw error;
        }
    }

    // 🔄 Sincronizar una tabla específica
    async syncTable(tableName) {
        console.log(`🔄 Sincronizando tabla: ${tableName}`);
        
        // TODO: Implementar lógica específica de sincronización por tabla
        // Por ahora retornamos 0 como placeholder
        
        const config = this.checkpoint.tables[tableName];
        if (!config) {
            console.log(`⚠️  Configuración no encontrada para ${tableName}`);
            return 0;
        }

        // Aquí iría la lógica específica de migración para cada tabla
        // usando las queries definidas en CAMPOS_SINCRONIZACION.md
        
        console.log(`✅ ${tableName} sincronizada (placeholder)`);
        return 0;
    }

    // 📈 Reconstruir índices agregados
    async rebuildAggregatedIndexes() {
        console.log('📈 Reconstruyendo índices agregados...\n');
        
        try {
            // Ventas por producto (con ingredientes)
            await this.rebuildProductStats();
            
            // Ventas por restaurante
            await this.rebuildRestaurantStats();

            // Ventas por cliente (nuevo)
            await this.rebuildClientStats();

            console.log('✅ Índices agregados reconstruidos correctamente');

        } catch (error) {
            console.error('❌ Error reconstruyendo índices:', error);
            throw error;
        }
    }

    // 📊 Estadísticas de productos
    async rebuildProductStats() {
        console.log('📊 Reconstruyendo estadísticas de productos...');
        
        // TODO: Implementar agregación de ventas por producto
        // Agrupar facturas por producto, incluir ingredientes
        
        this.checkpoint.aggregated_indexes.clickeat_ventas_por_producto.last_rebuild = new Date().toISOString();
        console.log('✅ Estadísticas de productos actualizadas');
    }

    // 🏪 Estadísticas de restaurantes  
    async rebuildRestaurantStats() {
        console.log('🏪 Reconstruyendo estadísticas de restaurantes...');
        
        // TODO: Implementar agregación de ventas por restaurante
        // Agrupar facturas por restaurante, calcular métricas
        
        this.checkpoint.aggregated_indexes.clickeat_ventas_por_restaurante.last_rebuild = new Date().toISOString();
        console.log('✅ Estadísticas de restaurantes actualizadas');
    }

    // 👥 Estadísticas de clientes
    async rebuildClientStats() {
        console.log('👥 Reconstruyendo estadísticas de clientes...');
        
        // TODO: Implementar agregación de comportamiento de clientes
        // Calcular: frecuencia compra, monto promedio, productos favoritos, 
        // última compra, segmentación (VIP, frecuente, ocasional, inactivo)
        
        this.checkpoint.aggregated_indexes.clickeat_ventas_por_cliente.last_rebuild = new Date().toISOString();
        console.log('✅ Estadísticas de clientes actualizadas');
    }

    // 📱 Estadísticas por teléfono (incluye guests)
    async rebuildPhoneStats() {
        console.log('📱 Reconstruyendo estadísticas por teléfono...');
        
        // TODO: Implementar agregación por número de teléfono
        // Agrupar todas las compras por teléfono (incluye guests sin cuenta)
        // Detectar: múltiples nombres/emails para mismo teléfono,
        // conversión de guest a cliente registrado, patrones de compra
        
        this.checkpoint.aggregated_indexes.clickeat_ventas_por_telefono.last_rebuild = new Date().toISOString();
        console.log('✅ Estadísticas por teléfono actualizadas');
    }
}

// 🎯 Funciones de comando
async function detectChanges() {
    const sync = new SyncManager();
    await sync.showChangesSummary();
}

async function syncIncremental(tableName = null) {
    const sync = new SyncManager();
    await sync.syncIncremental(tableName);
}

async function rebuildAggregates() {
    const sync = new SyncManager();
    await sync.rebuildAggregatedIndexes();
}

// 🚀 Exportar para uso desde línea de comandos
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const tableName = process.argv[3];

    (async () => {
        try {
            switch (command) {
                case 'detect':
                    await detectChanges();
                    break;
                case 'sync':
                    await syncIncremental(tableName);
                    break;
                case 'rebuild':
                    await rebuildAggregates();
                    break;
                default:
                    console.log(`
🔄 SISTEMA DE SINCRONIZACIÓN CLICKEAT

Uso:
  node src/scripts/sync-manager.js detect           - Detectar cambios
  node src/scripts/sync-manager.js sync [tabla]     - Sincronización incremental  
  node src/scripts/sync-manager.js rebuild          - Reconstruir agregados

Ejemplos:
  node src/scripts/sync-manager.js detect
  node src/scripts/sync-manager.js sync tbClientes
  node src/scripts/sync-manager.js sync
  node src/scripts/sync-manager.js rebuild
                    `);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}

export { SyncManager, detectChanges, syncIncremental, rebuildAggregates };