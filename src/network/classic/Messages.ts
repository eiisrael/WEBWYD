import {
  CLASSIC_PACKET_HEADER_SIZE,
  PacketReader,
  PacketWriter,
  type ClassicPacketHeader,
} from "./PacketIO";
import { parseClassicMobCore, parseClassicScore, type ClassicMobCore } from "./Structures";
import {
  CLASSIC_APP_VERSION,
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
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


export interface ClassicCharacterSummary {
  readonly slot: number;
  readonly name: string;
  readonly homeTownX: number;
  readonly homeTownY: number;
  readonly level: number;
  readonly guild: number;
  readonly coin: number;
  readonly experience: bigint;
}

export interface ClassicAccountLoginConfirmation {
  readonly header: ClassicPacketHeader;
  readonly secretCode: Uint8Array;
  readonly characters: readonly ClassicCharacterSummary[];
  readonly cargoCoin: number;
  readonly accountName: string;
  readonly ssn1: number;
  readonly ssn2: number;
}

export interface ClassicCharacterLoginConfirmation {
  readonly header: ClassicPacketHeader;
  readonly posX: number;
  readonly posY: number;
  readonly mob: ClassicMobCore;
  readonly characterName: string;
  readonly characterClass: number;
  readonly clientId: number;
  readonly slot: number;
  readonly weather: number;
  readonly shortSkills: Uint8Array;
}

export interface ClassicMessagePanel {
  readonly header: ClassicPacketHeader;
  readonly message: string;
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
  const encoded = new TextEncoder().encode(value);
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


export function parseAccountLoginConfirmation(
  source: ArrayBuffer | ArrayBufferView,
): ClassicAccountLoginConfirmation {
  const reader = new PacketReader(source);
  const header = reader.header();
  if (header.type !== ClassicOpcode.cnfAccountLogin) {
    throw new Error(`Opcode não é MSG_CNFAccountLogin: 0x${header.type.toString(16)}`);
  }
  if (header.size !== CLASSIC_PACKET_SIZES.cnfAccountLogin) {
    throw new Error(`MSG_CNFAccountLogin com tamanho inesperado: ${header.size}`);
  }

  const secretCode = reader.bytes(16);
  const selectedCharacterOffset = reader.offset;
  const homeTownX = Array.from({ length: 4 }, () => reader.u16());
  const homeTownY = Array.from({ length: 4 }, () => reader.u16());
  const names = Array.from({ length: 4 }, () => reader.fixedString(16));

  const scores = Array.from({ length: 4 }, () => parseClassicScore(reader));

  reader.skip(CLASSIC_STRUCTURE_SIZES.item * 4 * 16);
  const guilds = Array.from({ length: 4 }, () => reader.u16());
  const coins = Array.from({ length: 4 }, () => reader.i32());
  const experiences = Array.from({ length: 4 }, () => reader.u64());

  if (reader.offset - selectedCharacterOffset !== CLASSIC_STRUCTURE_SIZES.selectedCharacters) {
    throw new Error("STRUCT_SELCHAR divergiu do layout auditado");
  }

  const characters = names.map((name, slot): ClassicCharacterSummary => ({
    slot,
    name,
    homeTownX: homeTownX[slot]!,
    homeTownY: homeTownY[slot]!,
    level: scores[slot]!.level,
    guild: guilds[slot]!,
    coin: coins[slot]!,
    experience: experiences[slot]!,
  }));

  reader.skip(CLASSIC_STRUCTURE_SIZES.item * 128);
  const cargoCoin = reader.i32();
  const accountName = reader.fixedString(16);
  const ssn1 = reader.i32();
  const ssn2 = reader.i32();

  if (reader.remaining !== 0) {
    throw new Error(`MSG_CNFAccountLogin contém ${reader.remaining} bytes inesperados`);
  }
  return { header, secretCode, characters, cargoCoin, accountName, ssn1, ssn2 };
}

export function parseCharacterLoginConfirmation(
  source: ArrayBuffer | ArrayBufferView,
): ClassicCharacterLoginConfirmation {
  const reader = new PacketReader(source);
  const header = reader.header();
  if (header.type !== ClassicOpcode.cnfCharacterLogin) {
    throw new Error(`Opcode não é MSG_CNFCharacterLogin: 0x${header.type.toString(16)}`);
  }

  const posX = reader.i16();
  const posY = reader.i16();
  const mob = parseClassicMobCore(reader);
  const characterName = mob.name;
  const characterClass = mob.characterClass;

  reader.skip(208);
  const slot = reader.u16();
  const clientId = reader.u16();
  const weather = reader.u16();
  const shortSkills = reader.bytes(16);

  return {
    header,
    posX,
    posY,
    mob,
    characterName,
    characterClass,
    clientId,
    slot,
    weather,
    shortSkills,
  };
}

export function parseMessagePanel(source: ArrayBuffer | ArrayBufferView): ClassicMessagePanel {
  const reader = new PacketReader(source);
  const header = reader.header();
  if (header.type !== ClassicOpcode.messagePanel) {
    throw new Error(`Opcode não é MSG_MessagePanel: 0x${header.type.toString(16)}`);
  }
  if (header.size !== CLASSIC_PACKET_SIZES.messagePanel) {
    throw new Error(`MSG_MessagePanel com tamanho inesperado: ${header.size}`);
  }
  const message = reader.fixedString(128);
  return { header, message };
}

export function parseClassicHeader(source: ArrayBuffer | ArrayBufferView): ClassicPacketHeader {
  const reader = new PacketReader(source);
  if (reader.remaining < CLASSIC_PACKET_HEADER_SIZE) {
    throw new RangeError("Packet menor que MSG_STANDARD");
  }
  return reader.header();
}
