#pragma once

#include "ProcessClientMessage.h"
#include <iostream>
#include <cstdlib>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <random>
#include <ctime>
#include "SendFunc.h"
#include "Functions.h"
#include "wMySQL.h"

void Freeze() {

	for (int i = MAX_USER; i < MAX_MOB; i++)
	{
		if (pMob[i].Mode != MOB_EMPTY)
		{
			MSG_UpdateScore Update;
			memset(&Update, 0, sizeof(MSG_UpdateScore));
			GridMulticast(pMob[i].TargetX, pMob[i].TargetY, (MSG_STANDARD*)&Update, 0);
		}
		else {
			MSG_RemoveMob sm;
			memset(&sm, 0, sizeof(MSG_RemoveMob));

			sm.Type = _MSG_RemoveMob;
			sm.Size = sizeof(MSG_RemoveMob);
			sm.ID = i;
			sm.RemoveType = 0;

			GridMulticast(pMob[i].TargetX, pMob[i].TargetY, (MSG_STANDARD*)&sm, i);
		}
	}
}