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
Object.defineProperty(exports, "__esModule", { value: true });
exports.printerService = void 0;
const printer = __importStar(require("@thiagoelg/node-printer"));
const config_1 = require("../config/config");
/**
 * Servicio para manejar operaciones de impresión
 */
class PrinterService {
    /**
     * Imprimir texto en la impresora configurada
     */
    async print(texto) {
        return new Promise((resolve, reject) => {
            // Verificar impresora
            console.log(`🔍 Buscando impresora: ${config_1.config.printer.name}...`);
            const impresora = printer.getPrinter(config_1.config.printer.name);
            if (!impresora) {
                const error = `Impresora "${config_1.config.printer.name}" no encontrada en el sistema`;
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
                printer: config_1.config.printer.name,
                type: 'RAW',
                success: (jobID) => {
                    resolve({
                        success: true,
                        printerJobId: String(jobID)
                    });
                },
                error: (err) => {
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
    isPrinterAvailable() {
        return printer.getPrinter(config_1.config.printer.name) !== null;
    }
    /**
     * Obtener información de la impresora
     */
    getPrinterInfo() {
        return {
            name: config_1.config.printer.name,
            available: this.isPrinterAvailable()
        };
    }
}
exports.printerService = new PrinterService();
//# sourceMappingURL=printer.service.js.map