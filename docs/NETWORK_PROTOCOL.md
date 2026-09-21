# Protocolo de rede WEBWYD

Status: **P0 estrutural implementado; P1 de Field em andamento em 20/09/2026**.

## Objetivo

Preservar a semântica e os layouts de packets auditados na `BASE759`, sem
tentar abrir TCP diretamente no navegador.

Arquitetura alvo:

```text
Browser WEBWYD
  │
  │ WSS / WebSocket
  ▼
Gateway WYD
  │
  │ TCP + framing CPSock
  ▼
TMSrv
  │
  ▼
DBSrv
```

O navegador troca **packets clássicos decodificados completos**, incluindo o
header `MSG_STANDARD`. O gateway é responsável por adaptar WebSocket para o
framing/criptografia do `CPSock` clássico.

## Fonte canônica

Principal:

- `BASE759/SOURCERS/Source do Cliente/Projects/TMProject/Basedef.h`
- `BASE759/SOURCERS/Source do Cliente/Projects/TMProject/CPSock.cpp`
- `BASE759/SOURCERS/Source do Cliente/Projects/TMProject/CPSock.h`

Validação de autoridade:

- `BASE759/SOURCERS/Source do Servidor/Code/Basedef.h`
- `BASE759/SOURCERS/Source do Servidor/Code/TMSrv/_MSG_*.cpp`

## Implementação atual

`src/network/classic/PacketIO.ts`

- leitura/escrita little-endian;
- limites estritos de pacote;
- `MSG_STANDARD` de 12 bytes;
- strings e buffers de tamanho fixo.

`src/network/classic/Protocol.ts`

- `APP_VERSION = 18175`;
- `INIT_CODE = 521270033`;
- catálogo inicial de opcodes;
- tamanhos auditados dos primeiros packets.

`src/network/classic/Messages.ts`

Primeiros codecs:

- `MSG_AccountLogin`;
- `MSG_CharacterLogin`;
- `MSG_Action`.

O `MSG_AccountLogin` conserva:

- transformação byte a byte de `Encode()`;
- tamanho Win32 de 116 bytes;
- padding nativo antes de `IP[4]`.

`src/network/transport/WebSocketClassicTransport.ts`

- transporte WSS/WebSocket desacoplado;
- frames binários;
- eventos de conexão/packet/erro/fechamento;
- nenhuma dependência de gameplay.

## O que ainda não está implementado/homologado

Já existem gateway TCP, codec `CPSock`, `INIT_CODE`, dispatcher, sessão,
login/seleção, integração opt-in com `GameApp`, runtime autoritativo básico,
atores de NPC/monstro do servidor e envio de `MSG_Action` por clique.

Ainda estão abertos:

- homologação ponta a ponta contra TMSrv/DBSrv reais;
- reconexão e timeout/heartbeat completos;
- renderização de **jogadores remotos** via `TMHuman::SetPacketEquipItem/SetRace/CheckWeapon`;
- inventário/equipamentos autoritativos completos no HUD;
- chat/whisper real;
- ataque/skills enviados pelo navegador e reconciliação de combate;
- drops/itens/lojas/party/guild/trade/quests;
- persistência e demais fluxos MMORPG.

## Estado do P0

O núcleo estrutural do P0 está implementado:

- `ClassicPacketDispatcher` com validação estrita de tamanho;
- `ClassicSession` com estados de conexão/login/seleção/entrada no Field;
- codecs de login, confirmação de conta, seleção e confirmação de personagem;
- parser comprovado de `STRUCT_SCORE`, `STRUCT_ITEM` e núcleo de `STRUCT_MOB`;
- `CPSockCodec` com a tabela `pKeyWord[512]` exata da BASE759;
- framing/reassembly para streams TCP fragmentados;
- `INIT_CODE`;
- rotação de `SendQueue` por `SecretCode`;
- gateway Bun WebSocket ↔ TCP;
- quality gate compilando gateway + frontend;
- testes automatizados para os layouts/framing/sessão.

A etapa que ainda impede declarar P0 homologado em produção é um teste de
integração **contra uma instância real do TMSrv**: conexão TCP, login válido,
`MSG_CNFAccountLogin`, seleção do personagem e `MSG_CNFCharacterLogin`.

## P1 iniciado — replicação de Field

A primeira fatia do P1 já existe:

- `MSG_CreateMob` e `MSG_CreateMobTrade`;
- `MSG_Action`/`MSG_Action_Stop`;
- `ClassicFieldReplica`, um estado de atores independente de Three.js;
- `ClassicSession.fieldReplica`.

O objetivo é migrar o renderer gradualmente de “simulador local de atores” para
“apresentador de estado autoritativo recebido do TMSrv”, sem remover o modo
offline enquanto a rede não estiver homologada.

## Regra de segurança

Nenhuma regra autoritativa deve migrar do TMSrv para o navegador apenas por
conveniência. O frontend pode prever e apresentar; o servidor decide.


## Portas auditadas da BASE759

