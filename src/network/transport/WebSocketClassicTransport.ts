export type ClassicTransportState = "idle" | "connecting" | "open" | "closed";

export interface ClassicTransportEventMap {
  readonly open: undefined;
  readonly close: CloseEvent;
  readonly error: Event;
  readonly packet: Uint8Array;
}

type Listener<K extends keyof ClassicTransportEventMap> = (
  event: ClassicTransportEventMap[K],
) => void;

export interface ClassicTransport {
  readonly state: ClassicTransportState;
  connect(): void;
  send(packet: Uint8Array): void;
  close(code?: number, reason?: string): void;
  on<K extends keyof ClassicTransportEventMap>(type: K, listener: Listener<K>): () => void;
}

/**
 * Browser transport for the future WYD gateway.
 *
 * The gateway is responsible for TCP/CPSock framing/encryption. The browser
 * exchanges complete decoded classic packets, preserving MSG_STANDARD and
 * opcodes without attempting direct TCP access (which browsers do not expose).
 */
export class WebSocketClassicTransport implements ClassicTransport {
  readonly #listeners = new Map<keyof ClassicTransportEventMap, Set<(event: unknown) => void>>();
  #socket: WebSocket | null = null;
  #state: ClassicTransportState = "idle";

  constructor(
    readonly url: string,
    private readonly socketFactory: (url: string) => WebSocket = (url) => new WebSocket(url),
  ) {}

  get state(): ClassicTransportState {
    return this.#state;
  }

  connect(): void {
    if (this.#state === "connecting" || this.#state === "open") return;
    this.#state = "connecting";
    const socket = this.socketFactory(this.url);
    this.#socket = socket;
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", () => {
      if (socket !== this.#socket) return;
      this.#state = "open";
      this.emit("open", undefined);
    });
    socket.addEventListener("message", (event) => {
      if (socket !== this.#socket) return;
      const data = event.data;
      if (data instanceof ArrayBuffer) {
        this.emit("packet", new Uint8Array(data));
      } else if (ArrayBuffer.isView(data)) {
        this.emit("packet", new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice());
      } else {
        console.warn("Gateway WYD enviou frame não-binário; frame ignorado.");
      }
    });
    socket.addEventListener("error", (event) => {
      if (socket !== this.#socket) return;
      this.emit("error", event);
    });
    socket.addEventListener("close", (event) => {
      if (socket !== this.#socket) return;
      this.#socket = null;
      this.#state = "closed";
      this.emit("close", event);
    });
  }

  send(packet: Uint8Array): void {
    if (this.#state !== "open" || !this.#socket) {
      throw new Error("Transporte WYD não está conectado");
    }
    this.#socket.send(packet);
  }

  close(code?: number, reason?: string): void {
    const socket = this.#socket;
    this.#socket = null;
    this.#state = "closed";
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(code, reason);
  }

  on<K extends keyof ClassicTransportEventMap>(type: K, listener: Listener<K>): () => void {
    const listeners = this.#listeners.get(type) ?? new Set();
    this.#listeners.set(type, listeners);
    const erased = listener as unknown as (event: unknown) => void;
    listeners.add(erased);
    return () => listeners.delete(erased);
  }

  private emit<K extends keyof ClassicTransportEventMap>(
    type: K,
    event: ClassicTransportEventMap[K],
  ): void {
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
  }
}
