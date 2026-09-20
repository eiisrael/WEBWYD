# Auditoria sistemática BASE759 → WEBWYD

Data da primeira auditoria estrutural: **20/09/2026**.

## Objetivo

Usar a `BASE759` como referência técnica rastreável para aproximar o WEBWYD do
comportamento do cliente/servidor 7.59 no navegador, distinguindo:

- comportamento clássico essencial;
- customizações específicas desta BASE759;
- implementação web fiel;
- implementação web parcial/provisória;
- extensão deliberada do projeto;
- funcionalidade ausente.

A BASE759 é corpus de referência, não dependência de runtime.

## Escopo inspecionado

### Cliente clássico

`BASE759/SOURCERS/Source do Cliente/Projects/TMProject`:

- 263 arquivos;
- 112 `.cpp`;
- 143 headers;
- 25 implementações `TMSkill*.cpp`;
- 18 implementações `TMEffect*.cpp`;
- 5 cenas principais;
- 13 módulos ambientais principais.

Arquivos centrais auditados:

- `NewApp.cpp`
- `TMSelectServerScene.cpp`
- `TMSelectCharScene.cpp`
- `TMFieldScene.cpp`
- `TMHuman.cpp`
- `TMCamera.cpp`
- `TMGround.cpp`
- `SGrid.cpp`
- `SControl.cpp`
- `CPSock.cpp`
- `TMSkinMesh.cpp`
- `TMMesh.cpp`

### Servidor clássico/base

`BASE759/SOURCERS/Source do Servidor/Code/TMSrv`:

- 138 arquivos;
- 66 handlers `_MSG_*.cpp`;
- núcleo de gameplay em `CMob`, `CNPCGene`, `DropControl`,
  `MobKilled`, `ProcessClientMessage`, `SendFunc` e `Server`.

Handlers inspecionados diretamente:

- `_MSG_AccountLogin.cpp`
- `_MSG_CharacterLogin.cpp`
- `_MSG_Action.cpp`
- `_MSG_Attack.cpp`
- `_MSG_GetItem.cpp`
- `_MSG_Buy.cpp`
- `_MSG_UseItem.cpp`

### WEBWYD

- 68 arquivos TypeScript em `src/`;
- 7 arquivos de teste;
- CI executando lint, testes e build;
- runtime Three.js/WebGL;
- atualmente offline.

## Legenda

| Estado | Significado |
| --- | --- |
| 🟢 Forte | comportamento ou dados muito próximos da referência |
| 🟡 Parcial | base existente, mas ainda há diferenças relevantes |
| 🔴 Ausente | não existe equivalente funcional no WEBWYD |
| 🔵 Extensão | comportamento proposital do WEBWYD, não equivalência clássica |
| ⚪ Servidor | regra deve permanecer autoritativa no backend |

## Matriz principal

