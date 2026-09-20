import {
  createAccountLoginPacket,
  createCharacterLoginPacket,
  parseAccountLoginConfirmation,
  parseCharacterLoginConfirmation,
  parseMessagePanel,
  type ClassicAccountLoginConfirmation,
  type ClassicCharacterLoginConfirmation,
  type ClassicCharacterSummary,
} from "../classic/Messages";
import { ClassicOpcode } from "../classic/Protocol";
import type { ClassicMobCore } from "../classic/Structures";
import { ClassicPacketDispatcher } from "../classic/ClassicPacketDispatcher";
import { ClassicFieldReplica } from "../classic/ClassicFieldReplica";
import type {
  ClassicTransport,
  ClassicTransportState,
} from "../transport/WebSocketClassicTransport";

export type ClassicSessionState =
  | "idle"
  | "connecting"
  | "authenticating"
  | "character-select"
  | "entering-world"
  | "field"
  | "disconnected"
  | "error";

export interface ClassicFieldSession {
  readonly mob: ClassicMobCore;
  readonly characterName: string;
  readonly characterClass: number;
  readonly clientId: number;
  readonly slot: number;
  readonly posX: number;
  readonly posY: number;
  readonly weather: number;
  readonly shortSkills: Uint8Array;
}

export interface ClassicSessionSnapshot {
  readonly state: ClassicSessionState;
  readonly accountName: string | null;
  readonly characters: readonly ClassicCharacterSummary[];
  readonly cargoCoin: number;
  readonly selectedSlot: number | null;
  readonly field: ClassicFieldSession | null;
}

export interface ClassicSessionEventMap {
  readonly state: ClassicSessionSnapshot;
  readonly message: string;
  readonly error: Error;
  readonly unknownPacket: number;
}

type SessionListener<K extends keyof ClassicSessionEventMap> = (
  event: ClassicSessionEventMap[K],
) => void;

