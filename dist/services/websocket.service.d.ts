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