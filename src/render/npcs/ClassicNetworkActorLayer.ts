import * as THREE from "three";
import type { ClassicAssetSource } from "../../assets/ClassicAssetSource";
import type {
  ClassicFieldActor,
  ClassicFieldReplica,
  ClassicFieldReplicaEvent,
} from "../../network/classic/ClassicFieldReplica";
import type { WydPosition } from "../../world/coordinates";
import { toScene } from "../../world/coordinates";
import { ClassicSkinnedAssetLibrary, type ClassicSkinnedInstanceLease } from "../../game/npcs/ClassicSkinnedAssetLibrary";
import { MonsterCatalog } from "../../game/npcs/MonsterCatalog";
import {
  createClassicMonsterStatusSprite,
  disposeClassicMonsterStatusSprite,
  updateClassicMonsterStatusSprite,
} from "./ClassicMonsterStatusSprite";

const NETWORK_ACTOR_ID_KEY = "classicNetworkActorId";
const SNAP_DISTANCE = 18;

export interface ClassicNetworkActorEnvironment {
  readonly origin: WydPosition;
  heightAt(position: WydPosition): number;
}

interface MutableWydPosition {
  x: number;
  y: number;
}

interface NetworkVisualActor {
  readonly id: number;
  readonly object: THREE.Group;
  readonly lease: ClassicSkinnedInstanceLease;
  readonly label: THREE.Sprite;
  readonly labelTexture: THREE.CanvasTexture;
  readonly labelMaterial: THREE.SpriteMaterial;
  readonly position: MutableWydPosition;
  readonly target: MutableWydPosition;
  readonly scale: number;
  currentAction: string;
  lastAttackTick: number;
  lastDamageTick: number;
  generation: number;
}

/**
 * Render-only bridge from authoritative TMSrv field state to classic skinned
 * NPC/monster visuals. It intentionally skips player IDs (1..999): remote
 * players need TMHuman equipment/race/weapon reconstruction, not npcdb lookup.
 */
export class ClassicNetworkActorLayer {
  readonly object = new THREE.Group();

  readonly #visuals = new Map<number, NetworkVisualActor>();
  readonly #generation = new Map<number, number>();
  readonly #pending = new Map<number, Promise<void>>();
  readonly #assetLibrary: ClassicSkinnedAssetLibrary;
  readonly #unsubscribe: () => void;
  #disposed = false;

  private constructor(
    private readonly catalog: MonsterCatalog,
    private readonly replica: ClassicFieldReplica,
    private readonly environment: ClassicNetworkActorEnvironment,
    assets: ClassicAssetSource,
  ) {
    this.#assetLibrary = new ClassicSkinnedAssetLibrary(assets, catalog);
    this.object.name = "classic-network-actors";
    this.#unsubscribe = replica.onChange((event) => this.onReplicaEvent(event));

    for (const actor of replica.snapshots()) this.queueMaterialize(actor);
  }