| Subsistema | BASE759 principal | WEBWYD principal | Estado | Diagnóstico |
| --- | --- | --- | --- | --- |
| Formatos/assets | TMGround/TMMesh/TMSkinMesh + dados | `formats/classic`, importadores | 🟢 Forte | TRN/MSH/MSA/BON/ANI/DAT/WYT/WYS e catálogos principais já têm pipeline web |
| Terreno/Fields | `TMGround.cpp`, `TMFieldScene.cpp` | `ClassicWorld.ts`, `TerrainBlockMesh.ts` | 🟢 Forte | streaming, attach visual, altura e 111 Fields já reproduzidos |
| Colisão/navegação | `TMGround::LoadTileMap/GetMask`, `BASE_GetRoute` | `ClassicNavigation.ts`, `ClassicCollisionMask.ts` | 🟢/🟡 | máscara clássica está forte; algoritmo web é equivalente funcional, não cópia literal de BASE_GetRoute |
| Movimento | `TMHuman::GetRoute`, `_MSG_Action.cpp` | `Player.ts`, `GameInput.ts` | 🟡 Parcial | sensação local boa; falta protocolo e validação autoritativa do servidor |
| Câmera | `TMCamera.cpp` | `WydCamera.ts` | 🟡 Parcial | orientação clássica preservada, mas zoom/pitch web são muito mais livres que os view modes originais |
| Player/rig/animação | `TMHuman.cpp`, `TMSkinMesh.cpp` | `ClassicPlayerAvatar.ts`, `Player.ts` | 🟢/🟡 | rigs, bancos e attachments fortes; estado de rede/motion remoto ainda ausente |
| Montarias/familiar | `TMHuman.cpp` e LOOK_INFO | `ClassicMount.ts`, `ClassicFamiliar.ts` | 🟢/🟡 | pipeline visual avançado; HP/feed/estado autoritativo ainda não existem |
| NPCs/monstros | `OnPacketCreateMob`, `CNPCGene.cpp`, `CMob.cpp` | `ClassicSpawnManager.ts` | 🟡 Parcial | spawn/rota/combate local existem, mas IA, vida, morte, respawn e drops são mocks do frontend |
| Ataque/dano | `TMHuman::MoveAttack`, `OnPacketAttack`, `_MSG_Attack.cpp` | `GameApp.ts`, `PlayerState.ts` | 🟡/⚪ | animação e VFX avançados; fórmula, range, crítico, mana e validações autoritativas ainda não equivalem ao servidor |
| Skills | 25 `TMSkill*.cpp` + SkillData | `ClassSkills.ts`, `HuntressSkills.ts`, render/effects | 🟡 Parcial | vários lotes já portados; matriz completa das quatro classes ainda não fechou |
| Inventário visual | `SGrid.cpp`, FieldScene UI | `GameHud.ts`, `ClassicInventoryPreview.ts` | 🟢/🟡 | quatro bolsas, slots/equip e preview estão fortes |
| Inventário lógico | `OnPacketSwapItem`, `_MSG_UseItem/GetItem/Buy/Sell` | `PlayerState.ts` | 🟡/⚪ | move/merge/equip/poção local existem; regras completas de item/economia pertencem ao servidor |
| Loot/drops | `OnPacketCreateItem`, `_MSG_GetItem/DropItem`, `DropControl` | eventos locais de `ClassicSpawnManager` | 🟡/⚪ | apresentação existe; geração, propriedade e persistência não são equivalentes |
| NPC/diálogo/loja | `MouseClick_NPC`, Shop/Buy/Sell handlers | — | 🔴 Ausente | interação completa com NPCs ainda não foi portada |
| Login/servidor | `TMSelectServerScene.cpp`, `_MSG_AccountLogin.cpp` | — | 🔴 Ausente | WEBWYD inicia diretamente em Armia |
| Seleção/criação de personagem | `TMSelectCharScene.cpp`, Character handlers | — | 🔴 Ausente | menu atual apenas marca essas ações como dependentes de rede |
| Transporte/protocolo | `CPSock.cpp`, `sendfunc.h`, `OnPacketEvent` | — | 🔴 Ausente | maior lacuna arquitetural para equivalência online |
| Persistência | DBSrv, DB759.sql, ProcessDBMessage | — | 🔴/⚪ | nenhum estado persistente autoritativo no WEBWYD |
| Chat | `OnPacketMessageChat/Whisper` | `GameHud.ts` | 🟡 Parcial | UX local existe; entrega/regras/canais de rede não |
| Party/guild/trade | handlers de party/guild/trade | — | 🔴 Ausente | depende da camada de protocolo/servidor |
| Quests/missões | `_MSG_Quest.cpp`, missão/UI | — | 🔴 Ausente | não há estado de quest autoritativo |
| Shops/economia/cargo | Buy/Sell/Deposit/Withdraw/ShopList | — | 🔴 Ausente | moedas atuais são mock local |
| Clima/ambiente | TMRain/TMSnow/TMSun/TMSky/TMSea/... | environment/water/map effects | 🟡 Parcial | água, vegetação e chuva local existem; sistema climático completo não |
| Áudio | dsutil, AniSound, chamadas GetSoundAndPlay | — | 🔴 Ausente | não há camada WebAudio equivalente |
| HUD/UI | SControl/SGrid/ResourceControl + WYT | `GameHud.ts`, CSS, import UI | 🟡/🟢 | HUD principal e inventário estão avançados; várias janelas clássicas ainda faltam |
| Segurança/anticheat | validações em `_MSG_Action/_MSG_Attack`, AddCrackError | — | ⚪ Servidor | não deve ser portado como confiança no navegador |
| C.C/macro offline | GameAuto + controles clássicos | `AutoCombat.ts`, `GameApp.ts` | 🔵 Extensão | WEBWYD possui comportamentos adicionais explicitamente não 1:1 |
| Modo G/debug | rotinas/debug do cliente | `Player.toggleSpeedBoost` | 🔵 Extensão | útil ao desenvolvimento, não deve definir regra normal |
| Telemetria/map selector | sem equivalente direto obrigatório | WEBWYD | 🔵 Extensão | ferramenta de desenvolvimento/QA |

