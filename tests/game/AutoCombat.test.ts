import { describe, expect, it } from "vitest";
import {
  isAutoCombatMode,
  nextAutoCombatMode,
  nextAutoCombatPositionMode,
} from "../../src/game/combat/AutoCombat";

describe("AutoCombat", () => {
  it("percorre os quatro modos ciclicamente", () => {
    expect(nextAutoCombatMode("off")).toBe("physical");
    expect(nextAutoCombatMode("physical")).toBe("magic");
    expect(nextAutoCombatMode("magic")).toBe("support");
    expect(nextAutoCombatMode("support")).toBe("off");
  });

  it("valida somente modos conhecidos", () => {
    expect(isAutoCombatMode("support")).toBe(true);
    expect(isAutoCombatMode("invalid")).toBe(false);
    expect(isAutoCombatMode(undefined)).toBe(false);
  });

  it("percorre modos de posicao ciclicamente", () => {
    expect(nextAutoCombatPositionMode("continuous")).toBe("fixed");
    expect(nextAutoCombatPositionMode("fixed")).toBe("stationary");
    expect(nextAutoCombatPositionMode("stationary")).toBe("continuous");
  });
});
