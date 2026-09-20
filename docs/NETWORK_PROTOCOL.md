# Protocolo de rede WEBWYD

Status: **P0 iniciado em 20/09/2026**.

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

## O que ainda não está implementado

- gateway TCP real;
- framing/criptografia `CPSock`;
- fila `SendQueue/RecvQueue`;
- handshake `INIT_CODE`;
- state machine de login;
- reconexão;
- timeout/heartbeat;
- dispatch de opcodes;
- integração com `GameApp`;
- autoridade de movimento/combat/inventory.

## Próximo lote P0

1. criar `ClassicPacketDispatcher`;
2. codecs de confirmação de login e seleção de personagem;
3. state machine de sessão;
4. contrato explícito Browser ↔ Gateway;
5. protótipo do gateway;
6. testes de framing usando vetores derivados do `CPSock`;
7. somente depois conectar uma tela de login ao runtime.

## Regra de segurança

Nenhuma regra autoritativa deve migrar do TMSrv para o navegador apenas por
conveniência. O frontend pode prever e apresentar; o servidor decide.


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
