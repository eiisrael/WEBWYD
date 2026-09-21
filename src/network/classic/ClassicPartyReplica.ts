import { ClassicPacketDispatcher } from "./ClassicPacketDispatcher";
import { ClassicOpcode } from "./Protocol";
import {
  parsePartyAddPacket,
  parsePartyRemovePacket,
  parsePartyRequestPacket,
  type ClassicPartyMemberMessage,
  type ClassicPartyRequestMessage,
} from "./PartyMessages";

export interface ClassicPartyMember {
  readonly id: number;
  readonly name: string;
  readonly level: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly isLeader: boolean;
  readonly leaderMarker: number;
  readonly target: number;
}

export interface ClassicPartySnapshot {
  readonly leaderId: number | null;
  readonly members: readonly ClassicPartyMember[];
  readonly pendingRequest: ClassicPartyRequestMessage | null;
}

export type ClassicPartyReplicaEvent =
  | { readonly type: "add"; readonly member: ClassicPartyMember }
  | { readonly type: "remove"; readonly memberId: number; readonly member: ClassicPartyMember | null }
  | { readonly type: "clear"; readonly members: readonly ClassicPartyMember[] }
  | { readonly type: "request"; readonly request: ClassicPartyRequestMessage };

export class ClassicPartyReplica {
  readonly #members = new Map<number, ClassicPartyMember>();
  readonly #listeners = new Set<(event: ClassicPartyReplicaEvent) => void>();
  readonly #cleanups: Array<() => void> = [];
  #leaderId: number | null = null;
  #pendingRequest: ClassicPartyRequestMessage | null = null;

  constructor(dispatcher?: ClassicPacketDispatcher) {
    if (dispatcher) this.bind(dispatcher);
  }

  bind(dispatcher: ClassicPacketDispatcher): () => void {
    const cleanups = [
      dispatcher.on(ClassicOpcode.partyAdd, (packet) => this.applyAdd(parsePartyAddPacket(packet))),
      dispatcher.on(ClassicOpcode.partyRemove, (packet) => this.applyRemove(parsePartyRemovePacket(packet).memberId)),
      dispatcher.on(ClassicOpcode.partyRequest, (packet) => this.applyRequest(parsePartyRequestPacket(packet))),
    ];
    const cleanup = () => {
      for (const release of cleanups) release();
    };
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  onChange(listener: (event: ClassicPartyReplicaEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get snapshot(): ClassicPartySnapshot {
    return {
      leaderId: this.#leaderId,
      members: this.members(),
      pendingRequest: this.#pendingRequest ? cloneRequest(this.#pendingRequest) : null,
    };
  }

  member(id: number): ClassicPartyMember | null {
    const member = this.#members.get(id);
    return member ? { ...member } : null;
  }

  members(): readonly ClassicPartyMember[] {
    return [...this.#members.values()].map((member) => ({ ...member }));
  }

  has(id: number): boolean {
    return this.#members.has(id);
  }

  applyAdd(message: ClassicPartyMemberMessage): ClassicPartyMember {
    const member: ClassicPartyMember = {
      id: message.memberId,
      name: message.name,
      level: message.level,
      maxHp: message.maxHp,
      hp: message.hp,
      isLeader: message.isLeader,
      leaderMarker: message.leaderMarker,
      target: message.target,
    };
    this.#members.set(member.id, member);
    if (member.isLeader) this.#leaderId = member.id;
    this.#pendingRequest = null;
    this.emit({ type: "add", member: { ...member } });
    return { ...member };
  }

  applyRemove(memberId: number): void {
    const id = Math.trunc(memberId);
    if (id === 0) {
      this.clear();
      return;
    }

    const member = this.#members.get(id) ?? null;
    this.#members.delete(id);
    if (this.#leaderId === id) this.#leaderId = null;
    this.emit({ type: "remove", memberId: id, member: member ? { ...member } : null });
  }

  applyRequest(request: ClassicPartyRequestMessage): void {
    this.#pendingRequest = cloneRequest(request);
    this.emit({ type: "request", request: cloneRequest(request) });
  }

  clear(): void {
    const members = this.members();
    this.#members.clear();
    this.#leaderId = null;
    this.#pendingRequest = null;
    if (members.length > 0) this.emit({ type: "clear", members });
  }

  dispose(): void {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    this.clear();
    this.#listeners.clear();
  }

  private emit(event: ClassicPartyReplicaEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}

function cloneRequest(request: ClassicPartyRequestMessage): ClassicPartyRequestMessage {
  return {
    ...request,
    header: { ...request.header },
  };
}
