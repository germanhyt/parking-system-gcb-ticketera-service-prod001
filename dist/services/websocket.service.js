"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketService = void 0;
exports.decodePrintTexto = decodePrintTexto;
const config_1 = require("../config/config");
const pusher_client_1 = require("../lib/pusher-client");
const printer_service_1 = require("./printer.service");
/**
 * Decodifica texto ESC/POS del evento Reverb (base64) o legado (crudo).
 */
function decodePrintTexto(data) {
    const raw = String(data.texto ?? '');
    if (data.texto_encoding === 'base64') {
        if (!raw) {
            return '';
        }
        return Buffer.from(raw, 'base64').toString('latin1');
    }
    return raw;
}
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
        // Mostrar información según modo
        if (config_1.config.modo === 'puerta') {
            console.log(`📍 Sede: ${config_1.config.puerta.sedeNombre}`);
            console.log(`🚪 Puerta: ${config_1.config.puerta.numero} (ID: ${config_1.config.puerta.id})`);
            console.log(`🖨️  Impresora: ${config_1.config.printer.name}`);
            console.log(`🔌 Servidor: ${config_1.config.websocket.serverUrl}`);
            console.log(`📡 Canal: printer.puerta.${config_1.config.puerta.id}`);
        }
        else {
            console.log(`📍 Sede: ${config_1.config.caja.sedeNombre} (Caja ${config_1.config.caja.codigo})`);
            console.log(`🆔 Caja ID: ${config_1.config.caja.id}`);
            console.log(`🖨️  Impresora: ${config_1.config.printer.name}`);
            console.log(`🔌 Servidor: ${config_1.config.websocket.serverUrl}`);
            console.log(`📡 Canal: printer.caja.${config_1.config.caja.id}`);
        }
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        // Extraer host y port de la URL
        const url = new URL(config_1.config.websocket.serverUrl);
        const wsHost = url.hostname;
        const wsPort = parseInt(url.port, 10) || (url.protocol === 'wss:' ? 443 : 80);
        const useTls = url.protocol === 'wss:';
        // Configurar Pusher para conectar a Laravel Reverb
        // Mismo criterio que Laravel Echo en el frontend: con TLS, permitir ws+wss
        // (solo ['wss'] deja la conexión en "failed" en Node/pusher-js).
        this.pusher = (0, pusher_client_1.createPusher)(config_1.config.websocket.appKey, {
            wsHost: wsHost,
            wsPort: wsPort,
            wssPort: wsPort,
            forceTLS: useTls,
            enabledTransports: useTls ? ['ws', 'wss'] : ['ws'],
            disableStats: true,
            cluster: 'mt1' // Requerido pero ignorado por Reverb
        });
        // Configurar event handlers de conexión
        this.setupConnectionHandlers();
        // Suscribirse al canal según modo
        const channelName = config_1.config.modo === 'puerta'
            ? `printer.puerta.${config_1.config.puerta.id}`
            : `printer.caja.${config_1.config.caja.id}`;
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
            const channelName = config_1.config.modo === 'puerta'
                ? `printer.puerta.${config_1.config.puerta.id}`
                : `printer.caja.${config_1.config.caja.id}`;
            console.log('✅ Conectado al servidor WebSocket (Reverb)');
            console.log(`   Socket ID: ${this.pusher?.connection.socket_id}`);
            console.log(`   Escuchando canal: ${channelName}`);
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
        this.pusher.connection.bind('failed', () => {
            console.error('❌ WebSocket en estado failed. Verifique Reverb en el VPS (docker ps | grep reverb) y que', config_1.config.websocket.serverUrl, 'responda en /app (no 502).');
        });
        this.pusher.connection.bind('unavailable', () => {
            console.error('❌ WebSocket no disponible (unavailable). Revise red/firewall hacia el servidor Reverb.');
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
        // PrinterCommandEvent
        // Escuchar evento de impresión (Laravel Reverb usa el nombre del evento del broadcast)
        this.channel.bind('print-command', async (data) => {
            await this.onPrintCommandReceived(data, { source: 'websocket' });
        });
    }
    /**
     * Parsear payload del evento print-command (Laravel / Reverb).
     */
    parsePrintCommand(data) {
        return {
            job_id: String(data.job_id ?? ''),
            caja_id: Number(data.caja_id ?? 0),
            target_id: data.target_id != null ? Number(data.target_id) : undefined,
            target_type: data.target_type != null ? String(data.target_type) : undefined,
            texto: decodePrintTexto(data),
            tipo_impresion: String(data.tipo_impresion ?? 'ticket'),
            metadata: data.metadata || {},
            timestamp: String(data.timestamp ?? new Date().toISOString()),
        };
    }
    /**
     * Mismo flujo que el WebSocket; útil para debug local (POST /debug/simulate-print-event).
     */
    async onPrintCommandReceived(data, options = {}) {
        const source = options.source ?? 'manual';
        const imprimir = options.imprimir !== false;
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📄 COMANDO DE IMPRESIÓN RECIBIDO [${source}]`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('   Datos recibidos:', JSON.stringify(data, null, 2));
        console.log(`   imprimir: ${imprimir}`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        const raw = (data && typeof data === 'object' ? data : {});
        const command = this.parsePrintCommand(raw);
        const targetId = config_1.config.modo === 'puerta' ? config_1.config.puerta.id : config_1.config.caja.id;
        const commandTargetId = command.target_id ?? command.caja_id;
        if (commandTargetId !== targetId) {
            const targetType = config_1.config.modo === 'puerta' ? 'puerta' : 'caja';
            console.log(`⚠️  Comando ignorado: es para ${targetType} ${commandTargetId}, este es ${targetType} ${targetId}`);
            return { processed: false, ignored: true };
        }
        if (!imprimir) {
            console.log('ℹ️  Modo solo-log: no se envía a impresora (imprimir=false)');
            return { processed: true, printed: false };
        }
        try {
            await this.handlePrintCommand(command);
            return { processed: true, printed: true };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { processed: true, printed: false, error: msg };
        }
    }
    /**
     * Manejar comando de impresión recibido
     */
    async handlePrintCommand(command) {
        const startTime = Date.now();
        try {
            // Verificar que el comando es para este dispositivo
            const targetId = config_1.config.modo === 'puerta' ? config_1.config.puerta.id : config_1.config.caja.id;
            const commandTargetId = command.target_id || command.caja_id;
            if (commandTargetId !== targetId) {
                const targetType = config_1.config.modo === 'puerta' ? 'puerta' : 'caja';
                console.log(`⚠️  Comando ignorado: es para ${targetType} ${commandTargetId}, este es ${targetType} ${targetId}`);
                return;
            }
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`🖨️  PROCESANDO IMPRESIÓN - MODO: ${config_1.config.modo.toUpperCase()}`);
            console.log('═══════════════════════════════════════════════════════');
            console.log(`   Job ID: ${command.job_id}`);
            console.log(`   Tipo: ${command.tipo_impresion}`);
            // Mostrar información relevante según el tipo
            if (command.tipo_impresion === 'comprobante') {
                console.log(`   Serie: ${command.metadata.serie_numero || 'N/A'}`);
                console.log(`   Tipo Comprobante: ${command.metadata.tipo || 'N/A'}`);
            }
            else {
                console.log(`   Ticket: ${command.metadata.numero_ticket || 'N/A'}`);
                console.log(`   Placa: ${command.metadata.placa || 'N/A'}`);
            }
            // Mostrar puerta o caja
            if (config_1.config.modo === 'puerta') {
                console.log(`   Puerta: ${config_1.config.puerta.numero}`);
            }
            else {
                console.log(`   Caja: ${config_1.config.caja.codigo}`);
            }
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
                    caja_id: config_1.config.modo === 'caja' ? config_1.config.caja.id : 0,
                    ...(config_1.config.modo === 'puerta' ? { puerta_id: config_1.config.puerta.id } : {}),
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
                caja_id: config_1.config.modo === 'caja' ? config_1.config.caja.id : 0,
                ...(config_1.config.modo === 'puerta' ? { puerta_id: config_1.config.puerta.id } : {}),
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
            const channelName = config_1.config.modo === 'puerta'
                ? `printer.puerta.${config_1.config.puerta.id}`
                : `printer.caja.${config_1.config.caja.id}`;
            this.pusher?.unsubscribe(channelName);
            this.channel = null;
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