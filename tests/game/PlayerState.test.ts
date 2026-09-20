import { describe, expect, it } from "vitest";
import { PlayerState } from "../../src/game/state/PlayerState";

describe("PlayerState", () => {
  it("sobe de nivel de forma atomica e libera atributos offline", () => {
    const state = new PlayerState("Teste");
    const before = state.snapshot;
    const reward = state.grantRewards(500, 123);

    expect(reward.levelsGained).toBe(1);
    expect(reward.attackGained).toBe(3);
    expect(reward.attributePointsGained).toBe(5);
    expect(state.snapshot.level).toBe(2);
    expect(state.snapshot.attack).toBe(before.attack + 3);
    expect(state.snapshot.coins).toBe(123);
    expect(state.snapshot.freeAttributePoints).toBe(5);

    expect(state.allocatePrimaryAttribute("dex", 3)).toBe(true);
    expect(state.snapshot.primaryAttributes.dex).toBe(before.primaryAttributes.dex + 3);
    expect(state.snapshot.freeAttributePoints).toBe(2);
  });

  it("consome pocao apenas quando o recurso precisa ser recuperado", () => {
    const state = new PlayerState();

    expect(state.useInventorySlot(0)).toBe(false);
    const damage = state.takeDamage(100);
    expect(damage).toBeGreaterThan(0);
    const beforeHp = state.snapshot.hp;
    expect(state.useInventorySlot(0)).toBe(true);
    expect(state.snapshot.hp).toBeGreaterThan(beforeHp);
    expect(state.snapshot.inventory[0]?.quantity).toBe(4);

    expect(state.useInventorySlot(1)).toBe(false);
    expect(state.spendMana(40)).toBe(true);
    const beforeMp = state.snapshot.mp;
    expect(state.useInventorySlot(1)).toBe(true);
    expect(state.snapshot.mp).toBeGreaterThan(beforeMp);
  });
});
