import {
  createAccountLoginPacket,
  createActionPacket,
  createCharacterLoginPacket,
  parseAccountLoginConfirmation,
  parseCharacterLoginConfirmation,
  parseMessagePanel,
  type ClassicAccountLoginConfirmation,
  type ClassicCharacterLoginConfirmation,
  type ClassicCharacterSummary,
} from "../classic/Messages";
import {
  createClientAttackPacket,
  parseHpDamagePacket,
  parseHpModePacket,
  parseHpMpPacket,
  parseUpdateEtcPacket,
  parseUpdateScorePacket,
  type ClassicHpDamageMessage,
  type ClassicHpModeMessage,
  type ClassicHpMpMessage,
  type ClassicUpdateEtcMessage,
  type ClassicUpdateScoreMessage,
} from "../classic/FieldMessages";
import { ClassicOpcode } from "../classic/Protocol";
import type { ClassicMobCore, ClassicScore } from "../classic/Structures";
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

export interface ClassicPlayerRuntime {
  readonly score: ClassicScore;
  readonly currentHp: number;
  readonly currentMp: number;
  readonly requestedHp: number;
  readonly requestedMp: number;
  readonly critical: number;
  readonly saveMana: number;
  readonly affects: readonly number[];
  readonly guild: number;
  readonly guildLevel: number;
  readonly resist: readonly number[];
  readonly regenHp: number;
  readonly regenMp: number;
  readonly magic: number;
  readonly special: readonly number[];
  readonly hold: number;
  readonly experience: bigint;
  readonly learnedSkill: number;
  readonly secondaryLearnedSkill: number;
  readonly scoreBonus: number;
  readonly specialBonus: number;
  readonly skillBonus: number;
  readonly coin: number;
  readonly donate: number;
  readonly honor: number;
  readonly mode: number | null;
  readonly lastDamage: number | null;
}