## Achados detalhados

### 1. Mundo e navegação são a área mais madura

O WEBWYD reproduz a estrutura de Field e a máscara clássica com forte
rastreabilidade. `ClassicNavigation.ts` replica a construção de máscara do
`TMGround::LoadTileMap`, mantém o limite de altura clássico e diferencia
máscara completa/importada de fallback de terreno.

A diferença principal é de algoritmo: o clássico chama `BASE_GetRoute` e
transporta a rota no protocolo. O WEBWYD combina linha direta, A* e simplificação
de waypoints. Isso é funcionalmente bom para o modo offline, mas não deve ser
tratado como protocolo 1:1.

**Conclusão:** preservar a implementação atual até existir uma regressão concreta;
quando a rede entrar, separar “predição local” de “rota/posição aceita pelo
servidor”.

### 2. Movimento ainda não é autoritativo

No cliente clássico, `TMHuman::GetRoute` monta rota e o servidor
`_MSG_Action.cpp` valida coordenadas, tempo, velocidade, estado, rota e
multicast.

No WEBWYD, `Player.ts` aplica a posição diretamente no estado local. Isso é
correto para o slice offline, porém é incompatível com um MMORPG autoritativo.

**Necessário na fase online:**

1. input gera intenção;
2. cliente calcula/prediz movimento;
3. envia Action;
4. servidor valida;
5. servidor confirma/corrige;
6. outros atores recebem snapshots/action packets;
7. cliente interpola/reconcilia.

### 3. Câmera é “inspirada”, não 1:1

`TMCamera::SetViewMode` possui presets explícitos de ângulo, sight length,
altura e horizonte. O WEBWYD usa câmera orbital contínua com:

- pitch livre;
- distância de 3,5 a 180;
- smoothing exponencial.

Isso é uma melhoria de usabilidade deliberada, não equivalência estrita.

**Decisão recomendada:** manter o modo atual como “câmera livre” e adicionar um
preset “Clássico” com os valores de `SetViewMode(1/2/4)`, em vez de substituir
a câmera atual.

### 4. Combate visual está muito à frente do combate lógico

O cliente recebe e apresenta `MSG_Attack`; o servidor `_MSG_Attack.cpp`
possui milhares de linhas de validações e regras, incluindo:

- mana;
- estado de morte;
- range;
- arma;
- skill;
- crítico/double critical;
- múltiplos alvos;
- HP;
- mapa;
- cooldown/ticks;
- checks anticheat.

No WEBWYD, dano, crítico, EXP e progressão são deliberadamente simulados no
frontend.

**Regra para a próxima fase:** não “aperfeiçoar” a fórmula offline tentando
adivinhar o servidor. Portar a autoridade de `_MSG_Attack.cpp`/Basedef para um
backend testável e deixar o navegador apenas prever/apresentar.

### 5. NPCs e monstros estão visualmente fortes, semanticamente provisórios

O clássico materializa mobs por packet (`OnPacketCreateMob`) e o TMSrv controla
geração/IA/estado por `CNPCGene` e `CMob`.

O WEBWYD lê os dados clássicos, cria atores por Field e implementa:

