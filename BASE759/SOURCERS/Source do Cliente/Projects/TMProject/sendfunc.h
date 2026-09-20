#ifndef _SENDFUNC_ // Last updated 27/01/2013
#define _SENDFUNC_

#include <time.h>
#include <Windows.h>

#define GetItemList(itemId) reinterpret_cast<STRUCT_ITEMLIST*>((itemId * 0x8C) + 0xFB9608)
#define GetItemName(itemId) reinterpret_cast<char*>((itemId * 0x8C) +  0xFB9608)
#define GetItemPrice(itemId) *reinterpret_cast<uint32_t*>((itemId * 0x8C) + 0xFB9688)


void AffectIconLimit();
//void BASE_EffectMagic(bool IsEnable);
void AffectIconLimit();
INT32 HKD_GreenTime_NewArea(INT32 posX, INT32 posY);
int32_t AddItemSanc(STRUCT_ITEM* item, char* str);
void HandlerController(char* pBuffer, int a_iSize, int a_iType);
char* ClientReceiver(char* pBuffer, int a_iSize);
//char* ClientSended(char* pBuffer, int a_iSize);
void ClientSended(MSG_STANDARD* pBuffer, int a_iSize); 
//char* ReadMessage(char* pMsg, int pSize);                         28/02
//int SendPack(const int conn, char* const pMsg, const int len);    28/02
//void SendMsgExp(TNColor Color, char* msg, ...);
void CreateMessagePanel(char* msg, int color);
bool NewItensDay(INT32 Item);
bool SetItemPriceString(STRUCT_ITEM* item, char* str);
void FormataValidadeFada(char* msg, STRUCT_ITEM* item);
void FormataValidadeTraje(char* msg, STRUCT_ITEM* item);
//void FormataValidadeEsferas(char* msg, STRUCT_ITEM* item);
INT32 HKD_GetItemAbility_Esferas(STRUCT_ITEM* item, INT32 effectId);
//INT32 HKD_Macro_NewPotions(STRUCT_ITEM* item, INT32 type);
int CreateObjectText(STRUCT_ITEM* item, char* line1, char* line2, char* line3, char* line4, char* line5, char* line6, char* line7, char* line8, char* line9, char* line10, int* color1, int* color2, int* color3, int* color4, int* color5, int* color6, int* color7, int* color8, int* color9, int* color10);
int HKD_ChangeTabColor(char* msg);
int HKD_SendChat(char* command);
INT32 HKD_KeyPress_NewButton(BYTE button);
void HKD_FixIndex(DWORD* sTraje, int32_t* Costume);
void HKD_CorrectBone(int32_t index, int32_t* bone);
void HKD_LoadFile(int32_t index, char* textureName, char* meshName);
void NewMount(int32_t index, int32_t* value);
bool SetVolatileMessageBoxText(int itemID, char* text);
int AddVolatileMessageItem(int itemID);
#pragma endregion

#endif
