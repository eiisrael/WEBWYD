export const CLASSIC_PACKET_HEADER_SIZE = 12;

export interface ClassicPacketHeader {
  readonly size: number;
  readonly keyword: number;
  readonly checksum: number;
  readonly type: number;
  readonly id: number;
  readonly tick: number;
}

export class PacketReader {
  readonly #view: DataView;
  #offset = 0;

  constructor(source: ArrayBuffer | ArrayBufferView, offset = 0, length?: number) {
    const buffer = source instanceof ArrayBuffer ? source : source.buffer;
    const byteOffset = source instanceof ArrayBuffer ? offset : source.byteOffset + offset;
    const byteLength = length ?? (source instanceof ArrayBuffer ? source.byteLength - offset : source.byteLength - offset);
    this.#view = new DataView(buffer, byteOffset, byteLength);
  }

  get offset(): number {
    return this.#offset;
  }

  get remaining(): number {
    return this.#view.byteLength - this.#offset;
  }

  seek(offset: number): void {
    if (!Number.isInteger(offset) || offset < 0 || offset > this.#view.byteLength) {
      throw new RangeError(`PacketReader offset inválido: ${offset}`);
    }
    this.#offset = offset;
  }

  skip(bytes: number): void {
    this.seek(this.#offset + bytes);
  }

  u8(): number {
    this.ensure(1);
    return this.#view.getUint8(this.#offset++);
  }

  i8(): number {
    this.ensure(1);
    return this.#view.getInt8(this.#offset++);
  }

  u16(): number {
    this.ensure(2);
    const value = this.#view.getUint16(this.#offset, true);
    this.#offset += 2;
    return value;
  }

  i16(): number {
    this.ensure(2);
    const value = this.#view.getInt16(this.#offset, true);
    this.#offset += 2;
    return value;
  }

  u32(): number {
    this.ensure(4);
    const value = this.#view.getUint32(this.#offset, true);
    this.#offset += 4;
    return value;
  }

  i32(): number {
    this.ensure(4);
    const value = this.#view.getInt32(this.#offset, true);
    this.#offset += 4;
    return value;
  }

  u64(): bigint {
    this.ensure(8);
    const value = this.#view.getBigUint64(this.#offset, true);
    this.#offset += 8;
    return value;
  }

  bytes(length: number): Uint8Array {
    this.ensure(length);
    const value = new Uint8Array(
      this.#view.buffer,
      this.#view.byteOffset + this.#offset,
      length,
    ).slice();
    this.#offset += length;
    return value;
  }

  fixedString(length: number): string {
    const bytes = this.bytes(length);
    const zero = bytes.indexOf(0);
    return new TextDecoder().decode(zero >= 0 ? bytes.subarray(0, zero) : bytes);
  }

  header(): ClassicPacketHeader {
    return {
      size: this.u16(),
      keyword: this.u8(),
      checksum: this.u8(),
      type: this.u16(),
      id: this.u16(),
      tick: this.u32(),
    };
  }

  private ensure(bytes: number): void {
    if (!Number.isInteger(bytes) || bytes < 0 || this.#offset + bytes > this.#view.byteLength) {
      throw new RangeError(
        `PacketReader fora dos limites: offset=${this.#offset}, bytes=${bytes}, tamanho=${this.#view.byteLength}`,
      );
    }
  }
}

export class PacketWriter {
  readonly #buffer: ArrayBuffer;
  readonly #view: DataView;
  #offset = 0;

  constructor(readonly size: number) {
    if (!Number.isInteger(size) || size < 0) throw new RangeError(`Tamanho inválido: ${size}`);
    this.#buffer = new ArrayBuffer(size);
    this.#view = new DataView(this.#buffer);
  }

  get offset(): number {
    return this.#offset;
  }

  u8(value: number): this {
    this.ensure(1);
    this.#view.setUint8(this.#offset++, value & 0xff);
    return this;
  }

  i8(value: number): this {
    this.ensure(1);
    this.#view.setInt8(this.#offset++, value);
    return this;
  }

  u16(value: number): this {
    this.ensure(2);
    this.#view.setUint16(this.#offset, value & 0xffff, true);
    this.#offset += 2;
    return this;
  }

  i16(value: number): this {
    this.ensure(2);
    this.#view.setInt16(this.#offset, value, true);
    this.#offset += 2;
    return this;
  }

  u32(value: number): this {
    this.ensure(4);
    this.#view.setUint32(this.#offset, value >>> 0, true);
    this.#offset += 4;
    return this;
  }

  i32(value: number): this {
    this.ensure(4);
    this.#view.setInt32(this.#offset, value | 0, true);
    this.#offset += 4;
    return this;
  }

  u64(value: bigint): this {
    this.ensure(8);
    this.#view.setBigUint64(this.#offset, value, true);
    this.#offset += 8;
    return this;
  }

  bytes(value: ArrayLike<number>, length = value.length): this {
    if (!Number.isInteger(length) || length < 0) throw new RangeError(`Comprimento inválido: ${length}`);
    this.ensure(length);
    const target = new Uint8Array(this.#buffer, this.#offset, length);
    target.fill(0);
    const count = Math.min(length, value.length);
    for (let index = 0; index < count; index++) target[index] = value[index]! & 0xff;
    this.#offset += length;
    return this;
  }

  fixedString(value: string, length: number): this {
    const encoded = new TextEncoder().encode(value);
    return this.bytes(encoded.subarray(0, length), length);
  }

  padding(length: number): this {
    return this.bytes([], length);
  }

  header(header: Omit<ClassicPacketHeader, "size"> & { readonly size?: number }): this {
    return this
      .u16(header.size ?? this.size)
      .u8(header.keyword)
      .u8(header.checksum)
      .u16(header.type)
      .u16(header.id)
      .u32(header.tick);
  }

  finish(): Uint8Array {
    if (this.#offset !== this.size) {
      throw new Error(`PacketWriter incompleto: escreveu ${this.#offset} de ${this.size} bytes`);
    }
    return new Uint8Array(this.#buffer);
  }

  private ensure(bytes: number): void {
    if (this.#offset + bytes > this.size) {
      throw new RangeError(
        `PacketWriter fora dos limites: offset=${this.#offset}, bytes=${bytes}, tamanho=${this.size}`,
      );
    }
  }
}
