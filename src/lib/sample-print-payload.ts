import { config } from '../config/config';
import { PrintCommand } from '../types';

/**
 * Ticket ESC/POS mínimo para pruebas locales.
 */
export function buildSampleTicketText(folio: string, placa: string): string {
    const sede = config.modo === 'puerta' ? config.puerta.sedeNombre : config.caja.sedeNombre;
    const punto = config.modo === 'puerta'
        ? `Puerta ${config.puerta.numero}`
        : `Caja ${config.caja.codigo}`;
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
export function buildSamplePrintEvent(overrides?: Partial<PrintCommand>): Record<string, unknown> {
    const targetId = config.modo === 'puerta' ? config.puerta.id : config.caja.id;
    const targetType = config.modo;
    const folio = 'SIM-' + Date.now().toString().slice(-6);
    const placa = 'ABC-123';

    const base: PrintCommand = {
        job_id: `job-debug-${Date.now()}`,
        caja_id: config.modo === 'caja' ? config.caja.id : 0,
        target_id: targetId,
        target_type: targetType,
        tipo_impresion: 'ticket',
        texto: buildSampleTicketText(folio, placa),
        timestamp: new Date().toISOString(),
        metadata: {
            numero_ticket: folio,
            placa,
            caja_nombre: config.modo === 'caja' ? config.caja.sedeNombre : undefined,
            caja_codigo: config.modo === 'caja' ? config.caja.codigo : undefined,
            sede_nombre: config.modo === 'caja' ? config.caja.sedeNombre : config.puerta.sedeNombre,
            sede_id: config.modo === 'puerta' ? config.puerta.sedeId : undefined,
            timestamp: new Date().toISOString(),
        },
    };

    return { ...base, ...overrides } as Record<string, unknown>;
}
