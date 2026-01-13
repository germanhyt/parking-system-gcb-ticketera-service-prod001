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
    res.json({
        status: websocket_service_1.websocketService.getConnectionStatus() && printerInfo.available ? 'online' : 'offline',
        caja_id: config_1.config.caja.id,
        caja_codigo: config_1.config.caja.codigo,
        sede_nombre: config_1.config.caja.sedeNombre,
        websocket: {
            connected: websocket_service_1.websocketService.getConnectionStatus(),
            server: config_1.config.websocket.serverUrl
        },
        printer: {
            name: printerInfo.name,
            available: printerInfo.available
        },
        uptime: process.uptime()
    });
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