import { CLASSIC_PACKET_HEADER_SIZE } from "./PacketIO";

export const CLASSIC_CPSOCK_RECV_BUFFER_SIZE = 131_072;
export const CLASSIC_CPSOCK_SEND_BUFFER_SIZE = 131_072;
export const CLASSIC_CPSOCK_KEY_QUEUE_SIZE = 16;

/** Exact pKeyWord[512] table from the BASE759 CPSock.cpp client. */
const CLASSIC_KEYWORD_TABLE = Uint8Array.from([
  0x84, 0x87, 0x37, 0xd7, 0xea, 0x79, 0x91, 0x7d, 0x4b, 0x4b, 0x85, 0x7d, 0x87, 0x81, 0x91, 0x7c,
  0x0f, 0x73, 0x91, 0x91, 0x87, 0x7d, 0x0d, 0x7d, 0x86, 0x8f, 0x73, 0x0f, 0xe1, 0xdd, 0x85, 0x7d,
  0x05, 0x7d, 0x85, 0x83, 0x87, 0x9c, 0x85, 0x33, 0x0d, 0xe2, 0x87, 0x19, 0x0f, 0x79, 0x85, 0x86,
  0x37, 0x7d, 0xd7, 0xdd, 0xe9, 0x7d, 0xd7, 0x7d, 0x85, 0x79, 0x05, 0x7d, 0x0f, 0xe1, 0x87, 0x7e,
  0x23, 0x87, 0xf5, 0x79, 0x5f, 0xe3, 0x4b, 0x83, 0xa3, 0xa2, 0xae, 0x0e, 0x14, 0x7d, 0xde, 0x7e,
  0x85, 0x7a, 0x85, 0xaf, 0xcd, 0x7d, 0x87, 0xa5, 0x87, 0x7d, 0xe1, 0x7d, 0x88, 0x7d, 0x15, 0x91,
  0x23, 0x7d, 0x87, 0x7c, 0x0d, 0x7a, 0x85, 0x87, 0x17, 0x7c, 0x85, 0x7d, 0xac, 0x80, 0xbb, 0x79,
  0x84, 0x9b, 0x5b, 0xa5, 0xd7, 0x8f, 0x05, 0x0f, 0x85, 0x7e, 0x85, 0x80, 0x85, 0x98, 0xf5, 0x9d,
  0xa3, 0x1a, 0x0d, 0x19, 0x87, 0x7c, 0x85, 0x7d, 0x84, 0x7d, 0x85, 0x7e, 0xe7, 0x97, 0x0d, 0x0f,
  0x85, 0x7b, 0xea, 0x7d, 0xad, 0x80, 0xad, 0x7d, 0xb7, 0xaf, 0x0d, 0x7d, 0xe9, 0x3d, 0x85, 0x7d,
  0x87, 0xb7, 0x23, 0x7d, 0xe7, 0xb7, 0xa3, 0x0c, 0x87, 0x7e, 0x85, 0xa5, 0x7d, 0x76, 0x35, 0xb9,
  0x0d, 0x6f, 0x23, 0x7d, 0x87, 0x9b, 0x85, 0x0c, 0xe1, 0xa1, 0x0d, 0x7f, 0x87, 0x7d, 0x84, 0x7a,
  0x84, 0x7b, 0xe1, 0x86, 0xe8, 0x6f, 0xd1, 0x79, 0x85, 0x19, 0x53, 0x95, 0xc3, 0x47, 0x19, 0x7d,
  0xe7, 0x0c, 0x37, 0x7c, 0x23, 0x7d, 0x85, 0x7d, 0x4b, 0x79, 0x21, 0xa5, 0x87, 0x7d, 0x19, 0x7d,
  0x0d, 0x7d, 0x15, 0x91, 0x23, 0x7d, 0x87, 0x7c, 0x85, 0x7a, 0x85, 0xaf, 0xcd, 0x7d, 0x87, 0x7d,
  0xe9, 0x3d, 0x85, 0x7d, 0x15, 0x79, 0x85, 0x7d, 0xc1, 0x7b, 0xea, 0x7d, 0xb7, 0x7d, 0x85, 0x7d,
  0x85, 0x7d, 0x0d, 0x7d, 0xe9, 0x73, 0x85, 0x79, 0x05, 0x7d, 0xd7, 0x7d, 0x85, 0xe1, 0xb9, 0xe1,
  0x0f, 0x65, 0x85, 0x86, 0x2d, 0x7d, 0xd7, 0xdd, 0xa3, 0x8e, 0xe6, 0x7d, 0xde, 0x7e, 0xae, 0x0e,
  0x0f, 0xe1, 0x89, 0x7e, 0x23, 0x7d, 0xf5, 0x79, 0x23, 0xe1, 0x4b, 0x83, 0x0c, 0x0f, 0x85, 0x7b,
  0x85, 0x7e, 0x8f, 0x80, 0x85, 0x98, 0xf5, 0x7a, 0x85, 0x1a, 0x0d, 0xe1, 0x0f, 0x7c, 0x89, 0x0c,
  0x85, 0x0b, 0x23, 0x69, 0x87, 0x7b, 0x23, 0x0c, 0x1f, 0xb7, 0x21, 0x7a, 0x88, 0x7e, 0x8f, 0xa5,
  0x7d, 0x80, 0xb7, 0xb9, 0x18, 0xbf, 0x4b, 0x19, 0x85, 0xa5, 0x91, 0x80, 0x87, 0x81, 0x87, 0x7c,
  0x0f, 0x73, 0x91, 0x91, 0x84, 0x87, 0x37, 0xd7, 0x86, 0x79, 0xe1, 0xdd, 0x85, 0x7a, 0x73, 0x9b,
  0x05, 0x7d, 0x0d, 0x83, 0x87, 0x9c, 0x85, 0x33, 0x87, 0x7d, 0x85, 0x0f, 0x87, 0x7d, 0x0d, 0x7d,
  0xf6, 0x7e, 0x87, 0x7d, 0x88, 0x19, 0x89, 0xf5, 0xd1, 0xdd, 0x85, 0x7d, 0x8b, 0xc3, 0xea, 0x7a,
  0xd7, 0xb0, 0x0d, 0x7d, 0x87, 0xa5, 0x87, 0x7c, 0x73, 0x7e, 0x7d, 0x86, 0x87, 0x23, 0x85, 0x10,
  0xd7, 0xdf, 0xed, 0xa5, 0xe1, 0x7a, 0x85, 0x23, 0xea, 0x7e, 0x85, 0x98, 0xad, 0x79, 0x86, 0x7d,
  0x85, 0x7d, 0xd7, 0x7d, 0xe1, 0x7a, 0xf5, 0x7d, 0x85, 0xb0, 0x2b, 0x37, 0xe1, 0x7a, 0x87, 0x79,
  0x84, 0x7d, 0x73, 0x73, 0x87, 0x7d, 0x23, 0x7d, 0xe9, 0x7d, 0x85, 0x7e, 0x02, 0x7d, 0xdd, 0x2d,
  0x87, 0x79, 0xe7, 0x79, 0xad, 0x7c, 0x23, 0xda, 0x87, 0x0d, 0x0d, 0x7b, 0xe7, 0x79, 0x9b, 0x7d,
  0xd7, 0x8f, 0x05, 0x7d, 0x0d, 0x34, 0x8f, 0x7d, 0xad, 0x87, 0xe9, 0x7c, 0x85, 0x80, 0x85, 0x79,
  0x8a, 0xc3, 0xe7, 0xa5, 0xe8, 0x6b, 0x0d, 0x74, 0x10, 0x73, 0x33, 0x17, 0x0d, 0x37, 0x21, 0x19,
]);

