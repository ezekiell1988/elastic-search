#!/usr/bin/env node

// 🧪 Verificación del Sistema ClickEat
// Script de diagnóstico multiplataforma para validar instalación y configuración
// Compatible con Windows, Mac y Linux

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esClient from '../config/elasticsearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class SystemVerifier {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.warnings = 0;
    }

    // 🎨 Log con colores
    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    // ✅ Test pasado
    pass(description, info = '') {
        const infoText = info ? ` (${info})` : '';
        console.log(`✅ ${description}${infoText}`);
        this.passed++;
    }

    // ❌ Test fallido
    fail(description, suggestion = '') {
        console.log(`❌ ${description}`);
        if (suggestion) {
            this.log(`   💡 ${suggestion}`, 'yellow');
        }
        this.failed++;
    }

    // ⚠️ Advertencia
    warn(description, suggestion = '') {
        console.log(`⚠️  ${description}`);
        if (suggestion) {
            this.log(`   💡 ${suggestion}`, 'yellow');
        }
        this.warnings++;
    }

    // 🔍 Verificar comando disponible
    async checkCommand(command, description) {
        return new Promise((resolve) => {
            const child = spawn(command, ['--version'], {
                stdio: 'pipe',
                shell: true
            });

            let output = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    const version = output.trim().split('\n')[0];
                    this.pass(description, version);
                    resolve(true);
                } else {
                    this.fail(description, `Instala ${command} desde su sitio oficial`);
                    resolve(false);
                }
            });

            child.on('error', () => {
                this.fail(description, `Comando '${command}' no encontrado`);
                resolve(false);
            });
        });
    }

    // 📁 Verificar archivo existe
    checkFile(filePath, description, suggestion = '') {
        if (fs.existsSync(filePath)) {
            this.pass(description);
            return true;
        } else {
            this.fail(description, suggestion);
            return false;
        }
    }

    // 📂 Verificar directorio existe
    checkDirectory(dirPath, description, suggestion = '') {
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            this.pass(description);
            return true;
        } else {
            this.fail(description, suggestion);
            return false;
        }
    }

    // 🌐 Verificar puerto disponible
    async checkPort(port, description) {
        return new Promise((resolve) => {
            import('net').then(({ createConnection }) => {
                const socket = createConnection({ port, host: 'localhost' });

                socket.on('connect', () => {
                    socket.destroy();
                    this.warn(description, `Cambia PORT en .env o detén el proceso en puerto ${port}`);
                    resolve(false);
                });

                socket.on('error', () => {
                    this.pass(description);
                    resolve(true);
                });

                socket.setTimeout(1000, () => {
                    socket.destroy();
                    this.pass(description);
                    resolve(true);
                });
            });
        });
    }

    // 🔗 Verificar conexión Elasticsearch
    async checkElasticsearch() {
        try {
            await esClient.ping();
            this.pass('Conexión a Elasticsearch');
            return true;
        } catch (error) {
            this.fail('Conexión a Elasticsearch', 'Verifica credenciales en archivo .env');
            return false;
        }
    }

    // 📋 Verificar variables de entorno
    checkEnvironmentVariables() {
        const projectRoot = path.resolve(__dirname, '../../');
        const envPath = path.join(projectRoot, '.env');
        
        if (!this.checkFile(envPath, 'Archivo .env configurado', 'Crea archivo .env con credenciales')) {
            return false;
        }

        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const requiredVars = ['ELASTIC_SEARCH_ENDPOINT', 'ELASTIC_SEARCH_API_KEY'];
            const missingVars = [];

            for (const varName of requiredVars) {
                if (!envContent.includes(varName)) {
                    missingVars.push(varName);
                }
            }

            if (missingVars.length === 0) {
                this.pass('Variables de entorno completas');
                return true;
            } else {
                this.fail('Variables de entorno incompletas', `Faltan: ${missingVars.join(', ')}`);
                return false;
            }
        } catch (error) {
            this.fail('Error leyendo archivo .env', error.message);
            return false;
        }
    }

    // 🏗️ Verificar estructura del proyecto
    checkProjectStructure() {
        const projectRoot = path.resolve(__dirname, '../../');
        const requiredDirs = [
            'src/config',
            'src/routes', 
            'src/services',
            'src/scripts',
            'src/utils'
        ];

        const requiredFiles = [
            'src/index.js',
            'src/config/elasticsearch.js',
            'src/services/customerService.js',
            'package.json'
        ];

        let allGood = true;

        // Verificar directorios
        for (const dir of requiredDirs) {
            if (!this.checkDirectory(path.join(projectRoot, dir), `Directorio ${dir}`)) {
                allGood = false;
            }
        }

        // Verificar archivos
        for (const file of requiredFiles) {
            if (!this.checkFile(path.join(projectRoot, file), `Archivo ${file}`)) {
                allGood = false;
            }
        }

        return allGood;
    }

    // 🚀 Ejecutar verificación completa
    async verify() {
        this.log('🧪 VERIFICACIÓN DEL SISTEMA CLICKEAT', 'cyan');
        this.log('====================================', 'cyan');
        console.log('');

        // 1. Runtime y herramientas
        this.log('📋 RUNTIME Y HERRAMIENTAS:', 'blue');
        await this.checkCommand('node', 'Node.js instalado');
        await this.checkCommand('npm', 'npm instalado');
        console.log('');

        // 2. Configuración del proyecto
        this.log('⚙️ CONFIGURACIÓN DEL PROYECTO:', 'blue');
        this.checkEnvironmentVariables();
        this.checkDirectory(path.resolve(__dirname, '../../node_modules'), 'Dependencias instaladas', 'Ejecuta: npm install');
        console.log('');

        // 3. Estructura del proyecto
        this.log('🏗️ ESTRUCTURA DEL PROYECTO:', 'blue');
        this.checkProjectStructure();
        console.log('');

        // 4. Conectividad
        this.log('🌐 CONECTIVIDAD:', 'blue');
        await this.checkElasticsearch();
        await this.checkPort(3000, 'Puerto 3000 disponible');
        console.log('');

        // 5. Scripts y comandos
        this.log('🔧 SCRIPTS DISPONIBLES:', 'blue');
        const packagePath = path.resolve(__dirname, '../../package.json');
        try {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const scriptCount = Object.keys(packageData.scripts || {}).length;
            this.pass('Scripts npm configurados', `${scriptCount} scripts disponibles`);
        } catch (error) {
            this.fail('Scripts npm', 'Error leyendo package.json');
        }

        // Resumen final
        this.showSummary();
    }

    // 📊 Mostrar resumen
    showSummary() {
        console.log('');
        this.log('════════════════════════════════════════', 'cyan');
        this.log(`Resumen: ${this.passed} ✅ ${this.failed} ❌ ${this.warnings} ⚠️`, 'cyan');
        this.log('════════════════════════════════════════', 'cyan');
        console.log('');

        if (this.failed === 0) {
            this.log('✨ ¡Todo listo para usar!', 'green');
            console.log('');
            this.log('🚀 PRÓXIMOS PASOS:', 'green');
            this.log('   1. Crear índices: npm run setup', 'green');
            this.log('   2. Detectar cambios: npm run sync:detect', 'green');
            this.log('   3. Menú interactivo: npm run utils', 'green');
            this.log('   4. Configuración completa: npm run setup:complete', 'green');
            console.log('');
        } else {
            this.log('⚠️  Hay problemas que resolver', 'red');
            console.log('');
            this.log('🔧 SOLUCIONES:', 'yellow');
            this.log('   • Instala Node.js desde: https://nodejs.org/', 'yellow');
            this.log('   • Ejecuta: npm install', 'yellow');
            this.log('   • Verifica .env con credenciales correctas', 'yellow');
            this.log('   • Usa: npm run utils para menú interactivo', 'yellow');
            console.log('');
        }

        return this.failed === 0;
    }
}

// 🎯 Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const verifier = new SystemVerifier();
    verifier.verify().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Error en verificación:', error.message);
        process.exit(1);
    });
}

export { SystemVerifier };