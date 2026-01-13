import * as printer from '@thiagoelg/node-printer';
import { config } from '../config/config';

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
class PrinterService {
    /**
     * Imprimir texto en la impresora configurada
     */
    public async print(texto: string): Promise<PrintResult> {
        return new Promise((resolve, reject) => {
            // Verificar impresora
            console.log(`🔍 Buscando impresora: ${config.printer.name}...`);
            const impresora = printer.getPrinter(config.printer.name);
            
            if (!impresora) {
                const error = `Impresora "${config.printer.name}" no encontrada en el sistema`;
                console.error(`❌ ${error}`);
                resolve({
                    success: false,
                    error: error
                });
                return;
            }
            
            console.log('✅ Impresora encontrada');
            console.log('📤 Enviando a imprimir...');

            // Imprimir
            printer.printDirect({
                data: texto,
                printer: config.printer.name,
                type: 'RAW',
                success: (jobID: string | number) => {
                    resolve({
                        success: true,
                        printerJobId: String(jobID)
                    });
                },
                error: (err: Error | string) => {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    resolve({
                        success: false,
                        error: errorMsg
                    });
                }
            });
        });
    }

    /**
     * Verificar si la impresora está disponible
     */
    public isPrinterAvailable(): boolean {
        return printer.getPrinter(config.printer.name) !== null;
    }

    /**
     * Obtener información de la impresora
     */
    public getPrinterInfo(): { name: string; available: boolean } {
        return {
            name: config.printer.name,
            available: this.isPrinterAvailable()
        };
    }
}

export const printerService = new PrinterService();

