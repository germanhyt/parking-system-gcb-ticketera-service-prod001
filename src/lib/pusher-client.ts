/**
 * Carga pusher-js en runtime (CJS/ESM) sin errores de tipos en ts-node.
 */

export interface PusherChannel {
    bind: (event: string, callback: (...args: unknown[]) => void) => void;
    trigger: (event: string, data: unknown) => void;
    unbind_all: () => void;
}

export interface PusherConnection {
    bind: (event: string, callback: (...args: unknown[]) => void) => void;
    socket_id?: string;
    state?: string;
}

export interface PusherClient {
    connection: PusherConnection;
    subscribe: (channelName: string) => PusherChannel;
    unsubscribe: (channelName: string) => void;
    disconnect: () => void;
}

type PusherConstructor = new (
    key: string,
    options?: Record<string, unknown>
) => PusherClient;

function getPusherConstructor(): PusherConstructor {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pusher-js') as
        | PusherConstructor
        | { Pusher?: PusherConstructor; default?: PusherConstructor };
    // En Node, pusher-js suele exportar el constructor como función (module.exports = Pusher)
    const Ctor =
        typeof mod === 'function'
            ? mod
            : mod.Pusher ?? mod.default;
    if (typeof Ctor !== 'function') {
        throw new Error('pusher-js: no se pudo cargar el constructor Pusher');
    }
    return Ctor;
}

export function createPusher(
    key: string,
    options?: Record<string, unknown>
): PusherClient {
    const Pusher = getPusherConstructor();
    return new Pusher(key, options);
}
