import {
  parseAttackPacket,
  parseHpDamagePacket,
  parseMotionPacket,
  parseRemoveMobPacket,
  type ClassicAttackMessage,
  type ClassicHpDamageMessage,
  type ClassicMotionMessage,
  type ClassicRemoveMobMessage,
} from "./FieldMessages";
import {
  parseActionPacket,
  parseCreateMobPacket,
  type ClassicActionMessage,
  type ClassicCreateMobMessage,
} from "./Messages";
import { ClassicPacketDispatcher } from "./ClassicPacketDispatcher";
import { ClassicOpcode } from "./Protocol";
import type { ClassicScore } from "./Structures";

export interface ClassicFieldActor {
  readonly id: number;
  readonly name: string;
  readonly posX: number;
  readonly posY: number;
  readonly guild: number;
  readonly guildLevel: number;
  readonly score: ClassicScore;
  readonly equipment: readonly number[];
  readonly affects: readonly number[];
  readonly createType: number;
  readonly equipment2: Uint8Array;
  readonly nick: string;
  readonly hold: number | null;
  readonly tradeDescription: string | null;
  readonly action: ClassicActorAction | null;
  readonly motion: ClassicActorMotion | null;
  readonly lastDamage: ClassicActorDamage | null;
  readonly lastAttack: ClassicActorAttack | null;
}

export interface ClassicActorAction {
  readonly effect: number;
  readonly speed: number;
  readonly route: Uint8Array;
  readonly targetX: number;
  readonly targetY: number;
  readonly tick: number;
}

export interface ClassicActorMotion {
  readonly motion: number;
  readonly parm: number;
  readonly direction: number;
  readonly directionBits: number;
  readonly tick: number;
}

export interface ClassicActorDamage {
  readonly hp: number;
  readonly damage: number;
  readonly tick: number;
}

export interface ClassicActorAttack {
  readonly attackerId: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly motion: number;
  readonly skillParm: number;
  readonly doubleCritical: number;
  readonly flagLocal: number;
  readonly skillIndex: number;
  readonly currentHp: number;
  readonly currentMp: number;
  readonly damages: readonly {
    readonly targetId: number;
    readonly damage: number;
  }[];
  readonly tick: number;
}

export type ClassicFieldReplicaEvent =
  | { readonly type: "create"; readonly actor: ClassicFieldActor }
  | { readonly type: "update"; readonly actor: ClassicFieldActor }
  | {
      readonly type: "remove";
      readonly actorId: number;
      readonly removeType: number;
      readonly actor: ClassicFieldActor | null;
    }
  | { readonly type: "attack"; readonly actor: ClassicFieldActor; readonly attack: ClassicActorAttack }
  | { readonly type: "missing-action"; readonly actorId: number; readonly action: ClassicActionMessage }
  | { readonly type: "missing-motion"; readonly actorId: number; readonly motion: ClassicMotionMessage }
  | { readonly type: "missing-damage"; readonly actorId: number; readonly damage: ClassicHpDamageMessage }
  | { readonly type: "missing-attack"; readonly actorId: number; readonly attack: ClassicAttackMessage }
  | { readonly type: "clear" };

export class ClassicFieldReplica {
  readonly #actors = new Map<number, ClassicFieldActor>();
  readonly #listeners = new Set<(event: ClassicFieldReplicaEvent) => void>();
  readonly #cleanups: Array<() => void> = [];

  constructor(dispatcher?: ClassicPacketDispatcher) {
    if (dispatcher) this.bind(dispatcher);
  }

