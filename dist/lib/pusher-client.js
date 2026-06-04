"use strict";
/**
 * Carga pusher-js en runtime (CJS/ESM) sin errores de tipos en ts-node.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPusher = createPusher;
function getPusherConstructor() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pusher-js');
    // En Node, pusher-js suele exportar el constructor como función (module.exports = Pusher)
    const Ctor = typeof mod === 'function'
        ? mod
        : mod.Pusher ?? mod.default;
    if (typeof Ctor !== 'function') {
        throw new Error('pusher-js: no se pudo cargar el constructor Pusher');
    }
    return Ctor;
}
function createPusher(key, options) {
    const Pusher = getPusherConstructor();
    return new Pusher(key, options);
}
//# sourceMappingURL=pusher-client.js.map