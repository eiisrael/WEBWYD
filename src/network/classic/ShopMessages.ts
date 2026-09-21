import { PacketReader, PacketWriter, type ClassicPacketHeader } from "./PacketIO";
import { createClassicHeader, type PacketHeaderInput } from "./Messages";
import { CLASSIC_PACKET_SIZES, ClassicOpcode } from "./Protocol";
import { parseClassicItem, type ClassicItem } from "./Structures";

export interface ClassicShopListMessage {
  readonly header: ClassicPacketHeader;
  readonly shopType: number;
  readonly items: readonly ClassicItem[];
  readonly tax: number;
}

export interface ClassicBuyMessage {
  readonly header: ClassicPacketHeader;
  readonly targetId: number;
  readonly targetCarryPos: number;
  readonly myCarryPos: number;
  readonly coin: number;
}

export function parseShopListPacket(
  source: ArrayBuffer | ArrayBufferView,
): ClassicShopListMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.shopList, CLASSIC_PACKET_SIZES.shopList, "MSG_ShopList");
  const shopType = reader.i32();
  const items = Array.from({ length: 64 }, () => parseClassicItem(reader));
  const tax = reader.i32();
  assertEmpty(reader, "MSG_ShopList");
  return { header, shopType, items, tax };
}

export function parseBuyPacket(source: ArrayBuffer | ArrayBufferView): ClassicBuyMessage {
  const reader = new PacketReader(source);
  const header = reader.header();
  assertPacket(header, ClassicOpcode.buy, CLASSIC_PACKET_SIZES.buy, "MSG_Buy");
  const targetId = reader.u16();
  const targetCarryPos = reader.i16();
  const myCarryPos = reader.i16();
  reader.skip(2); // alinhamento Win32 antes de Coin
  const coin = reader.i32();
  assertEmpty(reader, "MSG_Buy");
  return { header, targetId, targetCarryPos, myCarryPos, coin };
}

export function createRequestShopListPacket(
  targetId: number,
  face = 0,
  effect = 0,
  input: PacketHeaderInput = {},
): Uint8Array {
  const writer = new PacketWriter(CLASSIC_PACKET_SIZES.requestShopList);
  writer.header(createClassicHeader(
    ClassicOpcode.requestShopList,
    CLASSIC_PACKET_SIZES.requestShopList,
    input,
  ));
  writer.u16(targetId);
  writer.u16(face);
  writer.u16(effect);
  writer.padding(2); // tail padding Win32
  return writer.finish();
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
