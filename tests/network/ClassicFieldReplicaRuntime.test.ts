import { describe, expect, it, vi } from "vitest";
import { ClassicFieldReplica } from "../../src/network/classic/ClassicFieldReplica";
import { ClassicPacketDispatcher } from "../../src/network/classic/ClassicPacketDispatcher";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";

function writeScore(writer: PacketWriter, hp = 900, mp = 500): void {
  writer.i16(77);
  writer.padding(2);
  writer.i32(345).i32(678);
  writer.i8(0).i8(5).padding(2);
  writer.i32(1200).i32(800).i32(hp).i32(mp);
  writer.i16(10).i16(20).i16(30).i16(40);
  writer.u16(1).u16(2).u16(3).u16(4);
}

function createMobPacket(id = 456): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.createMob);
  writer.header({
    size: CLASSIC_PACKET_SIZES.createMob,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.createMob,
    id: 30_000,
    tick: 100,
  });
  writer.i16(2100).i16(2101).u16(id);
  writer.fixedString("Orc", 16);
  for (let slot = 0; slot < 16; slot++) writer.u16(slot === 0 ? 501 : 0);
  for (let affect = 0; affect < 32; affect++) writer.u16(affect === 0 ? 27 : 0);
  writer.u16(99).u8(3).padding(3);
  const start = writer.offset;
  writeScore(writer);
  expect(writer.offset - start).toBe(CLASSIC_STRUCTURE_SIZES.score);
  writer.u16(2);
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => index));
  writer.fixedString("ORC-GUARD", 26);
  writer.i32(9876);
  return writer.finish();
}

function motionPacket(id: number): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.motion)
    .header({
      size: CLASSIC_PACKET_SIZES.motion,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.motion,
      id,
      tick: 200,
    })
    .i16(25).i16(3).u32(0x3f800000)
    .finish();
}

function damagePacket(id: number): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.setHpDam)
    .header({
      size: CLASSIC_PACKET_SIZES.setHpDam,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.setHpDam,
      id,
      tick: 300,
    })
    .i32(650).i32(250)
    .finish();
}

function attackPacket(id: number): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.attackOne);
  writer.header({
    size: CLASSIC_PACKET_SIZES.attackOne,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.attackOne,
    id,
    tick: 400,
  });
  writer.u32(0);
  writer.i32(420);
  writer.u32(0);
  writer.u64(123n);
  writer.i16(0);
  writer.u16(2110).u16(2111);
  writer.u16(2120).u16(2121);
  writer.u16(id).u16(1);
  writer.u8(4).u8(0).u8(0).u8(0);
  writer.i16(0);
  writer.i32(640);
  writer.i16(7).i16(5);
  writer.i32(999).i32(111);
  return writer.finish();
}

function updateEquipPacket(id: number): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.updateEquip);
  writer.header({
    size: CLASSIC_PACKET_SIZES.updateEquip,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.updateEquip,
    id,
    tick: 450,
  });
  for (let slot = 0; slot < 16; slot++) writer.u16(slot === 0 ? 998 : slot + 700);
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => 0xf0 + index));
  return writer.finish();
}

function removePacket(id: number): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.removeMob)
    .header({
      size: CLASSIC_PACKET_SIZES.removeMob,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.removeMob,
      id,
      tick: 500,
    })
    .i32(1)
    .finish();
}

describe("ClassicFieldReplica runtime", () => {
  it("aplica Motion, HP, Attack e RemoveMob sem recalcular autoridade", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const replica = new ClassicFieldReplica(dispatcher);
    const changes = vi.fn();
    replica.onChange(changes);

    dispatcher.dispatch(createMobPacket());
    dispatcher.dispatch(motionPacket(456));
    expect(replica.snapshot(456)).toMatchObject({
      motion: {
        motion: 25,
        parm: 3,
        direction: 1,
        tick: 200,
      },
    });

    dispatcher.dispatch(damagePacket(456));
    expect(replica.snapshot(456)).toMatchObject({
      score: { hp: 650 },
      lastDamage: { hp: 650, damage: 250, tick: 300 },
    });

    dispatcher.dispatch(attackPacket(456));
    expect(replica.snapshot(456)).toMatchObject({
      posX: 2110,
      posY: 2111,
      score: { mp: 420 },
      lastAttack: {
        attackerId: 456,
        targetX: 2120,
        targetY: 2121,
        skillIndex: 7,
        currentHp: 640,
        currentMp: 420,
        damages: [{ targetId: 999, damage: 111 }],
        tick: 400,
      },
    });

    dispatcher.dispatch(updateEquipPacket(456));
    expect(replica.snapshot(456)?.equipment[0]).toBe(998);
    expect(replica.snapshot(456)?.equipment[15]).toBe(715);
    expect([...replica.snapshot(456)!.equipment2.slice(0, 3)]).toEqual([0xf0, 0xf1, 0xf2]);

    dispatcher.dispatch(removePacket(456));
    expect(replica.snapshot(456)).toBeNull();

    expect(changes.mock.calls.map(([event]) => event.type)).toEqual([
      "create",
      "update",
      "update",
      "attack",
      "update",
      "update",
      "remove",
    ]);
  });

  it("não inventa atores para eventos recebidos antes de CreateMob", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const replica = new ClassicFieldReplica(dispatcher);
    const changes = vi.fn();
    replica.onChange(changes);

    dispatcher.dispatch(motionPacket(700));
    dispatcher.dispatch(damagePacket(701));
    dispatcher.dispatch(attackPacket(702));
    dispatcher.dispatch(updateEquipPacket(703));

    expect(replica.snapshots()).toHaveLength(0);
    expect(changes.mock.calls.map(([event]) => event.type)).toEqual([
      "missing-motion",
      "missing-damage",
      "missing-attack",
      "missing-equip",
    ]);
  });
});
