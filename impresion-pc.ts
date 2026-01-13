import express, { Request, Response } from 'express';
import cors from 'cors';
import * as printer from '@thiagoelg/node-printer';

// ==================== TIPOS E INTERFACES ====================

interface PrintRequest {
    texto?: string;
}

interface TestTicketRequest {
    folio?: string;
    placa?: string;
}

interface PrintResponse {
    success: boolean;
    jobID?: string | number;
    message?: string;
    error?: string;
}

interface PrinterInfo {
    name: string;
    status?: string;
    isDefault?: boolean;
}

// ==================== CONSTANTES ====================

const NOMBRE_IMPRESORA: string = 'POS-80'; // Debe coincidir con el nombre en Windows
const PUERTO: number = 4000;

// ==================== COMANDOS ESC/POS ====================

const ESC: string = '\x1B';
const GS: string = '\x1D';
const INIT: string = ESC + '@';           // Inicializar
const ALIGN_CENTER: string = ESC + 'a' + '\x01';
const ALIGN_LEFT: string = ESC + 'a' + '\x00';
const BOLD_ON: string = ESC + 'E' + '\x01';
const BOLD_OFF: string = ESC + 'E' + '\x00';
const DOUBLE_HEIGHT: string = GS + '!' + '\x11'; // Doble altura
const NORMAL: string = GS + '!' + '\x00';
const CUT: string = GS + 'V' + '\x41' + '\x00';  // Cortar papel

// ==================== CONFIGURACIÓN EXPRESS ====================

const app = express();
app.use(cors());
app.use(express.json());

// ==================== ENDPOINTS ====================

/**
 * Endpoint para imprimir texto simple
 */
app.post('/imprimir',
    (req: Request<{}, PrintResponse, PrintRequest>,
        res: Response<PrintResponse>): void => {
        const texto: string = req.body.texto || "PRUEBA DE IMPRESION\n\n";

        console.log(`Intentando imprimir en: ${NOMBRE_IMPRESORA}`);

        // 1. Buscamos la impresora
        const impresora: PrinterInfo | null = printer.getPrinter(NOMBRE_IMPRESORA) as PrinterInfo | null;

        if (!impresora) {
            res.status(500).json({
                success: false,
                error: "Impresora no encontrada en Windows"
            });
            return;
        }

        // 2. Preparamos los datos (Comandos ESC/POS básicos)
        // \x1B\x40 = Iniciar impresora
        // \x1D\x56\x01 = Cortar papel
        const comandos: string = "\x1B\x40" + texto + "\n\n\n\x1D\x56\x01";

        // 3. Enviamos en modo RAW
        printer.printDirect({
            data: comandos,
            printer: NOMBRE_IMPRESORA,
            type: 'RAW', // Importante con el driver Generic
            success: (jobID: string | number): void => {
                console.log("Enviado al spooler con ID:", jobID);
                res.json({ success: true, jobID });
            },
            error: (err: Error | string): void => {
                console.error("Error:", err);
                const errorMessage: string = err instanceof Error ? err.toString() : String(err);
                res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            }
        });
    });

/**
 * Endpoint para listar todas las impresoras disponibles
 */
app.get('/impresoras', (_req: Request, res: Response<PrinterInfo[]>) => {
    const impresoras: PrinterInfo[] = printer.getPrinters() as PrinterInfo[];
    res.json(impresoras);
});

/**
 * Endpoint para imprimir un ticket de prueba con formato completo
 */
app.post('/test-ticket', (req: Request<{}, PrintResponse, TestTicketRequest>, res: Response<PrintResponse>): void => {
    // DATOS DINÁMICOS (Simulados o recibidos del req.body)
    const folio: string = req.body.folio || "A-00123";
    const fecha: string = new Date().toLocaleString();

    // CONSTRUCCIÓN DEL TICKET
    let ticketTest: string = "";

    // 1. Encabezado
    ticketTest += INIT;
    ticketTest += ALIGN_CENTER;
    ticketTest += BOLD_ON + "MI ESTACIONAMIENTO" + BOLD_OFF + "\n";
    ticketTest += "Av. Principal #123\n";
    ticketTest += "Lima, Peru\n";
    ticketTest += "--------------------------------\n";

    // 2. Cuerpo del TicketTest
    ticketTest += ALIGN_LEFT;
    ticketTest += BOLD_ON + "FOLIO DE ENTRADA" + BOLD_OFF + "\n";
    ticketTest += DOUBLE_HEIGHT + folio + NORMAL + "\n"; // Folio grande
    ticketTest += "--------------------------------\n";
    ticketTest += "Fecha: " + fecha + "\n";
    ticketTest += "Placa: " + (req.body.placa || "--- ---") + "\n";
    ticketTest += "--------------------------------\n";

    // 3. Pie de página
    ticketTest += ALIGN_CENTER;
    ticketTest += "Por favor conserve este ticketTest.\n";
    ticketTest += "Sin ticketTest se cobrara multa.\n\n\n"; // Saltos para sacar el papel

    // 4. Corte
    ticketTest += CUT;

    // ENVIAR A IMPRESORA
    try {
        printer.printDirect({
            data: ticketTest,
            printer: NOMBRE_IMPRESORA,
            type: 'RAW',
            success: (jobID: string | number): void => {

                // ticketTest
                console.log("TicketTest enviado con éxito", ticketTest);

                res.json({
                    success: true,
                    message: "Ticket enviado",
                    jobID
                });
            },
            error: (err: Error | string): void => {
                console.error(err);
                const errorMessage: string = err instanceof Error ? err.toString() : String(err);
                res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            }
        });
    } catch (e: unknown) {
        const errorMessage: string = e instanceof Error ? e.message : 'Error desconocido';
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// ==================== INICIO DEL SERVIDOR ====================

app.listen(PUERTO, (): void => {
    console.log(`Servidor listo en puerto ${PUERTO}`);
});
