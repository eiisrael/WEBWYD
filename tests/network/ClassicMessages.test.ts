import { describe, expect, it } from "vitest";
import {
  createAccountLoginPacket,
  createActionPacket,
  createCharacterLoginPacket,
  encodeAccountLoginField,
  parseActionPacket,
  parseClassicHeader,
} from "../../src/network/classic/Messages";
import {
  CLASSIC_APP_VERSION,
  CLASSIC_PACKET_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";
import { PacketReader } from "../../src/network/classic/PacketIO";

describe("mensagens clássicas auditadas", () => {
  it("codifica MSG_AccountLogin no tamanho/alinhamento do cliente Win32", () => {
    const packet = createAccountLoginPacket(
      "conta",
      "senha",
      "00:11:22:33:44:55",
      { tick: 1234 },
    );

    expect(packet.byteLength).toBe(CLASSIC_PACKET_SIZES.accountLogin);
    expect(parseClassicHeader(packet)).toEqual({
      size: 116,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.accountLogin,
      id: 0,
      tick: 1234,
    });

    const reader = new PacketReader(packet);
    reader.skip(12 + 12 + 16 + 18 + 34);
    expect(reader.i32()).toBe(CLASSIC_APP_VERSION);
    expect(reader.i16()).toBe(1);
    expect(reader.u16()).toBe(0); // padding nativo antes de IP[4]
    expect(reader.i32()).toBe(0);
    expect(reader.i32()).toBe(0);
    expect(reader.i32()).toBe(0);
    expect(reader.i32()).toBe(0);
  });

  it("aplica a transformação de login da BASE759 byte a byte", () => {
    const encoded = encodeAccountLoginField("A", 12, 11);
    // A (0x41) + key[11] (0x7d); os bytes NUL seguintes também recebem as chaves.
    expect(encoded[0]).toBe((0x41 + 0x7d) & 0xff);
    expect(encoded[1]).toBe(0x87);
    expect(encoded[11]).toBe(0x7d);
  });

  it("cria MSG_CharacterLogin com slot e SecretCode fixos", () => {
    const secret = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
    const packet = createCharacterLoginPacket(2, secret, { tick: 55 });

    expect(packet.byteLength).toBe(36);
    expect(parseClassicHeader(packet).type).toBe(ClassicOpcode.characterLogin);

    const reader = new PacketReader(packet);
    reader.skip(12);
    expect(reader.i32()).toBe(2);
    expect(reader.i32()).toBe(0);
    expect(reader.bytes(16)).toEqual(secret);
  });

  it("round-tripa MSG_Action com rota clássica de 24 bytes", () => {
    const route = Uint8Array.from([1, 2, 3, 4]);
    const packet = createActionPacket({
      posX: 2100,
      posY: 2101,
      effect: 0,
      speed: 6,
      route,
      targetX: 2110,
      targetY: 2111,
    }, { id: 77, tick: 9001 });

    const action = parseActionPacket(packet);
    expect(action.header.type).toBe(ClassicOpcode.action);
    expect(action.header.id).toBe(77);
    expect(action.posX).toBe(2100);
    expect(action.posY).toBe(2101);
    expect(action.speed).toBe(6);
    expect([...action.route.slice(0, 5)]).toEqual([1, 2, 3, 4, 0]);
    expect(action.targetX).toBe(2110);
    expect(action.targetY).toBe(2111);
  });
});