A origem do servidor declara em
`BASE759/SOURCERS/Source do Servidor/Code/Basedef.h`:

```text
GAME_PORT = 7556  # cliente -> TMSrv
DB_PORT   = 7514  # TMSrv -> DBSrv
ADMIN_PORT = 3695
```

`Server.cpp` confirma que o TMSrv chama
`ListenSocket.StartListen(..., GAME_PORT, ...)` e conecta ao DBSrv em
`7514`. Portanto `WYD_TCP_PORT=7556` no gateway é o padrão desta BASE759,
não um valor provisório.

## Gateway executável

Protótipo atual:

```text
gateway/server.mjs
```

Execução local:

```bash
bun run gateway
```

Variáveis suportadas:

```text
WYD_GATEWAY_PORT=8787
WYD_TCP_HOST=127.0.0.1
WYD_TCP_PORT=7556
WYD_GATEWAY_ORIGINS=http://localhost:5173
```

Endpoints:

- `GET /health` — estado básico do gateway;
- `WS /wyd` — frames binários contendo packets clássicos decodificados.

Fluxo implementado:

1. browser abre WebSocket;
2. gateway abre TCP para o TMSrv;
3. gateway envia `INIT_CODE` little-endian;
4. browser envia `MSG_*` decodificado;
5. gateway aplica framing/obfuscação `CPSock`;
6. TMSrv recebe o packet clássico;
7. respostas TCP são remontadas/decodificadas;
8. gateway envia o packet clássico decodificado ao browser;
9. ao receber `MSG_CNFAccountLogin`, o gateway instala o `SecretCode` como
   `SendQueue` para os próximos packets, espelhando o cliente BASE759.

O gateway ainda é protótipo de desenvolvimento: autenticação externa, TLS
terminado, rate limit, métricas e implantação pública ainda não foram fechados.


### Limitação do checksum clássico

O `CPSock` calcula `CheckSum = Sum(encoded) - Sum(decoded)`. Como a diferença
por posição é determinada principalmente pela transformação `pKeyWord`, esse
byte **não é um hash de integridade do payload** e não detecta necessariamente
uma alteração arbitrária de dados.

O gateway preserva essa semântica por compatibilidade. Segurança de transporte
público deve vir de WSS/TLS e das validações autoritativas do servidor, não
desse checksum legado.


### STRUCT_MOB auditado

Os comentários antigos do `Basedef.h` sugerem offsets que terminariam perto de
805/808 bytes, mas o layout Win32 real foi comprovado por outra estrutura do
próprio servidor:

```text
STRUCT_ACCOUNTFILE:
Char[4] = offsets 216..3480
3480 - 216 = 3264
3264 / 4 = 816 bytes por STRUCT_MOB
```

Por isso o protocolo WEBWYD usa **816 bytes**.

A parte até `Carry[64]` é decodificada normalmente. Os 36 bytes finais
permanecem como `opaqueTail` porque os `Basedef.h` de cliente e servidor
desta BASE759 atribuem semânticas diferentes a essa cauda. Ela só será tipada
quando a divergência for resolvida com evidência adicional.


## Executando o modo online opt-in

O modo offline continua sendo o boot padrão.

Com TMSrv/DBSrv ativos, inicie o gateway:

```bash
WYD_TCP_HOST=127.0.0.1 \
WYD_TCP_PORT=7556 \
WYD_GATEWAY_ORIGINS=http://localhost:5173 \
bun run gateway
```

Em outro terminal:

```bash
bun run dev
```

Abra:

```text
http://localhost:5173/?mode=online
```

Para apontar o navegador para outro gateway:

```text
http://localhost:5173/?mode=online&gateway=ws://HOST:8787/wyd
```

O fluxo atual é:

```text
login
 -> MSG_CNFAccountLogin
 -> seleção dos 4 slots
 -> MSG_CharacterLogin
 -> MSG_CNFCharacterLogin
 -> GameApp autoritativo
 -> CreateMob/Action/Attack/HP/MP/Score
```

No Field online:

- `PlayerState` não cria poções/equipamentos/recompensas mock;
- HP/MP/nível/EXP/atributos/moedas vêm da sessão/TMSrv;
- spawns locais ficam desligados;
- NPCs/monstros com template auditado usam os assets clássicos reais;
- IDs de jogadores `1..999` ainda não recebem visual remoto improvisado;
- clique no terreno calcula uma rota clássica de até 12 passos, envia
  `MSG_Action` com `Speed = AttackRun & 0xF` e usa somente predição visual;
- um `Action` autoritativo do próprio `ClientID` reconcilia a posição;
- WASD, GM, C.C, skills, montaria e chat autoritativo continuam bloqueados até
  os respectivos packets serem portados.

O navegador não tem acesso ao MAC físico. Para preencher o campo legado do
login, o WEBWYD gera um identificador localmente administrado
`02:xx:xx:xx:xx:xx`, persistido apenas para compatibilidade de sessão. Ele
não representa o endereço físico da placa de rede.
