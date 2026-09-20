import { describe, expect, it, vi } from "vitest";
import { ClassicFieldReplica } from "../../src/network/classic/ClassicFieldReplica";
import { ClassicPacketDispatcher } from "../../src/network/classic/ClassicPacketDispatcher";
import { createActionPacket } from "../../src/network/classic/Messages";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";

function writeScore(writer: PacketWriter, hp = 900): void {
  writer.i16(77);
  writer.padding(2);
  writer.i32(345);
  writer.i32(678);
  writer.i8(0);
  writer.i8(5);
  writer.padding(2);
  writer.i32(1200);
  writer.i32(800);
  writer.i32(hp);
  writer.i32(700);
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
  writer.u16(99);
  writer.u8(3);
  writer.padding(3);

  const scoreStart = writer.offset;
  writeScore(writer);
  expect(writer.offset - scoreStart).toBe(CLASSIC_STRUCTURE_SIZES.score);

  writer.u16(2);
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => index));
  writer.fixedString("ORC-GUARD", 26);
  writer.i32(9876);
  return writer.finish();
}

describe("ClassicFieldReplica", () => {
  it("replica CreateMob e Action recebidos pelo dispatcher", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const replica = new ClassicFieldReplica(dispatcher);
    const onChange = vi.fn();
    replica.onChange(onChange);

    expect(dispatcher.dispatch(createMobPacket())).toBe(true);
    expect(replica.snapshot(456)).toMatchObject({
      id: 456,
      name: "Orc",
      posX: 2100,
      posY: 2101,
      guild: 99,
      guildLevel: 3,
      createType: 2,
      nick: "ORC-GUARD",
      hold: 9876,
    });
    expect(replica.snapshot(456)?.score.hp).toBe(900);
    expect(replica.snapshot(456)?.equipment[0]).toBe(501);

    const action = createActionPacket({
      posX: 2110,
      posY: 2111,
      effect: 0,
      speed: 6,
      route: Uint8Array.from([1, 2, 3]),
      targetX: 2120,
      targetY: 2121,
    }, { id: 456, tick: 777 });

    expect(dispatcher.dispatch(action)).toBe(true);
    expect(replica.snapshot(456)).toMatchObject({
      posX: 2110,
      posY: 2111,
      action: {
        effect: 0,
        speed: 6,
        targetX: 2120,
        targetY: 2121,
        tick: 777,
      },
    });
    expect(onChange.mock.calls.map(([event]) => event.type)).toEqual(["create", "update"]);
  });

  it("sinaliza Action de ator ainda não materializado", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const replica = new ClassicFieldReplica(dispatcher);
    const onChange = vi.fn();
    replica.onChange(onChange);

    const action = createActionPacket({
      posX: 100,
      posY: 101,
      effect: 0,
      speed: 4,
      route: [],
      targetX: 102,
      targetY: 103,
    }, { id: 999, tick: 5 });

    expect(dispatcher.dispatch(action)).toBe(true);
    expect(replica.snapshot(999)).toBeNull();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "missing-action", actorId: 999 }),
    );
  });

  it("limpa atores e desregistra handlers ao descartar", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const replica = new ClassicFieldReplica(dispatcher);
    dispatcher.dispatch(createMobPacket(321));
    expect(replica.snapshots()).toHaveLength(1);

    replica.clear();
    expect(replica.snapshots()).toHaveLength(0);

    replica.dispose();
    expect(dispatcher.dispatch(createMobPacket(322))).toBe(false);
  });
});
