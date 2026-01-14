import express from 'express';
import client from '../config/elasticsearch.js';
import * as XLSX from 'xlsx';

const router = express.Router();

// Obtener todos los índices
router.get('/', async (req, res) => {
    try {
        const response = await client.cat.indices({
            format: 'json',
            bytes: 'b'
        });
        
        const indices = response.map(index => ({
            name: index.index,
            health: index.health,
            status: index.status,
            docsCount: parseInt(index['docs.count']) || 0,
            docsDeleted: parseInt(index['docs.deleted']) || 0,
            storeSize: formatBytes(parseInt(index['store.size']) || 0),
            primaryShards: parseInt(index.pri) || 0,
            replicas: parseInt(index.rep) || 0,
            uuid: index.uuid
        }))
        .filter(index => !index.name.startsWith('.')) // Filtrar índices del sistema
        .sort((a, b) => a.name.localeCompare(b.name));
        
        res.json(indices);
    } catch (error) {
        console.error('Error obteniendo índices:', error);
        res.status(500).json({
            error: 'Error obteniendo índices',
            message: error.message
        });
    }
});

// Crear nuevo índice
router.post('/', async (req, res) => {
    try {
        const { name, settings = {} } = req.body;
        
        if (!name) {
            return res.status(400).json({
                error: 'Nombre del índice requerido'
            });
        }
        
        // Validar nombre del índice
        if (!/^[a-z0-9_-]+$/.test(name)) {
            return res.status(400).json({
                error: 'El nombre del índice solo puede contener minúsculas, números, guiones y guiones bajos'
            });
        }
        
        // Verificar si el índice ya existe
        const exists = await client.indices.exists({ index: name });
        if (exists) {
            return res.status(400).json({
                error: `El índice "${name}" ya existe`
            });
        }
        
        // Crear el índice
        const defaultSettings = {
            settings: {
                number_of_shards: 1,
                number_of_replicas: 0
            }
        };
        
        const indexConfig = Object.keys(settings).length > 0 ? settings : defaultSettings;
        
        await client.indices.create({
            index: name,
            body: indexConfig
        });
        
        res.json({
            message: `Índice "${name}" creado correctamente`,
            index: name,
            settings: indexConfig
        });
        
    } catch (error) {
        console.error('Error creando índice:', error);
        res.status(500).json({
            error: 'Error creando índice',
            message: error.message
        });
    }
});

// Eliminar índice
router.delete('/:indexName', async (req, res) => {
    try {
        const { indexName } = req.params;
        
        // Verificar si el índice existe
        const exists = await client.indices.exists({ index: indexName });
        if (!exists) {
            return res.status(404).json({
                error: `El índice "${indexName}" no existe`
            });
        }
        
        // Eliminar el índice
        await client.indices.delete({ index: indexName });
        
        res.json({
            message: `Índice "${indexName}" eliminado correctamente`
        });
        
    } catch (error) {
        console.error('Error eliminando índice:', error);
        res.status(500).json({
            error: 'Error eliminando índice',
            message: error.message
        });
    }
});

