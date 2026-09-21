import { PacketReader, PacketWriter, type ClassicPacketHeader } from "./PacketIO";
import { createClassicHeader, type PacketHeaderInput } from "./Messages";
import { CLASSIC_PACKET_SIZES, ClassicOpcode } from "./Protocol";

export interface ClassicPartyMember {
  readonly playerClass: number;
  readonly partyIndex: number;
  readonly level: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly id: number;
  readonly name: string;
}

export interface ClassicPartyInvite {
  readonly header: ClassicPacketHeader;
  readonly leader: ClassicPartyMember;
  readonly targetId: number;
}

export interface ClassicPartyAddMessage {
  readonly header: ClassicPacketHeader;
  readonly member: ClassicPartyMember;
}

export interface ClassicPartyRemoveMessage {
  readonly header: ClassicPacketHeader;
  readonly memberId: number;
}

export function parsePartyRequestPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyInvite {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(
    header,
    ClassicOpcode.partyRequest,
    CLASSIC_PACKET_SIZES.partyRequest,
    "MSG_REQParty",
  );
  const leader = readPartyMember(reader);
  reader.skip(2); // alinhamento Win32 de int após PARTY (26 bytes)
  const targetId = reader.i32();
  assertEmpty(reader, "MSG_REQParty");
  return { header, leader, targetId };
}

export function parsePartyAddPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyAddMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(
    header,
    ClassicOpcode.partyAdd,
    CLASSIC_PACKET_SIZES.partyAdd,
    "MSG_AddParty",
  );
  const member = readPartyMember(reader);
  reader.skip(2); // tail padding Win32: sizeof(MSG_AddParty) = 40
  assertEmpty(reader, "MSG_AddParty");
  return { header, member };
}

export function parsePartyRemovePacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyRemoveMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(
    header,
    ClassicOpcode.partyRemove,
    CLASSIC_PACKET_SIZES.partyRemove,
    "MSG_STANDARDPARM/RemoveParty",
  );
  const memberId = reader.i32();
  assertEmpty(reader, "MSG_STANDARDPARM/RemoveParty");
  return { header, memberId };
}

export function createPartyConfirmPacket(
  leaderId: number,
  leaderName: string,
  input: PacketHeaderInput = {},
): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.partyConfirm2);
  writer.header(createClassicHeader(
    ClassicOpcode.partyConfirm2,
    CLASSIC_PACKET_SIZES.partyConfirm2,
    input,
  ));
  writer.i16(Math.trunc(leaderId));
  writer.fixedString(leaderName, 16);
  writer.padding(2); // tail padding Win32
  return writer.finish();
}

export function createSetPkModePacket(
  enabled: boolean,
  input: PacketHeaderInput = {},
): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.setPkMode);
  writer.header(createClassicHeader(
    ClassicOpcode.setPkMode,
    CLASSIC_PACKET_SIZES.setPkMode,
    input,
  ));
  writer.i32(enabled ? 1 : 0);
  return writer.finish();
}

function readPartyMember(reader: PacketReader): ClassicPartyMember {
  return {
    playerClass: reader.i8(),
    partyIndex: reader.i8(),
    level: reader.i16(),
    maxHp: reader.i16(),
    hp: reader.i16(),
    id: reader.u16(),
    name: reader.fixedString(16),
  };
}

function assertPacket(
  header: ClassicPacketHeader,
  type: number,
  size: number,
  name: string,
): void {
  if (header.type !== type) {
    throw new Error(`Opcode não é ${name}: 0x${header.type.toString(16)}`);
  }
  if (header.size !== size) {
    throw new Error(`${name} com tamanho inesperado: ${header.size}; esperado ${size}`);
  }
}

function assertEmpty(reader: PacketReader, name: string): void {
  if (reader.remaining !== 0) {
    throw new Error(`${name} contém ${reader.remaining} bytes inesperados`);
  }
}
