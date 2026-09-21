/**
 * Valores auditados em BASE759/SOURCERS/Source do Cliente/Projects/TMProject/Basedef.h.
 * Estes são opcodes efetivamente usados pelo cliente desta BASE759, já com os
 * flags de direção incorporados.
 */
export const CLASSIC_APP_VERSION = 18_175;
export const CLASSIC_INIT_CODE = 521_270_033;

export const ClassicOpcode = {
  messagePanel: 0x101,
  removeMob: 0x165,
  setHpMp: 0x181,
  setHpDam: 0x18a,
  setHpMode: 0x292,
  cnfAccountLogin: 0x10a,
  cnfNewCharacter: 0x110,
  cnfDeleteCharacter: 0x112,
  cnfCharacterLogin: 0x114,
  newCharacter: 0x20f,
  deleteCharacter: 0x211,
  characterLogin: 0x213,
  accountLogin: 0x20d,
  recall: 0x289,
  quest: 0x28b,
  requestCapsuleInfo: 0x2cd,
  deleteItem: 0x2e4,
  splitItem: 0x2e5,
  createMobTrade: 0x363,
  createMob: 0x364,
  actionStop: 0x366,
  attackMulti: 0x367,
  action2: 0x368,
  requestMobById: 0x369,
  motion: 0x36a,
  updateEquip: 0x36b,
  action: 0x36c,
  partyAdd: 0x37d,
  partyRemove: 0x37e,
  partyRequest: 0x37f,
  useItem: 0x373,
  trade: 0x383,
  closeTrade: 0x384,
  withdraw: 0x387,
  deposit: 0x388,
  setPkMode: 0x399,
  attackOne: 0x39d,
  attackTwo: 0x39e,
  ping: 0x3a0,
  combineItem: 0x3a6,
  partyAccept: 0x3ab,
  delayStart: 0x3ae,
  updateAffect: 0x3b9,
  combineItemTiny: 0x3c0,
  messageWhisper: 0x334,
  updateScore: 0x336,
  updateEtc: 0x337,
} as const;

export type ClassicOpcodeValue = (typeof ClassicOpcode)[keyof typeof ClassicOpcode];

export const CLASSIC_STRUCTURE_SIZES = {
  score: 48,
  item: 8,
  selectedCharacters: 840,
  mob: 816,
  affect: 8,
} as const;

export const CLASSIC_PACKET_SIZES = {
  standard: 12,
  messagePanel: 140,
  characterLogin: 36,
  cnfAccountLogin: 1_920,
  createMob: 232,
  createMobTrade: 252,
  removeMob: 16,
  setHpMp: 28,
  setHpDam: 20,
  setHpMode: 20,
  motion: 20,
  updateEquip: 60,
  updateAffect: 268,
  partyAdd: 40,
  partyRemove: 16,
  partyRequest: 44,
  partyAccept: 30,
  attackOne: 68,
  attackTwo: 76,
  attackMulti: 164,
  updateScore: 152,
  updateEtc: 52,
  action: 52,
  /**
   * O layout C++ possui 2 bytes de padding entre Force (short) e IP[4].
   * sizeof(MSG_AccountLogin) = 116 no ABI Win32 usado pela base.
   */
  accountLogin: 116,
} as const;
