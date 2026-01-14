#!/usr/bin/env node

// 🛠️ Utilidades del Sistema ClickEat
// Script multiplataforma para tareas comunes de administración
// Compatible con Windows, Mac y Linux

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración multiplataforma
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
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class UtilsManager {
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

    // 🏃‍♂️ Ejecutar comando npm
    async runCommand(command, args = [], description = '') {
        return new Promise((resolve, reject) => {
            if (description) {
                this.log(`🏃‍♂️ ${description}...`, 'blue');
            }
            
            const cmd = command === 'npm' ? NPM_CMD : command;
            const child = spawn(cmd, args, {
                stdio: 'inherit',
                shell: true,
                cwd: path.resolve(__dirname, '../../')
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.log(`✅ ${description || command} completado`, 'green');
                    resolve(code);
                } else {
                    this.log(`❌ Error en ${description || command} (código: ${code})`, 'red');
                    reject(new Error(`Command failed with code ${code}`));
                }
            });

            child.on('error', (error) => {
                this.log(`❌ Error: ${error.message}`, 'red');
                reject(error);
            });
        });
    }

    // 📊 Mostrar menú principal
    showMenu() {
        console.clear();
        this.log('🛠️  UTILIDADES CLICKEAT ELASTICSEARCH', 'magenta');
        this.log('====================================', 'magenta');
        this.log('', 'white');
        this.log('📋 OPCIONES DISPONIBLES:', 'cyan');
        this.log('', 'white');
        this.log('1. 📊 Verificar estado de índices', 'white');
        this.log('2. 🔍 Detectar cambios pendientes', 'white');
        this.log('3. 🔄 Sincronización incremental', 'white');
        this.log('4. 🏗️  Reconstruir índices agregados', 'white');
        this.log('5. 🗑️  Limpiar todos los índices', 'white');
        this.log('6. ⚙️  Configuración completa del sistema', 'white');
        this.log('7. 🧮 Demo de cálculo de días', 'white');
        this.log('8. 📈 Ejecutar consultas de reactivación', 'white');
        this.log('9. 📝 Mostrar logs de sincronización', 'white');
        this.log('10. 🧪 Verificar sistema completo', 'white');
        this.log('0. ❌ Salir', 'white');
        this.log('', 'white');
    }

    // ❓ Obtener selección del usuario
    async getSelection() {
        return new Promise(resolve => {
            this.rl.question(`${colors.yellow}Selecciona una opción [0-10]: ${colors.reset}`, answer => {
                resolve(answer.trim());
            });
        });
    }

    // 📊 Verificar estado de índices
    async checkIndices() {
        try {
            await this.runCommand('npm', ['run', 'check:indices'], 'Verificando índices');
        } catch (error) {
            this.log('❌ Error verificando índices', 'red');
        }
    }

    // 🔍 Detectar cambios
    async detectChanges() {
        try {
            await this.runCommand('npm', ['run', 'sync:detect'], 'Detectando cambios');
        } catch (error) {
            this.log('❌ Error detectando cambios', 'red');
        }
    }

    // 🔄 Sincronización incremental
    async syncIncremental() {
        try {
            await this.runCommand('npm', ['run', 'sync:incremental'], 'Sincronización incremental');
        } catch (error) {
            this.log('❌ Error en sincronización', 'red');
        }
    }

    // 🏗️ Reconstruir agregados
    async rebuildAggregates() {
        try {
            await this.runCommand('npm', ['run', 'sync:rebuild'], 'Reconstruyendo índices agregados');
        } catch (error) {
            this.log('❌ Error reconstruyendo agregados', 'red');
        }
    }

    // 🗑️ Limpiar índices
    async cleanIndices() {
        this.log('⚠️  Esta acción eliminará TODOS los índices de ClickEat', 'yellow');
        const confirm = await this.getConfirmation('¿Continuar? (y/N): ');
        
        if (confirm) {
            try {
                await this.runCommand('npm', ['run', 'migrate:clean'], 'Limpiando índices');
            } catch (error) {
                this.log('❌ Error limpiando índices', 'red');
            }
        }
    }

    // ⚙️ Configuración completa
    async setupComplete() {
        try {
            await this.runCommand('npm', ['run', 'setup:complete'], 'Configuración completa');
        } catch (error) {
            this.log('❌ Error en configuración completa', 'red');
        }
    }

    // 🧮 Demo cálculo días
    async demoCalculation() {
        try {
            await this.runCommand('npm', ['run', 'demo:days'], 'Ejecutando demo');
        } catch (error) {
            this.log('❌ Error en demo', 'red');
        }
    }

    // 📈 Consultas reactivación
    async runReactivationQueries() {
        try {
            await this.runCommand('npm', ['run', 'query:reactivation'], 'Ejecutando consultas de reactivación');
        } catch (error) {
            this.log('❌ Error en consultas', 'red');
        }
    }

    // 🧪 Verificar sistema
    async verifySystem() {
        try {
            await this.runCommand('npm', ['run', 'verify'], 'Verificando sistema completo');
        } catch (error) {
            this.log('❌ Error en verificación del sistema', 'red');
        }
    }

    // 📝 Mostrar logs
    async showLogs() {
        
        if (fs.existsSync(logFile)) {
            this.log('📝 LOGS DE SINCRONIZACIÓN:', 'cyan');
            this.log('========================', 'cyan');
            
            try {
                const logs = fs.readFileSync(logFile, 'utf8');
                const lastLines = logs.split('\n').slice(-50).join('\n'); // Últimas 50 líneas
                console.log(lastLines);
            } catch (error) {
                this.log('❌ Error leyendo logs', 'red');
            }
        } else {
            this.log('ℹ️  No se encontraron logs de sincronización', 'yellow');
            this.log('Los logs se generan después de la primera sincronización automática', 'yellow');
        }
    }

    // ❓ Obtener confirmación
    async getConfirmation(question) {
        return new Promise(resolve => {
            this.rl.question(`${colors.yellow}${question}${colors.reset}`, answer => {
                const confirmed = answer.trim().toLowerCase();
                resolve(confirmed === 'y' || confirmed === 'yes');
            });
        });
    }

    // ⏸️ Pausa para ver resultados
    async pause() {
        return new Promise(resolve => {
            this.rl.question(`${colors.green}Presiona Enter para continuar...${colors.reset}`, () => {
                resolve();
            });
        });
    }

    // 🚀 Bucle principal
    async run() {
        try {
            while (true) {
                this.showMenu();
                const selection = await this.getSelection();

                console.log(''); // Línea en blanco

                switch (selection) {
                    case '1':
                        await this.checkIndices();
                        break;
                    case '2':
                        await this.detectChanges();
                        break;
                    case '3':
                        await this.syncIncremental();
                        break;
                    case '4':
                        await this.rebuildAggregates();
                        break;
                    case '5':
                        await this.cleanIndices();
                        break;
                    case '6':
                        await this.setupComplete();
                        break;
                    case '7':
                        await this.demoCalculation();
                        break;
                    case '8':
                        await this.runReactivationQueries();
                        break;
                    case '9':
                        await this.showLogs();
                        break;
                    case '10':
                        await this.verifySystem();
                        break;
                    case '0':
                        this.log('👋 ¡Hasta luego!', 'magenta');
                        this.rl.close();
                        return;
                    default:
                        this.log('❌ Opción no válida. Selecciona 0-10.', 'red');
                }

                console.log('');
                await this.pause();
            }
        } catch (error) {
            this.log(`❌ Error en la aplicación: ${error.message}`, 'red');
        } finally {
            this.rl.close();
        }
    }
}

// 🎯 Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const utils = new UtilsManager();
    utils.run().catch(error => {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    });
}

export { UtilsManager };