import { describe, expect, it } from "vitest";
import { ClassicItemCatalog, type ClassicItemCatalogEntry } from "../../src/game/player/ClassicItemCatalog";
import { resolveClassicPacketPlayerVisual } from "../../src/game/player/ClassicPlayerPacketVisual";

function item(
  index: number,
  itemClass: number,
  meshIndex = 0,
  position = 0,
  weaponType = 0,
): ClassicItemCatalogEntry {
  return {
    index,
    name: `item-${index}`,
    meshIndex,
    textureIndex: 0,
    position,
    grade: 0,
    itemClass,
    weaponType,
  };
}

const catalog = ClassicItemCatalog.fromEntries([
  item(6, 1, 40, 1),
  item(16, 2, 40, 1),
  item(26, 4, 40, 1),
  item(36, 8, 40, 1),
  item(1230, 1, 45, 4),
  item(1365, 2, 45, 4),
  item(1515, 4, 45, 4),
  item(1665, 8, 45, 4),
  item(2551, 10, 762, 64, 101),
  item(3625, 255, 2892, 64, 101),
  item(999, 8, 50, 4),
]);

describe("resolveClassicPacketPlayerVisual", () => {
  it("resolve classe, look e arma conhecidos a partir de Equip[]", () => {
    const equipment = Array.from({ length: 16 }, () => 0);
    equipment[0] = 36;
    equipment[2] = 1665;
    equipment[6] = 3625;

    const visual = resolveClassicPacketPlayerVisual(catalog, equipment);
    expect(visual).not.toBeNull();
    expect(visual?.playerClass.key).toBe("huntress");
    expect(visual?.look.key).toBe("urania-selection");
    expect(visual?.weapon?.itemIndex).toBe(3625);
    expect(visual?.unsupportedWeaponIndex).toBeNull();
  });

  it("aceita corpo exato e não inventa arma desconhecida", () => {
    const equipment = Array.from({ length: 16 }, () => 0);
    equipment[0] = 36;
    equipment[2] = 1665;
    equipment[6] = 999;

    const visual = resolveClassicPacketPlayerVisual(catalog, equipment);
    expect(visual?.look.key).toBe("urania-selection");
    expect(visual?.weapon).toBeNull();
    expect(visual?.unsupportedWeaponIndex).toBe(999);
  });

  it("usa o corpo base somente quando não há armadura equipada", () => {
    const equipment = Array.from({ length: 16 }, () => 0);
    equipment[0] = 6;

    const visual = resolveClassicPacketPlayerVisual(catalog, equipment);
    expect(visual?.playerClass.key).toBe("transknight");
    expect(visual?.look.itemIndex).toBeNull();
  });

  it("recusa classe ou armadura sem look auditado", () => {
    const unknownClass = Array.from({ length: 16 }, () => 0);
    unknownClass[0] = 999;
    expect(resolveClassicPacketPlayerVisual(catalog, unknownClass)).toBeNull();

    const unknownBody = Array.from({ length: 16 }, () => 0);
    unknownBody[0] = 36;
    unknownBody[2] = 999;
    expect(resolveClassicPacketPlayerVisual(catalog, unknownBody)).toBeNull();
  });
});
