import { describe, expect, it } from "vitest";
import { parseCreateMobPacket } from "../../src/network/classic/Messages";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";

function writeScore(writer: PacketWriter): void {
  writer.i16(77);
  writer.padding(2);
  writer.i32(345);
  writer.i32(678);
  writer.i8(0);
  writer.i8(5);
  writer.padding(2);
  writer.i32(1200);
  writer.i32(800);
  writer.i32(1100);
  writer.i32(700);
  writer.i16(10).i16(20).i16(30).i16(40);
  writer.u16(1).u16(2).u16(3).u16(4);
}

function createPacket(trade: boolean): Uint8Array {
  const size = trade ? CLASSIC_PACKET_SIZES.createMobTrade : CLASSIC_PACKET_SIZES.createMob;
  const writer = new PacketWriter(size);
  writer.header({
    size,
    keyword: 0,
    checksum: 0,
    type: trade ? ClassicOpcode.createMobTrade : ClassicOpcode.createMob,
    id: 30_000,
    tick: 123,
  });
  writer.i16(2100).i16(2101).u16(456);
  writer.fixedString("Orc", 16);
  for (let slot = 0; slot < 16; slot++) writer.u16(slot + 100);
  for (let affect = 0; affect < 32; affect++) writer.u16(affect);
  writer.u16(99);
  writer.u8(3);
  writer.padding(3);
  const scoreStart = writer.offset;
  writeScore(writer);
  expect(writer.offset - scoreStart).toBe(CLASSIC_STRUCTURE_SIZES.score);
  writer.u16(2);
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => index + 1));
  writer.fixedString("ORC-GUARD", 26);
  if (trade) writer.fixedString("Mercador de teste", 24);
  else writer.i32(9876);
  return writer.finish();
}

describe("MSG_CreateMob", () => {
  it("decodifica actor normal com score e visuais", () => {
    const mob = parseCreateMobPacket(createPacket(false));
    expect(mob).toMatchObject({
      posX: 2100,
      posY: 2101,
      mobId: 456,
      mobName: "Orc",
      guild: 99,
      guildLevel: 3,
      createType: 2,
      nick: "ORC-GUARD",
      hold: 9876,
      tradeDescription: null,
    });
    expect(mob.header.type).toBe(ClassicOpcode.createMob);
    expect(mob.equipment).toHaveLength(16);
    expect(mob.equipment[0]).toBe(100);
    expect(mob.affects).toHaveLength(32);
    expect(mob.score.level).toBe(77);
    expect(mob.score.hp).toBe(1100);
    expect(mob.equipment2[15]).toBe(16);
  });

  it("decodifica variante de auto-trade respeitando padding Win32", () => {
    const mob = parseCreateMobPacket(createPacket(true));
    expect(mob.header.type).toBe(ClassicOpcode.createMobTrade);
    expect(mob.hold).toBeNull();
    expect(mob.tradeDescription).toBe("Mercador de teste");
  });
});
