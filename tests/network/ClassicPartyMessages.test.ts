import { describe, expect, it } from "vitest";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  createPartyConfirmPacket,
  createSetPkModePacket,
  parsePartyAddPacket,
  parsePartyRemovePacket,
  parsePartyRequestPacket,
} from "../../src/network/classic/PartyMessages";
import { CLASSIC_PACKET_SIZES, ClassicOpcode } from "../../src/network/classic/Protocol";

function partyMember(writer: PacketWriter, id = 321, partyIndex = 0): PacketWriter {
  return writer
    .i8(3)
    .i8(partyIndex)
    .i16(120)
    .i16(1500)
    .i16(1250)
    .u16(id)
    .fixedString(id === 321 ? "Leader" : "Member", 16);
}

describe("ClassicPartyMessages", () => {
  it("decodifica MSG_REQParty com alinhamento Win32", () => {
    const writer = new PacketWriter(CLASSIC_PACKET_SIZES.partyRequest);
    writer.header({
      size: CLASSIC_PACKET_SIZES.partyRequest,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.partyRequest,
      id: 777,
      tick: 1,
    });
    partyMember(writer);
    writer.padding(2).i32(777);

    const message = parsePartyRequestPacket(writer.finish());
    expect(message.header.type).toBe(ClassicOpcode.partyRequest);
    expect(message.targetId).toBe(777);
    expect(message.leader).toEqual({
      playerClass: 3,
      partyIndex: 0,
      level: 120,
      maxHp: 1500,
      hp: 1250,
      id: 321,
      name: "Leader",
    });
  });

  it("decodifica add/remove de party nos tamanhos exatos da BASE759", () => {
    const add = new PacketWriter(CLASSIC_PACKET_SIZES.partyAdd);
    add.header({
      size: CLASSIC_PACKET_SIZES.partyAdd,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.partyAdd,
      id: 777,
      tick: 2,
    });
    partyMember(add, 654, 1);
    add.padding(2);

    expect(parsePartyAddPacket(add.finish()).member).toMatchObject({
      id: 654,
      partyIndex: 1,
      name: "Member",
    });

    const remove = new PacketWriter(CLASSIC_PACKET_SIZES.partyRemove)
      .header({
        size: CLASSIC_PACKET_SIZES.partyRemove,
        keyword: 0,
        checksum: 0,
        type: ClassicOpcode.partyRemove,
        id: 777,
        tick: 3,
      })
      .i32(654)
      .finish();

    expect(parsePartyRemovePacket(remove).memberId).toBe(654);
  });

  it("codifica confirmação de party exatamente como MSG_CNFParty2", () => {
    const packet = createPartyConfirmPacket(321, "Leader", { id: 777 });
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

    expect(packet).toHaveLength(CLASSIC_PACKET_SIZES.partyConfirm2);
    expect(view.getUint16(0, true)).toBe(CLASSIC_PACKET_SIZES.partyConfirm2);
    expect(view.getUint16(4, true)).toBe(ClassicOpcode.partyConfirm2);
    expect(view.getUint16(6, true)).toBe(777);
    expect(view.getInt16(12, true)).toBe(321);
    expect(new TextDecoder().decode(packet.slice(14, 20))).toBe("Leader");
    expect(view.getUint16(30, true)).toBe(0);
  });

  it("codifica MSG_SetPKMode como MSG_STANDARDPARM de 16 bytes", () => {
    const enabled = createSetPkModePacket(true, { id: 777 });
    const disabled = createSetPkModePacket(false, { id: 777 });

    for (const packet of [enabled, disabled]) {
      const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
      expect(packet).toHaveLength(CLASSIC_PACKET_SIZES.setPkMode);
      expect(view.getUint16(4, true)).toBe(ClassicOpcode.setPkMode);
      expect(view.getUint16(6, true)).toBe(777);
    }
    expect(new DataView(enabled.buffer).getInt32(12, true)).toBe(1);
    expect(new DataView(disabled.buffer).getInt32(12, true)).toBe(0);
  });
});
