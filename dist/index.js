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
const sample_print_payload_1 = require("./lib/sample-print-payload");
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
app.get('/status', async (_req, res) => {
    const printerInfo = await printer_service_1.printerService.getPrinterInfoAsync();
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
app.get('/health', async (_req, res) => {
    const printerOk = await printer_service_1.printerService.isPrinterAvailableAsync();
    const healthy = websocket_service_1.websocketService.getConnectionStatus() && printerOk;
    res.status(healthy ? 200 : 503).json({
        healthy,
        timestamp: new Date().toISOString()
    });
});
/**
 * Payload de ejemplo del evento print-command (según .env actual).
 */
app.get('/debug/print-event-sample', (_req, res) => {
    const canal = config_1.config.modo === 'puerta'
        ? `printer.puerta.${config_1.config.puerta.id}`
        : `printer.caja.${config_1.config.caja.id}`;
    res.json({
        evento: 'print-command',
        canal,
        descripcion: 'Estructura que envía Laravel Reverb; usar en POST /debug/simulate-print-event',
        payload: (0, sample_print_payload_1.buildSamplePrintEvent)(),
        curl_ejemplo: `curl -X POST http://localhost:${config_1.config.server.port}/debug/simulate-print-event -H "Content-Type: application/json" -d "{\\"imprimir\\":false}"`,
    });
});
/**
 * Simula el evento print-command (mismos logs que WebSocket).
 * Body: payload del evento, o vacío para usar el ejemplo.
 * Query/body: imprimir=false → solo logs, sin imprimir.
 */
app.post('/debug/simulate-print-event', async (req, res) => {
    const imprimir = req.body?.imprimir !== false && req.query.imprimir !== 'false';
    const hasEventPayload = req.body?.job_id != null;
    const payload = hasEventPayload
        ? req.body
        : (0, sample_print_payload_1.buildSamplePrintEvent)();
    const result = await websocket_service_1.websocketService.onPrintCommandReceived(payload, {
        source: 'debug-http',
        imprimir,
    });
    res.json({
        ok: true,
        imprimir,
        result,
        payload_usado: payload,
    });
});
/**
 * Impresión física de prueba (solo diagnóstico local)
 */
app.post('/test-print', async (req, res) => {
    const folio = req.body?.folio || 'PRUEBA-LOCAL';
    const placa = req.body?.placa || 'TST-999';
    const sede = config_1.config.modo === 'puerta' ? config_1.config.puerta.sedeNombre : config_1.config.caja.sedeNombre;
    const punto = config_1.config.modo === 'puerta'
        ? `Puerta ${config_1.config.puerta.numero}`
        : `Caja ${config_1.config.caja.codigo}`;
    const ESC = '\x1B';
    const GS = '\x1D';
    let ticket = ESC + '@';
    ticket += ESC + 'a' + '\x01' + ESC + 'E' + '\x01' + 'PRUEBA TICKETERA' + ESC + 'E' + '\x00' + '\n';
    ticket += sede + '\n' + punto + '\n';
    ticket += '--------------------------------\n';
    ticket += ESC + 'a' + '\x00';
    ticket += 'Folio: ' + folio + '\n';
    ticket += 'Placa: ' + placa + '\n';
    ticket += 'Fecha: ' + new Date().toLocaleString('es-PE') + '\n';
    ticket += '--------------------------------\n';
    ticket += ESC + 'a' + '\x01' + 'Impresion de diagnostico\n\n\n';
    ticket += GS + 'V' + '\x41' + '\x00';
    const result = await printer_service_1.printerService.print(ticket);
    if (result.success) {
        res.json({
            success: true,
            message: 'Ticket enviado al spooler. Verifique salida fisica en la impresora.',
            printer_job_id: result.printerJobId,
            impresora: config_1.config.printer.name,
            folio,
            placa
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: result.error,
        impresora: config_1.config.printer.name
    });
});
// ==================== INICIO DEL SERVIDOR ====================
app.listen(config_1.config.server.port, () => {
    console.log(`🌐 Servidor HTTP local: http://localhost:${config_1.config.server.port}`);
    console.log(`   - Estado: http://localhost:${config_1.config.server.port}/status`);
    console.log(`   - Health: http://localhost:${config_1.config.server.port}/health`);
    console.log(`   - Sample evento: http://localhost:${config_1.config.server.port}/debug/print-event-sample`);
    console.log(`   - Simular evento: POST http://localhost:${config_1.config.server.port}/debug/simulate-print-event`);
    console.log('');
    // Conectar a WebSocket (no tumbar HTTP si falla)
    try {
        websocket_service_1.websocketService.connect();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ WebSocket no inició:', msg);
        console.error('   El servidor HTTP sigue activo para /test-print y /status');
    }
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