import { describe, expect, it } from "vitest";
import type { TrnBlock, TrnTile } from "../../src/formats/classic/Trn";
import {
  CLASSIC_NAVIGATION_SIDE,
  ClassicNavigation,
} from "../../src/world/navigation/ClassicNavigation";

const FIELD_COLUMN = 16;
const FIELD_ROW = 16;
const ORIGIN_X = FIELD_COLUMN * 128;
const ORIGIN_Y = FIELD_ROW * 128;

function block(): TrnBlock {
  const tile: TrnTile = {
    height: 0,
    texture: 0,
    textureOrientation: 0,
    backgroundTexture: 0,
    backgroundOrientation: 0,
    colorArgb: 0xffffffff,
  };
  return {
    name: "Test",
    column: FIELD_COLUMN,
    row: FIELD_ROW,
    tiles: Array.from({ length: 64 * 64 }, () => tile),
  };
}

function navigation(values: Int8Array): ClassicNavigation {
  const terrain = block();
  return new ClassicNavigation({
    terrainAt: (column, row) =>
      column === FIELD_COLUMN && row === FIELD_ROW ? terrain : undefined,
    collisionMaskAt: (column, row) =>
      column === FIELD_COLUMN && row === FIELD_ROW
        ? { values, complete: true }
        : undefined,
  });
}

function index(localX: number, localY: number): number {
  return localY * CLASSIC_NAVIGATION_SIDE + localX;
}

describe("ClassicNavigation", () => {
  it("distingue celula caminhavel, bloqueada e Field nao carregado", () => {
    const values = new Int8Array(CLASSIC_NAVIGATION_SIDE ** 2);
    values[index(2, 2)] = 126;
    const nav = navigation(values);

    expect(nav.sample({ x: ORIGIN_X + 1, y: ORIGIN_Y + 1 }).walkability).toBe("walkable");
    expect(nav.sample({ x: ORIGIN_X + 2, y: ORIGIN_Y + 2 }).walkability).toBe("blocked");
    expect(nav.sample({ x: 0, y: 0 }).walkability).toBe("unloaded");
  });

  it("respeita limite estrito de desnivel e encontra desvio ao redor de obstaculo", () => {
    const values = new Int8Array(CLASSIC_NAVIGATION_SIDE ** 2);
    values[index(3, 1)] = 8;
    values[index(2, 2)] = 126;
    const nav = navigation(values);

    expect(nav.canStep(
      { x: ORIGIN_X + 2, y: ORIGIN_Y + 1 },
      { x: ORIGIN_X + 3, y: ORIGIN_Y + 1 },
    )).toBe(false);

    const path = nav.findPath(
      { x: ORIGIN_X + 1, y: ORIGIN_Y + 2 },
      { x: ORIGIN_X + 3, y: ORIGIN_Y + 2 },
      { allowDiagonal: false, maxVisited: 100 },
    );
    expect(path.status).toBe("found");
    expect(path.authoritative).toBe(true);
    expect(path.points.some((point) => point.x === ORIGIN_X + 2 && point.y === ORIGIN_Y + 2)).toBe(false);
  });
});
