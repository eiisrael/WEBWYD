import { describe, expect, it } from "vitest";
import {
  CLASSIC_FIELD_ROUTE_MAX_STEPS,
  encodeClassicFieldRoute,
} from "../../src/network/classic/ClassicRoute";

describe("encodeClassicFieldRoute", () => {
  it("codifica as oito direções usadas por TMHuman::GenerateRouteTable", () => {
    const route = encodeClassicFieldRoute([
      { x: 10, y: 10 },
      { x: 9, y: 9 },
      { x: 9, y: 8 },
      { x: 10, y: 7 },
      { x: 9, y: 7 },
      { x: 10, y: 7 },
      { x: 9, y: 8 },
      { x: 9, y: 9 },
      { x: 10, y: 10 },
    ], 23);

    expect(route).not.toBeNull();
    expect([...route!.route.slice(0, 8)]).toEqual([
      "1".charCodeAt(0),
      "2".charCodeAt(0),
      "3".charCodeAt(0),
      "4".charCodeAt(0),
      "6".charCodeAt(0),
      "7".charCodeAt(0),
      "8".charCodeAt(0),
      "9".charCodeAt(0),
    ]);
  });

  it("limita a rota de Field a 12 passos e usa o último passo como Target", () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ x: 100 + index, y: 200 }));
    const route = encodeClassicFieldRoute(points);

    expect(route?.steps).toBe(CLASSIC_FIELD_ROUTE_MAX_STEPS);
    expect(route?.start).toEqual({ x: 100, y: 200 });
    expect(route?.target).toEqual({ x: 112, y: 200 });
    expect(route?.route[12]).toBe(0);
  });

  it("rejeita salto que não pode existir no route buffer clássico", () => {
    expect(() => encodeClassicFieldRoute([
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ])).toThrow(/salto inválido/i);
  });
});
