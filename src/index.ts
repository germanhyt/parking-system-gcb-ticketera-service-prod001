import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { websocketService } from './services/websocket.service';
import { printerService } from './services/printer.service';
import { AgentStatus } from './types';

// ==================== CONFIGURACIÓN EXPRESS ====================

const app = express();
app.use(cors());
app.use(express.json());

// ==================== ENDPOINTS DE MONITOREO ====================

/**
 * Endpoint de estado del agente
 */
app.get('/status', (_req: Request, res: Response<AgentStatus>) => {
    const printerInfo = printerService.getPrinterInfo();

    res.json({
        status: websocketService.getConnectionStatus() && printerInfo.available ? 'online' : 'offline',
        caja_id: config.caja.id,
        caja_codigo: config.caja.codigo,
        sede_nombre: config.caja.sedeNombre,
        websocket: {
            connected: websocketService.getConnectionStatus(),
            server: config.websocket.serverUrl
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
app.get('/health', (_req: Request, res: Response) => {
    const healthy = websocketService.getConnectionStatus() && printerService.isPrinterAvailable();

    res.status(healthy ? 200 : 503).json({
        healthy,
        timestamp: new Date().toISOString()
    });
});

// ==================== INICIO DEL SERVIDOR ====================

app.listen(config.server.port, (): void => {
    console.log(`🌐 Servidor HTTP local: http://localhost:${config.server.port}`);
    console.log(`   - Estado: http://localhost:${config.server.port}/status`);
    console.log(`   - Health: http://localhost:${config.server.port}/health`);
    console.log('');

    // Conectar a WebSocket
    websocketService.connect();
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