export class ClassicSession {
  readonly #dispatcher = new ClassicPacketDispatcher();
  readonly fieldReplica = new ClassicFieldReplica(this.#dispatcher);
  readonly #listeners = new Map<keyof ClassicSessionEventMap, Set<(event: unknown) => void>>();
  readonly #cleanups: Array<() => void> = [];

  #state: ClassicSessionState = "idle";
  #pendingLoginPacket: Uint8Array | null = null;
  #secretCode: Uint8Array | null = null;
  #accountName: string | null = null;
  #characters: readonly ClassicCharacterSummary[] = [];
  #cargoCoin = 0;
  #selectedSlot: number | null = null;
  #field: ClassicFieldSession | null = null;
  #disposed = false;

  constructor(readonly transport: ClassicTransport) {
    this.#cleanups.push(
      transport.on("open", () => this.handleOpen()),
      transport.on("packet", (packet) => this.handlePacket(packet)),
      transport.on("close", () => this.handleClose()),
      transport.on("error", () => this.fail(new Error("Falha no transporte WYD"))),
      this.#dispatcher.on(ClassicOpcode.cnfAccountLogin, (packet) => {
        this.applyAccountLogin(parseAccountLoginConfirmation(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.cnfCharacterLogin, (packet) => {
        this.applyCharacterLogin(parseCharacterLoginConfirmation(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.messagePanel, (packet) => {
        this.emit("message", parseMessagePanel(packet).message);
      }),
      this.#dispatcher.onUnknown((_packet, header) => {
        this.emit("unknownPacket", header.type);
      }),
    );
  }

  get snapshot(): ClassicSessionSnapshot {
    return {
      state: this.#state,
      accountName: this.#accountName,
      characters: this.#characters.map((character) => ({ ...character })),
      cargoCoin: this.#cargoCoin,
      selectedSlot: this.#selectedSlot,
      field: this.#field
        ? { ...this.#field, shortSkills: this.#field.shortSkills.slice() }
        : null,
    };
  }

  login(account: string, password: string, mac: string): void {
    this.assertAlive();
    if (!["idle", "disconnected", "error"].includes(this.#state)) {
      throw new Error(`Login inválido no estado ${this.#state}`);
    }
    if (!account.trim() || !password) throw new Error("Conta e senha são obrigatórias");

    this.resetSessionData();
    this.#pendingLoginPacket = createAccountLoginPacket(account, password, mac);
    if (this.transport.state === "open") {
      this.sendPendingLogin();
      return;
    }

    this.setState("connecting");
    this.transport.connect();
  }

  selectCharacter(slot: number): void {
    this.assertAlive();
    if (this.#state !== "character-select" || !this.#secretCode) {
      throw new Error(`Seleção de personagem inválida no estado ${this.#state}`);
    }
    const character = this.#characters[slot];
    if (!character || !character.name) {
      throw new Error(`Slot de personagem vazio ou inválido: ${slot}`);
    }

    this.transport.send(createCharacterLoginPacket(slot, this.#secretCode));
    this.#selectedSlot = slot;
    this.#field = null;
    this.setState("entering-world");
  }

  close(code?: number, reason?: string): void {
    if (this.#disposed) return;
    this.transport.close(code, reason);
    this.setState("disconnected");
  }

  on<K extends keyof ClassicSessionEventMap>(
    type: K,
    listener: SessionListener<K>,
  ): () => void {
    const listeners = this.#listeners.get(type) ?? new Set();
    this.#listeners.set(type, listeners);
    const erased = listener as unknown as (event: unknown) => void;
    listeners.add(erased);
    return () => listeners.delete(erased);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    this.fieldReplica.dispose();
    this.#dispatcher.clear();
    this.zeroSensitiveBuffers();
    this.#listeners.clear();
  }

  private handleOpen(): void {
    if (this.#pendingLoginPacket) this.sendPendingLogin();
  }

  private sendPendingLogin(): void {
    const packet = this.#pendingLoginPacket;
    if (!packet) throw new Error("Nenhum login pendente");
    this.#pendingLoginPacket = null;
    this.transport.send(packet);
    packet.fill(0);
    this.setState("authenticating");
  }

  private handlePacket(packet: Uint8Array): void {
    try {
      this.#dispatcher.dispatch(packet);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleClose(): void {
    if (this.#disposed) return;
    this.zeroSensitiveBuffers();
    this.setState("disconnected");
  }

  private applyAccountLogin(confirmation: ClassicAccountLoginConfirmation): void {
    if (this.#state !== "authenticating") {
      throw new Error(`MSG_CNFAccountLogin recebido no estado ${this.#state}`);
    }
    this.#secretCode?.fill(0);
    this.#secretCode = confirmation.secretCode.slice();
    this.#accountName = confirmation.accountName;
    this.#characters = confirmation.characters;
    this.#cargoCoin = confirmation.cargoCoin;
    this.#selectedSlot = null;
    this.#field = null;
    this.setState("character-select");
  }

  private applyCharacterLogin(confirmation: ClassicCharacterLoginConfirmation): void {
    if (this.#state !== "entering-world") {
      throw new Error(`MSG_CNFCharacterLogin recebido no estado ${this.#state}`);
    }
    this.#field = {
      mob: confirmation.mob,
      characterName: confirmation.characterName,
      characterClass: confirmation.characterClass,
      clientId: confirmation.clientId,
      slot: confirmation.slot,
      posX: confirmation.posX,
      posY: confirmation.posY,
      weather: confirmation.weather,
      shortSkills: confirmation.shortSkills.slice(),
    };
    this.#selectedSlot = confirmation.slot;
    this.#secretCode?.fill(0);
    this.#secretCode = null;
    this.setState("field");
  }

  private resetSessionData(): void {
    this.zeroSensitiveBuffers();
    this.fieldReplica.clear();
    this.#accountName = null;
    this.#characters = [];
    this.#cargoCoin = 0;
    this.#selectedSlot = null;
    this.#field = null;
  }

  private zeroSensitiveBuffers(): void {
    this.#pendingLoginPacket?.fill(0);
    this.#pendingLoginPacket = null;
    this.#secretCode?.fill(0);
    this.#secretCode = null;
  }

  private setState(state: ClassicSessionState): void {
    if (this.#state === state) return;
    this.#state = state;
    this.emit("state", this.snapshot);
  }

  private fail(error: Error): void {
    this.setState("error");
    this.emit("error", error);
  }

  private emit<K extends keyof ClassicSessionEventMap>(
    type: K,
    event: ClassicSessionEventMap[K],
  ): void {
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
  }

  private assertAlive(): void {
    if (this.#disposed) throw new Error("ClassicSession já foi descartada");
  }
}

export function isConnectedTransportState(state: ClassicTransportState): boolean {
  return state === "connecting" || state === "open";
}