export interface ClassicCPSockEncoderOptions {
  readonly keywordSource?: () => number;
  readonly tickSource?: () => number;
}

export interface ClassicServerClockOptions {
  readonly nowSource?: () => number;
  readonly fallbackTickSource?: () => number;
}

/**
 * Browser/gateway equivalent of TMTimerManager's server clock.
 *
 * The native client receives TMSrv ticks, keeps a local monotonic clock aligned
 * to them and CPSock::AddMessage stamps every outgoing packet with CurrentTime.
 * A gateway process has a different uptime from TMSrv, so performance.now()
 * cannot be sent directly as ClientTick for attack/skill packets.
 */
export class ClassicServerClock {
  readonly #nowSource: () => number;
  readonly #fallbackTickSource: () => number;
  #serverTick: number | null = null;
  #observedAt = 0;

  constructor(options: ClassicServerClockOptions = {}) {
    this.#nowSource = options.nowSource ?? (() => performance.now());
    this.#fallbackTickSource = options.fallbackTickSource
      ?? (() => Math.trunc(this.#nowSource()) >>> 0);
  }

  observe(serverTick: number): void {
    if (!Number.isFinite(serverTick)) throw new RangeError(`Tick TMSrv inválido: ${serverTick}`);
    this.#serverTick = Math.trunc(serverTick) >>> 0;
    this.#observedAt = this.#nowSource();
  }

  now(): number {
    if (this.#serverTick === null) return this.#fallbackTickSource() >>> 0;
    const elapsed = Math.max(0, Math.trunc(this.#nowSource() - this.#observedAt));
    return (this.#serverTick + elapsed) >>> 0;
  }

  clear(): void {
    this.#serverTick = null;
    this.#observedAt = 0;
  }
}

export class ClassicCPSockEncoder {
  readonly #sendQueue = new Uint8Array(CLASSIC_CPSOCK_KEY_QUEUE_SIZE);
  #sendCount = 0;
  readonly #keywordSource: () => number;
  readonly #tickSource: () => number;

  constructor(options: ClassicCPSockEncoderOptions = {}) {
    this.#keywordSource = options.keywordSource ?? (() => Math.floor(Math.random() * 256));
    this.#tickSource = options.tickSource ?? (() => Math.trunc(performance.now()) >>> 0);
  }

  setSendQueue(secretCode: ArrayLike<number>): void {
    this.#sendQueue.fill(0);
    for (let index = 0; index < this.#sendQueue.length; index++) {
      this.#sendQueue[index] = secretCode[index] ?? 0;
    }
    this.#sendCount = 0;
  }

  clearSendQueue(): void {
    this.#sendQueue.fill(0);
    this.#sendCount = 0;
  }

  encode(decodedPacket: Uint8Array): Uint8Array {
    if (decodedPacket.byteLength < CLASSIC_PACKET_HEADER_SIZE) {
      throw new RangeError("Packet CPSock menor que MSG_STANDARD");
    }
    if (decodedPacket.byteLength >= CLASSIC_CPSOCK_SEND_BUFFER_SIZE) {
      throw new RangeError(`Packet CPSock grande demais: ${decodedPacket.byteLength}`);
    }

    const packet = decodedPacket.slice();
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(0, packet.byteLength, true);
    view.setUint32(8, this.#tickSource() >>> 0, true);

    const keywordIndex = this.nextKeywordIndex();
    packet[2] = keywordIndex;
    packet[3] = 0;

    const keyWord = CLASSIC_KEYWORD_TABLE[keywordIndex * 2]!;
    let sumDecoded = 0;
    let sumEncoded = 0;
    let position = keyWord;

    for (let index = 4; index < packet.length; index++, position++) {
      const original = packet[index]!;
      sumDecoded = (sumDecoded + original) & 0xff;
      const transform = CLASSIC_KEYWORD_TABLE[(position & 0xff) * 2 + 1]!;
      let encoded = original;
      switch (index & 3) {
        case 0:
          encoded = original + (transform << 1);
          break;
        case 1:
          encoded = original - (transform >> 3);
          break;
        case 2:
          encoded = original + (transform << 2);
          break;
        case 3:
          encoded = original - (transform >> 5);
          break;
      }
      packet[index] = encoded & 0xff;
      sumEncoded = (sumEncoded + packet[index]!) & 0xff;
    }

    packet[3] = (sumEncoded - sumDecoded) & 0xff;
    return packet;
  }

  private nextKeywordIndex(): number {
    if (this.#sendQueue[0] === 0) return this.#keywordSource() & 0xff;

    if (this.#sendCount <= 15) {
      return (this.#sendQueue[this.#sendCount++]! ^ 0xff) & 0xff;
    }

    const value = (this.#sendQueue[15]! & 1) !== 0
      ? toSignedByte(this.#sendQueue[11]!) + toSignedByte(this.#sendQueue[13]!) - toSignedByte(this.#sendQueue[9]!) + 4
      : toSignedByte(this.#sendQueue[3]!) + toSignedByte(this.#sendQueue[1]!) + toSignedByte(this.#sendQueue[5]!) - 87;
    return (value ^ 0xff) & 0xff;
  }
}

export class ClassicCPSockStreamDecoder {
  #buffer = new Uint8Array(0);

  push(chunk: ArrayBuffer | ArrayBufferView): Uint8Array[] {
    const incoming = chunk instanceof ArrayBuffer
      ? new Uint8Array(chunk)
      : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    if (incoming.byteLength === 0) return [];

    const merged = new Uint8Array(this.#buffer.byteLength + incoming.byteLength);
    merged.set(this.#buffer);
    merged.set(incoming, this.#buffer.byteLength);
    this.#buffer = merged;

    const packets: Uint8Array[] = [];
    let offset = 0;
    while (this.#buffer.byteLength - offset >= 2) {
      const size = this.#buffer[offset]! | (this.#buffer[offset + 1]! << 8);
      if (size < CLASSIC_PACKET_HEADER_SIZE || size >= CLASSIC_CPSOCK_RECV_BUFFER_SIZE) {
        this.#buffer = new Uint8Array(0);
        throw new Error(`Tamanho CPSock inválido: ${size}`);
      }
      if (this.#buffer.byteLength - offset < size) break;
      packets.push(decodeClassicCPSockPacket(this.#buffer.subarray(offset, offset + size)));
      offset += size;
    }

    this.#buffer = this.#buffer.slice(offset);
    return packets;
  }

  clear(): void {
    this.#buffer = new Uint8Array(0);
  }
}

export function decodeClassicCPSockPacket(encodedPacket: Uint8Array): Uint8Array {
  if (encodedPacket.byteLength < CLASSIC_PACKET_HEADER_SIZE) {
    throw new RangeError("Packet CPSock menor que MSG_STANDARD");
  }
  const declaredSize = encodedPacket[0]! | (encodedPacket[1]! << 8);
  if (declaredSize !== encodedPacket.byteLength) {
    throw new Error(
      `Packet CPSock divergente: declara ${declaredSize}, recebeu ${encodedPacket.byteLength}`,
    );
  }

  const packet = encodedPacket.slice();
  const keywordIndex = packet[2]!;
  const expectedChecksum = packet[3]!;
  const keyWord = CLASSIC_KEYWORD_TABLE[keywordIndex * 2]!;
  let sumDecoded = 0;
  let sumEncoded = 0;
  let position = keyWord;

  for (let index = 4; index < packet.length; index++, position++) {
    const encoded = packet[index]!;
    sumEncoded = (sumEncoded + encoded) & 0xff;
    const transform = CLASSIC_KEYWORD_TABLE[(position & 0xff) * 2 + 1]!;
    let decoded = encoded;
    switch (index & 3) {
      case 0:
        decoded = encoded - (transform << 1);
        break;
      case 1:
        decoded = encoded + (transform >> 3);
        break;
      case 2:
        decoded = encoded - (transform << 2);
        break;
      case 3:
        decoded = encoded + (transform >> 5);
        break;
    }
    packet[index] = decoded & 0xff;
    sumDecoded = (sumDecoded + packet[index]!) & 0xff;
  }

  const actualChecksum = (sumEncoded - sumDecoded) & 0xff;
  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `Checksum CPSock inválido: recebido ${expectedChecksum}, calculado ${actualChecksum}`,
    );
  }
  return packet;
}

function toSignedByte(value: number): number {
  const byte = value & 0xff;
  return byte >= 0x80 ? byte - 0x100 : byte;
}
