"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config/config");
const websocket_service_1 = require("./services/websocket.service");
const printer_service_1 = require("./services/printer.service");
// ==================== VALIDACIÓN DE CONFIGURACIÓN ====================
/**
 * Validar configuración según el modo de operación
 */
function validateConfig() {
    console.log('');
    console.log('🔍 Validando configuración...');
    if (config_1.config.modo === 'puerta') {
        if (!config_1.config.puerta.id || !config_1.config.puerta.numero) {
            console.error('❌ ERROR: Configuración de PUERTA incompleta');
            console.error('   Se requiere: PUERTA_ID y PUERTA_NUMERO en .env');
            process.exit(1);
        }
        console.log(`✅ Modo: PUERTA`);
        console.log(`   - ID: ${config_1.config.puerta.id}`);
        console.log(`   - Número: ${config_1.config.puerta.numero}`);
        console.log(`   - Sede: ${config_1.config.puerta.sedeNombre}`);
    }
    else {
        if (!config_1.config.caja.id) {
            console.error('❌ ERROR: Configuración de CAJA incompleta');
            console.error('   Se requiere: CAJA_ID en .env');
            process.exit(1);
        }
        console.log(`✅ Modo: CAJA`);
        console.log(`   - ID: ${config_1.config.caja.id}`);
        console.log(`   - Código: ${config_1.config.caja.codigo}`);
        console.log(`   - Sede: ${config_1.config.caja.sedeNombre}`);
    }
    console.log('');
}
// Validar antes de iniciar
validateConfig();
// ==================== CONFIGURACIÓN EXPRESS ====================
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ==================== ENDPOINTS DE MONITOREO ====================
/**
 * Endpoint de estado del agente
 */
app.get('/status', (_req, res) => {
    const printerInfo = printer_service_1.printerService.getPrinterInfo();
    const status = {
        status: websocket_service_1.websocketService.getConnectionStatus() && printerInfo.available ? 'online' : 'offline',
        modo: config_1.config.modo,
        sede_nombre: config_1.config.modo === 'puerta' ? config_1.config.puerta.sedeNombre : config_1.config.caja.sedeNombre,
        websocket: {
            connected: websocket_service_1.websocketService.getConnectionStatus(),
            server: config_1.config.websocket.serverUrl
        },
        printer: {
            name: printerInfo.name,
            available: printerInfo.available
        },
        uptime: process.uptime()
    };
    // Agregar campos específicos según modo
    if (config_1.config.modo === 'caja') {
        status.caja_id = config_1.config.caja.id;
        status.caja_codigo = config_1.config.caja.codigo;
    }
    else {
        status.puerta_id = config_1.config.puerta.id;
        status.puerta_numero = config_1.config.puerta.numero;
    }
    res.json(status);
});
/**
 * Endpoint de health check
 */
app.get('/health', (_req, res) => {
    const healthy = websocket_service_1.websocketService.getConnectionStatus() && printer_service_1.printerService.isPrinterAvailable();
    res.status(healthy ? 200 : 503).json({
        healthy,
        timestamp: new Date().toISOString()
    });
});
// ==================== INICIO DEL SERVIDOR ====================
app.listen(config_1.config.server.port, () => {
    console.log(`🌐 Servidor HTTP local: http://localhost:${config_1.config.server.port}`);
    console.log(`   - Estado: http://localhost:${config_1.config.server.port}/status`);
    console.log(`   - Health: http://localhost:${config_1.config.server.port}/health`);
    console.log('');
    // Conectar a WebSocket
    websocket_service_1.websocketService.connect();
});
// ==================== MANEJO DE CIERRE GRACEFUL ====================
process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Cerrando agente...');
    websocket_service_1.websocketService.disconnect();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('');
    console.log('👋 Cerrando agente...');
    websocket_service_1.websocketService.disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map