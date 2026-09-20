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
}

export interface ClassicActorAction {
  readonly effect: number;
  readonly speed: number;
  readonly route: Uint8Array;
  readonly targetX: number;
  readonly targetY: number;
  readonly tick: number;
}

export type ClassicFieldReplicaEvent =
  | { readonly type: "create"; readonly actor: ClassicFieldActor }
  | { readonly type: "update"; readonly actor: ClassicFieldActor }
  | { readonly type: "missing-action"; readonly actorId: number; readonly action: ClassicActionMessage }
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
      score: message.score,
      equipment: [...message.equipment],
      affects: [...message.affects],
      createType: message.createType,
      equipment2: message.equipment2.slice(),
      nick: message.nick,
      hold: message.hold,
      tradeDescription: message.tradeDescription,
      action: null,
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
    this.#actors.set(actor.id, actor);
    this.emit({ type: "update", actor: cloneActor(actor) });
    return cloneActor(actor);
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

  private emit(event: ClassicFieldReplicaEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}

function cloneActor(actor: ClassicFieldActor): ClassicFieldActor {
  return {
    ...actor,
    score: {
      ...actor.score,
      special: [...actor.score.special],
    },
    equipment: [...actor.equipment],
    affects: [...actor.affects],
    equipment2: actor.equipment2.slice(),
    action: actor.action
      ? { ...actor.action, route: actor.action.route.slice() }
      : null,
  };
}
