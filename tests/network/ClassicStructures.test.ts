import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "../../src/network/classic/PacketIO";
import { CLASSIC_STRUCTURE_SIZES } from "../../src/network/classic/Protocol";
import {
  parseClassicMobCore,
  parseClassicScore,
} from "../../src/network/classic/Structures";

function writeScore(
  writer: PacketWriter,
  values: {
    level: number;
    hp: number;
    mp: number;
    maxHp: number;
    maxMp: number;
  },
): void {
  writer.i16(values.level);
  writer.padding(2);
  writer.i32(321);
  writer.i32(654);
  writer.i8(7);
  writer.i8(8);
  writer.padding(2);
  writer.i32(values.maxHp);
  writer.i32(values.maxMp);
  writer.i32(values.hp);
  writer.i32(values.mp);
  writer.i16(11).i16(12).i16(13).i16(14);
  writer.u16(21).u16(22).u16(23).u16(24);
}

function writeItem(writer: PacketWriter, index: number): void {
  writer.i16(index);
  writer.u8(1).u8(2);
  writer.u8(3).u8(4);
  writer.u8(5).u8(6);
}

describe("estruturas clássicas Win32", () => {
  it("consome exatamente 48 bytes em STRUCT_SCORE", () => {
    const writer = new PacketWriter(CLASSIC_STRUCTURE_SIZES.score);
    writeScore(writer, { level: 120, hp: 900, mp: 800, maxHp: 1000, maxMp: 850 });
    const reader = new PacketReader(writer.finish());

    const score = parseClassicScore(reader);
    expect(reader.offset).toBe(48);
    expect(score).toMatchObject({
      level: 120,
      armorClass: 321,
      damage: 654,
      maxHp: 1000,
      maxMp: 850,
      hp: 900,
      mp: 800,
      strength: 11,
      intelligence: 12,
      dexterity: 13,
      constitution: 14,
      special: [21, 22, 23, 24],
    });
  });

  it("decodifica o núcleo comprovado de STRUCT_MOB em 816 bytes", () => {
    const writer = new PacketWriter(CLASSIC_STRUCTURE_SIZES.mob);
    writer.fixedString("Huntress", 16);
    writer.i8(2);
    writer.u8(0);
    writer.u16(77);
    writer.u8(3);
    writer.padding(1);
    writer.u16(9);
    writer.u8(4);
    writer.padding(3);
    writer.i32(123456);
    writer.u64(987654321n);
    writer.i16(2100);
    writer.i16(2101);

    writeScore(writer, { level: 120, hp: 1000, mp: 500, maxHp: 1000, maxMp: 500 });
    writeScore(writer, { level: 120, hp: 777, mp: 333, maxHp: 1100, maxMp: 550 });

    for (let slot = 0; slot < 16; slot++) writeItem(writer, slot === 0 ? 501 : 0);
    for (let slot = 0; slot < 64; slot++) writeItem(writer, slot === 0 ? 400 : 0);

    const tailLength = CLASSIC_STRUCTURE_SIZES.mob - writer.offset;
    expect(tailLength).toBe(36);
    writer.bytes(Uint8Array.from({ length: tailLength }, (_, index) => index));

    const reader = new PacketReader(writer.finish());
    const mob = parseClassicMobCore(reader);

    expect(reader.offset).toBe(816);
    expect(mob).toMatchObject({
      name: "Huntress",
      clan: 2,
      guild: 77,
      characterClass: 3,
      quest: 4,
      coin: 123456,
      experience: 987654321n,
      homeTownX: 2100,
      homeTownY: 2101,
    });
    expect(mob.baseScore.level).toBe(120);
    expect(mob.currentScore.hp).toBe(777);
    expect(mob.currentScore.mp).toBe(333);
    expect(mob.equipment[0]).toMatchObject({ index: 501 });
    expect(mob.carry[0]).toMatchObject({ index: 400 });
    expect(mob.opaqueTail).toHaveLength(36);
    expect(mob.opaqueTail[35]).toBe(35);
  });
});