  bind(dispatcher: ClassicPacketDispatcher): () => void {
    const cleanups = [
      dispatcher.on(ClassicOpcode.createMob, (packet) => this.applyCreate(parseCreateMobPacket(packet))),
      dispatcher.on(ClassicOpcode.createMobTrade, (packet) => this.applyCreate(parseCreateMobPacket(packet))),
      dispatcher.on(ClassicOpcode.action, (packet) => this.applyAction(parseActionPacket(packet))),
      dispatcher.on(ClassicOpcode.actionStop, (packet) => this.applyAction(parseActionPacket(packet))),
      dispatcher.on(ClassicOpcode.motion, (packet) => this.applyMotion(parseMotionPacket(packet))),
      dispatcher.on(ClassicOpcode.removeMob, (packet) => this.applyRemove(parseRemoveMobPacket(packet))),
      dispatcher.on(ClassicOpcode.setHpDam, (packet) => this.applyDamage(parseHpDamagePacket(packet))),
      dispatcher.on(ClassicOpcode.attackOne, (packet) => this.applyAttack(parseAttackPacket(packet))),
      dispatcher.on(ClassicOpcode.attackTwo, (packet) => this.applyAttack(parseAttackPacket(packet))),
      dispatcher.on(ClassicOpcode.attackMulti, (packet) => this.applyAttack(parseAttackPacket(packet))),
    ];
    const cleanup = () => {
      for (const release of cleanups) release();
    };
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  onChange(listener: (event: ClassicFieldReplicaEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  snapshot(id: number): ClassicFieldActor | null {
    const actor = this.#actors.get(id);
    return actor ? cloneActor(actor) : null;
  }

  snapshots(): readonly ClassicFieldActor[] {
    return [...this.#actors.values()].map(cloneActor);
  }

  applyCreate(message: ClassicCreateMobMessage): ClassicFieldActor {
    const actor: ClassicFieldActor = {
      id: message.mobId,
      name: message.mobName,
      posX: message.posX,
      posY: message.posY,
      guild: message.guild,
      guildLevel: message.guildLevel,
      score: cloneScore(message.score),
      equipment: [...message.equipment],
      affects: [...message.affects],
      createType: message.createType,
      equipment2: message.equipment2.slice(),
      nick: message.nick,
      hold: message.hold,
      tradeDescription: message.tradeDescription,
      action: null,
      motion: null,
      lastDamage: null,
      lastAttack: null,
    };
    this.#actors.set(actor.id, actor);
    this.emit({ type: "create", actor: cloneActor(actor) });
    return cloneActor(actor);
  }

  applyAction(message: ClassicActionMessage): ClassicFieldActor | null {
    const current = this.#actors.get(message.header.id);
    if (!current) {
      this.emit({
        type: "missing-action",
        actorId: message.header.id,
        action: message,
      });
      return null;
    }

    const actor: ClassicFieldActor = {
      ...current,
      posX: message.posX,
      posY: message.posY,
      action: {
        effect: message.effect,
        speed: message.speed,
        route: message.route.slice(),
        targetX: message.targetX,
        targetY: message.targetY,
        tick: message.header.tick,
      },
    };
    return this.storeUpdate(actor);
  }

  applyMotion(message: ClassicMotionMessage): ClassicFieldActor | null {
    const actorId = message.header.id;
    const current = this.#actors.get(actorId);
    if (!current) {
      this.emit({ type: "missing-motion", actorId, motion: message });
      return null;
    }

    return this.storeUpdate({
      ...current,
      motion: {
        motion: message.motion,
        parm: message.parm,
        direction: message.direction,
        directionBits: message.directionBits,
        tick: message.header.tick,
      },
    });
  }

  applyDamage(message: ClassicHpDamageMessage): ClassicFieldActor | null {
    const actorId = message.header.id;
    const current = this.#actors.get(actorId);
    if (!current) {
      this.emit({ type: "missing-damage", actorId, damage: message });
      return null;
    }

    return this.storeUpdate({
      ...current,
      score: {
        ...current.score,
        hp: message.hp,
        special: [...current.score.special],
      },
      lastDamage: {
        hp: message.hp,
        damage: message.damage,
        tick: message.header.tick,
      },
    });
  }

  applyAttack(message: ClassicAttackMessage): ClassicFieldActor | null {
    const actorId = message.attackerId || message.header.id;
    const current = this.#actors.get(actorId);
    if (!current) {
      this.emit({ type: "missing-attack", actorId, attack: message });
      return null;
    }

    const attack: ClassicActorAttack = {
      attackerId: actorId,
      targetX: message.targetX,
      targetY: message.targetY,
      motion: message.motion,
      skillParm: message.skillParm,
      doubleCritical: message.doubleCritical,
      flagLocal: message.flagLocal,
      skillIndex: message.skillIndex,
      currentHp: message.currentHp,
      currentMp: message.currentMp,
      damages: message.damages.map((damage) => ({ ...damage })),
      tick: message.header.tick,
    };

    const actor: ClassicFieldActor = {
      ...current,
      posX: message.posX,
      posY: message.posY,
      score: message.currentMp >= 0
        ? {
            ...current.score,
            mp: message.currentMp,
            special: [...current.score.special],
          }
        : current.score,
      lastAttack: attack,
    };
    this.#actors.set(actor.id, actor);
    const cloned = cloneActor(actor);
    this.emit({ type: "attack", actor: cloned, attack: cloneAttack(attack) });
    this.emit({ type: "update", actor: cloned });
    return cloned;
  }

  applyRemove(message: ClassicRemoveMobMessage): ClassicFieldActor | null {
    const actorId = message.header.id;
    const current = this.#actors.get(actorId) ?? null;
    if (current) this.#actors.delete(actorId);
    this.emit({
      type: "remove",
      actorId,
      removeType: message.removeType,
      actor: current ? cloneActor(current) : null,
    });
    return current ? cloneActor(current) : null;
  }

  clear(): void {
    if (this.#actors.size === 0) return;
    this.#actors.clear();
    this.emit({ type: "clear" });
  }

  dispose(): void {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    this.#actors.clear();
    this.#listeners.clear();
  }

  private storeUpdate(actor: ClassicFieldActor): ClassicFieldActor {
    this.#actors.set(actor.id, actor);
    const cloned = cloneActor(actor);
    this.emit({ type: "update", actor: cloned });
    return cloned;
  }

  private emit(event: ClassicFieldReplicaEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}

function cloneActor(actor: ClassicFieldActor): ClassicFieldActor {
  return {
    ...actor,
    score: cloneScore(actor.score),
    equipment: [...actor.equipment],
    affects: [...actor.affects],
    equipment2: actor.equipment2.slice(),
    action: actor.action
      ? { ...actor.action, route: actor.action.route.slice() }
      : null,
    motion: actor.motion ? { ...actor.motion } : null,
    lastDamage: actor.lastDamage ? { ...actor.lastDamage } : null,
    lastAttack: actor.lastAttack ? cloneAttack(actor.lastAttack) : null,
  };
}

function cloneScore(score: ClassicScore): ClassicScore {
  return {
    ...score,
    special: [...score.special],
  };
}

function cloneAttack(attack: ClassicActorAttack): ClassicActorAttack {
  return {
    ...attack,
    damages: attack.damages.map((damage) => ({ ...damage })),
  };
}
