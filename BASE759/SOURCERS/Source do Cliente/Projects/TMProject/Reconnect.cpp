#include "pch.h"
#include "TMSelectServerScene.h"
#include "TMSelectCharScene.h"
#include "TMGlobal.h"
#include <stdio.h>
#include "TMHuman.h"
#include "TMFieldScene.h"
#include "TMUtil.h"

bool Reconnect = false;
int ReconnectState = 0;
int ReconnectTimer = 0;
int nPersonagem = 0;
char Numerica[10];
short Reconnect_Conn_id_leader = 0;
char Reconnect_LeaderName[16];

void TMSelectServerScene::Reconnecting_Login() {

	m_pMessagePanel->SetMessage("Auto reconnect activated! Reconnecting...", 4000);
	m_pMessagePanel->SetVisible(1, 2);

	if (ReconnectState == 1)
	{
		auto pLoginOK = m_pLoginBtns[0];
		auto pEditID = m_pEditID;
		auto pEditPassword = m_pEditPW;

		if (!g_pSocketManager->ConnectServer(g_pApp->m_szServerIP, TM_CONNECTION_PORT, 0, 1124))
		{
			pLoginOK->SetEnable(1);
			m_pMessagePanel->SetMessage(g_pMessageStringTable[8], 4000);
			m_pMessagePanel->SetVisible(1, 1);
			return;
		}

		g_bMoveServer = 0;

		MSG_AccountLogin stAccountLogin{};
		stAccountLogin.Header.ID = 0;
		stAccountLogin.Header.Type = MSG_AccountLogin_Opcode;
		stAccountLogin.Force = 1;
		stAccountLogin.Version = APP_VERSION;   // APP_VERSION

		UUID uuid;
		UuidCreateSequential(&uuid);
		memset(&stAccountLogin.Mac[0], 0, 18);  //52

		sprintf_s(stAccountLogin.Mac, 18, "%02X:%02X:%02X:%02X:%02X:%02X", uuid.Data4[2], uuid.Data4[3], uuid.Data4[4], uuid.Data4[5], uuid.Data4[6], uuid.Data4[7]);

		sprintf_s(stAccountLogin.AccountName, "%s", RecName);
		sprintf_s(stAccountLogin.AccountPass, "%s", RecPass);
		sprintf_s(g_pObjectManager->m_szAccountName, "%s", stAccountLogin.AccountName);
		g_pObjectManager->m_szAccountPass[0] = stAccountLogin.AccountPass[0];
		g_pObjectManager->m_szAccountPass[1] = stAccountLogin.AccountPass[1];

		g_pObjectManager->m_szAccountPass[15] = '\0';

		sprintf_s(g_pObjectManager->m_szAccountName, "%s", _strupr(g_pObjectManager->m_szAccountName));
		sprintf_s(g_pObjectManager->m_szAccountPass, "%s", _strupr(g_pObjectManager->m_szAccountPass));

		int nLen1 = strlen(g_pObjectManager->m_szAccountName);
		int nLen2 = strlen(g_pObjectManager->m_szAccountPass);

		stAccountLogin.Encode(); //18/11
		g_pSocketManager->SendOneMessage(reinterpret_cast<char*>(&stAccountLogin), sizeof MSG_AccountLogin);
		LastSendMsgTime = g_pTimerManager->GetServerTime();
	}
	return;
}

void TMSelectCharScene::Reconnecting_Numerica()
{
	m_pMessagePanel->SetMessage("System is entering your pincode...", 4000);
	m_pMessagePanel->SetVisible(1, 2);

	MSG_CHARPASSWORD msLock{};
	strcpy(msLock.ItemPassWord, Numerica);
	msLock.ItemPassWord[14] = 0;
	msLock.ItemPassWord[15] = 0;
	msLock.Header.ID = 0;
	msLock.Header.Type = MSG_CharPassword_Opcode;

	g_pSocketManager->SendOneMessage((char*)&msLock, sizeof(msLock));
	m_pAccountLockDlg->SetVisible(0);
	m_pAccountLockTime = g_pTimerManager->GetServerTime();
	g_AccountLock = 2;
}

void TMSelectCharScene::Reconnecting_Char()
{
	m_pMessagePanel->SetMessage("Connecting to your character...", 4000);
	m_pMessagePanel->SetVisible(1, 2);

	STRUCT_SELCHAR* pSelChar = &g_pObjectManager->m_stSelCharData;
	unsigned int dwServerTime = g_pTimerManager->GetServerTime();

	int nSlot = nPersonagem;

	if (nSlot < 0 || nSlot >= 4)
	{
		m_pMessagePanel->SetMessage(g_pMessageStringTable[14], 2000);
		m_pMessagePanel->SetVisible(1, 1);
	}
	else if (m_pHuman[nSlot] && pSelChar->MobName[nSlot][0])
	{
		MSG_CharacterLogin stCharacterLogin{};
		stCharacterLogin.Header.ID = 0;
		stCharacterLogin.Header.Type = MSG_CharacterLogin_Opcode;
		stCharacterLogin.Slot = nSlot;

		g_pSocketManager->SendOneMessage((char*)&stCharacterLogin, sizeof(stCharacterLogin));
		m_dwLastClickLoginBtnTime = dwServerTime;

		m_pBtnLogin->SetEnable(0);
		m_pBtnCancel->SetEnable(0);
		m_pBtnDelete->SetEnable(0);
	}
	g_pClientInfo->Info.ReconnectDone = 1;
}

DWORD WINAPI Timer(LPVOID lpParameter) {
	while (Reconnect) {
		Sleep(1000);
		ReconnectTimer += 1;
	}
	return 0;
}