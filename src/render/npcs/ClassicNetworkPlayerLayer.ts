import * as THREE from "three";
import type { ClassicAssetSource } from "../../assets/ClassicAssetSource";
import { ClassicItemCatalog } from "../../game/player/ClassicItemCatalog";
import { ClassicPlayerAvatar } from "../../game/player/ClassicPlayerAvatar";
import { resolveClassicPacketPlayerVisual } from "../../game/player/ClassicPlayerPacketVisual";
import type {
  ClassicFieldActor,
  ClassicFieldReplica,
  ClassicFieldReplicaEvent,
} from "../../network/classic/ClassicFieldReplica";
import type { WydPosition } from "../../world/coordinates";
import { toScene } from "../../world/coordinates";
import {
  createClassicMonsterStatusSprite,
  disposeClassicMonsterStatusSprite,
  updateClassicMonsterStatusSprite,
} from "./ClassicMonsterStatusSprite";

const NETWORK_PLAYER_ID_KEY = "classicNetworkPlayerId";
const SNAP_DISTANCE = 18;

interface MutableWydPosition {
  x: number;
  y: number;
}

interface RemotePlayerVisual {
  readonly id: number;
  readonly object: THREE.Group;
  readonly avatar: ClassicPlayerAvatar;
  readonly label: THREE.Sprite;
  readonly labelTexture: THREE.CanvasTexture;
  readonly labelMaterial: THREE.SpriteMaterial;
  readonly position: MutableWydPosition;
  readonly target: MutableWydPosition;
  readonly equipmentSignature: string;
  generation: number;
  lastAttackTick: number;
  lastDamageTick: number;
  currentAction: string;
}

export interface ClassicNetworkPlayerEnvironment {
  readonly origin: WydPosition;
  heightAt(position: WydPosition): number;
}

/**
 * Exact-only renderer for remote TMSrv players.
 *
 * Player IDs are 1..999 in TMFieldScene. This layer refuses unknown class/look
 * combinations rather than routing them through npcdb or another class.
 */
export class ClassicNetworkPlayerLayer {
  readonly object = new THREE.Group();

  readonly #visuals = new Map<number, RemotePlayerVisual>();
  readonly #pending = new Map<number, Promise<void>>();
  readonly #generation = new Map<number, number>();
  readonly #warnedUnsupportedWeapons = new Set<number>();
  readonly #unsubscribe: () => void;
  #disposed = false;

  private constructor(
    private readonly assets: ClassicAssetSource,
    private readonly catalog: ClassicItemCatalog,
    private readonly replica: ClassicFieldReplica,
    private readonly environment: ClassicNetworkPlayerEnvironment,
    private readonly ownClientId: number,
  ) {
    this.object.name = "classic-network-players";
    this.#unsubscribe = replica.onChange((event) => this.onReplicaEvent(event));
    for (const actor of replica.snapshots()) this.queueMaterialize(actor);
  }

  static async create(
    assets: ClassicAssetSource,
    replica: ClassicFieldReplica,
    environment: ClassicNetworkPlayerEnvironment,
    ownClientId: number,
  ): Promise<ClassicNetworkPlayerLayer> {
    const catalog = await ClassicItemCatalog.load(assets);
    return new ClassicNetworkPlayerLayer(assets, catalog, replica, environment, ownClientId);
  }

