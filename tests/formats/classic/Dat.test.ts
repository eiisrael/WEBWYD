import { describe, expect, it } from "vitest";
import { parseDat } from "../../../src/formats/classic/Dat";

describe("parseDat", () => {
  it("decodifica registro padrao e registro estendido", () => {
    const buffer = new ArrayBuffer(28 + 36);
    const view = new DataView(buffer);

    view.setUint32(0, 100, true);
    view.setFloat32(4, 1.5, true);
    view.setFloat32(8, 2.5, true);
    view.setFloat32(12, 3.5, true);
    view.setFloat32(16, 4.5, true);
    view.setInt32(20, 2, true);
    view.setInt32(24, 7, true);

    const offset = 28;
    view.setUint32(offset, 501, true);
    view.setFloat32(offset + 4, 10, true);
    view.setFloat32(offset + 8, 11, true);
    view.setFloat32(offset + 12, 12, true);
    view.setFloat32(offset + 16, 13, true);
    view.setInt32(offset + 20, 4, true);
    view.setInt32(offset + 24, 9, true);
    view.setFloat32(offset + 28, 1.25, true);
    view.setFloat32(offset + 32, 0.75, true);

    const records = parseDat(buffer);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ type: 100, scaleH: 1, scaleV: 1 });
    expect(records[1]).toMatchObject({ type: 501, scaleH: 1.25, scaleV: 0.75 });
  });

  it("recusa bytes excedentes e registro estendido truncado", () => {
    expect(() => parseDat(new ArrayBuffer(1))).toThrow(/excedentes/i);

    const buffer = new ArrayBuffer(28);
    new DataView(buffer).setUint32(0, 501, true);
    expect(() => parseDat(buffer)).toThrow(/truncado/i);
  });
});
