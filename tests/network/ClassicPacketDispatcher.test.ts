import { describe, expect, it, vi } from "vitest";
import { ClassicPacketDispatcher } from "../../src/network/classic/ClassicPacketDispatcher";
import { PacketWriter } from "../../src/network/classic/PacketIO";

function packet(type: number, size = 12): Uint8Array {
  return new PacketWriter(size)
    .header({ size, keyword: 0, checksum: 0, type, id: 7, tick: 9 })
    .padding(size - 12)
    .finish();
}

describe("ClassicPacketDispatcher", () => {
  it("despacha pelo opcode e informa packets desconhecidos", () => {
    const dispatcher = new ClassicPacketDispatcher();
    const known = vi.fn();
    const unknown = vi.fn();

    dispatcher.on(0x10a, known);
    dispatcher.onUnknown(unknown);

    expect(dispatcher.dispatch(packet(0x10a))).toBe(true);
    expect(known).toHaveBeenCalledTimes(1);
    expect(known.mock.calls[0]?.[1]).toMatchObject({ type: 0x10a, id: 7, tick: 9 });

    expect(dispatcher.dispatch(packet(0x999))).toBe(false);
    expect(unknown).toHaveBeenCalledTimes(1);
  });

  it("recusa frame truncado ou tamanho divergente", () => {
    const dispatcher = new ClassicPacketDispatcher();
    expect(() => dispatcher.dispatch(new Uint8Array(4))).toThrow(RangeError);

    const divergent = packet(0x10a, 16);
    new DataView(divergent.buffer).setUint16(0, 12, true);
    expect(() => dispatcher.dispatch(divergent)).toThrow(/divergente/i);
  });
});
