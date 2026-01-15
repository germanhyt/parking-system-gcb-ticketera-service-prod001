"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketService = void 0;
const pusher_js_1 = __importDefault(require("pusher-js"));
const config_1 = require("../config/config");
const printer_service_1 = require("./printer.service");
/**
 * Servicio para manejar la conexión WebSocket con Laravel Reverb
 */
class WebSocketService {
    constructor() {
        this.pusher = null;
        this.channel = null;
        this.isConnected = false;
    }
    /**
     * Conectar al servidor WebSocket (Laravel Reverb)
     */
    connect() {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 AGENTE DE IMPRESIÓN - INICIANDO');
        console.log('═══════════════════════════════════════════════════════');
        if (!config_1.config.websocket.serverUrl) {
            console.error('❌ ERROR: WEBSOCKET_SERVER_URL no está configurado en .env');
            return;
        }
        console.log('');
        console.log(`📍 Sede: ${config_1.config.caja.sedeNombre} (Caja ${config_1.config.caja.codigo})`);
        console.log(`🆔 Caja ID: ${config_1.config.caja.id}`);
        console.log(`🖨️  Impresora: ${config_1.config.printer.name}`);
        console.log(`🔌 Servidor: ${config_1.config.websocket.serverUrl}`);
        console.log(`📡 Canal: printer.caja.${config_1.config.caja.id}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        // Extraer host y port de la URL
        const url = new URL(config_1.config.websocket.serverUrl);
        const wsHost = url.hostname;
        const wsPort = parseInt(url.port) || 8080;
        // Configurar Pusher para conectar a Laravel Reverb
        this.pusher = new pusher_js_1.default(config_1.config.websocket.appKey, {
            wsHost: wsHost,
            wsPort: wsPort,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
            cluster: 'mt1' // Requerido pero ignorado por Reverb
        });
        // Configurar event handlers de conexión
        this.setupConnectionHandlers();
        // Suscribirse al canal específico de la caja
        const channelName = `printer.caja.${config_1.config.caja.id}`;
        this.channel = this.pusher.subscribe(channelName);
        // Configurar listeners de eventos del canal
        this.setupChannelHandlers();
    }
    /**
     * Configurar manejadores de conexión
     */
    setupConnectionHandlers() {
        if (!this.pusher)
            return;
        // Conexión establecida
        this.pusher.connection.bind('connected', () => {
            this.isConnected = true;
            console.log('✅ Conectado al servidor WebSocket (Reverb)');
            console.log(`   Socket ID: ${this.pusher?.connection.socket_id}`);
            console.log(`   Escuchando canal: printer.caja.${config_1.config.caja.id}`);
            console.log('');
        });
        // Desconectado
        this.pusher.connection.bind('disconnected', () => {
            this.isConnected = false;
            console.log('❌ Desconectado del servidor');
        });
        // Error de conexión
        this.pusher.connection.bind('error', (error) => {
            console.error('❌ Error de conexión:', error);
        });
        // Estado cambiado
        this.pusher.connection.bind('state_change', (states) => {
            console.log(`🔄 Estado: ${states.previous} -> ${states.current}`);
        });
        // Reconectando
        this.pusher.connection.bind('connecting', () => {
            console.log('🔄 Conectando al servidor...');
        });
        // Reconexión exitosa
        this.pusher.connection.bind('connected', () => {
            if (this.isConnected) {
                console.log('✅ Reconectado exitosamente');
            }
        });
    }
    /**
     * Configurar manejadores del canal
     */
    setupChannelHandlers() {
        if (!this.channel)
            return;
        // Suscripción exitosa
        this.channel.bind('pusher:subscription_succeeded', () => {
            console.log('✅ Suscrito exitosamente al canal');
            console.log('');
        });
        // Error en suscripción
        this.channel.bind('pusher:subscription_error', (error) => {
            console.error('❌ Error al suscribirse al canal:', error);
        });
        // Escuchar evento de impresión (Laravel Reverb usa el nombre del evento del broadcast)
        this.channel.bind('PrinterCommandEvent', async (data) => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('📄 COMANDO DE IMPRESIÓN RECIBIDO');
            console.log('═══════════════════════════════════════════════════════');
            console.log('   Datos recibidos:', JSON.stringify(data, null, 2));
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            // El evento viene con la estructura de Laravel
            const command = {
                job_id: data.job_id,
                caja_id: data.caja_id,
                texto: data.texto,
                tipo_impresion: data.tipo_impresion,
                metadata: data.metadata || {},
                timestamp: data.timestamp || new Date().toISOString()
            };
            await this.handlePrintCommand(command);
        });
    }
    /**
     * Manejar comando de impresión recibido
     */
    async handlePrintCommand(command) {
        const startTime = Date.now();
        try {
            // Verificar que el comando es para esta caja
            if (command.caja_id !== config_1.config.caja.id) {
                console.log(`⚠️  Comando ignorado: es para caja ${command.caja_id}, esta es caja ${config_1.config.caja.id}`);
                return;
            }
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('🖨️  PROCESANDO IMPRESIÓN');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`   Job ID: ${command.job_id}`);
            console.log(`   Tipo: ${command.tipo_impresion}`);
            console.log(`   Ticket: ${command.metadata.numero_ticket || 'N/A'}`);
            console.log(`   Placa: ${command.metadata.placa || 'N/A'}`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            // Imprimir usando el servicio de impresión
            const result = await printer_service_1.printerService.print(command.texto);
            const duration = Date.now() - startTime;
            if (result.success) {
                console.log('');
                console.log('✅ ¡IMPRESIÓN EXITOSA!');
                console.log(`   Printer Job ID: ${result.printerJobId}`);
                console.log(`   Duración: ${duration}ms`);
                console.log('');
                // Enviar resultado exitoso al servidor
                const printResult = {
                    job_id: command.job_id,
                    caja_id: config_1.config.caja.id,
                    success: true,
                    printer_job_id: result.printerJobId,
                    duration_ms: duration
                };
                // Trigger evento de resultado (si el backend lo escucha)
                this.channel?.trigger('client-print-result', printResult);
                console.log('📤 Resultado enviado al servidor');
            }
            else {
                throw new Error(result.error || 'Error desconocido en impresión');
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            const duration = Date.now() - startTime;
            console.error('');
            console.error('❌ ERROR EN IMPRESIÓN');
            console.error(`   Mensaje: ${errorMsg}`);
            console.error(`   Duración: ${duration}ms`);
            console.error('');
            // Enviar resultado de error al servidor
            const printResult = {
                job_id: command.job_id,
                caja_id: config_1.config.caja.id,
                success: false,
                error: errorMsg,
                duration_ms: duration
            };
            this.channel?.trigger('client-print-result', printResult);
            console.log('📤 Error reportado al servidor');
        }
    }
    /**
     * Desconectar del servidor
     */
    disconnect() {
        if (this.channel) {
            this.channel.unbind_all();
            this.pusher?.unsubscribe(`printer.caja.${config_1.config.caja.id}`);
        }
        if (this.pusher) {
            this.pusher.disconnect();
            this.pusher = null;
            this.isConnected = false;
        }
    }
    /**
     * Obtener estado de conexión
     */
    getConnectionStatus() {
        return this.isConnected && this.pusher?.connection.state === 'connected';
    }
}
exports.websocketService = new WebSocketService();
//# sourceMappingURL=websocket.service.js.map