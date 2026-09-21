import type { ClassicAssetSource } from "../../assets/ClassicAssetSource";

export interface ClassicItemCatalogEntry {
  readonly index: number;
  readonly name: string;
  readonly meshIndex: number;
  readonly textureIndex: number;
  readonly position: number;
  readonly grade: number;
  readonly itemClass: number;
  readonly weaponType: number;
}

interface CompactItemCatalogEntry {
  readonly i: number;
  readonly n: string;
  readonly m: number;
  readonly t: number;
  readonly p: number;
  readonly g: number;
  readonly c: number;
  readonly w: number;
}

interface CompactItemCatalogFile {
  readonly version: number;
  readonly source: string;
  readonly items: readonly CompactItemCatalogEntry[];
}

export class ClassicItemCatalog {
  readonly #items = new Map<number, ClassicItemCatalogEntry>();

  private constructor(source: CompactItemCatalogFile) {
    for (const item of source.items) {
      this.#items.set(item.i, {
        index: item.i,
        name: item.n,
        meshIndex: item.m,
        textureIndex: item.t,
        position: item.p,
        grade: item.g,
        itemClass: item.c,
        weaponType: item.w,
      });
    }
  }

  static async load(assets: ClassicAssetSource): Promise<ClassicItemCatalog> {
    const response = await fetch(assets.dataUrl("data/items.json"));
    if (!response.ok) {
      throw new Error(`Catálogo ItemList indisponível: HTTP ${response.status}`);
    }
    const data = await response.json() as CompactItemCatalogFile;
    if (data.version !== 1 || !Array.isArray(data.items)) {
      throw new Error("Catálogo ItemList possui formato incompatível");
    }
    return new ClassicItemCatalog(data);
  }

  item(index: number): ClassicItemCatalogEntry | null {
    return this.#items.get(index & 0x0fff) ?? null;
  }

  itemClass(index: number): number {
    return this.item(index)?.itemClass ?? 0;
  }

  weaponType(index: number): number {
    return this.item(index)?.weaponType ?? 0;
  }
}
