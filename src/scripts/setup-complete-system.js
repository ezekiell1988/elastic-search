#!/usr/bin/env node

// 🚀 Script de Configuración Completa del Sistema ClickEat
// Configura migración inicial + sincronización incremental + índices agregados
// Compatible con Windows, Mac y Linux

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const IS_WINDOWS = process.platform === 'win32';
const NPM_CMD = IS_WINDOWS ? 'npm.cmd' : 'npm';

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class SetupManager {
    constructor() {
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // 🎨 Función para mostrar texto con colores
    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    // 📍 Mostrar paso del proceso
    showStep(step, title) {
        console.log('');
        this.log(`📍 ${step}. ${title}`, 'cyan');
        this.log('----------------------------------------', 'cyan');
    }

    // ✅ Verificar éxito de comando
    checkSuccess(description, code) {
        if (code !== 0) {
            this.log(`❌ Error en: ${description}`, 'red');
            process.exit(1);
        }
        this.log(`✅ ${description} completado`, 'green');
    }

    // ❓ Función para preguntas
    async ask(question) {
        return new Promise(resolve => {
            this.rl.question(`${colors.yellow}${question}${colors.reset}`, answer => {
                resolve(answer.trim().toLowerCase());
            });
        });
    }

    // 🏃‍♂️ Ejecutar comando npm
    async runNpmCommand(command, description) {
        return new Promise((resolve, reject) => {
            this.log(`🏃‍♂️ Ejecutando: ${description}...`, 'blue');
            
            const child = spawn(NPM_CMD, ['run', command], {
                stdio: 'inherit',
                shell: true,
                cwd: path.resolve(__dirname, '../../')
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.checkSuccess(description, code);
                    resolve(code);
                } else {
                    reject(new Error(`${description} falló con código ${code}`));
                }
            });

            child.on('error', (error) => {
                this.log(`❌ Error ejecutando ${command}: ${error.message}`, 'red');
                reject(error);
            });
        });
    }

    // 📊 Verificar que estamos en el directorio correcto
    verifyDirectory() {
        const packagePath = path.resolve(__dirname, '../../package.json');
        if (!fs.existsSync(packagePath)) {
            this.log('❌ Error: Ejecutar desde el directorio raíz del proyecto', 'red');
            this.log('El archivo package.json no se encuentra', 'red');
            process.exit(1);
        }
    }

    // 📋 Configurar cron job multiplataforma
    async setupScheduledSync() {
        const answer = await this.ask('🕐 ¿Configurar sincronización automática diaria? (y/N): ');
        
        if (answer === 'y' || answer === 'yes') {
            const projectPath = path.resolve(__dirname, '../../');
            
            if (IS_WINDOWS) {
                // Windows: Usar Task Scheduler
                this.log('\n📅 CONFIGURACIÓN WINDOWS:', 'yellow');
                this.log('Para configurar sincronización automática en Windows:', 'yellow');
                this.log('1. Abrir "Programador de tareas" (Task Scheduler)', 'yellow');
                this.log('2. Crear tarea básica', 'yellow');
                this.log('3. Programa: node', 'yellow');
                this.log(`4. Argumentos: "${path.join(projectPath, 'src/scripts/sync-manager.js')}" sync`, 'yellow');
                this.log('5. Directorio inicial: ' + projectPath, 'yellow');
                this.log('6. Configurar para ejecutar diariamente a las 2:00 AM', 'yellow');
                
                // Crear archivo bat para ayudar
                const batContent = `@echo off
cd /d "${projectPath}"
node src/scripts/sync-manager.js sync >> sync.log 2>&1
`;
                fs.writeFileSync(path.join(projectPath, 'sync-daily.bat'), batContent);
                this.log('✅ Archivo sync-daily.bat creado para Task Scheduler', 'green');
                
            } else {
                // Unix: Usar crontab
                try {
                    const { spawn } = await import('child_process');
                    const cronJob = `0 2 * * * cd "${projectPath}" && npm run sync:incremental >> sync.log 2>&1`;
                    
                    // Leer crontab actual
                    const crontabList = spawn('crontab', ['-l']);
                    let currentCrontab = '';
                    
                    crontabList.stdout.on('data', (data) => {
                        currentCrontab += data.toString();
                    });
                    
                    crontabList.on('close', () => {
                        // Agregar nueva entrada si no existe
                        if (!currentCrontab.includes('sync:incremental')) {
                            const newCrontab = currentCrontab + cronJob + '\n';
                            const crontabSet = spawn('crontab', ['-'], { stdio: 'pipe' });
                            crontabSet.stdin.write(newCrontab);
                            crontabSet.stdin.end();
                            
                            crontabSet.on('close', (code) => {
                                this.checkSuccess('Configuración de cron job', code);
                            });
                        } else {
                            this.log('✅ Cron job ya configurado', 'green');
                        }
                    });
                } catch (error) {
                    this.log('⚠️  No se pudo configurar cron automáticamente', 'yellow');
                    this.log('Agregar manualmente: 0 2 * * * cd ' + projectPath + ' && npm run sync:incremental >> sync.log 2>&1', 'yellow');
                }
            }
        }
    }

    // 🚀 Proceso principal de configuración
    async setupComplete() {
        try {
            // Header
            this.log('🚀 CONFIGURACIÓN SISTEMA CLICKEAT ELASTICSEARCH', 'magenta');
            this.log('==============================================', 'magenta');
            this.log('');

            // Verificar directorio
            this.verifyDirectory();

            // 1. Detectar cambios actuales
            this.showStep(1, 'Detectando estado actual de la base de datos');
            await this.runNpmCommand('sync:detect', 'Detección de cambios');

            // 2. Confirmar migración inicial
            console.log('');
            const confirmMigration = await this.ask('🤔 ¿Proceder con migración inicial? Esto tomará ~9 horas (y/N): ');
            
            if (confirmMigration !== 'y' && confirmMigration !== 'yes') {
                this.log('🚫 Migración cancelada por el usuario', 'yellow');
                this.rl.close();
                return;
            }

            // 3. Limpiar índices existentes (opcional)
            this.showStep(2, 'Limpiando índices existentes (opcional)');
            const confirmClean = await this.ask('🗑️  ¿Limpiar índices existentes de Elasticsearch? (y/N): ');
            
            if (confirmClean === 'y' || confirmClean === 'yes') {
                await this.runNpmCommand('migrate:clean', 'Limpieza de índices');
            }

            // 4. Configurar índices base
            this.showStep(3, 'Configurando índices de Elasticsearch');
            await this.runNpmCommand('setup', 'Configuración de índices');

            // 5. Ejecutar migración inicial por fases
            this.showStep(4, 'Iniciando migración por fases');

            this.log('📋 FASE 1: Tablas de referencia (rápido)', 'blue');
            await this.runNpmCommand('sync:productos', 'Migración de productos');
            await this.runNpmCommand('sync:clientes', 'Migración de clientes');

            this.log('\n📋 FASE 2: Facturas principales (más tiempo)', 'blue');
            await this.runNpmCommand('sync:facturas', 'Migración de facturas');

            this.log('\n📋 FASE 3: Índices agregados', 'blue');
            await this.runNpmCommand('sync:rebuild', 'Construcción de índices agregados');

            // 6. Validar migración
            this.showStep(5, 'Validando migración');
            await this.runNpmCommand('migrate:validate', 'Validación de migración');

            // 7. Configurar sincronización automática
            this.showStep(6, 'Configuración de sincronización automática');
            await this.setupScheduledSync();

            // 8. Mostrar resumen final
            this.showStep('✅', 'CONFIGURACIÓN COMPLETADA');
            this.showFinalSummary();

        } catch (error) {
            this.log(`❌ Error durante la configuración: ${error.message}`, 'red');
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    // 📊 Mostrar resumen final
    showFinalSummary() {
        this.log('📊 SISTEMA CLICKEAT CONFIGURADO:', 'green');
        console.log('');
        this.log('🔄 Migración inicial: ✅ Completada', 'green');  
        this.log('📈 Índices agregados: ✅ Configurados', 'green');
        this.log('⏰ Sync automática: ✅ Configurada', 'green');
        console.log('');
        this.log('🎯 COMANDOS ÚTILES:', 'cyan');
        this.log('   npm run sync:detect        - Ver cambios pendientes', 'cyan');
        this.log('   npm run sync:incremental   - Sincronización manual', 'cyan');
        this.log('   npm run query:reactivation - Consultas de reactivación', 'cyan');
        console.log('');
        this.log('📁 ARCHIVOS IMPORTANTES:', 'yellow');
        this.log('   .sync-checkpoint.json      - Estado de sincronización', 'yellow');
        this.log('   docs/                      - Documentación completa', 'yellow');
        this.log('   sync.log                   - Logs de sincronización automática', 'yellow');
        console.log('');
        this.log('🚀 ¡Sistema listo para usar!', 'magenta');
    }
}

// 🎯 Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new SetupManager();
    setup.setupComplete().catch(error => {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    });
}

export { SetupManager };