"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables de entorno
dotenv_1.default.config();
/**
 * Obtener variable de entorno requerida
 */
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name] || defaultValue;
    if (!value) {
        throw new Error(`❌ Variable de entorno requerida: ${name}`);
    }
    return value;
};
/**
 * Obtener variable de entorno numérica
 */
const getEnvNumber = (name, defaultValue) => {
    const value = process.env[name];
    return value ? parseInt(value, 10) : defaultValue;
};
/**
 * Configuración del agente
 */
exports.config = {
    websocket: {
        serverUrl: getEnvVar('WEBSOCKET_SERVER_URL'),
        appKey: getEnvVar('WEBSOCKET_APP_KEY'),
    },
    // NUEVO: Modo de operación (caja o puerta)
    modo: getEnvVar('MODO', 'caja'),
    caja: {
        id: getEnvNumber('CAJA_ID', 0),
        codigo: getEnvVar('CAJA_CODIGO', '001'),
        sedeNombre: getEnvVar('SEDE_NOMBRE', 'Sin sede'),
    },
    // NUEVO: Configuración de puerta
    puerta: {
        id: getEnvNumber('PUERTA_ID', 0),
        numero: getEnvVar('PUERTA_NUMERO', 'Puerta 1'),
        sedeId: getEnvNumber('SEDE_ID', 1),
        sedeNombre: getEnvVar('SEDE_NOMBRE', 'Sin sede'),
    },
    printer: {
        name: getEnvVar('NOMBRE_IMPRESORA', 'POS-80'),
    },
    server: {
        port: getEnvNumber('PUERTO_LOCAL', 4000),
    },
};
exports.default = exports.config;
//# sourceMappingURL=config.js.map