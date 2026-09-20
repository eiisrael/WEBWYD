import { describe, expect, it } from "vitest";
import { aniMatrixOffset, parseAni } from "../../../src/formats/classic/Ani";
import { parseBon } from "../../../src/formats/classic/Bon";

describe("formatos ANI/BON", () => {
  it("decodifica matriz ANI e calcula offsets por tick/slot", () => {
    const buffer = new ArrayBuffer(8 + 2 * 2 * 64);
    const view = new DataView(buffer);
    view.setUint32(0, 2, true);
    view.setUint32(4, 2, true);
    for (let i = 0; i < 64; i++) view.setFloat32(8 + i * 4, i + 0.5, true);

    const animation = parseAni(buffer);
    expect(animation.tickCount).toBe(2);
    expect(animation.boneSlotCount).toBe(2);
    expect(animation.matrices).toHaveLength(64);
    expect(animation.matrices[0]).toBeCloseTo(0.5);
    expect(aniMatrixOffset(animation, 1, 1)).toBe(48);
    expect(() => aniMatrixOffset(animation, 2, 0)).toThrow(RangeError);
  });

  it("recusa ANI com tamanho divergente", () => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 1, true);
    view.setUint32(4, 1, true);
    expect(() => parseAni(buffer)).toThrow(/tamanho invalido/i);
  });

  it("preserva ids, raizes e duplicatas BON", () => {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    view.setInt32(0, -1, true); view.setUint32(4, 3, true);
    view.setInt32(8, 3, true); view.setUint32(12, 7, true);
    view.setInt32(16, 3, true); view.setUint32(20, 7, true);

    const skeleton = parseBon(buffer);
    expect(skeleton.slotCount).toBe(8);
    expect(skeleton.rootIds).toEqual([3]);
    expect(skeleton.duplicateIds).toEqual([7]);
  });
});