export interface ClassicFieldSession {
  readonly mob: ClassicMobCore;
  runtime: ClassicPlayerRuntime;
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

export interface ClassicMoveIntent {
  readonly posX: number;
  readonly posY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly route: ArrayLike<number>;
  readonly speed: number;
}

export interface ClassicBasicAttackIntent {
  readonly targetId: number;
  readonly posX: number;
  readonly posY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly progress?: number;
}

export interface ClassicSessionEventMap {
  readonly state: ClassicSessionSnapshot;
  readonly message: string;
  readonly error: Error;
  readonly unknownPacket: number;
  readonly runtime: ClassicPlayerRuntime;
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
      this.#dispatcher.on(ClassicOpcode.setHpMp, (packet) => {
        this.applyHpMp(parseHpMpPacket(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.setHpDam, (packet) => {
        this.applyLocalDamage(parseHpDamagePacket(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.setHpMode, (packet) => {
        this.applyHpMode(parseHpModePacket(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.updateScore, (packet) => {
        this.applyUpdateScore(parseUpdateScorePacket(packet));
      }),
      this.#dispatcher.on(ClassicOpcode.updateEtc, (packet) => {
        this.applyUpdateEtc(parseUpdateEtcPacket(packet));
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
      field: this.#field ? cloneFieldSession(this.#field) : null,
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

  sendMoveIntent(intent: ClassicMoveIntent): void {
    this.assertAlive();
    const field = this.#field;
    if (this.#state !== "field" || !field) {
      throw new Error(`Movimento inválido no estado ${this.#state}`);
    }

    const speed = Math.max(0, Math.min(15, Math.trunc(intent.speed)));
    this.transport.send(createActionPacket({
      posX: Math.trunc(intent.posX),
      posY: Math.trunc(intent.posY),
      effect: 0,
      speed,
      route: intent.route,
      targetX: Math.trunc(intent.targetX),
      targetY: Math.trunc(intent.targetY),
    }, { id: field.clientId }));
  }

  sendBasicAttackIntent(intent: ClassicBasicAttackIntent): void {
    this.assertAlive();
    const field = this.#field;
    if (this.#state !== "field" || !field) {
      throw new Error(`Ataque inválido no estado ${this.#state}`);
    }

    const targetId = Math.trunc(intent.targetId);
    if (targetId <= 0 || targetId === field.clientId) {
      throw new RangeError(`Alvo de ataque inválido: ${targetId}`);
    }

    this.transport.send(createClientAttackPacket({
      opcode: ClassicOpcode.attackOne,
      posX: Math.trunc(intent.posX),
      posY: Math.trunc(intent.posY),
      targetX: Math.trunc(intent.targetX),
      targetY: Math.trunc(intent.targetY),
      attackerId: field.clientId,
      progress: Math.trunc(intent.progress ?? 0),
      motion: 0xff,
      skillParm: 0,
      flagLocal: 0,
      currentHp: 0,
      currentMp: -1,
      skillIndex: 0,
      requestedMp: 0,
      damages: [{ targetId, damage: -2 }],
    }, { id: field.clientId }));
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
      runtime: createInitialRuntime(confirmation.mob),
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

  private applyHpMp(message: ClassicHpMpMessage): void {
    const field = this.requireFieldForUpdate("MSG_SetHpMp");
    field.runtime = {
      ...field.runtime,
      score: {
        ...field.runtime.score,
        hp: message.hp,
        mp: message.mp,
        special: [...field.runtime.score.special],
      },
      currentHp: message.hp,
      currentMp: message.mp,
      requestedHp: message.requestedHp,
      requestedMp: message.requestedMp,
    };
    this.emitRuntime();
  }

  private applyLocalDamage(message: ClassicHpDamageMessage): void {
    if (!this.#field || message.header.id !== this.#field.clientId) return;
    this.#field.runtime = {
      ...this.#field.runtime,
      score: {
        ...this.#field.runtime.score,
        hp: message.hp,
        special: [...this.#field.runtime.score.special],
      },
      currentHp: message.hp,
      requestedHp: message.hp,
      lastDamage: message.damage,
    };
    this.emitRuntime();
  }

  private applyHpMode(message: ClassicHpModeMessage): void {
    const field = this.requireFieldForUpdate("MSG_SetHpMode");
    field.runtime = {
      ...field.runtime,
      score: {
        ...field.runtime.score,
        hp: message.hp,
        special: [...field.runtime.score.special],
      },
      currentHp: message.hp,
      requestedHp: message.hp,
      mode: message.mode,
    };
    this.emitRuntime();
  }

  private applyUpdateScore(message: ClassicUpdateScoreMessage): void {
    const field = this.requireFieldForUpdate("MSG_UpdateScore");
    field.runtime = {
      ...field.runtime,
      score: {
        ...message.score,
        hp: message.currentHp,
        mp: message.currentMp,
        special: [...message.score.special],
      },
      currentHp: message.currentHp,
      currentMp: message.currentMp,
      requestedHp: message.currentHp,
      requestedMp: message.currentMp,
      critical: message.critical,
      saveMana: message.saveMana,
      affects: [...message.affects],
      guild: message.guild,
      guildLevel: message.guildLevel,
      resist: [...message.resist],
      regenHp: message.regenHp,
      regenMp: message.regenMp,
      magic: message.magic,
      special: [...message.special],
    };
    this.emitRuntime();
  }

  private applyUpdateEtc(message: ClassicUpdateEtcMessage): void {
    const field = this.requireFieldForUpdate("MSG_UpdateEtc");
    field.runtime = {
      ...field.runtime,
      hold: message.hold,
      experience: message.experience,
      learnedSkill: message.learnedSkill,
      secondaryLearnedSkill: message.secondaryLearnedSkill,
      scoreBonus: message.scoreBonus,
      specialBonus: message.specialBonus,
      skillBonus: message.skillBonus,
      magic: message.magic,
      coin: message.coin,
      donate: message.donate,
      honor: message.honor,
    };
    this.emitRuntime();
  }

  private requireFieldForUpdate(packetName: string): ClassicFieldSession {
    if (!this.#field || this.#state !== "field") {
      throw new Error(`${packetName} recebido fora do Field`);
    }
    return this.#field;
  }

  private emitRuntime(): void {
    if (!this.#field) return;
    this.emit("runtime", cloneRuntime(this.#field.runtime));
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

function createInitialRuntime(mob: ClassicMobCore): ClassicPlayerRuntime {
  return {
    score: cloneScore(mob.currentScore),
    currentHp: mob.currentScore.hp,
    currentMp: mob.currentScore.mp,
    requestedHp: mob.currentScore.hp,
    requestedMp: mob.currentScore.mp,
    critical: 0,
    saveMana: 0,
    affects: [],
    guild: mob.guild,
    guildLevel: 0,
    resist: [],
    regenHp: 0,
    regenMp: 0,
    magic: 0,
    special: [],
    hold: 0,
    experience: mob.experience,
    learnedSkill: 0,
    secondaryLearnedSkill: 0,
    scoreBonus: 0,
    specialBonus: 0,
    skillBonus: 0,
    coin: mob.coin,
    donate: 0,
    honor: 0,
    mode: null,
    lastDamage: null,
  };
}

function cloneFieldSession(field: ClassicFieldSession): ClassicFieldSession {
  return {
    ...field,
    runtime: cloneRuntime(field.runtime),
    shortSkills: field.shortSkills.slice(),
  };
}

function cloneRuntime(runtime: ClassicPlayerRuntime): ClassicPlayerRuntime {
  return {
    ...runtime,
    score: cloneScore(runtime.score),
    affects: [...runtime.affects],
    resist: [...runtime.resist],
    special: [...runtime.special],
  };
}

function cloneScore(score: ClassicScore): ClassicScore {
  return {
    ...score,
    special: [...score.special],
  };
}

export function isConnectedTransportState(state: ClassicTransportState): boolean {
  return state === "connecting" || state === "open";
}
