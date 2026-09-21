import { describe, expect, it } from "vitest";
import {
  resolveClassicMonsterTemplateIndex,
  type MonsterTemplate,
} from "../../src/game/npcs/MonsterCatalog";

function template(
  name: string,
  face: number,
  leftHand = 0,
): MonsterTemplate {
  const equipment = Array.from({ length: 16 * 7 }, () => 0);
  equipment[0] = face;
  equipment[6 * 7] = leftHand;
  return {
    key: name.replaceAll(" ", "_"),
    name,
    equipment,
    visual: {
      skin: 20,
      itemClass: 16,
      parts: [[1, face, 1, 1, "monster.msh", "monster.dds", "N"]],
    },
  };
}

describe("resolveClassicMonsterTemplateIndex", () => {
  it("usa nome clássico como requisito e equipamentos como desempate", () => {
    const templates = [
      template("Orc Guerreiro", 100, 200),
      template("Orc Guerreiro", 100, 201),
      template("Troll", 100, 201),
    ];

    expect(resolveClassicMonsterTemplateIndex(
      templates,
      "Orc_Guerreiro",
      [100, 0, 0, 0, 0, 0, 201],
    )).toBe(1);
  });

  it("ignora bits altos de refino do packet ao comparar item index", () => {
    const templates = [template("Guarda", 230, 501)];
    expect(resolveClassicMonsterTemplateIndex(
      templates,
      "Guarda",
      [0x5230, 0, 0, 0, 0, 0, 0x1501],
    )).toBe(0);
  });

  it("não converte jogador ou nome desconhecido em NPC parecido", () => {
    const templates = [template("Orc", 100, 200)];
    expect(resolveClassicMonsterTemplateIndex(
      templates,
      "ErickPlayer",
      [100, 0, 0, 0, 0, 0, 200],
    )).toBeNull();
  });
});
