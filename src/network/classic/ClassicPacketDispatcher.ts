import {
  CLASSIC_PACKET_HEADER_SIZE,
  type ClassicPacketHeader,
} from "./PacketIO";
import { parseClassicHeader } from "./Messages";

export type ClassicPacketHandler = (
  packet: Uint8Array,
  header: ClassicPacketHeader,
) => void;

export type ClassicUnknownPacketHandler = (
  packet: Uint8Array,
  header: ClassicPacketHeader,
) => void;

export class ClassicPacketDispatcher {
  readonly #handlers = new Map<number, Set<ClassicPacketHandler>>();
  readonly #unknownHandlers = new Set<ClassicUnknownPacketHandler>();

  on(type: number, handler: ClassicPacketHandler): () => void {
    const handlers = this.#handlers.get(type) ?? new Set();
    this.#handlers.set(type, handlers);
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.#handlers.delete(type);
    };
  }

  onUnknown(handler: ClassicUnknownPacketHandler): () => void {
    this.#unknownHandlers.add(handler);
    return () => this.#unknownHandlers.delete(handler);
  }

  dispatch(packet: Uint8Array): boolean {
    if (packet.byteLength < CLASSIC_PACKET_HEADER_SIZE) {
      throw new RangeError(`Frame WYD menor que MSG_STANDARD: ${packet.byteLength} bytes`);
    }

    const header = parseClassicHeader(packet);
    if (header.size < CLASSIC_PACKET_HEADER_SIZE) {
      throw new Error(`MSG_STANDARD declara tamanho inválido: ${header.size}`);
    }
    if (header.size !== packet.byteLength) {
      throw new Error(
        `Frame WYD divergente: header declara ${header.size} bytes, frame possui ${packet.byteLength}`,
      );
    }

    const handlers = this.#handlers.get(header.type);
    if (!handlers || handlers.size === 0) {
      for (const handler of this.#unknownHandlers) handler(packet, header);
      return false;
    }

    for (const handler of [...handlers]) handler(packet, header);
    return true;
  }

  clear(): void {
    this.#handlers.clear();
    this.#unknownHandlers.clear();
  }
}
