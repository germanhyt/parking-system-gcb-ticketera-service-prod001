import { PrintCommand } from '../types';
/**
 * Decodifica texto ESC/POS del evento Reverb (base64) o legado (crudo).
 */
export declare function decodePrintTexto(data: Record<string, unknown>): string;
/**
 * Servicio para manejar la conexión WebSocket con Laravel Reverb
 */
declare class WebSocketService {
    private pusher;
    private channel;
    private isConnected;
    /**
     * Conectar al servidor WebSocket (Laravel Reverb)
     */
    connect(): void;
    /**
     * Configurar manejadores de conexión
     */
    private setupConnectionHandlers;
    /**
     * Configurar manejadores del canal
     */
    private setupChannelHandlers;
    /**
     * Parsear payload del evento print-command (Laravel / Reverb).
     */
    parsePrintCommand(data: Record<string, unknown>): PrintCommand;
    /**
     * Mismo flujo que el WebSocket; útil para debug local (POST /debug/simulate-print-event).
     */
    onPrintCommandReceived(data: unknown, options?: {
        source?: string;
        imprimir?: boolean;
    }): Promise<{
        processed: boolean;
        ignored?: boolean;
        printed?: boolean;
        error?: string;
    }>;
    /**
     * Manejar comando de impresión recibido
     */
    private handlePrintCommand;
    /**
     * Desconectar del servidor
     */
    disconnect(): void;
    /**
     * Obtener estado de conexión
     */
    getConnectionStatus(): boolean;
}
export declare const websocketService: WebSocketService;
export {};
//# sourceMappingURL=websocket.service.d.ts.map