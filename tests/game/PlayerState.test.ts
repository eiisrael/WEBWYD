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


describe("PlayerState modo autoritativo", () => {
  it("inicia sem itens mock e aplica snapshot do servidor", () => {
    const state = new PlayerState("Conectando", { authoritative: true });
    expect(state.snapshot.inventory.every((slot) => slot === null)).toBe(true);
    expect(Object.values(state.snapshot.equipment).every((slot) => slot === null)).toBe(true);

    state.applyAuthoritative({
      name: "HuntressOnline",
      level: 120,
      totalExperience: 123456789n,
      hp: 777,
      maxHp: 1100,
      mp: 333,
      maxMp: 550,
      attack: 654,
      defense: 321,
      strength: 11,
      intelligence: 12,
      dexterity: 13,
      constitution: 14,
      freeAttributePoints: 17,
      coins: 9999,
    });

    expect(state.snapshot).toMatchObject({
      name: "HuntressOnline",
      level: 120,
      totalExperience: 123456789,
      hp: 777,
      maxHp: 1100,
      mp: 333,
      maxMp: 550,
      attack: 654,
      defense: 321,
      primaryAttributes: { str: 11, int: 12, dex: 13, con: 14 },
      freeAttributePoints: 17,
      coins: 9999,
      alive: true,
    });
  });

  it("bloqueia mutações locais de progressão e inventário", () => {
    const state = new PlayerState("Online", { authoritative: true });
    state.applyAuthoritative({
      name: "Online",
      level: 10,
      totalExperience: 9260,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 25,
      defense: 15,
      strength: 10,
      intelligence: 10,
      dexterity: 10,
      constitution: 10,
      freeAttributePoints: 5,
      coins: 200,
    });

    expect(state.takeDamage(50)).toBe(0);
    expect(state.heal(50)).toBe(0);
    expect(state.restoreMana(50)).toBe(0);
    expect(state.spendMana(10)).toBe(false);
    expect(state.allocatePrimaryAttribute("str")).toBe(false);
    expect(state.grantRewards(5000, 5000)).toMatchObject({
      experienceAdded: 0,
      coinsAdded: 0,
      levelsGained: 0,
    });
    expect(state.snapshot).toMatchObject({
      hp: 100,
      mp: 50,
      freeAttributePoints: 5,
      coins: 200,
    });
  });

  it("recusa snapshot autoritativo em estado offline", () => {
    const state = new PlayerState("Offline");
    expect(() => state.applyAuthoritative({
      name: "X",
      level: 1,
      totalExperience: 0,
      hp: 1,
      maxHp: 1,
      mp: 1,
      maxMp: 1,
      attack: 1,
      defense: 1,
      strength: 1,
      intelligence: 1,
      dexterity: 1,
      constitution: 1,
      freeAttributePoints: 0,
      coins: 0,
    })).toThrow(/offline/i);
  });
});
