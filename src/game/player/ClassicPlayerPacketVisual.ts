import { CLASSIC_PLAYER_CLASSES, type ClassicPlayerClassDefinition, type ClassicPlayerLookDefinition, type ClassicPlayerWeaponDefinition } from "./PlayerClasses";
import type { ClassicItemCatalog } from "./ClassicItemCatalog";

export interface ClassicPacketPlayerVisual {
  readonly playerClass: ClassicPlayerClassDefinition;
  readonly look: ClassicPlayerLookDefinition;
  readonly weapon: ClassicPlayerWeaponDefinition | null;
  readonly unsupportedWeaponIndex: number | null;
}

/**
 * Conservative TMHuman::SetPacketEquipItem resolver.
 *
 * The face item's EF_CLASS is authoritative for the four playable classes.
 * Body/costume must match a look already audited into PlayerClasses. Unknown
 * equipment is deliberately not approximated by a nearby visual.
 */
export function resolveClassicPacketPlayerVisual(
  catalog: ClassicItemCatalog,
  equipment: readonly number[],
): ClassicPacketPlayerVisual | null {
  const faceIndex = itemIndex(equipment[0]);
  const itemClass = catalog.itemClass(faceIndex);
  const playerClass = CLASSIC_PLAYER_CLASSES.find(
    (candidate) => candidate.itemClass === itemClass,
  );
  if (!playerClass) return null;

  const costumeIndex = itemIndex(equipment[12]);
  const bodyIndex = itemIndex(equipment[2]);
  const look = resolveLook(playerClass, costumeIndex, bodyIndex, equipment);
  if (!look) return null;

  const leftIndex = itemIndex(equipment[6]);
  const rightIndex = itemIndex(equipment[7]);
  const equippedWeaponIndex = leftIndex || rightIndex;
  const knownWeapons = uniqueWeapons(playerClass);
  const weapon = equippedWeaponIndex === 0
    ? null
    : knownWeapons.find((candidate) => candidate.itemIndex === equippedWeaponIndex) ?? null;

  return {
    playerClass,
    look,
    weapon,
    unsupportedWeaponIndex: equippedWeaponIndex !== 0 && !weapon
      ? equippedWeaponIndex
      : null,
  };
}

function resolveLook(
  playerClass: ClassicPlayerClassDefinition,
  costumeIndex: number,
  bodyIndex: number,
  equipment: readonly number[],
): ClassicPlayerLookDefinition | null {
  if (costumeIndex !== 0) {
    const costume = playerClass.looks.find((look) => look.itemIndex === costumeIndex);
    if (costume) return costume;
  }

  if (bodyIndex !== 0) {
    const body = playerClass.looks.find((look) => look.itemIndex === bodyIndex);
    if (body) return body;
  }

  const hasArmor = [1, 2, 3, 4, 5].some((slot) => itemIndex(equipment[slot]) !== 0);
  if (!hasArmor) {
    return playerClass.looks.find((look) => look.itemIndex === null)
      ?? {
        key: `${playerClass.key}-packet-base`,
        name: `Traje básico ${playerClass.name}`,
        itemIndex: null,
        source: "MSG_CreateMob + PlayerClasses.baseParts",
        parts: playerClass.baseParts,
      };
  }

  return null;
}

function uniqueWeapons(
  playerClass: ClassicPlayerClassDefinition,
): readonly ClassicPlayerWeaponDefinition[] {
  const byIndex = new Map<number, ClassicPlayerWeaponDefinition>();
  byIndex.set(playerClass.selection.weapon.itemIndex, playerClass.selection.weapon);
  byIndex.set(playerClass.defaultWeapon.itemIndex, playerClass.defaultWeapon);
  return [...byIndex.values()];
}

function itemIndex(value: number | undefined): number {
  return (value ?? 0) & 0x0fff;
}
