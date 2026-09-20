/**
 * Valores auditados em BASE759/SOURCERS/Source do Cliente/Projects/TMProject/Basedef.h.
 * Estes são opcodes efetivamente usados pelo cliente desta BASE759, já com os
 * flags de direção incorporados.
 */
export const CLASSIC_APP_VERSION = 18_175;
export const CLASSIC_INIT_CODE = 521_270_033;

export const ClassicOpcode = {
  messagePanel: 0x101,
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
  actionStop: 0x366,
  attackMulti: 0x367,
  action2: 0x368,
  motion: 0x36a,
  updateEquip: 0x36b,
  action: 0x36c,
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
  delayStart: 0x3ae,
  updateAffect: 0x3b9,
  combineItemTiny: 0x3c0,
  messageWhisper: 0x334,
} as const;

export type ClassicOpcodeValue = (typeof ClassicOpcode)[keyof typeof ClassicOpcode];

export const CLASSIC_STRUCTURE_SIZES = {
  score: 48,
  item: 8,
  selectedCharacters: 840,
  mob: 816,
} as const;

export const CLASSIC_PACKET_SIZES = {
  standard: 12,
  messagePanel: 140,
  characterLogin: 36,
  cnfAccountLogin: 1_920,
  action: 52,
  /**
   * O layout C++ possui 2 bytes de padding entre Force (short) e IP[4].
   * sizeof(MSG_AccountLogin) = 116 no ABI Win32 usado pela base.
   */
  accountLogin: 116,
} as const;