  static async create(
    assets: ClassicAssetSource,
    replica: ClassicFieldReplica,
    environment: ClassicNetworkActorEnvironment,
  ): Promise<ClassicNetworkActorLayer> {
    const catalog = await MonsterCatalog.load(assets);
    return new ClassicNetworkActorLayer(catalog, replica, environment, assets);
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
        visual.lease.model.setClassicTransform({
          yaw: classicYawForVelocity(dx, dy),
          scale: visual.scale,
          mirrorModelZ: true,
        });
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

      visual.lease.model.update(delta);
    }
  }

  actorIdFromObject(object: THREE.Object3D | null): number | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      const value = current.userData[NETWORK_ACTOR_ID_KEY];
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
      case "create":
        this.queueMaterialize(event.actor);
        break;
      case "update":
      case "attack":
        this.syncActor(event.actor);
        break;
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
      this.play(visual, ["ATTACK1", "STRIKE", "STAND01"], true);
      return;
    }

    const damageTick = actor.lastDamage?.tick ?? 0;
    if (damageTick !== 0 && damageTick !== visual.lastDamageTick) {
      visual.lastDamageTick = damageTick;
      this.play(visual, ["STRIKE", "STAND01"], true);
      return;
    }

    const speed = actor.action?.speed ?? 0;
    if (speed > 0) {
      this.play(visual, speed > 2 ? ["RUN", "WALK"] : ["WALK", "RUN"]);
    } else {
      this.play(visual, ["STAND01"]);
    }
  }

  private queueMaterialize(actor: ClassicFieldActor): void {
    if (this.#disposed || isPlayerMobId(actor.id)) return;
    if (this.#visuals.has(actor.id)) {
      this.syncActor(actor);
      return;
    }
    if (this.#pending.has(actor.id)) return;

    const templateIndex = this.catalog.resolvePacketTemplateIndex(actor.name, actor.equipment);
    if (templateIndex === null) return;

    const generation = this.bumpGeneration(actor.id);
    const job = this.materialize(actor, templateIndex, generation)
      .catch((error: unknown) => {
        console.warn(`Falha ao materializar ator remoto ${actor.id} (${actor.name})`, error);
      })
      .finally(() => {
        if (this.#pending.get(actor.id) === job) this.#pending.delete(actor.id);
      });
    this.#pending.set(actor.id, job);
  }

  private async materialize(
    actor: ClassicFieldActor,
    templateIndex: number,
    generation: number,
  ): Promise<void> {
    const template = this.catalog.template(templateIndex);
    if (!template?.visual || this.#disposed) return;

    const lease = await this.#assetLibrary.createTemplateInstance(templateIndex);
    if (!lease) return;
    if (this.#disposed || this.#generation.get(actor.id) !== generation) {
      lease.release();
      return;
    }

    const scale = classicMobScale(actor.score.constitution);
    lease.model.setClassicTransform({
      scale,
      mirrorModelZ: true,
    });
    lease.model.update(0);
    lease.model.object.updateMatrixWorld(true);

    const object = new THREE.Group();
    object.name = `network-actor-${actor.id}-${template.key}`;
    object.userData[NETWORK_ACTOR_ID_KEY] = actor.id;
    object.add(lease.model.object);
    for (const mesh of lease.model.meshes) {
      mesh.userData[NETWORK_ACTOR_ID_KEY] = actor.id;
    }

    const label = createClassicMonsterStatusSprite(
      actor.name,
      actor.score.maxHp,
      lease.model.object,
      scale,
    );
    object.add(label.sprite);

    const position = { x: actor.posX + 0.5, y: actor.posY + 0.5 };
    const visual: NetworkVisualActor = {
      id: actor.id,
      object,
      lease,
      label: label.sprite,
      labelTexture: label.texture,
      labelMaterial: label.material,
      position: { ...position },
      target: { ...position },
      scale,
      currentAction: lease.model.currentClip ?? "",
      lastAttackTick: 0,
      lastDamageTick: 0,
      generation,
    };

    const scene = toScene(position, this.environment.origin);
    object.position.set(scene.x, this.environment.heightAt(position), scene.z);
    this.#visuals.set(actor.id, visual);
    this.object.add(object);
    this.syncActor(this.replica.snapshot(actor.id) ?? actor);
  }

  private play(
    visual: NetworkVisualActor,
    actions: readonly string[],
    restart = false,
  ): void {
    for (const action of actions) {
      if (!restart && visual.currentAction === action) return;
      if (!visual.lease.model.play(action, restart)) continue;
      visual.currentAction = action;
      return;
    }
  }

  private release(id: number): void {
    const visual = this.#visuals.get(id);
    if (!visual) return;
    this.#visuals.delete(id);
    visual.object.removeFromParent();
    visual.lease.release();
    disposeClassicMonsterStatusSprite(visual.labelTexture, visual.labelMaterial);
  }

  private bumpGeneration(id: number): number {
    const generation = (this.#generation.get(id) ?? 0) + 1;
    this.#generation.set(id, generation);
    return generation;
  }
}

function isPlayerMobId(id: number): boolean {
  return id > 0 && id < 1000;
}

function classicMobScale(constitution: number): number {
  return Math.max(0.12, Math.min(5, 0.9 * (1 + constitution / 2_000)));
}

/**
 * TMHuman::MoveTo stores atan2(dx,dy)+PI/2 then TMSkinMesh receives its
 * negative. Keep the same transform already used by the offline actor layer.
 */
function classicYawForVelocity(dx: number, dy: number): number {
  return -(Math.atan2(dx, dy) + Math.PI / 2);
}
