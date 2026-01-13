"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const printer = __importStar(require("@thiagoelg/node-printer"));
// ==================== CONSTANTES ====================
const NOMBRE_IMPRESORA = 'POS-80'; // Debe coincidir con el nombre en Windows
const PUERTO = 4000;
// ==================== COMANDOS ESC/POS ====================
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@'; // Inicializar
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const DOUBLE_HEIGHT = GS + '!' + '\x11'; // Doble altura
const NORMAL = GS + '!' + '\x00';
const CUT = GS + 'V' + '\x41' + '\x00'; // Cortar papel
// ==================== CONFIGURACIÓN EXPRESS ====================
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ==================== ENDPOINTS ====================
/**
 * Endpoint para imprimir texto simple
 */
app.post('/imprimir', (req, res) => {
    const texto = req.body.texto || "PRUEBA DE IMPRESION\n\n";
    console.log(`Intentando imprimir en: ${NOMBRE_IMPRESORA}`);
    // 1. Buscamos la impresora
    const impresora = printer.getPrinter(NOMBRE_IMPRESORA);
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
    const comandos = "\x1B\x40" + texto + "\n\n\n\x1D\x56\x01";
    // 3. Enviamos en modo RAW
    printer.printDirect({
        data: comandos,
        printer: NOMBRE_IMPRESORA,
        type: 'RAW', // Importante con el driver Generic
        success: (jobID) => {
            console.log("Enviado al spooler con ID:", jobID);
            res.json({ success: true, jobID });
        },
        error: (err) => {
            console.error("Error:", err);
            const errorMessage = err instanceof Error ? err.toString() : String(err);
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
app.get('/impresoras', (_req, res) => {
    const impresoras = printer.getPrinters();
    res.json(impresoras);
});
/**
 * Endpoint para imprimir un ticket de prueba con formato completo
 */
app.post('/test-ticket', (req, res) => {
    // DATOS DINÁMICOS (Simulados o recibidos del req.body)
    const folio = req.body.folio || "A-00123";
    const fecha = new Date().toLocaleString();
    // CONSTRUCCIÓN DEL TICKET
    let ticket = "";
    // 1. Encabezado
    ticket += INIT;
    ticket += ALIGN_CENTER;
    ticket += BOLD_ON + "MI ESTACIONAMIENTO" + BOLD_OFF + "\n";
    ticket += "Av. Principal #123\n";
    ticket += "Lima, Peru\n";
    ticket += "--------------------------------\n";
    // 2. Cuerpo del Ticket
    ticket += ALIGN_LEFT;
    ticket += BOLD_ON + "FOLIO DE ENTRADA" + BOLD_OFF + "\n";
    ticket += DOUBLE_HEIGHT + folio + NORMAL + "\n"; // Folio grande
    ticket += "--------------------------------\n";
    ticket += "Fecha: " + fecha + "\n";
    ticket += "Placa: " + (req.body.placa || "--- ---") + "\n";
    ticket += "--------------------------------\n";
    // 3. Pie de página
    ticket += ALIGN_CENTER;
    ticket += "Por favor conserve este ticket.\n";
    ticket += "Sin ticket se cobrara multa.\n\n\n"; // Saltos para sacar el papel
    // 4. Corte
    ticket += CUT;
    // ENVIAR A IMPRESORA
    try {
        printer.printDirect({
            data: ticket,
            printer: NOMBRE_IMPRESORA,
            type: 'RAW',
            success: (jobID) => {
                // ticket
                console.log("Ticket enviado con éxito", ticket);
                res.json({
                    success: true,
                    message: "Ticket enviado",
                    jobID
                });
            },
            error: (err) => {
                console.error(err);
                const errorMessage = err instanceof Error ? err.toString() : String(err);
                res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            }
        });
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});
// ==================== INICIO DEL SERVIDOR ====================
app.listen(PUERTO, () => {
    console.log(`Servidor listo en puerto ${PUERTO}`);
});
//# sourceMappingURL=impresion-pc.js.map