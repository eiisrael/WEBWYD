import {
  CLASSIC_PACKET_HEADER_SIZE,
  PacketReader,
  PacketWriter,
  type ClassicPacketHeader,
} from "./PacketIO";
import {
  CLASSIC_APP_VERSION,
  CLASSIC_PACKET_SIZES,
  ClassicOpcode,
} from "./Protocol";

const LOGIN_KEYS = Uint8Array.from([
  0x7d, 0xda, 0x37, 0xd7, 0xea, 0x79, 0x91, 0x7d, 0x4b, 0x4b, 0x85,
  0x7d, 0x87, 0x81, 0x91, 0x7c, 0x0f, 0x73, 0x91, 0x91, 0x87, 0x7d,
]);

export interface PacketHeaderInput {
  readonly id?: number;
  readonly tick?: number;
  readonly keyword?: number;
  readonly checksum?: number;
}

export interface ClassicActionMessage {
  readonly header: ClassicPacketHeader;
  readonly posX: number;
  readonly posY: number;
  readonly effect: number;
  readonly speed: number;
  readonly route: Uint8Array;
  readonly targetX: number;
  readonly targetY: number;
}

export function createClassicHeader(
  type: number,
  size: number,
  input: PacketHeaderInput = {},
): Omit<ClassicPacketHeader, "size"> & { readonly size: number } {
  return {
    size,
    keyword: input.keyword ?? 0,
    checksum: input.checksum ?? 0,
    type,
    id: input.id ?? 0,
    tick: input.tick ?? 0,
  };
}

export function encodeAccountLoginField(
  value: string,
  length: number,
  keyEndIndex: number,
): Uint8Array {
  const encoded = new TextEncoder().encode(value.toUpperCase());
  const field = new Uint8Array(length);
  field.set(encoded.subarray(0, length));
  for (let index = 0; index < length; index++) {
    field[index] = (field[index]! + LOGIN_KEYS[keyEndIndex - index]!) & 0xff;
  }
  return field;
}

export function createAccountLoginPacket(
  account: string,
  password: string,
  mac: string,
  input: PacketHeaderInput & { readonly force?: number; readonly version?: number } = {},
): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.accountLogin);
  writer.header(createClassicHeader(
    ClassicOpcode.accountLogin,
    CLASSIC_PACKET_SIZES.accountLogin,
    input,
  ));
  writer.bytes(encodeAccountLoginField(password, 12, 11));
  writer.bytes(encodeAccountLoginField(account, 16, 15));
  writer.bytes(encodeAccountLoginField(mac, 18, 17));
  writer.padding(34);
  writer.i32(input.version ?? CLASSIC_APP_VERSION);
  writer.i16(input.force ?? 1);
  // Native Win32 struct alignment before int IP[4].
  writer.padding(2);
  writer.i32(0).i32(0).i32(0).i32(0);
  return writer.finish();
}

export function createCharacterLoginPacket(
  slot: number,
  secretCode: ArrayLike<number>,
  input: PacketHeaderInput & { readonly force?: number } = {},
): Uint8Array {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    throw new RangeError(`Slot de personagem inválido: ${slot}`);
  }
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.characterLogin);
  writer.header(createClassicHeader(
    ClassicOpcode.characterLogin,
    CLASSIC_PACKET_SIZES.characterLogin,
    input,
  ));
  writer.i32(slot);
  writer.i32(input.force ?? 0);
  writer.bytes(secretCode, 16);
  return writer.finish();
}

export function createActionPacket(
  action: Omit<ClassicActionMessage, "header" | "route"> & { readonly route: ArrayLike<number> },
  input: PacketHeaderInput = {},
): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.action);
  writer.header(createClassicHeader(ClassicOpcode.action, CLASSIC_PACKET_SIZES.action, input));
  writer.i16(action.posX);
  writer.i16(action.posY);
  writer.i32(action.effect);
  writer.i32(action.speed);
  writer.bytes(action.route, 24);
  writer.u16(action.targetX);
  writer.u16(action.targetY);
  return writer.finish();
}

export function parseActionPacket(source: ArrayBuffer | ArrayBufferView): ClassicActionMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  if (header.size !== CLASSIC_PACKET_SIZES.action) {
    throw new Error(`MSG_Action com tamanho inesperado: ${header.size}`);
  }
  if (header.type !== ClassicOpcode.action && header.type !== ClassicOpcode.action2 && header.type !== ClassicOpcode.actionStop) {
    throw new Error(`Opcode não é MSG_Action: 0x${header.type.toString(16)}`);
  }
  const posX = reader.i16();
  const posY = reader.i16();
  const effect = reader.i32();
  const speed = reader.i32();
  const route = reader.bytes(24);
  const targetX = reader.u16();
  const targetY = reader.u16();
  if (reader.remaining !== 0) throw new Error("MSG_Action contém bytes inesperados");
  return { header, posX, posY, effect, speed, route, targetX, targetY };
}

export function parseClassicHeader(source: ArrayBuffer | ArrayBufferView): ClassicPacketHeader {
  const reader = new PacketReader(source);
  if (reader.remaining < CLASSIC_PACKET_HEADER_SIZE) {
    throw new RangeError("Packet menor que MSG_STANDARD");
  }
  return reader.header();
}
