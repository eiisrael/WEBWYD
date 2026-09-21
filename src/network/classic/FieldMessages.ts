import { PacketReader, PacketWriter, type ClassicPacketHeader } from "./PacketIO";
import { createClassicHeader, type PacketHeaderInput } from "./Messages";
import { CLASSIC_PACKET_SIZES, ClassicOpcode } from "./Protocol";
import { parseClassicScore, type ClassicScore } from "./Structures";

export interface ClassicMotionMessage {
  readonly header: ClassicPacketHeader;
  readonly motion: number;
  readonly parm: number;
  readonly directionBits: number;
  readonly direction: number;
}

export interface ClassicRemoveMobMessage {
  readonly header: ClassicPacketHeader;
  readonly removeType: number;
}

export interface ClassicUpdateEquipMessage {
  readonly header: ClassicPacketHeader;
  readonly equipment: readonly number[];
  readonly equipment2: Uint8Array;
}

export interface ClassicHpMpMessage {
  readonly header: ClassicPacketHeader;
  readonly hp: number;
  readonly mp: number;
  readonly requestedHp: number;
  readonly requestedMp: number;
}

export interface ClassicHpDamageMessage {
  readonly header: ClassicPacketHeader;
  readonly hp: number;
  readonly damage: number;
}

export interface ClassicHpModeMessage {
  readonly header: ClassicPacketHeader;
  readonly hp: number;
  readonly mode: number;
}

export interface ClassicUpdateScoreMessage {
  readonly header: ClassicPacketHeader;
  readonly score: ClassicScore;
  readonly critical: number;
  readonly saveMana: number;
  readonly affects: readonly number[];
  readonly guild: number;
  readonly guildLevel: number;
  readonly resist: readonly number[];
  readonly regenHp: number;
  readonly regenMp: number;
  readonly currentHp: number;
  readonly currentMp: number;
  readonly magic: number;
  readonly special: readonly number[];
}

export interface ClassicUpdateEtcMessage {
  readonly header: ClassicPacketHeader;
  readonly hold: number;
  readonly experience: bigint;
  readonly learnedSkill: number;
  readonly secondaryLearnedSkill: number;
  readonly scoreBonus: number;
  readonly specialBonus: number;
  readonly skillBonus: number;
  readonly magic: number;
  readonly coin: number;
  readonly donate: number;
  readonly honor: number;
}

export interface ClassicDamageEntry {
  readonly targetId: number;
  readonly damage: number;
}

export interface ClassicAttackMessage {
  readonly header: ClassicPacketHeader;
  readonly unknown1: number;
  readonly unknown2: number;
  readonly currentHp: number;
  readonly currentMp: number;
  readonly currentExperience: bigint;
  readonly unknown0: number;
  readonly posX: number;
  readonly posY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly attackerId: number;
  readonly progress: number;
  readonly motion: number;
  readonly skillParm: number;
  readonly doubleCritical: number;
  readonly flagLocal: number;
  readonly reserved: number;
  readonly skillIndex: number;
  readonly requestedMp: number;
  readonly damages: readonly ClassicDamageEntry[];
}

export type ClassicAttackOpcode =
  | typeof ClassicOpcode.attackOne
  | typeof ClassicOpcode.attackTwo
  | typeof ClassicOpcode.attackMulti;

export interface ClassicClientAttackInput {
  readonly opcode: ClassicAttackOpcode;
  readonly posX: number;
  readonly posY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly attackerId: number;
  readonly damages: readonly ClassicDamageEntry[];
  readonly progress?: number;
  readonly motion?: number;
  readonly skillParm?: number;
  readonly doubleCritical?: number;
  readonly flagLocal?: number;
  readonly reserved?: number;
  readonly currentHp?: number;
  readonly currentMp?: number;
  readonly currentExperience?: bigint;
  readonly unknown0?: number;
  readonly unknown1?: number;
  readonly unknown2?: number;
  readonly skillIndex?: number;
  readonly requestedMp?: number;
}

export function parseMotionPacket(source: ArrayBuffer | ArrayBufferView): ClassicMotionMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.motion, CLASSIC_PACKET_SIZES.motion, "MSG_Motion");
  const motion = reader.i16();
  const parm = reader.i16();
  const directionBits = reader.u32();
  const direction = u32BitsToFloat(directionBits);
  assertEmpty(reader, "MSG_Motion");
  return { header, motion, parm, directionBits, direction };
}

export function parseUpdateEquipPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicUpdateEquipMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(
    header,
    ClassicOpcode.updateEquip,
    CLASSIC_PACKET_SIZES.updateEquip,
    "MSG_UpdateEquip",
  );
  const equipment = Array.from({ length: 16 }, () => reader.u16());
  const equipment2 = reader.bytes(16);
  assertEmpty(reader, "MSG_UpdateEquip");
  return { header, equipment, equipment2 };
}

