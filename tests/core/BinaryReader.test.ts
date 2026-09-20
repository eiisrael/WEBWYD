import { describe, expect, it } from "vitest";
import { BinaryReader } from "../../src/core/binary/BinaryReader";

describe("BinaryReader", () => {
  it("le inteiros little-endian e ASCII em sequencia", () => {
    const buffer = new ArrayBuffer(8);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    bytes[0] = 0xfe;
    bytes[1] = 0x7f;
    view.setUint32(2, 0x78563412, true);
    bytes.set(new TextEncoder().encode("OK"), 6);

    const reader = new BinaryReader(buffer);
    expect(reader.int8()).toBe(-2);
    expect(reader.uint8()).toBe(127);
    expect(reader.uint32LE()).toBe(0x78563412);
    expect(reader.ascii(2)).toBe("OK");
    expect(reader.remaining).toBe(0);
  });

  it("recusa leitura alem do buffer", () => {
    const reader = new BinaryReader(new ArrayBuffer(1));
    reader.uint8();
    expect(() => reader.uint8()).toThrow(RangeError);
    expect(() => reader.ascii(-1)).toThrow(RangeError);
  });
});