- rota;
- perseguição;
- ataque;
- morte;
- respawn;
- drops;
- separação.

Isso é excelente para homologação offline, mas essas regras não devem permanecer
como fonte de verdade online.

**Migração futura:** `ClassicSpawnManager` deve evoluir de “simulador” para
“replicador/apresentador” de snapshots do servidor.

### 6. Inventário possui boa fidelidade visual, mas pouca cobertura de regra

O WEBWYD já reproduz quatro bolsas, slots reais de equipamento, drag/drop,
merge/swap e preview 3D.

Por outro lado, `_MSG_UseItem.cpp` sozinho possui mais de 14 mil linhas nesta
BASE759. Isso demonstra que “usar item” não é apenas decrementar stack/curar HP.

Ainda faltam, entre outros:

- regras completas de efeitos de item;
- refino/combinações;
- dimensões e restrições específicas;
- cargo;
- compra/venda/recompra;
- propriedade de drop;
- validações de troca;
- persistência.

### 7. Login e seleção de personagem estão completamente ausentes

O clássico executa:

`TMSelectServerScene -> CPSock -> MSG_AccountLogin -> TMSrv -> DBSrv`

e depois:

`TMSelectCharScene -> MSG_CharacterLogin -> TMSrv -> DBSrv -> Field`.

O WEBWYD chama `new GameApp(...).start()` e entra diretamente em Armia.

Isso é uma lacuna funcional real, não apenas visual.

### 8. O navegador não pode falar o TCP clássico diretamente

`CPSock` usa socket TCP. Navegadores não expõem socket TCP arbitrário para uma
página web.

Para manter os packets/estruturas da BASE759 sem reescrever toda a semântica,
a arquitetura recomendada é:

`Browser <-> WSS/WebSocket Gateway <-> protocolo clássico/TMSrv`

O gateway pode:

- enquadrar/desenquadrar packets;
- preservar opcodes e estruturas;
- manter TLS no trecho público;
- adaptar conexão/sessão;
- evitar colocar segredos/autoridade no navegador.

Alternativamente, o TMSrv pode receber uma camada WebSocket nativa. Em ambos os
casos, o conteúdo lógico dos packets pode continuar rastreável à BASE759.

### 9. Skills: pipeline bom, cobertura ainda incompleta

O cliente possui 25 arquivos dedicados `TMSkill*.cpp`, além de lógica de skill
em `TMHuman`/`TMFieldScene`.

O WEBWYD já tem renderers dedicados por classe e importa `SkillData.bin`, mas o
próprio `PENDENCIAS.md` ainda classifica a matriz completa das quatro classes
como aberta.

A Huntress atual possui no loadout web registros 72, 79, 80, 86, 88, 75, 76,
95 e 81; Força Espectral 101 é tratada separadamente.

**Critério para fechar skills:** cada skill ativa precisa de uma linha de
rastreabilidade:

`SkillData -> action/motion -> classe TMSkill/TMEffect -> assets -> material/blend -> timing -> alvo -> packet/regra server`.

### 10. Áudio é uma lacuna clara

A BASE759 usa áudio em animações, seleção de personagem, ataques e ambiente e
importa/referencia `AniSound4.txt`. O runtime TypeScript atual não possui
WebAudio/AudioContext.

Áudio deve ser tratado como subsistema próprio, não como detalhe de VFX.

### 11. Ambiente está parcialmente coberto

Já existem água, vegetação, peixe/borboleta, partículas e chuva local no
WEBWYD. Porém o clássico possui módulos próprios para:

- chuva;
- neve;
- céu;
- sol;
- mar;
- clima/efeitos ambientais.

O `GameApp` atual usa céu/fog/luz Three.js genéricos. Portanto o resultado
visual ainda não é equivalente ao pipeline climático completo do cliente.

### 12. UI/HUD precisa ser dividida entre “janela portada” e “sistema ausente”

Portado/avançado:

- HUD inferior;
- HP/MP/EXP;
- inventário;
- personagem;
- catálogo de skills;
- chat local;
- minimapa;
- C.C.

Ainda ausente ou parcial:

