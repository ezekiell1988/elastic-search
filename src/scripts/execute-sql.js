import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de SQL Server desde .env
const config = {
  server: process.env.DB_HOST_CLICKEAT,
  database: process.env.DB_DATABASE_CLICKEAT,
  user: process.env.DB_USER_CLICKEAT,
  password: process.env.DB_PASSWORD_CLICKEAT,
  port: parseInt(process.env.DB_PORT_CLICKEAT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

/**
 * Ejecuta un archivo SQL en la base de datos
 * @param {string} sqlFilePath - Ruta al archivo .sql
 * @returns {Promise<Object>} - Resultados de la consulta
 */
export async function executeSqlFile(sqlFilePath) {
  let pool;
  
  try {
    console.log('📁 Leyendo archivo SQL:', sqlFilePath);
    
    // Leer el contenido del archivo SQL
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    if (!sqlContent.trim()) {
      throw new Error('El archivo SQL está vacío');
    }
    
    console.log('🔌 Conectando a SQL Server...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    // Conectar a SQL Server
    pool = await sql.connect(config);
    console.log('✅ Conectado exitosamente');
    
    // Dividir por GO para ejecutar múltiples batches
    const batches = sqlContent
      .split(/\bGO\b/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    console.log(`\n📋 Ejecutando ${batches.length} batch(es)...\n`);
    
    const results = [];
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`⚙️  Ejecutando batch ${i + 1}/${batches.length}...`);
      const result = await pool.request().query(batches[i]);
      results.push(result);
      
      // Mostrar resultados si los hay
      if (result.recordset && result.recordset.length > 0) {
        console.log(`✓ Batch ${i + 1} completado: ${result.recordset.length} filas`);
        
        // Mostrar preview de los primeros resultados
        if (result.recordset.length <= 10) {
          console.table(result.recordset);
        } else {
          console.table(result.recordset.slice(0, 5));
          console.log(`   ... y ${result.recordset.length - 5} filas más`);
        }
      } else {
        console.log(`✓ Batch ${i + 1} completado`);
      }
      console.log('');
    }
    
    return {
      success: true,
      batches: batches.length,
      results: results
    };
    
  } catch (err) {
    console.error('❌ Error ejecutando SQL:', err.message);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

/**
 * Ejecuta una consulta SQL directa (sin archivo)
 * @param {string} query - Consulta SQL
 * @returns {Promise<Object>} - Resultados de la consulta
 */
export async function executeQuery(query) {
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado exitosamente');
    
    console.log('⚙️  Ejecutando consulta...');
    const result = await pool.request().query(query);
    
    if (result.recordset) {
      console.log(`✓ Consulta completada: ${result.recordset.length} filas`);
      return {
        success: true,
        recordset: result.recordset,
        rowsAffected: result.rowsAffected
      };
    }
    
    return {
      success: true,
      rowsAffected: result.rowsAffected
    };
    
  } catch (err) {
    console.error('❌ Error ejecutando consulta:', err.message);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Si se ejecuta directamente desde línea de comandos
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sqlFileName = process.argv[2];
  
  if (!sqlFileName) {
    console.error('❌ Uso: node execute-sql.js <archivo.sql>');
    console.log('\nEjemplo:');
    console.log('  node execute-sql.js queries/get-schema.sql');
    process.exit(1);
  }
  
  // Construir la ruta completa del archivo
  let sqlFilePath;
  if (path.isAbsolute(sqlFileName)) {
    sqlFilePath = sqlFileName;
  } else {
    // Buscar en la carpeta sql-queries dentro del proyecto
    const projectRoot = path.join(__dirname, '..', '..');
    sqlFilePath = path.join(projectRoot, 'sql-queries', sqlFileName);
    
    // Si no existe, intentar con la ruta relativa desde donde se ejecuta
    if (!fs.existsSync(sqlFilePath)) {
      sqlFilePath = path.resolve(sqlFileName);
    }
  }
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ Archivo no encontrado: ${sqlFilePath}`);
    process.exit(1);
  }
  
  executeSqlFile(sqlFilePath)
    .then(() => {
      console.log('\n✅ Ejecución completada exitosamente');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error en la ejecución:', err);
      process.exit(1);
    });
}
