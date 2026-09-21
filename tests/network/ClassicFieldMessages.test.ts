import { describe, expect, it } from "vitest";
import { parseCreateMobPacket } from "../../src/network/classic/Messages";
import { createClientAttackPacket } from "../../src/network/classic/FieldMessages";
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


describe("client MSG_Attack", () => {
  it("reproduz o prefixo MSG_Attack usado pelo cliente para ataque físico de um alvo", () => {
    const packet = createClientAttackPacket({
      opcode: ClassicOpcode.attackOne,
      posX: 2100,
      posY: 2101,
      targetX: 2102,
      targetY: 2101,
      attackerId: 777,
      damages: [{ targetId: 1500, damage: -2 }],
      skillIndex: 0,
    }, { id: 777, tick: 1234 });

    expect(packet).toHaveLength(CLASSIC_PACKET_SIZES.attackOne);
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    expect(view.getUint16(0, true)).toBe(CLASSIC_PACKET_SIZES.attackOne);
    expect(view.getUint16(4, true)).toBe(ClassicOpcode.attackOne);
    expect(view.getUint16(6, true)).toBe(777);
    expect(view.getUint32(8, true)).toBe(1234);
    expect(view.getInt32(16, true)).toBe(0);
    expect(view.getUint16(34, true)).toBe(2100);
    expect(view.getUint16(36, true)).toBe(2101);
    expect(view.getUint16(38, true)).toBe(2102);
    expect(view.getUint16(40, true)).toBe(2101);
    expect(view.getUint16(42, true)).toBe(777);
    expect(view.getUint8(46)).toBe(0xff);
    expect(view.getInt32(52, true)).toBe(-1);
    expect(view.getInt16(56, true)).toBe(0);
    expect(view.getInt32(60, true)).toBe(1500);
    expect(view.getInt32(64, true)).toBe(-2);
  });

  it("recusa mais alvos do que a variante de packet comporta", () => {
    expect(() => createClientAttackPacket({
      opcode: ClassicOpcode.attackOne,
      posX: 1,
      posY: 1,
      targetX: 2,
      targetY: 2,
      attackerId: 7,
      damages: [
        { targetId: 8, damage: -2 },
        { targetId: 9, damage: -2 },
      ],
    })).toThrow(/máximo 1/i);
  });
});
