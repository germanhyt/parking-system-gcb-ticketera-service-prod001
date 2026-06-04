/**
 * Tipos e interfaces para el agente de impresión
 */
export interface PrintCommand {
    caja_id: number;
    target_id?: number;
    target_type?: string;
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
        tipo?: string;
        serie_numero?: string;
        puerta_numero?: string;
        puerta_descripcion?: string;
    };
    timestamp: string;
}
export interface PrintResult {
    job_id: string;
    /** ID de caja cuando MODO=caja (0 si solo aplica puerta). */
    caja_id: number;
    /** ID de puerta cuando MODO=puerta. */
    puerta_id?: number;
    success: boolean;
    error?: string;
    printer_job_id?: string;
    duration_ms?: number;
}
export interface AgentStatus {
    status: 'online' | 'offline' | 'error';
    modo: 'caja' | 'puerta';
    caja_id?: number;
    puerta_id?: number;
    caja_codigo?: string;
    puerta_numero?: string;
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
    modo: 'caja' | 'puerta';
    caja: {
        id: number;
        codigo: string;
        sedeNombre: string;
    };
    puerta: {
        id: number;
        numero: string;
        sedeId: number;
        sedeNombre: string;
    };
    printer: {
        name: string;
    };
    server: {
        port: number;
    };
}
//# sourceMappingURL=index.d.ts.map