"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSampleTicketText = buildSampleTicketText;
exports.buildSamplePrintEvent = buildSamplePrintEvent;
const config_1 = require("../config/config");
/**
 * Ticket ESC/POS mínimo para pruebas locales.
 */
function buildSampleTicketText(folio, placa) {
    const sede = config_1.config.modo === 'puerta' ? config_1.config.puerta.sedeNombre : config_1.config.caja.sedeNombre;
    const punto = config_1.config.modo === 'puerta'
        ? `Puerta ${config_1.config.puerta.numero}`
        : `Caja ${config_1.config.caja.codigo}`;
    const ESC = '\x1B';
    const GS = '\x1D';
    let t = ESC + '@';
    t += ESC + 'a\x01' + ESC + 'E\x01' + 'ESTACIONAMIENTO GCB' + ESC + 'E\x00\n';
    t += sede + '\n' + punto + '\n';
    t += '--------------------------------\n';
    t += ESC + 'a\x00';
    t += `Folio: ${folio}\nPlaca: ${placa}\n`;
    t += `Fecha: ${new Date().toLocaleString('es-PE')}\n`;
    t += '--------------------------------\n';
    t += ESC + 'a\x01' + 'Evento simulado (debug)\n\n\n';
    t += GS + 'V\x41\x00';
    return t;
}
/**
 * Payload como lo envía Laravel Reverb en el evento `print-command`.
 */
function buildSamplePrintEvent(overrides) {
    const targetId = config_1.config.modo === 'puerta' ? config_1.config.puerta.id : config_1.config.caja.id;
    const targetType = config_1.config.modo;
    const folio = 'SIM-' + Date.now().toString().slice(-6);
    const placa = 'ABC-123';
    const base = {
        job_id: `job-debug-${Date.now()}`,
        caja_id: config_1.config.modo === 'caja' ? config_1.config.caja.id : 0,
        target_id: targetId,
        target_type: targetType,
        tipo_impresion: 'ticket',
        texto: buildSampleTicketText(folio, placa),
        timestamp: new Date().toISOString(),
        metadata: {
            numero_ticket: folio,
            placa,
            caja_nombre: config_1.config.modo === 'caja' ? config_1.config.caja.sedeNombre : undefined,
            caja_codigo: config_1.config.modo === 'caja' ? config_1.config.caja.codigo : undefined,
            sede_nombre: config_1.config.modo === 'caja' ? config_1.config.caja.sedeNombre : config_1.config.puerta.sedeNombre,
            sede_id: config_1.config.modo === 'puerta' ? config_1.config.puerta.sedeId : undefined,
            timestamp: new Date().toISOString(),
        },
    };
    const payload = { ...base, ...overrides };
    // Mismo formato que Laravel Reverb tras el fix de encoding
    if (payload.texto_encoding !== 'base64' && typeof payload.texto === 'string') {
        payload.texto = Buffer.from(payload.texto, 'latin1').toString('base64');
        payload.texto_encoding = 'base64';
    }
    return payload;
}
//# sourceMappingURL=sample-print-payload.js.map