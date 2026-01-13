import Pusher from 'pusher-js';
import { config } from '../config/config';
import { PrintCommand, PrintResult } from '../types';
import { printerService } from './printer.service';

/**
 * Servicio para manejar la conexión WebSocket con Laravel Reverb
 */
class WebSocketService {
    private pusher: Pusher | null = null;
    private channel: any = null;
    private isConnected: boolean = false;

    /**
     * Conectar al servidor WebSocket (Laravel Reverb)
     */
    public connect(): void {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 AGENTE DE IMPRESIÓN - INICIANDO');
        console.log('═══════════════════════════════════════════════════════');

        if (!config.websocket.serverUrl) {
            console.error('❌ ERROR: WEBSOCKET_SERVER_URL no está configurado en .env');
            return;
        }

        console.log('');
        console.log(`📍 Sede: ${config.caja.sedeNombre} (Caja ${config.caja.codigo})`);
        console.log(`🆔 Caja ID: ${config.caja.id}`);
        console.log(`🖨️  Impresora: ${config.printer.name}`);
        console.log(`🔌 Servidor: ${config.websocket.serverUrl}`);
        console.log(`📡 Canal: printer.caja.${config.caja.id}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');

        // Extraer host y port de la URL
        const url = new URL(config.websocket.serverUrl);
        const wsHost = url.hostname;
        const wsPort = parseInt(url.port) || 8080;

        // Configurar Pusher para conectar a Laravel Reverb
        this.pusher = new Pusher(config.websocket.appKey, {
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
        const channelName = `printer.caja.${config.caja.id}`;
        this.channel = this.pusher.subscribe(channelName);

        // Configurar listeners de eventos del canal
        this.setupChannelHandlers();
    }

    /**
     * Configurar manejadores de conexión
     */
    private setupConnectionHandlers(): void {
        if (!this.pusher) return;

        // Conexión establecida
        this.pusher.connection.bind('connected', () => {
            this.isConnected = true;
            console.log('✅ Conectado al servidor WebSocket (Reverb)');
            console.log(`   Socket ID: ${this.pusher?.connection.socket_id}`);
            console.log(`   Escuchando canal: printer.caja.${config.caja.id}`);
            console.log('');
        });

        // Desconectado
        this.pusher.connection.bind('disconnected', () => {
            this.isConnected = false;
            console.log('❌ Desconectado del servidor');
        });

        // Error de conexión
        this.pusher.connection.bind('error', (error: any) => {
            console.error('❌ Error de conexión:', error);
        });

        // Estado cambiado
        this.pusher.connection.bind('state_change', (states: any) => {
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
    private setupChannelHandlers(): void {
        if (!this.channel) return;

        // Suscripción exitosa
        this.channel.bind('pusher:subscription_succeeded', () => {
            console.log('✅ Suscrito exitosamente al canal');
            console.log('');
        });

        // Error en suscripción
        this.channel.bind('pusher:subscription_error', (error: any) => {
            console.error('❌ Error al suscribirse al canal:', error);
        });

        // Escuchar evento de impresión (Laravel Reverb usa el nombre del evento del broadcast)
        this.channel.bind('print-command', async (data: any) => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('📄 COMANDO DE IMPRESIÓN RECIBIDO');
            console.log('═══════════════════════════════════════════════════════');
            console.log('   Datos recibidos:', JSON.stringify(data, null, 2));
            console.log('═══════════════════════════════════════════════════════');
            console.log('');

            // El evento viene con la estructura de Laravel
            const command: PrintCommand = {
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
    private async handlePrintCommand(command: PrintCommand): Promise<void> {
        const startTime = Date.now();

        try {
            // Verificar que el comando es para esta caja
            if (command.caja_id !== config.caja.id) {
                console.log(`⚠️  Comando ignorado: es para caja ${command.caja_id}, esta es caja ${config.caja.id}`);
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
            const result = await printerService.print(command.texto);

            const duration = Date.now() - startTime;

            if (result.success) {
                console.log('');
                console.log('✅ ¡IMPRESIÓN EXITOSA!');
                console.log(`   Printer Job ID: ${result.printerJobId}`);
                console.log(`   Duración: ${duration}ms`);
                console.log('');

                // Enviar resultado exitoso al servidor
                const printResult: PrintResult = {
                    job_id: command.job_id,
                    caja_id: config.caja.id,
                    success: true,
                    printer_job_id: result.printerJobId,
                    duration_ms: duration
                };

                // Trigger evento de resultado (si el backend lo escucha)
                this.channel?.trigger('client-print-result', printResult);
                console.log('📤 Resultado enviado al servidor');
            } else {
                throw new Error(result.error || 'Error desconocido en impresión');
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            const duration = Date.now() - startTime;

            console.error('');
            console.error('❌ ERROR EN IMPRESIÓN');
            console.error(`   Mensaje: ${errorMsg}`);
            console.error(`   Duración: ${duration}ms`);
            console.error('');

            // Enviar resultado de error al servidor
            const printResult: PrintResult = {
                job_id: command.job_id,
                caja_id: config.caja.id,
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
    public disconnect(): void {
        if (this.channel) {
            this.channel.unbind_all();
            this.pusher?.unsubscribe(`printer.caja.${config.caja.id}`);
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
    public getConnectionStatus(): boolean {
        return this.isConnected && this.pusher?.connection.state === 'connected';
    }
}

export const websocketService = new WebSocketService();
