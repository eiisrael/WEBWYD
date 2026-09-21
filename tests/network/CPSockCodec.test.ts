import { describe, expect, it } from "vitest";
import {
  ClassicCPSockEncoder,
  ClassicCPSockStreamDecoder,
  ClassicServerClock,
  decodeClassicCPSockPacket,
} from "../../src/network/classic/CPSockCodec";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import { ClassicOpcode } from "../../src/network/classic/Protocol";

function message(type: number = ClassicOpcode.action): Uint8Array {
  return new PacketWriter(20)
    .header({ size: 20, keyword: 0, checksum: 0, type, id: 321, tick: 0 })
    .i32(0x12345678)
    .i32(-123456)
    .finish();
}

describe("CPSockCodec", () => {
  it("mantém ClientTick alinhado ao último tick autoritativo do TMSrv", () => {
    let now = 1_000;
    const clock = new ClassicServerClock({
      nowSource: () => now,
      fallbackTickSource: () => 77,
    });

    expect(clock.now()).toBe(77);
    clock.observe(500_000);
    expect(clock.now()).toBe(500_000);

    now += 275;
    expect(clock.now()).toBe(500_275);

    now -= 50;
    expect(clock.now()).toBe(500_275);

    clock.clear();
    expect(clock.now()).toBe(77);
  });

  it("codifica e decodifica um packet preservando o payload clássico", () => {
    const decoded = message();
    const encoder = new ClassicCPSockEncoder({
      keywordSource: () => 0x42,
      tickSource: () => 0x10203040,
    });
    const encoded = encoder.encode(decoded);

    expect(encoded).not.toEqual(decoded);
    expect(encoded[2]).toBe(0x42);
    expect(new DataView(encoded.buffer).getUint16(0, true)).toBe(20);

    const roundTrip = decodeClassicCPSockPacket(encoded);
    const view = new DataView(roundTrip.buffer);
    expect(view.getUint16(4, true)).toBe(ClassicOpcode.action);
    expect(view.getUint16(6, true)).toBe(321);
    expect(view.getUint32(8, true)).toBe(0x10203040);
    expect(view.getInt32(12, true)).toBe(0x12345678);
    expect(view.getInt32(16, true)).toBe(-123456);
  });

  it("usa o SecretCode como SendQueue exatamente nos primeiros 16 envios", () => {
    const encoder = new ClassicCPSockEncoder({
      keywordSource: () => 0,
      tickSource: () => 1,
    });
    const secret = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
    encoder.setSendQueue(secret);

    for (let index = 0; index < 16; index++) {
      const encoded = encoder.encode(message());
      expect(encoded[2]).toBe(secret[index]! ^ 0xff);
      expect(decodeClassicCPSockPacket(encoded).byteLength).toBe(20);
    }
  });

  it("remonta múltiplos packets mesmo com chunks TCP fragmentados", () => {
    const encoder = new ClassicCPSockEncoder({
      keywordSource: () => 7,
      tickSource: () => 99,
    });
    const first = encoder.encode(message(ClassicOpcode.action));
    const second = encoder.encode(message(ClassicOpcode.motion));
    const joined = new Uint8Array(first.length + second.length);
    joined.set(first);
    joined.set(second, first.length);

    const decoder = new ClassicCPSockStreamDecoder();
    expect(decoder.push(joined.subarray(0, 5))).toEqual([]);
    expect(decoder.push(joined.subarray(5, first.length - 2))).toEqual([]);

    const packets = decoder.push(joined.subarray(first.length - 2));
    expect(packets).toHaveLength(2);
    expect(new DataView(packets[0]!.buffer).getUint16(4, true)).toBe(ClassicOpcode.action);
    expect(new DataView(packets[1]!.buffer).getUint16(4, true)).toBe(ClassicOpcode.motion);
  });

  it("valida o byte de checksum clássico sem atribuir garantias que o CPSock não possui", () => {
    const encoder = new ClassicCPSockEncoder({
      keywordSource: () => 3,
      tickSource: () => 2,
    });
    const encoded = encoder.encode(message());
    encoded[3] = encoded[3]! ^ 0x01;
    expect(() => decodeClassicCPSockPacket(encoded)).toThrow(/checksum/i);
  });
});