export function parseRemoveMobPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicRemoveMobMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.removeMob, CLASSIC_PACKET_SIZES.removeMob, "MSG_RemoveMob");
  const removeType = reader.i32();
  assertEmpty(reader, "MSG_RemoveMob");
  return { header, removeType };
}

export function parseHpMpPacket(source: ArrayBuffer | ArrayBufferView): ClassicHpMpMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.setHpMp, CLASSIC_PACKET_SIZES.setHpMp, "MSG_SetHpMp");
  const hp = reader.i32();
  const mp = reader.i32();
  const requestedHp = reader.i32();
  const requestedMp = reader.i32();
  assertEmpty(reader, "MSG_SetHpMp");
  return { header, hp, mp, requestedHp, requestedMp };
}

export function parseHpDamagePacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicHpDamageMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.setHpDam, CLASSIC_PACKET_SIZES.setHpDam, "MSG_SetHpDam");
  const hp = reader.i32();
  // O Basedef do cliente declara short, mas o TMSrv envia int e sizeof=20.
  const damage = reader.i32();
  assertEmpty(reader, "MSG_SetHpDam");
  return { header, hp, damage };
}

export function parseHpModePacket(source: ArrayBuffer | ArrayBufferView): ClassicHpModeMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.setHpMode, CLASSIC_PACKET_SIZES.setHpMode, "MSG_SetHpMode");
  const hp = reader.i32();
  const mode = reader.i16();
  reader.skip(2); // padding Win32 da struct enviada pelo TMSrv
  assertEmpty(reader, "MSG_SetHpMode");
  return { header, hp, mode };
}

export function parseUpdateScorePacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicUpdateScoreMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(
    header,
    ClassicOpcode.updateScore,
    CLASSIC_PACKET_SIZES.updateScore,
    "MSG_UpdateScore",
  );

  // O TMSrv declara esta mensagem dentro de #pragma pack(push, 1).
  const score = parseClassicScore(reader);
  const critical = reader.u8();
  const saveMana = reader.u8();
  const affects = Array.from({ length: 32 }, () => reader.u16());
  const guild = reader.u16();
  const guildLevel = reader.u16();
  const resist = Array.from({ length: 4 }, () => reader.i8());
  const regenHp = reader.u8();
  const regenMp = reader.u8();
  const currentHp = reader.i32();
  const currentMp = reader.i32();
  const magic = reader.i32();
  const special = Array.from({ length: 4 }, () => reader.u8());
  assertEmpty(reader, "MSG_UpdateScore");

  return {
    header,
    score,
    critical,
    saveMana,
    affects,
    guild,
    guildLevel,
    resist,
    regenHp,
    regenMp,
    currentHp,
    currentMp,
    magic,
    special,
  };
}

export function parseUpdateEtcPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicUpdateEtcMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.updateEtc, CLASSIC_PACKET_SIZES.updateEtc, "MSG_UpdateEtc");

  const hold = reader.u32();
  const experience = reader.u64();
  const learnedSkill = reader.u32();
  const secondaryLearnedSkill = reader.u32();
  const scoreBonus = reader.u16();
  const specialBonus = reader.u16();
  const skillBonus = reader.u16();
  const magic = reader.u16();
  const coin = reader.i32();
  const donate = reader.i32();
  const honor = reader.i32();
  assertEmpty(reader, "MSG_UpdateEtc");

  return {
    header,
    hold,
    experience,
    learnedSkill,
    secondaryLearnedSkill,
    scoreBonus,
    specialBonus,
    skillBonus,
    magic,
    coin,
    donate,
    honor,
  };
}

/**
 * Encodes the exact client-to-TMSrv wire image produced by TMFieldScene.
 *
 * BASE759 builds a full MSG_Attack and sends only the prefix matching
 * MSG_AttackOne/Two when MaxTarget is 1/2. Therefore the outgoing one/two
 * variants intentionally keep MSG_Attack's vital offsets (CurrentHp at 16,
 * CurrentMp at 52) instead of the swapped server-to-client struct labels.
 */