  update(deltaSeconds: number, focusPosition?: WydPosition): void {
    if (this.#disposed) return;
    const delta = Math.max(0, Math.min(0.1, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    const smooth = 1 - Math.exp(-delta * 12);

    for (const visual of this.#visuals.values()) {
      const dx = visual.target.x - visual.position.x;
      const dy = visual.target.y - visual.position.y;
      const distance = Math.hypot(dx, dy);

      if (distance >= SNAP_DISTANCE) {
        visual.position.x = visual.target.x;
        visual.position.y = visual.target.y;
      } else if (distance > 1e-4) {
        visual.position.x += dx * smooth;
        visual.position.y += dy * smooth;
        visual.avatar.setYaw(classicYawForVelocity(dx, dy));
      }

      const scene = toScene(visual.position, this.environment.origin);
      visual.object.position.set(
        scene.x,
        this.environment.heightAt(visual.position),
        scene.z,
      );
      if (focusPosition) {
        const fx = visual.position.x - focusPosition.x;
        const fy = visual.position.y - focusPosition.y;
        visual.label.visible = fx * fx + fy * fy <= 40 * 40;
      }
      visual.avatar.update(delta);
    }
  }

  actorIdFromObject(object: THREE.Object3D | null): number | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      const value = current.userData[NETWORK_PLAYER_ID_KEY];
      if (typeof value === "number" && Number.isInteger(value)) return value;
      current = current.parent;
    }
    return null;
  }

  snapshotFromObject(object: THREE.Object3D | null): ClassicFieldActor | null {
    const id = this.actorIdFromObject(object);
    return id === null ? null : this.replica.snapshot(id);
  }

  visualizedIds(): readonly number[] {
    return [...this.#visuals.keys()];
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    for (const id of [...this.#visuals.keys()]) this.release(id);
    this.#pending.clear();
    this.#generation.clear();
    this.object.clear();
    this.object.removeFromParent();
  }

  private onReplicaEvent(event: ClassicFieldReplicaEvent): void {
    if (this.#disposed) return;
    switch (event.type) {
      case "create": {
        const existing = this.#visuals.get(event.actor.id);
        const signature = equipmentSignature(event.actor.equipment);
        if (existing && existing.equipmentSignature !== signature) {
          this.bumpGeneration(event.actor.id);
          this.release(event.actor.id);
        }
        this.queueMaterialize(event.actor);
        break;
      }
      case "update":
      case "attack": {
        const existing = this.#visuals.get(event.actor.id);
        const signature = equipmentSignature(event.actor.equipment);
        if (existing && existing.equipmentSignature !== signature) {
          this.bumpGeneration(event.actor.id);
          this.release(event.actor.id);
          this.queueMaterialize(event.actor);
          break;
        }
        this.syncActor(event.actor);
        break;
      }
      case "remove":
        this.bumpGeneration(event.actorId);
        this.release(event.actorId);
        break;
      case "clear":
        for (const id of [...this.#visuals.keys()]) {
          this.bumpGeneration(id);
          this.release(id);
        }
        break;
      case "missing-action":
      case "missing-motion":
      case "missing-damage":
      case "missing-attack":
      case "missing-equip":
        break;
    }
  }

  private syncActor(actor: ClassicFieldActor): void {
    const visual = this.#visuals.get(actor.id);
    if (!visual) {
      this.queueMaterialize(actor);
      return;
    }

    visual.target.x = actor.posX + 0.5;
    visual.target.y = actor.posY + 0.5;
    updateClassicMonsterStatusSprite(
      visual.labelTexture,
      actor.name,
      actor.score.hp,
      actor.score.maxHp,
    );
    visual.label.visible = actor.score.hp > 0;

    if (actor.score.hp <= 0) {
      this.play(visual, ["DIE", "DEAD", "STAND01"], true);
      return;
    }

    const attackTick = actor.lastAttack?.tick ?? 0;
    if (attackTick !== 0 && attackTick !== visual.lastAttackTick) {
      visual.lastAttackTick = attackTick;
      this.play(visual, ["ATTACK1", "ATTACK2", "ATTACK3", "STAND01"], true);
      return;
    }

    const damageTick = actor.lastDamage?.tick ?? 0;
    if (damageTick !== 0 && damageTick !== visual.lastDamageTick) {
      visual.lastDamageTick = damageTick;
      this.play(visual, ["STRIKE", "STAND01"], true);
      return;
    }

    const speed = actor.action?.speed ?? 0;
    if (speed > 0) this.play(visual, speed > 2 ? ["RUN", "WALK"] : ["WALK", "RUN"]);
    else this.play(visual, ["STAND01", "STAND02"]);
  }

  private queueMaterialize(actor: ClassicFieldActor): void {
    if (this.#disposed || !isRemotePlayerId(actor.id, this.ownClientId)) return;
    if (this.#visuals.has(actor.id)) {
      this.syncActor(actor);
      return;
    }
    if (this.#pending.has(actor.id)) return;

    const resolved = resolveClassicPacketPlayerVisual(this.catalog, actor.equipment);
    if (!resolved) return;
    if (
      resolved.unsupportedWeaponIndex !== null
      && !this.#warnedUnsupportedWeapons.has(resolved.unsupportedWeaponIndex)
    ) {
      this.#warnedUnsupportedWeapons.add(resolved.unsupportedWeaponIndex);
      console.warn(
        `Arma remota #${resolved.unsupportedWeaponIndex} ainda não possui definição visual auditada; corpo será renderizado sem substituição de arma.`,
      );
    }

    const generation = this.bumpGeneration(actor.id);
    const job = this.materialize(actor, resolved, generation)
      .catch((error: unknown) => {
        console.warn(`Falha ao materializar player remoto ${actor.id} (${actor.name})`, error);
      })
      .finally(() => {
        if (this.#pending.get(actor.id) === job) this.#pending.delete(actor.id);
      });
    this.#pending.set(actor.id, job);
  }

  private async materialize(
    actor: ClassicFieldActor,
    resolved: NonNullable<ReturnType<typeof resolveClassicPacketPlayerVisual>>,
    generation: number,
  ): Promise<void> {
    const avatar = await ClassicPlayerAvatar.loadResolved(
      this.assets,
      resolved.playerClass,
      resolved.look,
      resolved.weapon,
    );
    if (!avatar) return;
    if (this.#disposed || this.#generation.get(actor.id) !== generation) {
      avatar.release();
      return;
    }

    const object = new THREE.Group();
    object.name = `network-player-${actor.id}-${actor.name}`;
    object.userData[NETWORK_PLAYER_ID_KEY] = actor.id;
    object.add(avatar.object);
    avatar.object.traverse((child) => {
      child.userData[NETWORK_PLAYER_ID_KEY] = actor.id;
    });

    const label = createClassicMonsterStatusSprite(
      actor.name,
      actor.score.maxHp,
      avatar.object,
      0.9,
    );
    object.add(label.sprite);

    const position = { x: actor.posX + 0.5, y: actor.posY + 0.5 };
    const visual: RemotePlayerVisual = {
      id: actor.id,
      object,
      avatar,
      label: label.sprite,
      labelTexture: label.texture,
      labelMaterial: label.material,
      position: { ...position },
      target: { ...position },
      equipmentSignature: equipmentSignature(actor.equipment),
      generation,
      lastAttackTick: 0,
      lastDamageTick: 0,
      currentAction: "",
    };

    const scene = toScene(position, this.environment.origin);
    object.position.set(scene.x, this.environment.heightAt(position), scene.z);
    this.#visuals.set(actor.id, visual);
    this.object.add(object);
    this.syncActor(this.replica.snapshot(actor.id) ?? actor);
  }

  private play(
    visual: RemotePlayerVisual,
    actions: readonly string[],
    restart = false,
  ): void {
    for (const action of actions) {
      if (!restart && visual.currentAction === action) return;
      const played = visual.avatar.play([action], restart);
      if (!played) continue;
      visual.currentAction = played.name;
      return;
    }
  }

  private release(id: number): void {
    const visual = this.#visuals.get(id);
    if (!visual) return;
    this.#visuals.delete(id);
    visual.object.removeFromParent();
    visual.avatar.release();
    disposeClassicMonsterStatusSprite(visual.labelTexture, visual.labelMaterial);
  }

  private bumpGeneration(id: number): number {
    const generation = (this.#generation.get(id) ?? 0) + 1;
    this.#generation.set(id, generation);
    return generation;
  }
}

function isRemotePlayerId(id: number, ownClientId: number): boolean {
  return id > 0 && id < 1000 && id !== ownClientId;
}

function equipmentSignature(equipment: readonly number[]): string {
  return equipment.slice(0, 16).map((value) => value & 0xffff).join(",");
}

function classicYawForVelocity(dx: number, dy: number): number {
  return -(Math.atan2(dx, dy) + Math.PI / 2);
}