// Obtener datos de un índice específico
router.post('/:indexName/data', async (req, res) => {
    try {
        const { indexName } = req.params;
        const { 
            from = 0, 
            size = 100,
            searchField,
            searchValue,
            sortField,
            sortOrder = 'asc'
        } = req.body;
        
        // Verificar si el índice existe
        const exists = await client.indices.exists({ index: indexName });
        if (!exists) {
            return res.status(404).json({
                error: `El índice "${indexName}" no existe`
            });
        }
        
        // Construir la query
        let query = { match_all: {} };
        
        if (searchField && searchValue) {
            // Determinar el tipo de búsqueda basado en el valor
            const isNumeric = !isNaN(searchValue) && searchValue.trim() !== '';
            
            if (isNumeric) {
                // Para valores numéricos, usar term query
                query = {
                    term: {
                        [searchField]: Number(searchValue)
                    }
                };
            } else if (searchValue.includes('*') || searchValue.includes('?')) {
                // Si el usuario incluye wildcards, usar wildcard query
                query = {
                    wildcard: {
                        [`${searchField}.keyword`]: searchValue
                    }
                };
            } else {
                // Para búsqueda de texto, intentar múltiples estrategias
                query = {
                    bool: {
                        should: [
                            // Búsqueda exacta en campo keyword
                            {
                                term: {
                                    [`${searchField}.keyword`]: searchValue
                                }
                            },
                            // Búsqueda de texto completo
                            {
                                match: {
                                    [searchField]: {
                                        query: searchValue,
                                        operator: 'and'
                                    }
                                }
                            },
                            // Búsqueda con wildcard
                            {
                                wildcard: {
                                    [`${searchField}.keyword`]: `*${searchValue}*`
                                }
                            },
                            // Búsqueda en el campo sin .keyword
                            {
                                match_phrase_prefix: {
                                    [searchField]: searchValue
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                };
            }
        }
        
        // Construir ordenamiento
        let sort = [];
        if (sortField) {
            // Intentar múltiples estrategias de ordenamiento
            // Primero intentar con el campo directo (para numéricos y fechas)
            sort.push({
                [sortField]: {
                    order: sortOrder,
                    missing: '_last',
                    unmapped_type: 'long' // Ayuda con campos numéricos
                }
            });
        }
        
        const searchParams = {
            index: indexName,
            body: {
                query,
                from: parseInt(from),
                size: parseInt(size)
            }
        };
        
        if (sort.length > 0) {
            searchParams.body.sort = sort;
        }
        
        const startTime = Date.now();
        const response = await client.search(searchParams);
        const took = Date.now() - startTime;
        
        // Obtener los campos del primer documento para el mapping
        const fields = [];
        if (response.hits.hits.length > 0) {
            const firstDoc = response.hits.hits[0]._source;
            fields.push(...getAllFields(firstDoc));
        }
        
        res.json({
            hits: response.hits.hits,
            total: response.hits.total.value,
            took,
            fields: [...new Set(fields)].sort()
        });
        
    } catch (error) {
        console.error('Error obteniendo datos del índice:', error);
        res.status(500).json({
            error: 'Error obteniendo datos del índice',
            message: error.message
        });
    }
});

// Exportar datos de un índice a Excel
router.post('/:indexName/export', async (req, res) => {
    try {
        const { indexName } = req.params;
        const { 
            searchField,
            searchValue,
            sortField,
            sortOrder = 'asc'
        } = req.body;
        
        // Verificar si el índice existe
        const exists = await client.indices.exists({ index: indexName });
        if (!exists) {
            return res.status(404).json({
                error: `El índice "${indexName}" no existe`
            });
        }
        
        // Construir la query (igual que en el endpoint de datos)
        let query = { match_all: {} };
        
        if (searchField && searchValue) {
            // Determinar el tipo de búsqueda basado en el valor
            const isNumeric = !isNaN(searchValue) && searchValue.trim() !== '';
            
            if (isNumeric) {
                // Para valores numéricos, usar term query
                query = {
                    term: {
                        [searchField]: Number(searchValue)
                    }
                };
            } else if (searchValue.includes('*') || searchValue.includes('?')) {
                // Si el usuario incluye wildcards, usar wildcard query
                query = {
                    wildcard: {
                        [`${searchField}.keyword`]: searchValue
                    }
                };
            } else {
                // Para búsqueda de texto, intentar múltiples estrategias
                query = {
                    bool: {
                        should: [
                            // Búsqueda exacta en campo keyword
                            {
                                term: {
                                    [`${searchField}.keyword`]: searchValue
                                }
                            },
                            // Búsqueda de texto completo
                            {
                                match: {
                                    [searchField]: {
                                        query: searchValue,
                                        operator: 'and'
                                    }
                                }
                            },
                            // Búsqueda con wildcard
                            {
                                wildcard: {
                                    [`${searchField}.keyword`]: `*${searchValue}*`
                                }
                            },
                            // Búsqueda en el campo sin .keyword
                            {
                                match_phrase_prefix: {
                                    [searchField]: searchValue
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                };
            }
        }
        
        // Construir ordenamiento
        let sort = [];
        if (sortField) {
            // Intentar múltiples estrategias de ordenamiento
            sort.push({
                [sortField]: {
                    order: sortOrder,
                    missing: '_last',
                    unmapped_type: 'long' // Ayuda con campos numéricos
                }
            });
        }
        
        // Obtener todos los datos (máximo 10000 por limitación de Elasticsearch)
        const searchParams = {
            index: indexName,
            body: {
                query,
                size: 10000
            }
        };
        
        if (sort.length > 0) {
            searchParams.body.sort = sort;
        }
        
        const response = await client.search(searchParams);
        
        // Preparar datos para Excel
        const data = response.hits.hits.map(hit => hit._source);
        
        if (data.length === 0) {
            return res.status(400).json({
                error: 'No hay datos para exportar'
            });
        }
        
        // Crear workbook de Excel
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Agregar la hoja al workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, indexName);
        
        // Generar el archivo Excel
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx' 
        });
        
        // Enviar el archivo
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${indexName}-export.xlsx"`,
            'Content-Length': excelBuffer.length
        });
        
        res.send(excelBuffer);
        
    } catch (error) {
        console.error('Error exportando datos del índice:', error);
        res.status(500).json({
            error: 'Error exportando datos del índice',
            message: error.message
        });
    }
});

// Función auxiliar para formatear bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Función auxiliar para obtener todos los campos de un objeto
function getAllFields(obj, prefix = '') {
    let fields = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            // Es un objeto anidado
            fields.push(...getAllFields(value, fieldName));
        } else {
            // Es un campo simple
            fields.push(fieldName);
        }
    }
    
    return fields;
}

export default router;