import { PrintCommand } from '../types';
/**
 * Ticket ESC/POS mínimo para pruebas locales.
 */
export declare function buildSampleTicketText(folio: string, placa: string): string;
/**
 * Payload como lo envía Laravel Reverb en el evento `print-command`.
 */
export declare function buildSamplePrintEvent(overrides?: Partial<PrintCommand>): Record<string, unknown>;
//# sourceMappingURL=sample-print-payload.d.ts.map