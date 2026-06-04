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
export declare function createPusher(key: string, options?: Record<string, unknown>): PusherClient;
//# sourceMappingURL=pusher-client.d.ts.map