interface PrintResult {
    success: boolean;
    printerJobId?: string;
    error?: string;
}
declare class PrinterService {
    private useNative;
    private printerExistsViaPowerShell;
    print(texto: string): Promise<PrintResult>;
    private printNative;
    private printPowerShell;
    isPrinterAvailable(): boolean;
    isPrinterAvailableAsync(): Promise<boolean>;
    getPrinterInfo(): {
        name: string;
        available: boolean;
        driver: string;
    };
    getPrinterInfoAsync(): Promise<{
        name: string;
        available: boolean;
        driver: string;
    }>;
}
export declare const printerService: PrinterService;
export {};
//# sourceMappingURL=printer.service.d.ts.map