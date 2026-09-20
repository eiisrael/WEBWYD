import { PacketReader } from "./PacketIO";
import { CLASSIC_STRUCTURE_SIZES } from "./Protocol";

export interface ClassicScore {
  readonly level: number;
  readonly armorClass: number;
  readonly damage: number;
  readonly reserved: number;
  readonly attackRun: number;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly hp: number;
  readonly mp: number;
  readonly strength: number;
  readonly intelligence: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly special: readonly number[];
}

export interface ClassicItemEffect {
  readonly effect: number;
  readonly value: number;
}

export interface ClassicItem {
  readonly index: number;
  readonly effects: readonly ClassicItemEffect[];
}

export interface ClassicMobCore {
  readonly name: string;
  readonly clan: number;
  readonly merchant: number;
  readonly guild: number;
  readonly characterClass: number;
  readonly reserved: number;
  readonly quest: number;
  readonly coin: number;
  readonly experience: bigint;
  readonly homeTownX: number;
  readonly homeTownY: number;
  readonly baseScore: ClassicScore;
  readonly currentScore: ClassicScore;
  readonly equipment: readonly ClassicItem[];
  readonly carry: readonly ClassicItem[];
  /**
   * Bytes 780..815 intentionally remain opaque. Client and server sources in
   * this BASE759 disagree about the semantic layout of this tail.
   */
  readonly opaqueTail: Uint8Array;
}

export function parseClassicScore(reader: PacketReader): ClassicScore {
  const start = reader.offset;
  const level = reader.i16();
  reader.skip(2); // alignment before int Ac
  const armorClass = reader.i32();
  const damage = reader.i32();
  const reserved = reader.i8();
  const attackRun = reader.i8();
  reader.skip(2); // alignment before MaxHp
  const maxHp = reader.i32();
  const maxMp = reader.i32();
  const hp = reader.i32();
  const mp = reader.i32();
  const strength = reader.i16();
  const intelligence = reader.i16();
  const dexterity = reader.i16();
  const constitution = reader.i16();
  const special = Array.from({ length: 4 }, () => reader.u16());

  assertConsumed("STRUCT_SCORE", start, reader.offset, CLASSIC_STRUCTURE_SIZES.score);
  return {
    level,
    armorClass,
    damage,
    reserved,
    attackRun,
    maxHp,
    maxMp,
    hp,
    mp,
    strength,
    intelligence,
    dexterity,
    constitution,
    special,
  };
}

export function parseClassicItem(reader: PacketReader): ClassicItem {
  const start = reader.offset;
  const index = reader.i16();
  const effects = Array.from({ length: 3 }, (): ClassicItemEffect => ({
    effect: reader.u8(),
    value: reader.u8(),
  }));
  assertConsumed("STRUCT_ITEM", start, reader.offset, CLASSIC_STRUCTURE_SIZES.item);
  return { index, effects };
}

export function parseClassicMobCore(reader: PacketReader): ClassicMobCore {
  const start = reader.offset;
  const name = reader.fixedString(16);
  const clan = reader.i8();
  const merchant = reader.u8();
  const guild = reader.u16();
  const characterClass = reader.u8();
  reader.skip(1); // alignment before Rsv
  const reserved = reader.u16();
  const quest = reader.u8();
  reader.skip(3); // alignment before Coin
  const coin = reader.i32();
  const experience = reader.u64();
  const homeTownX = reader.i16();
  const homeTownY = reader.i16();
  const baseScore = parseClassicScore(reader);
  const currentScore = parseClassicScore(reader);
  const equipment = Array.from({ length: 16 }, () => parseClassicItem(reader));
  const carry = Array.from({ length: 64 }, () => parseClassicItem(reader));
  const consumedCore = reader.offset - start;
  const tailLength = CLASSIC_STRUCTURE_SIZES.mob - consumedCore;
  if (tailLength < 0) {
    throw new Error(`STRUCT_MOB excedeu layout auditado: ${consumedCore} bytes`);
  }
  const opaqueTail = reader.bytes(tailLength);

  assertConsumed("STRUCT_MOB", start, reader.offset, CLASSIC_STRUCTURE_SIZES.mob);
  return {
    name,
    clan,
    merchant,
    guild,
    characterClass,
    reserved,
    quest,
    coin,
    experience,
    homeTownX,
    homeTownY,
    baseScore,
    currentScore,
    equipment,
    carry,
    opaqueTail,
  };
}

function assertConsumed(name: string, start: number, end: number, expected: number): void {
  const actual = end - start;
  if (actual !== expected) {
    throw new Error(`${name} consumiu ${actual} bytes; esperado ${expected}`);
  }
}
