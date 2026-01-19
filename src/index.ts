import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/config';
import { websocketService } from './services/websocket.service';
import { printerService } from './services/printer.service';
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
app.get('/status', (_req: Request, res: Response<AgentStatus>) => {
    const printerInfo = printerService.getPrinterInfo();

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

