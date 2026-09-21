import { describe, expect, it } from "vitest";
import { PacketWriter } from "../../src/network/classic/PacketIO";
import {
  createRequestShopListPacket,
  parseShopListPacket,
} from "../../src/network/classic/ShopMessages";
import { CLASSIC_PACKET_SIZES, ClassicOpcode } from "../../src/network/classic/Protocol";

describe("ClassicShopMessages", () => {
  it("codifica MSG_REQShopList com o padding Win32 da BASE759", () => {
    const packet = createRequestShopListPacket(1234, 51, 7, { id: 777 });
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

    expect(packet).toHaveLength(CLASSIC_PACKET_SIZES.requestShopList);
    expect(view.getUint16(0, true)).toBe(CLASSIC_PACKET_SIZES.requestShopList);
    expect(view.getUint16(4, true)).toBe(ClassicOpcode.requestShopList);
    expect(view.getUint16(6, true)).toBe(777);
    expect(view.getUint16(12, true)).toBe(1234);
    expect(view.getUint16(14, true)).toBe(51);
    expect(view.getUint16(16, true)).toBe(7);
    expect(view.getUint16(18, true)).toBe(0);
  });

  it("decodifica MSG_ShopList com 64 STRUCT_ITEM e Tax autoritativo", () => {
    const writer = new PacketWriter(CLASSIC_PACKET_SIZES.shopList);
    writer.header({
      size: CLASSIC_PACKET_SIZES.shopList,
      keyword: 0,
      checksum: 0,
      type: ClassicOpcode.shopList,
      id: 1234,
      tick: 9000,
    });
    writer.i32(1);
    for (let index = 0; index < 64; index++) {
      writer.i16(index === 0 ? 413 : 0);
      writer.u8(index === 0 ? 91 : 0).u8(index === 0 ? 25 : 0);
      writer.u8(0).u8(0);
      writer.u8(0).u8(0);
    }
    writer.i32(12);

    const shop = parseShopListPacket(writer.finish());
    expect(shop.shopType).toBe(1);
    expect(shop.tax).toBe(12);
    expect(shop.items).toHaveLength(64);
    expect(shop.items[0]).toEqual({
      index: 413,
      effects: [
        { effect: 91, value: 25 },
        { effect: 0, value: 0 },
        { effect: 0, value: 0 },
      ],
    });
    expect(shop.items.slice(1).every((item) => item.index === 0)).toBe(true);
  });
});