- lojas;
- cargo;
- trade;
- party;
- guild;
- quest/mission;
- gamble/mix;
- painéis de portal;
- estados de conexão;
- seleção de servidor;
- seleção/criação/exclusão de personagem;
- balão de chat/nome/HP sobre player conforme o cliente.

### 13. A BASE759 possui customizações além do núcleo 7.59

Exemplos no TMSrv:

- `DonateShop.cpp`;
- `GeradorPix.cpp`;
- `reCaptcha.cpp`;
- `CBatalhaReal`;
- Coliseu;
- ranking;
- eventos/custom handlers.

Esses módulos devem receber uma etiqueta de origem:

- **CLÁSSICO** — necessário para reproduzir a experiência-base;
- **BASE759 CUSTOM** — reproduzir apenas se o alvo do WEBWYD for exatamente
  esta distribuição customizada;
- **WEBWYD EXTENSION** — ferramenta/experiência nova.

Sem essa etiqueta, há risco de portar uma modificação privada como se fosse
regra original do WYD.

## Maiores lacunas por prioridade

### P0 — habilitar arquitetura online sem quebrar o slice offline

1. criar `src/network/`;
2. definir `PacketReader/PacketWriter` a partir de Basedef/structures;
3. catálogo de opcodes;
4. transporte WebSocket/WSS;
5. gateway para protocolo clássico;
6. state machine de conexão;
7. reconexão e timeout;
8. testes binários de packets.

### P1 — sessão e estado autoritativo

1. login;
2. lista/seleção de servidor;
3. seleção/criação/exclusão de personagem;
4. CharacterLogin;
5. snapshot inicial do personagem;
6. criação/remoção de mobs;
7. Action/movimento;
8. Attack/Nuke;
9. HP/MP/EXP;
10. item create/get/drop/swap/use.

### P2 — substituir mocks locais

- dano/crítico;
- EXP/level;
- moedas;
- drops;
- respawn;
- IA de mobs;
- summons;
- HP/feed de montaria;
- buffs/affects;
- cooldowns autoritativos.

O frontend pode manter predição visual, mas não a decisão final.

### P3 — interações MMORPG

- NPC dialogue;
- shops;
- cargo;
- trade;
- party;
- guild;
- whisper/chat real;
- quests;
- portais;
- ranking;
- mix/gamble/refino;
- war/eventos selecionados.

### P4 — fidelidade audiovisual final

- completar matriz de skills;
- áudio;
- clima completo;
- presets de câmera clássica;
- HUD sobre personagens;
- telas de login/select char;
- revisão 1024×768;
- revisão widescreen/mobile.

## Divergências deliberadas que devem permanecer documentadas

Não tratar como bug sem decisão explícita:

- mapa/seletor de Field de QA;
- telemetria;
- modo G de exploração;
- zoom extremo;
- lista ordenável de skills do C.C;
- IA/drops/EXP offline enquanto não há servidor;
- formação de 10 summons no mock atual;
- controles WASD modernos.

A futura opção “fidelidade clássica” pode desabilitar/limitar extensões sem
retirá-las do modo de desenvolvimento.

## Critério de aceite por subsistema

Um item só passa de 🟡 para 🟢 quando possuir:

1. fonte BASE759 identificada;
2. dados/constantes rastreados;
3. implementação WEBWYD correspondente;
4. teste automatizado quando a regra for pura;
5. inspeção visual quando houver render;
6. ausência de fallback genérico silencioso;
7. divergências deliberadas explicitamente documentadas.

## Conclusão

O WEBWYD já tem um **vertical slice gráfico/jogável forte**. As maiores
diferenças para a BASE759 não estão mais no carregamento de mapa ou na
capacidade de exibir um personagem clássico; estão na **arquitetura de sessão,
protocolo e autoridade do servidor**.

A ordem segura não é continuar adicionando regras de MMORPG ao frontend.
Primeiro deve entrar a camada de protocolo/servidor, e então os mocks atuais
podem ser substituídos progressivamente por estado autoritativo sem destruir a
base visual que já foi homologada.
