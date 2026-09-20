import { describe, expect, it, vi } from "vitest";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  CLASSIC_STRUCTURE_SIZES,
  ClassicOpcode,
} from "../../src/network/classic/Protocol";
import { ClassicSession } from "../../src/network/session/ClassicSession";
import type {
  ClassicTransport,
  ClassicTransportEventMap,
  ClassicTransportState,
} from "../../src/network/transport/WebSocketClassicTransport";

type AnyListener = (event: unknown) => void;

class FakeTransport implements ClassicTransport {
  state: ClassicTransportState = "idle";
  readonly sent: Uint8Array[] = [];
  readonly listeners = new Map<keyof ClassicTransportEventMap, Set<AnyListener>>();

  connect(): void {
    this.state = "connecting";
  }

  send(packet: Uint8Array): void {
    this.sent.push(packet.slice());
  }

  close(): void {
    this.state = "closed";
  }

  on<K extends keyof ClassicTransportEventMap>(
    type: K,
    listener: (event: ClassicTransportEventMap[K]) => void,
  ): () => void {
    const listeners = this.listeners.get(type) ?? new Set<AnyListener>();
    this.listeners.set(type, listeners);
    const erased = listener as AnyListener;
    listeners.add(erased);
    return () => listeners.delete(erased);
  }

  open(): void {
    this.state = "open";
    this.emit("open", undefined);
  }

  receive(packet: Uint8Array): void {
    this.emit("packet", packet);
  }

  private emit<K extends keyof ClassicTransportEventMap>(
    type: K,
    event: ClassicTransportEventMap[K],
  ): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function accountConfirmation(): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.cnfAccountLogin);
  writer.header({
    size: CLASSIC_PACKET_SIZES.cnfAccountLogin,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.cnfAccountLogin,
    id: 0,
    tick: 1_234,
  });
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => index + 10));

  for (const value of [2100, 2200, 0, 0]) writer.u16(value);
  for (const value of [2101, 2201, 0, 0]) writer.u16(value);
  for (const name of ["Huntress", "TransKnight", "", ""]) writer.fixedString(name, 16);

  for (const level of [120, 80, 0, 0]) {
    writer.i16(level);
    writer.padding(CLASSIC_STRUCTURE_SIZES.score - 2);
  }

  writer.padding(CLASSIC_STRUCTURE_SIZES.item * 4 * 16);
  for (const guild of [12, 34, 0, 0]) writer.u16(guild);
  for (const coin of [1000, 2000, 0, 0]) writer.i32(coin);
  for (const exp of [123456n, 654321n, 0n, 0n]) writer.u64(exp);

  writer.padding(CLASSIC_STRUCTURE_SIZES.item * 128);
  writer.i32(9999);
  writer.fixedString("CONTA", 16);
  writer.i32(111);
  writer.i32(222);
  return writer.finish();
}

function characterConfirmation(): Uint8Array {
  const size = 12 + 4 + CLASSIC_STRUCTURE_SIZES.mob + 208 + 6 + 16;
  const writer = new PacketWriter(size);
  writer.header({
    size,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.cnfCharacterLogin,
    id: 0,
    tick: 2_345,
  });
  writer.i16(2100).i16(2101);
  writer.fixedString("Huntress", 16);
  writer.i8(0); // Clan
  writer.u8(0); // Merchant
  writer.u16(0); // Guild
  writer.u8(3); // Huntress
  writer.padding(CLASSIC_STRUCTURE_SIZES.mob - 21);
  writer.padding(208);
  writer.u16(0); // Slot
  writer.u16(777); // ClientID
  writer.u16(4); // Weather
  writer.bytes(Uint8Array.from({ length: 16 }, (_, index) => index));
  return writer.finish();
}

describe("ClassicSession", () => {
  it("percorre login → seleção → field usando packets clássicos", () => {
    const transport = new FakeTransport();
    const session = new ClassicSession(transport);
    const states: string[] = [];
    session.on("state", (snapshot) => states.push(snapshot.state));

    session.login("conta", "senha", "00:11:22:33:44:55");
    expect(session.snapshot.state).toBe("connecting");
    expect(transport.sent).toHaveLength(0);

    transport.open();
    expect(session.snapshot.state).toBe("authenticating");
    expect(transport.sent).toHaveLength(1);
    expect(new DataView(transport.sent[0]!.buffer).getUint16(4, true)).toBe(ClassicOpcode.accountLogin);

    transport.receive(accountConfirmation());
    expect(session.snapshot.state).toBe("character-select");
    expect(session.snapshot.accountName).toBe("CONTA");
    expect(session.snapshot.cargoCoin).toBe(9999);
    expect(session.snapshot.characters[0]).toMatchObject({
      slot: 0,
      name: "Huntress",
      level: 120,
      homeTownX: 2100,
      homeTownY: 2101,
      guild: 12,
      coin: 1000,
      experience: 123456n,
    });

    session.selectCharacter(0);
    expect(session.snapshot.state).toBe("entering-world");
    expect(transport.sent).toHaveLength(2);
    expect(new DataView(transport.sent[1]!.buffer).getUint16(4, true)).toBe(ClassicOpcode.characterLogin);

    transport.receive(characterConfirmation());
    expect(session.snapshot.state).toBe("field");
    expect(session.snapshot.field).toMatchObject({
      characterName: "Huntress",
      characterClass: 3,
      clientId: 777,
      slot: 0,
      posX: 2100,
      posY: 2101,
      weather: 4,
    });
    expect(states).toEqual([
      "connecting",
      "authenticating",
      "character-select",
      "entering-world",
      "field",
    ]);
  });

  it("emite mensagem de painel e recusa seleção fora de estado", () => {
    const transport = new FakeTransport();
    const session = new ClassicSession(transport);
    const onMessage = vi.fn();
    session.on("message", onMessage);

    expect(() => session.selectCharacter(0)).toThrow(/inválida/i);

    const writer = new PacketWriter(CLASSIC_PACKET_SIZES.messagePanel);
    const message = writer.header({
      size: CLASSIC_PACKET_SIZES.messagePanel,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.messagePanel,
      id: 0,
      tick: 0,
    }).fixedString("Servidor indisponível", 128).finish();

    transport.receive(message);
    expect(onMessage).toHaveBeenCalledWith("Servidor indisponível");
  });
});
