import { describe, expect, it, vi } from "vitest";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import { parseActionPacket } from "../../src/network/classic/Messages";
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


function hpMpUpdate(): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.setHpMp)
    .header({
      size: CLASSIC_PACKET_SIZES.setHpMp,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.setHpMp,
      id: 777,
      tick: 3_000,
    })
    .i32(900).i32(400).i32(880).i32(390)
    .finish();
}

function hpDamageUpdate(): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.setHpDam)
    .header({
      size: CLASSIC_PACKET_SIZES.setHpDam,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.setHpDam,
      id: 777,
      tick: 3_100,
    })
    .i32(650).i32(250)
    .finish();
}

function hpModeUpdate(): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.setHpMode)
    .header({
      size: CLASSIC_PACKET_SIZES.setHpMode,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.setHpMode,
      id: 777,
      tick: 3_200,
    })
    .i32(0).i16(22).padding(2)
    .finish();
}

function scoreUpdate(): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.updateScore);
  writer.header({
    size: CLASSIC_PACKET_SIZES.updateScore,
    keyword: 0,
    checksum: 0,
    type: ClassicOpcode.updateScore,
    id: 777,
    tick: 3_300,
  });
  writer.i16(121).padding(2);
  writer.i32(500).i32(700);
  writer.i8(0).i8(6).padding(2);
  writer.i32(1500).i32(900).i32(1200).i32(700);
  writer.i16(20).i16(30).i16(40).i16(50);
  writer.u16(1).u16(2).u16(3).u16(4);
  writer.u8(15).u8(10);
  for (let index = 0; index < 32; index++) writer.u16(index);
  writer.u16(77).u16(2);
  writer.i8(1).i8(2).i8(3).i8(4);
  writer.u8(5).u8(6);
  writer.i32(1190).i32(690);
  writer.i32(0x10203040);
  writer.u8(7).u8(8).u8(9).u8(10);
  return writer.finish();
}

function etcUpdate(): Uint8Array {
  return new PacketWriter(CLASSIC_PACKET_SIZES.updateEtc)
    .header({
      size: CLASSIC_PACKET_SIZES.updateEtc,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.updateEtc,
      id: 777,
      tick: 3_400,
    })
    .u32(123)
    .u64(999999n)
    .u32(0xaabbccdd)
    .u32(0x11223344)
    .u16(10).u16(11).u16(12).u16(13)
    .i32(14000).i32(15000).i32(16000)
    .finish();
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
  it("atualiza o runtime local apenas com estado autoritativo do TMSrv", () => {
    const transport = new FakeTransport();
    const session = new ClassicSession(transport);
    const runtimeEvents: unknown[] = [];
    session.on("runtime", (runtime) => runtimeEvents.push(runtime));

    session.login("conta", "senha", "00:11:22:33:44:55");
    transport.open();
    transport.receive(accountConfirmation());
    session.selectCharacter(0);
    transport.receive(characterConfirmation());
    expect(session.snapshot.state).toBe("field");

    transport.receive(hpMpUpdate());
    expect(session.snapshot.field?.runtime).toMatchObject({
      currentHp: 900,
      currentMp: 400,
      requestedHp: 880,
      requestedMp: 390,
    });

    transport.receive(hpDamageUpdate());
    expect(session.snapshot.field?.runtime).toMatchObject({
      currentHp: 650,
      requestedHp: 650,
      lastDamage: 250,
    });

    transport.receive(scoreUpdate());
    expect(session.snapshot.field?.runtime).toMatchObject({
      score: {
        level: 121,
        armorClass: 500,
        damage: 700,
        hp: 1190,
        mp: 690,
      },
      currentHp: 1190,
      currentMp: 690,
      critical: 15,
      saveMana: 10,
      guild: 77,
      guildLevel: 2,
      regenHp: 5,
      regenMp: 6,
      magic: 0x10203040,
      special: [7, 8, 9, 10],
    });

    transport.receive(etcUpdate());
    expect(session.snapshot.field?.runtime).toMatchObject({
      hold: 123,
      experience: 999999n,
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

    transport.receive(hpModeUpdate());
    expect(session.snapshot.field?.runtime).toMatchObject({
      currentHp: 0,
      requestedHp: 0,
      mode: 22,
    });
    expect(runtimeEvents).toHaveLength(5);
  });

  it("envia MSG_Action com ClientID autoritativo após entrar no Field", () => {
    const transport = new FakeTransport();
    const session = new ClassicSession(transport);

    expect(() => session.sendMoveIntent({
      posX: 2100,
      posY: 2101,
      targetX: 2102,
      targetY: 2101,
      route: Uint8Array.from([0x36, 0x36]),
      speed: 6,
    })).toThrow(/estado/i);

    session.login("conta", "senha", "00:11:22:33:44:55");
    transport.open();
    transport.receive(accountConfirmation());
    session.selectCharacter(0);
    transport.receive(characterConfirmation());

    session.sendMoveIntent({
      posX: 2100,
      posY: 2101,
      targetX: 2102,
      targetY: 2101,
      route: Uint8Array.from([0x36, 0x36]),
      speed: 6,
    });

    expect(transport.sent).toHaveLength(3);
    const action = parseActionPacket(transport.sent[2]!);
    expect(action.header).toMatchObject({
      type: ClassicOpcode.action,
      id: 777,
    });
    expect(action).toMatchObject({
      posX: 2100,
      posY: 2101,
      effect: 0,
      speed: 6,
      targetX: 2102,
      targetY: 2101,
    });
    expect([...action.route.slice(0, 3)]).toEqual([0x36, 0x36, 0]);
  });

  it("envia ataque físico básico para o TMSrv sem calcular dano no navegador", () => {
    const transport = new FakeTransport();
    const session = new ClassicSession(transport);

    expect(() => session.sendBasicAttackIntent({
      targetId: 1500,
      posX: 2100,
      posY: 2101,
      targetX: 2102,
      targetY: 2101,
    })).toThrow(/estado/i);

    session.login("conta", "senha", "00:11:22:33:44:55");
    transport.open();
    transport.receive(accountConfirmation());
    session.selectCharacter(0);
    transport.receive(characterConfirmation());

    session.sendBasicAttackIntent({
      targetId: 1500,
      posX: 2100,
      posY: 2101,
      targetX: 2102,
      targetY: 2101,
    });

    expect(transport.sent).toHaveLength(3);
    const packet = transport.sent[2]!;
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    expect(packet).toHaveLength(CLASSIC_PACKET_SIZES.attackOne);
    expect(view.getUint16(4, true)).toBe(ClassicOpcode.attackOne);
    expect(view.getUint16(6, true)).toBe(777);
    expect(view.getUint16(42, true)).toBe(777);
    expect(view.getInt16(56, true)).toBe(0);
    expect(view.getInt32(60, true)).toBe(1500);
    expect(view.getInt32(64, true)).toBe(-2);
  });

});
