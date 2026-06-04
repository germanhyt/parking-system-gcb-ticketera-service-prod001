import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { websocketService } from './services/websocket.service';
import { printerService } from './services/printer.service';
import { buildSamplePrintEvent } from './lib/sample-print-payload';
import { AgentStatus } from './types';

// ==================== VALIDACIÓN DE CONFIGURACIÓN ====================

/**
 * Validar configuración según el modo de operación
 */
function validateConfig(): void {
    console.log('');
    console.log('🔍 Validando configuración...');

    if (config.modo === 'puerta') {
        if (!config.puerta.id || !config.puerta.numero) {
            console.error('❌ ERROR: Configuración de PUERTA incompleta');
            console.error('   Se requiere: PUERTA_ID y PUERTA_NUMERO en .env');
            process.exit(1);
        }
        console.log(`✅ Modo: PUERTA`);
        console.log(`   - ID: ${config.puerta.id}`);
        console.log(`   - Número: ${config.puerta.numero}`);
        console.log(`   - Sede: ${config.puerta.sedeNombre}`);
    } else {
        if (!config.caja.id) {
            console.error('❌ ERROR: Configuración de CAJA incompleta');
            console.error('   Se requiere: CAJA_ID en .env');
            process.exit(1);
        }
        console.log(`✅ Modo: CAJA`);
        console.log(`   - ID: ${config.caja.id}`);
        console.log(`   - Código: ${config.caja.codigo}`);
        console.log(`   - Sede: ${config.caja.sedeNombre}`);
    }
    console.log('');
}

// Validar antes de iniciar
validateConfig();

// ==================== CONFIGURACIÓN EXPRESS ====================

const app = express();
app.use(cors());
app.use(express.json());

// ==================== ENDPOINTS DE MONITOREO ====================

/**
 * Endpoint de estado del agente
 */
app.get('/status', async (_req: Request, res: Response<AgentStatus>) => {
    const printerInfo = await printerService.getPrinterInfoAsync();

    const status: AgentStatus = {
        status: websocketService.getConnectionStatus() && printerInfo.available ? 'online' : 'offline',
        modo: config.modo,
        sede_nombre: config.modo === 'puerta' ? config.puerta.sedeNombre : config.caja.sedeNombre,
        websocket: {
            connected: websocketService.getConnectionStatus(),
            server: config.websocket.serverUrl
        },
        printer: {
            name: printerInfo.name,
            available: printerInfo.available
        },
        uptime: process.uptime()
    };

    // Agregar campos específicos según modo
    if (config.modo === 'caja') {
        status.caja_id = config.caja.id;
        status.caja_codigo = config.caja.codigo;
    } else {
        status.puerta_id = config.puerta.id;
        status.puerta_numero = config.puerta.numero;
    }

    res.json(status);
});

/**
 * Endpoint de health check
 */
app.get('/health', async (_req: Request, res: Response) => {
    const printerOk = await printerService.isPrinterAvailableAsync();
    const healthy = websocketService.getConnectionStatus() && printerOk;

    res.status(healthy ? 200 : 503).json({
        healthy,
        timestamp: new Date().toISOString()
    });
});

/**
 * Payload de ejemplo del evento print-command (según .env actual).
 */
app.get('/debug/print-event-sample', (_req: Request, res: Response) => {
    const canal = config.modo === 'puerta'
        ? `printer.puerta.${config.puerta.id}`
        : `printer.caja.${config.caja.id}`;

    res.json({
        evento: 'print-command',
        canal,
        descripcion: 'Estructura que envía Laravel Reverb; usar en POST /debug/simulate-print-event',
        payload: buildSamplePrintEvent(),
        curl_ejemplo: `curl -X POST http://localhost:${config.server.port}/debug/simulate-print-event -H "Content-Type: application/json" -d "{\\"imprimir\\":false}"`,
    });
});

/**
 * Simula el evento print-command (mismos logs que WebSocket).
 * Body: payload del evento, o vacío para usar el ejemplo.
 * Query/body: imprimir=false → solo logs, sin imprimir.
 */
app.post('/debug/simulate-print-event', async (req: Request, res: Response) => {
    const imprimir = req.body?.imprimir !== false && req.query.imprimir !== 'false';
    const hasEventPayload = req.body?.job_id != null;
    const payload = hasEventPayload
        ? req.body
        : buildSamplePrintEvent();

    const result = await websocketService.onPrintCommandReceived(payload, {
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
app.post('/test-print', async (req: Request, res: Response) => {
    const folio = (req.body?.folio as string) || 'PRUEBA-LOCAL';
    const placa = (req.body?.placa as string) || 'TST-999';
    const sede = config.modo === 'puerta' ? config.puerta.sedeNombre : config.caja.sedeNombre;
    const punto = config.modo === 'puerta'
        ? `Puerta ${config.puerta.numero}`
        : `Caja ${config.caja.codigo}`;

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

    const result = await printerService.print(ticket);

    if (result.success) {
        res.json({
            success: true,
            message: 'Ticket enviado al spooler. Verifique salida fisica en la impresora.',
            printer_job_id: result.printerJobId,
            impresora: config.printer.name,
            folio,
            placa
        });
        return;
    }

    res.status(500).json({
        success: false,
        error: result.error,
        impresora: config.printer.name
    });
});

// ==================== INICIO DEL SERVIDOR ====================

app.listen(config.server.port, (): void => {
    console.log(`🌐 Servidor HTTP local: http://localhost:${config.server.port}`);
    console.log(`   - Estado: http://localhost:${config.server.port}/status`);
    console.log(`   - Health: http://localhost:${config.server.port}/health`);
    console.log(`   - Sample evento: http://localhost:${config.server.port}/debug/print-event-sample`);
    console.log(`   - Simular evento: POST http://localhost:${config.server.port}/debug/simulate-print-event`);
    console.log('');

    // Conectar a WebSocket (no tumbar HTTP si falla)
    try {
        websocketService.connect();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ WebSocket no inició:', msg);
        console.error('   El servidor HTTP sigue activo para /test-print y /status');
    }
});

// ==================== MANEJO DE CIERRE GRACEFUL ====================

process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Cerrando agente...');
    websocketService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('');
    console.log('👋 Cerrando agente...');
    websocketService.disconnect();
    process.exit(0);
});

