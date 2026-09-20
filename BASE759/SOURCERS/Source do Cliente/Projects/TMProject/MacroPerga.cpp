#include "pch.h"
#include "TMFieldScene.h"
#include "TMGlobal.h"
#include "TMLog.h"
#include "dsutil.h"
#include "DirShow.h"
#include "SControlContainer.h"
#include "SGrid.h"
#include "Mission.h"
#include "MrItemMix.h"
#include "TMGround.h"
#include "TMHuman.h"
#include "TMObjectContainer.h"
#include "TMCamera.h"
#include "TMSun.h"
#include "TMSky.h"
#include "TMSnow.h"
#include "TMRain.h"
#include "TMSkinMesh.h"
#include "TMEffectMesh.h"
#include "TMEffectBillBoard2.h"
#include "TMEffectBillBoard.h"
#include "TMUtil.h"
#include "TMHouse.h"
#include "TMEffectBillBoard4.h"
#include "TMSkillMagicArrow.h"
#include "TMEffectStart.h"
#include "TMSkillJudgement.h"
#include "TMSkillTownPortal.h"
#include "TMEffectLevelUp.h"
#include "TMEffectSkinMesh.h"
#include "SGrid.h"
#include "ItemEffect.h"
#include "TMUtil.h"
#include "TMEffectSWSwing.h"
#include "TMEffectSpark.h"
#include "TMSkillHolyTouch.h"
#include "TMEffectParticle.h"
#include "TMSkillMeteorStorm.h"
#include "TMSkillThunderBolt.h"
#include "TMSkillSlowSlash.h"
#include "TMSkillMagicShield.h"
#include "TMSkillFreezeBlade.h"
#include "TMArrow.h"
#include "TMShade.h"
#include "TMSkillPoison.h"
#include "TMFont3.h"
#include "TMSkillHeavenDust.h"
#include "TMSkillFlash.h"
#include "TMItem.h"
#include "TMCannon.h"
#include "TMEffectCharge.h"
#include "TMSkillExplosion2.h"
#include "TMEffectDust.h"
#include "TMGate.h"
#include <WinInet.h>
#include <regex>
#include <windows.h>
#include <iostream>
#include <io.h>
#include <thread>
#include <chrono>

bool MacroUP = false;
bool MacroPesa = false;
int PossX;
int PossY;

bool AguaMacroN = false;
bool AguaMacroM = false;
bool AguaMacroA = false;

int needupdate = 0;

int countAguaN = 0;
int countAguaM = 0;
int countAguaA = 0;
int AutoTradeNew = 1;

void TMFieldScene::FiltroPosition() {
	PossX = (int)m_pMyHuman->m_vecPosition.x;
	PossY = (int)m_pMyHuman->m_vecPosition.y;
}

int TMFieldScene::ComandosChat(char* text) {

	if (!strcmp(text, "autowater")) {
		MacroUP = !MacroUP;
		char str[128] = {};
		sprintf(str, "AutoWater : %s", (MacroUP ? "ON" : "OFF"));
		m_pMessagePanel->SetMessage(strFmt(str), 4000);
		m_pMessagePanel->SetVisible(1, 2);

		if (MacroUP)
		{
			HANDLE threadHandle;
			DWORD threadID;
			threadHandle = CreateThread(NULL, 0, ThreadMacro, NULL, 0, &threadID);
		}

		return TRUE;
	}
	return FALSE;
}

DWORD WINAPI ThreadMacro(LPVOID lpParameter) {

	while (MacroUP) {

		if (!MacroUP)
		{
			AguaMacroN = false;
			AguaMacroM = false;
			AguaMacroA = false;
			CloseHandle(lpParameter);
		}

		if (MacroUP)
		{
			WORD X = PossX / 128;
			WORD Y = PossY / 128;
			WORD Xm = PossX;
			WORD Ym = PossY;
			int slot = -1;
			auto mob = g_pObjectManager->m_stMobData;

			if (Xm > 1954 && Ym > 1760 && Xm < 1976 && Ym < 1776)
			{
				int havePerga = 0;
				for (int i = 0; i < MAX_CARRY; i++)
				{
					auto item = mob.Carry[i].sIndex;

					if (item == 0)
						continue;

					if (item == 3182)
					{
						havePerga++;
						break;
					}
					if (item == 777)
					{
						havePerga++;
						break;
					}
					if (item == 3173)
					{
						havePerga++;
						break;
					}
				}

				if (havePerga == FALSE)
				{
					MacroUP = false;
					AguaMacroN = false;
					AguaMacroM = false;
					AguaMacroA = false;
					CloseHandle(lpParameter);
				}
			}

			if (Xm <= 1975 && Xm >= 1956 && Ym <= 1775 && Ym >= 1766)
			{
				int Next[] = { 3182, 777,3173 };
				for (int i = 0; i < MAX_CARRY; i++)
				{
					auto item = mob.Carry[i].sIndex;
					for (int s = 0; s < 3; s++)
					{
						for (int p = 0; p < 8; p++)
						{
							if (item == Next[s] + p)
							{
								slot = i;
								break;
							}
						}
						if (slot != -1)
							break;
					}
				}
			}

			if ((X == 8 && Y == 27) || (X == 9 && Y == 28) || (X == 10 && Y == 27))
			{
				int Next[] = { 3183, 778, 3174 };
				for (int i = 0; i < MAX_CARRY; i++)
				{
					auto item = mob.Carry[i].sIndex;
					for (int s = 0; s < 3; s++)
					{
						for (int p = 0; p < 8; p++)
						{
							if (item == Next[s] + p)
							{
								slot = i;
								break;
							}
						}
						if (slot != -1)
							break;
					}
				}
			}

			if (Xm <= 1976 && Xm >= 1955 && Ym <= 1780 && Ym >= 1764)
			{
				int Next[] = { 3183, 778, 3174 };
				for (int i = 0; i < MAX_CARRY; i++)
				{
					auto item = mob.Carry[i].sIndex;
					for (int s = 0; s < 3; s++)
					{
						for (int p = 0; p < 8; p++)
						{
							if (item == Next[s] + p)
							{
								slot = i;
								break;
							}
						}
						if (slot != -1)
							break;
					}
				}

				for (int i = 0; i < MAX_CARRY; i++)
				{
					if (slot != -1)
						break;

					for (int p = 0; p < 10; p++)
					{
						auto item = mob.Carry[i].sIndex;
						if (item == 3182 || item == 777 || item == 3173)
						{
							slot = i;
							break;
						}
					}
				}
			}

			if (slot != -1)
			{
				MSG_UseItem p;
				memset(&p, 0, sizeof(MSG_UseItem));
				p.Header.Type = 0x373;
				p.Header.Size = sizeof p;
				p.Header.ID = g_pObjectManager->m_dwCharID;
				p.GridX = PossX;
				p.GridY = PossY;
				p.SourType = 1;
				p.SourPos = slot;
				SendOneMessage((char*)&p, sizeof(p));
			}
		}

		Sleep(3000);
	}

	return 0;
}