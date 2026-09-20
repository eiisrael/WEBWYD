import { describe, expect, it } from "vitest";
import {
  CLASSIC_PACKET_HEADER_SIZE,
  PacketReader,
  PacketWriter,
} from "../../src/network/classic/PacketIO";

describe("PacketIO clássico", () => {
  it("preserva o layout little-endian de MSG_STANDARD", () => {
    const packet = new PacketWriter(CLASSIC_PACKET_HEADER_SIZE)
      .header({
        size: CLASSIC_PACKET_HEADER_SIZE,
        keyword: 0x12,
        checksum: 0x34,
        type: 0x36c,
        id: 0x4567,
        tick: 0x89abcdef,
      })
      .finish();

    expect([...packet]).toEqual([
      0x0c, 0x00,
      0x12,
      0x34,
      0x6c, 0x03,
      0x67, 0x45,
      0xef, 0xcd, 0xab, 0x89,
    ]);

    const reader = new PacketReader(packet);
    expect(reader.header()).toEqual({
      size: 12,
      keyword: 0x12,
      checksum: 0x34,
      type: 0x36c,
      id: 0x4567,
      tick: 0x89abcdef,
    });
    expect(reader.remaining).toBe(0);
  });

  it("lê e escreve strings fixas e inteiros sem ultrapassar o pacote", () => {
    const packet = new PacketWriter(12)
      .fixedString("WYD", 5)
      .i16(-123)
      .u16(65_000)
      .padding(3)
      .finish();

    const reader = new PacketReader(packet);
    expect(reader.fixedString(5)).toBe("WYD");
    expect(reader.i16()).toBe(-123);
    expect(reader.u16()).toBe(65_000);
    expect(reader.bytes(3)).toEqual(new Uint8Array(3));
    expect(reader.remaining).toBe(0);
    expect(() => reader.u8()).toThrow(RangeError);
  });
});
