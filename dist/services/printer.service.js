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
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const config_1 = require("../config/config");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let nativePrinter = null;
let nativePrinterLoaded = false;
function loadNativePrinter() {
    if (nativePrinterLoaded) {
        return nativePrinter;
    }
    nativePrinterLoaded = true;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        nativePrinter = require('@thiagoelg/node-printer');
        console.log('🖨️  Driver de impresión: node-printer (nativo)');
    }
    catch {
        nativePrinter = null;
        console.log('🖨️  Driver de impresión: PowerShell RAW (winspool)');
        console.log('   (node-printer no compilado; use npm install --ignore-scripts si npm install falla)');
    }
    return nativePrinter;
}
function scriptsDir() {
    return path.join(__dirname, '..', '..', 'scripts');
}
class PrinterService {
    useNative() {
        return loadNativePrinter() !== null;
    }
    async printerExistsViaPowerShell() {
        try {
            const { stdout } = await execFileAsync('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', path.join(scriptsDir(), 'impresora-existe.ps1'),
                '-PrinterName', config_1.config.printer.name
            ], { timeout: 15000, windowsHide: true });
            // El script responde "OK" o "OK:<nombre real>" si la encuentra (match tolerante)
            return stdout.toString().trim().startsWith('OK');
        }
        catch {
            return false;
        }
    }
    async print(texto) {
        console.log(`🔍 Buscando impresora: ${config_1.config.printer.name}...`);
        const available = await this.isPrinterAvailableAsync();
        if (!available) {
            const error = `Impresora "${config_1.config.printer.name}" no encontrada en el sistema`;
            console.error(`❌ ${error}`);
            return { success: false, error };
        }
        console.log('✅ Impresora encontrada');
        console.log('📤 Enviando a imprimir...');
        const native = loadNativePrinter();
        if (native) {
            return this.printNative(native, texto);
        }
        return this.printPowerShell(texto);
    }
    printNative(native, texto) {
        return new Promise((resolve) => {
            native.printDirect({
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
                    resolve({ success: false, error: errorMsg });
                }
            });
        });
    }
    async printPowerShell(texto) {
        const tmpFile = path.join(os.tmpdir(), `ticketera-${Date.now()}.prn`);
        try {
            const buffer = Buffer.from(texto, 'binary');
            fs.writeFileSync(tmpFile, buffer);
            await execFileAsync('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', path.join(scriptsDir(), 'print-raw.ps1'),
                '-PrinterName', config_1.config.printer.name,
                '-FilePath', tmpFile
            ], { timeout: 60000, windowsHide: true });
            return { success: true, printerJobId: 'powershell-raw' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        }
        finally {
            try {
                fs.unlinkSync(tmpFile);
            }
            catch {
                /* ignore */
            }
        }
    }
    isPrinterAvailable() {
        const native = loadNativePrinter();
        if (native) {
            return native.getPrinter(config_1.config.printer.name) !== null;
        }
        return false;
    }
    async isPrinterAvailableAsync() {
        const native = loadNativePrinter();
        if (native) {
            return native.getPrinter(config_1.config.printer.name) !== null;
        }
        return this.printerExistsViaPowerShell();
    }
    getPrinterInfo() {
        const native = loadNativePrinter();
        return {
            name: config_1.config.printer.name,
            available: native ? this.isPrinterAvailable() : false,
            driver: native ? 'node-printer' : 'powershell-raw'
        };
    }
    async getPrinterInfoAsync() {
        const native = loadNativePrinter();
        const available = native
            ? this.isPrinterAvailable()
            : await this.isPrinterAvailableAsync();
        return {
            name: config_1.config.printer.name,
            available,
            driver: native ? 'node-printer' : 'powershell-raw'
        };
    }
}
exports.printerService = new PrinterService();
//# sourceMappingURL=printer.service.js.map