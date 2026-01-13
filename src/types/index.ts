/**
 * Tipos e interfaces para el agente de impresión
 */

export interface PrintCommand {
    caja_id: number;
    texto: string;
    job_id: string;
    tipo_impresion: string;
    metadata: {
        numero_ticket?: string;
        placa?: string;
        caja_nombre?: string;
        caja_codigo?: string;
        sede_nombre?: string;
        sede_id?: number;
        timestamp?: string;
    };
    timestamp: string;
}

export interface PrintResult {
    job_id: string;
    caja_id: number;
    success: boolean;
    error?: string;
    printer_job_id?: string;
    duration_ms?: number;
}

export interface AgentStatus {
    status: 'online' | 'offline' | 'error';
    caja_id: number;
    caja_codigo: string;
    sede_nombre: string;
    websocket: {
        connected: boolean;
        server: string;
    };
    printer: {
        name: string;
        available: boolean;
    };
    uptime: number;
}

export interface Config {
    websocket: {
        serverUrl: string;
        appKey: string;
    };
    caja: {
        id: number;
        codigo: string;
        sedeNombre: string;
    };
    printer: {
        name: string;
    };
    server: {
        port: number;
    };
}