export function createClientAttackPacket(
  attack: ClassicClientAttackInput,
  input: PacketHeaderInput = {},
): Uint8Array {
  const targetCount = attackTargetCount(attack.opcode);
  if (attack.damages.length > targetCount) {
    throw new RangeError(
      `MSG_Attack 0x${attack.opcode.toString(16)} aceita no máximo ${targetCount} alvos`,
    );
  }

  const size = attackPacketSize(attack.opcode);
  const writer = new PacketWriter(size);
  writer.header(createClassicHeader(attack.opcode, size, input));
  writer.u32(attack.unknown1 ?? 0);
  writer.i32(attack.currentHp ?? 0);
  writer.u32(attack.unknown2 ?? 0);
  writer.u64(attack.currentExperience ?? 0n);
  writer.i16(attack.unknown0 ?? 0);
  writer.u16(attack.posX);
  writer.u16(attack.posY);
  writer.u16(attack.targetX);
  writer.u16(attack.targetY);
  writer.u16(attack.attackerId);
  writer.u16(attack.progress ?? 0);
  writer.u8(attack.motion ?? 0xff);
  writer.u8(attack.skillParm ?? 0);
  writer.u8(attack.doubleCritical ?? 0);
  writer.u8(attack.flagLocal ?? 0);
  writer.i16(attack.reserved ?? 0);
  writer.i32(attack.currentMp ?? -1);
  writer.i16(attack.skillIndex ?? 0);
  writer.i16(attack.requestedMp ?? 0);

  for (let index = 0; index < targetCount; index++) {
    const damage = attack.damages[index];
    writer.i32(damage?.targetId ?? 0);
    writer.i32(damage?.damage ?? 0);
  }

  return writer.finish();
}

export function parseAttackPacket(source: ArrayBuffer | ArrayBufferView): ClassicAttackMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  const targetCount = attackTargetCount(header.type);
  const expectedSize = attackPacketSize(header.type);
  assertPacket(header, header.type, expectedSize, "MSG_Attack");

  const unknown1 = reader.u32();
  const firstVital = reader.i32();
  const unknown2 = reader.u32();
  const currentExperience = reader.u64();
  const unknown0 = reader.i16();
  const posX = reader.u16();
  const posY = reader.u16();
  const targetX = reader.u16();
  const targetY = reader.u16();
  const attackerId = reader.u16();
  const progress = reader.u16();
  const motion = reader.u8();
  const skillParm = reader.u8();
  const doubleCritical = reader.u8();
  const flagLocal = reader.u8();
  const reserved = reader.i16();
  const secondVital = reader.i32();
  const skillIndex = reader.i16();
  const requestedMp = reader.i16();
  const damages = Array.from({ length: targetCount }, (): ClassicDamageEntry => ({
    targetId: reader.i32(),
    damage: reader.i32(),
  }));
  assertEmpty(reader, "MSG_Attack");

  const oneOrTwo = header.type === ClassicOpcode.attackOne || header.type === ClassicOpcode.attackTwo;
  const currentHp = oneOrTwo ? secondVital : firstVital;
  const currentMp = oneOrTwo ? firstVital : secondVital;

  return {
    header,
    unknown1,
    unknown2,
    currentHp,
    currentMp,
    currentExperience,
    unknown0,
    posX,
    posY,
    targetX,
    targetY,
    attackerId,
    progress,
    motion,
    skillParm,
    doubleCritical,
    flagLocal,
    reserved,
    skillIndex,
    requestedMp,
    damages,
  };
}

function attackTargetCount(type: number): number {
  switch (type) {
    case ClassicOpcode.attackOne:
      return 1;
    case ClassicOpcode.attackTwo:
      return 2;
    case ClassicOpcode.attackMulti:
      return 13;
    default:
      throw new Error(`Opcode não é MSG_Attack: 0x${type.toString(16)}`);
  }
}

function attackPacketSize(type: number): number {
  switch (type) {
    case ClassicOpcode.attackOne:
      return CLASSIC_PACKET_SIZES.attackOne;
    case ClassicOpcode.attackTwo:
      return CLASSIC_PACKET_SIZES.attackTwo;
    case ClassicOpcode.attackMulti:
      return CLASSIC_PACKET_SIZES.attackMulti;
    default:
      throw new Error(`Opcode não é MSG_Attack: 0x${type.toString(16)}`);
  }
}

function assertPacket(
  header: ClassicPacketHeader,
  type: number,
  size: number,
  name: string,
): void {
  if (header.type !== type) {
    throw new Error(`Opcode não é ${name}: 0x${header.type.toString(16)}`);
  }
  if (header.size !== size) {
    throw new Error(`${name} com tamanho inesperado: ${header.size}; esperado ${size}`);
  }
}

function assertEmpty(reader: PacketReader, name: string): void {
  if (reader.remaining !== 0) {
    throw new Error(`${name} contém ${reader.remaining} bytes inesperados`);
  }
}

function u32BitsToFloat(bits: number): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, bits >>> 0, true);
  return view.getFloat32(0, true);
}
