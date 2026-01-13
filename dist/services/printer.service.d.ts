/**
 * Resultado de una operación de impresión
 */
interface PrintResult {
    success: boolean;
    printerJobId?: string;
    error?: string;
}
/**
 * Servicio para manejar operaciones de impresión
 */
declare class PrinterService {
    /**
     * Imprimir texto en la impresora configurada
     */
    print(texto: string): Promise<PrintResult>;
    /**
     * Verificar si la impresora está disponible
     */
    isPrinterAvailable(): boolean;
    /**
     * Obtener información de la impresora
     */
    getPrinterInfo(): {
        name: string;
        available: boolean;
    };
}
export declare const printerService: PrinterService;
export {};
//# sourceMappingURL=printer.service.d.ts.map