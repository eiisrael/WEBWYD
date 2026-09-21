import { describe, expect, it } from "vitest";
import {
  parseAttackPacket,
  parseHpDamagePacket,
  parseHpModePacket,
  parseHpMpPacket,
  parseMotionPacket,
  parseRemoveMobPacket,
  parseUpdateEtcPacket,
  parseUpdateScorePacket,
} from "../../src/network/classic/FieldMessages";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";

function writeScore(writer: PacketWriter, hp = 777, mp = 333): void {
  writer.i16(120);
  writer.padding(2);
  writer.i32(321);
  writer.i32(654);
  writer.i8(7);
  writer.i8(8);
  writer.padding(2);
  writer.i32(1000);
  writer.i32(500);
  writer.i32(hp);
  writer.i32(mp);
  writer.i16(11).i16(12).i16(13).i16(14);
  writer.u16(21).u16(22).u16(23).u16(24);
}

function header(writer: PacketWriter, type: number, size: number, id = 456, tick = 999): PacketWriter {
  return writer.header({ size, keyword: 0, checksum: 0, type, id, tick });
}

function attackPacket(type: number): Uint8Array {
  const targetCount = type === ClassicOpcode.attackOne ? 1 : type === ClassicOpcode.attackTwo ? 2 : 13;
  const size = type === ClassicOpcode.attackOne
    ? CLASSIC_PACKET_SIZES.attackOne
    : type === ClassicOpcode.attackTwo
      ? CLASSIC_PACKET_SIZES.attackTwo
      : CLASSIC_PACKET_SIZES.attackMulti;
  const writer = header(new PacketWriter(size), type, size, 456, 12345);
  writer.u32(0x01020304);
  if (type === ClassicOpcode.attackMulti) writer.i32(850);
  else writer.i32(280);
  writer.u32(0x05060708);
  writer.u64(987654321n);
  writer.i16(9);
  writer.u16(2100).u16(2101);
  writer.u16(2110).u16(2111);
  writer.u16(456).u16(17);
  writer.u8(4).u8(6).u8(2).u8(0);
  writer.i16(3);
  if (type === ClassicOpcode.attackMulti) writer.i32(280);
  else writer.i32(850);
  writer.i16(39);
  writer.i16(20);
  for (let index = 0; index < targetCount; index++) {
    writer.i32(1000 + index);
    writer.i32(100 + index);
  }
  return writer.finish();
}

describe("FieldMessages", () => {
  it("decodifica Motion preservando bits e float", () => {
    const packet = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.motion),
      ClassicOpcode.motion,
      CLASSIC_PACKET_SIZES.motion,
    ).i16(25).i16(7).u32(0x3fc00000).finish();

    const motion = parseMotionPacket(packet);
    expect(motion).toMatchObject({
      motion: 25,
      parm: 7,
      directionBits: 0x3fc00000,
      direction: 1.5,
    });
  });

  it("decodifica RemoveMob e vitais autoritativos", () => {
    const remove = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.removeMob),
      ClassicOpcode.removeMob,
      CLASSIC_PACKET_SIZES.removeMob,
      777,
    ).i32(1).finish();
    expect(parseRemoveMobPacket(remove)).toMatchObject({
      header: { id: 777 },
      removeType: 1,
    });

    const hpMp = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.setHpMp),
      ClassicOpcode.setHpMp,
      CLASSIC_PACKET_SIZES.setHpMp,
    ).i32(900).i32(400).i32(875).i32(390).finish();
    expect(parseHpMpPacket(hpMp)).toMatchObject({
      hp: 900,
      mp: 400,
      requestedHp: 875,
      requestedMp: 390,
    });

    const damage = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.setHpDam),
      ClassicOpcode.setHpDam,
      CLASSIC_PACKET_SIZES.setHpDam,
      888,
    ).i32(650).i32(250).finish();
    expect(parseHpDamagePacket(damage)).toMatchObject({
      header: { id: 888 },
      hp: 650,
      damage: 250,
    });

    const mode = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.setHpMode),
      ClassicOpcode.setHpMode,
      CLASSIC_PACKET_SIZES.setHpMode,
    ).i32(0).i16(22).padding(2).finish();
    expect(parseHpModePacket(mode)).toMatchObject({ hp: 0, mode: 22 });
  });

  it("decodifica UpdateScore no layout packed do TMSrv", () => {
    const writer = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.updateScore),
      ClassicOpcode.updateScore,
      CLASSIC_PACKET_SIZES.updateScore,
    );
    const scoreStart = writer.offset;
    writeScore(writer, 777, 333);
    expect(writer.offset - scoreStart).toBe(CLASSIC_STRUCTURE_SIZES.score);
    writer.u8(15).u8(12);
    for (let index = 0; index < 32; index++) writer.u16(index);
    writer.u16(99).u16(2);
    writer.i8(-1).i8(2).i8(3).i8(4);
    writer.u8(5).u8(6);
    writer.i32(770).i32(330);
    writer.i32(0x11223344);
    writer.u8(8).u8(9).u8(10).u8(11);

    const update = parseUpdateScorePacket(writer.finish());
    expect(update.score).toMatchObject({ level: 120, hp: 777, mp: 333 });
    expect(update).toMatchObject({
      critical: 15,
      saveMana: 12,
      guild: 99,
      guildLevel: 2,
      regenHp: 5,
      regenMp: 6,
      currentHp: 770,
      currentMp: 330,
      magic: 0x11223344,
      special: [8, 9, 10, 11],
    });
    expect(update.affects).toHaveLength(32);
    expect(update.resist).toEqual([-1, 2, 3, 4]);
  });

  it("decodifica UpdateEtc conforme o TMSrv realmente envia", () => {
    const packet = header(
      new PacketWriter(CLASSIC_PACKET_SIZES.updateEtc),
      ClassicOpcode.updateEtc,
      CLASSIC_PACKET_SIZES.updateEtc,
    )
      .u32(123)
      .u64(987654321n)
      .u32(0xaabbccdd)
      .u32(0x11223344)
      .u16(10)
      .u16(11)
      .u16(12)
      .u16(13)
      .i32(14000)
      .i32(15000)
      .i32(16000)
      .finish();

    expect(parseUpdateEtcPacket(packet)).toMatchObject({
      hold: 123,
      experience: 987654321n,
      learnedSkill: 0xaabbccdd,
      secondaryLearnedSkill: 0x11223344,
      scoreBonus: 10,
      specialBonus: 11,
      skillBonus: 12,
      magic: 13,
      coin: 14000,
      donate: 15000,
      honor: 16000,
    });
  });

  it.each([
    [ClassicOpcode.attackOne, 1, CLASSIC_PACKET_SIZES.attackOne],
    [ClassicOpcode.attackTwo, 2, CLASSIC_PACKET_SIZES.attackTwo],
    [ClassicOpcode.attackMulti, 13, CLASSIC_PACKET_SIZES.attackMulti],
  ])("decodifica Attack 0x%s com %i alvo(s)", (type, count, size) => {
    const attack = parseAttackPacket(attackPacket(type));
    expect(attack.header.size).toBe(size);
    expect(attack.attackerId).toBe(456);
    expect(attack.posX).toBe(2100);
    expect(attack.posY).toBe(2101);
    expect(attack.targetX).toBe(2110);
    expect(attack.targetY).toBe(2111);
    expect(attack.skillIndex).toBe(39);
    expect(attack.currentHp).toBe(850);
    expect(attack.currentMp).toBe(280);
    expect(attack.damages).toHaveLength(count);
    expect(attack.damages[0]).toEqual({ targetId: 1000, damage: 100 });
  });
});
