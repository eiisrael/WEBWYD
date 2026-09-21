import type { WydPosition } from "../../world/coordinates";

export const CLASSIC_FIELD_ROUTE_MAX_STEPS = 12;

export interface ClassicEncodedRoute {
  readonly start: WydPosition;
  readonly target: WydPosition;
  readonly route: Uint8Array;
  readonly steps: number;
}

/**
 * Converts integer WYD cells to the same numeric route bytes consumed by
 * TMHuman::GenerateRouteTable:
 *
 * 1 SW · 2 S · 3 SE · 4 W · 6 E · 7 NW · 8 N · 9 NE
 *
 * The Field client calls BASE_GetRoute with nMaxRoute=12, so this encoder
 * deliberately truncates to 12 steps and leaves the packet buffer NUL-padded.
 */
export function encodeClassicFieldRoute(
  points: readonly WydPosition[],
  maxSteps = CLASSIC_FIELD_ROUTE_MAX_STEPS,
): ClassicEncodedRoute | null {
  if (points.length < 2) return null;
  const limit = Math.max(1, Math.min(23, Math.trunc(maxSteps)));
  const route = new Uint8Array(24);
  let previous = integerCell(points[0]!);
  const start = { ...previous };
  let steps = 0;

  for (let index = 1; index < points.length && steps < limit; index++) {
    const current = integerCell(points[index]!);
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const code = routeCode(dx, dy);
    if (code === 0) {
      if (dx === 0 && dy === 0) continue;
      throw new Error(
        `Rota clássica contém salto inválido: ${previous.x},${previous.y} -> ${current.x},${current.y}`,
      );
    }
    route[steps++] = code;
    previous = current;
  }

  if (steps === 0) return null;
  return {
    start,
    target: { ...previous },
    route,
    steps,
  };
}

function routeCode(dx: number, dy: number): number {
  if (dx === -1 && dy === -1) return 0x31; // '1'
  if (dx === 0 && dy === -1) return 0x32; // '2'
  if (dx === 1 && dy === -1) return 0x33; // '3'
  if (dx === -1 && dy === 0) return 0x34; // '4'
  if (dx === 1 && dy === 0) return 0x36; // '6'
  if (dx === -1 && dy === 1) return 0x37; // '7'
  if (dx === 0 && dy === 1) return 0x38; // '8'
  if (dx === 1 && dy === 1) return 0x39; // '9'
  return 0;
}

function integerCell(position: WydPosition): WydPosition {
  return {
    x: Math.floor(position.x),
    y: Math.floor(position.y),
  };
}
