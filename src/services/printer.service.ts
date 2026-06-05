import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config } from '../config/config';

const execFileAsync = promisify(execFile);

interface PrintResult {
    success: boolean;
    printerJobId?: string;
    error?: string;
}

type NodePrinterModule = {
    getPrinter: (name: string) => unknown;
    printDirect: (options: {
        data: string;
        printer: string;
        type: string;
        success: (jobID: string | number) => void;
        error: (err: Error | string) => void;
    }) => void;
};

let nativePrinter: NodePrinterModule | null = null;
let nativePrinterLoaded = false;

function loadNativePrinter(): NodePrinterModule | null {
    if (nativePrinterLoaded) {
        return nativePrinter;
    }
    nativePrinterLoaded = true;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        nativePrinter = require('@thiagoelg/node-printer') as NodePrinterModule;
        console.log('🖨️  Driver de impresión: node-printer (nativo)');
    } catch {
        nativePrinter = null;
        console.log('🖨️  Driver de impresión: PowerShell RAW (winspool)');
        console.log('   (node-printer no compilado; use npm install --ignore-scripts si npm install falla)');
    }
    return nativePrinter;
}

function scriptsDir(): string {
    return path.join(__dirname, '..', '..', 'scripts');
}

class PrinterService {
    private useNative(): boolean {
        return loadNativePrinter() !== null;
    }

    private async printerExistsViaPowerShell(): Promise<boolean> {
        try {
            const { stdout } = await execFileAsync(
                'powershell.exe',
                [
                    '-ExecutionPolicy', 'Bypass',
                    '-File', path.join(scriptsDir(), 'impresora-existe.ps1'),
                    '-PrinterName', config.printer.name
                ],
                { timeout: 15000, windowsHide: true }
            );
            // El script responde "OK" o "OK:<nombre real>" si la encuentra (match tolerante)
            return stdout.toString().trim().startsWith('OK');
        } catch {
            return false;
        }
    }

    public async print(texto: string): Promise<PrintResult> {
        console.log(`🔍 Buscando impresora: ${config.printer.name}...`);

        const available = await this.isPrinterAvailableAsync();
        if (!available) {
            const error = `Impresora "${config.printer.name}" no encontrada en el sistema`;
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

    private printNative(native: NodePrinterModule, texto: string): Promise<PrintResult> {
        return new Promise((resolve) => {
            native.printDirect({
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
                    resolve({ success: false, error: errorMsg });
                }
            });
        });
    }

    private async printPowerShell(texto: string): Promise<PrintResult> {
        const tmpFile = path.join(os.tmpdir(), `ticketera-${Date.now()}.prn`);
        try {
            const buffer = Buffer.from(texto, 'binary');
            fs.writeFileSync(tmpFile, buffer);
            await execFileAsync(
                'powershell.exe',
                [
                    '-ExecutionPolicy', 'Bypass',
                    '-File', path.join(scriptsDir(), 'print-raw.ps1'),
                    '-PrinterName', config.printer.name,
                    '-FilePath', tmpFile
                ],
                { timeout: 60000, windowsHide: true }
            );
            return { success: true, printerJobId: 'powershell-raw' };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
        } finally {
            try {
                fs.unlinkSync(tmpFile);
            } catch {
                /* ignore */
            }
        }
    }

    public isPrinterAvailable(): boolean {
        const native = loadNativePrinter();
        if (native) {
            return native.getPrinter(config.printer.name) !== null;
        }
        return false;
    }

    public async isPrinterAvailableAsync(): Promise<boolean> {
        const native = loadNativePrinter();
        if (native) {
            return native.getPrinter(config.printer.name) !== null;
        }
        return this.printerExistsViaPowerShell();
    }

    public getPrinterInfo(): { name: string; available: boolean; driver: string } {
        const native = loadNativePrinter();
        return {
            name: config.printer.name,
            available: native ? this.isPrinterAvailable() : false,
            driver: native ? 'node-printer' : 'powershell-raw'
        };
    }

    public async getPrinterInfoAsync(): Promise<{ name: string; available: boolean; driver: string }> {
        const native = loadNativePrinter();
        const available = native
            ? this.isPrinterAvailable()
            : await this.isPrinterAvailableAsync();
        return {
            name: config.printer.name,
            available,
            driver: native ? 'node-printer' : 'powershell-raw'
        };
    }
}

export const printerService = new PrinterService();
