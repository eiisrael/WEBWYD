import { PacketReader, PacketWriter, type ClassicPacketHeader } from "./PacketIO";
import {
  CLASSIC_PACKET_SIZES,
  ClassicOpcode,
} from "./Protocol";
import { createClassicHeader, type PacketHeaderInput } from "./Messages";

export interface ClassicPartyMemberMessage {
  readonly header: ClassicPacketHeader;
  /**
   * Wire field named Leaderconn by this TMSrv fork.
   * SendAddParty writes the real member id for the leader row and 30000 for
   * ordinary member rows.
   */
  readonly leaderMarker: number;
  readonly isLeader: boolean;
  readonly level: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly memberId: number;
  readonly name: string;
  readonly target: number;
}

export interface ClassicPartyRemoveMessage {
  readonly header: ClassicPacketHeader;
  readonly memberId: number;
  readonly unknown: number;
}

export interface ClassicPartyRequestMessage {
  readonly header: ClassicPacketHeader;
  readonly playerClass: number;
  readonly partyPosition: number;
  readonly level: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly partyId: number;
  readonly name: string;
  readonly unknown: number;
  readonly target: number;
}

export function parsePartyAddPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyMemberMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPartyPacket(header, ClassicOpcode.partyAdd, CLASSIC_PACKET_SIZES.partyAdd, "MSG_CNFAddParty");

  const leaderMarker = reader.i16();
  const level = reader.i16();
  const maxHp = reader.i16();
  const hp = reader.i16();
  const memberId = reader.u16();
  const name = reader.fixedString(16);
  const target = reader.i16();
  assertEmpty(reader, "MSG_CNFAddParty");

  return {
    header,
    leaderMarker,
    isLeader: leaderMarker !== 30_000,
    level,
    maxHp,
    hp,
    memberId,
    name,
    target,
  };
}

export function parsePartyRemovePacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyRemoveMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPartyPacket(
    header,
    ClassicOpcode.partyRemove,
    CLASSIC_PACKET_SIZES.partyRemove,
    "MSG_RemoveParty",
  );
  const memberId = reader.i16();
  const unknown = reader.i16();
  assertEmpty(reader, "MSG_RemoveParty");
  return { header, memberId, unknown };
}

export function parsePartyRequestPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicPartyRequestMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPartyPacket(
    header,
    ClassicOpcode.partyRequest,
    CLASSIC_PACKET_SIZES.partyRequest,
    "MSG_SendReqParty",
  );
  const playerClass = reader.i8();
  const partyPosition = reader.i8();
  const level = reader.i16();
  const maxHp = reader.i16();
  const hp = reader.i16();
  const partyId = reader.u16();
  const name = reader.fixedString(16);
  const unknown = reader.i32();
  const target = reader.i16();
  assertEmpty(reader, "MSG_SendReqParty");

  return {
    header,
    playerClass,
    partyPosition,
    level,
    maxHp,
    hp,
    partyId,
    name,
    unknown,
    target,
  };
}

export function createPartyAcceptPacket(
  leaderId: number,
  leaderName: string,
  input: PacketHeaderInput = {},
): Uint8Array {
  const id = Math.trunc(leaderId);
  if (id <= 0 || id >= 1000) throw new RangeError(`LeaderID de party inválido: ${id}`);
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.partyAccept);
  writer.header(createClassicHeader(
    ClassicOpcode.partyAccept,
    CLASSIC_PACKET_SIZES.partyAccept,
    input,
  ));
  writer.i16(id);
  writer.fixedString(leaderName, 16);
  return writer.finish();
}

function assertPartyPacket(
  header: ClassicPacketHeader,
  type: number,
  size: number,
  name: string,
): void {
  if (header.type !== type) {
    throw new Error(`${name} com opcode inesperado: 0x${header.type.toString(16)}`);
  }
  if (header.size !== size) {
    throw new Error(`${name} com tamanho inesperado: ${header.size}`);
  }
}

function assertEmpty(reader: PacketReader, name: string): void {
  if (reader.remaining !== 0) {
    throw new Error(`${name} contém ${reader.remaining} bytes inesperados`);
  }
}
