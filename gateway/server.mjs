import { connect as connectTcp } from "node:net";
import {
  ClassicCPSockEncoder,
  ClassicCPSockStreamDecoder,
} from "../src/network/classic/CPSockCodec.ts";
import {
  CLASSIC_INIT_CODE,
  ClassicOpcode,
} from "../src/network/classic/Protocol.ts";

const gatewayPort = integerEnv("WYD_GATEWAY_PORT", 8787);
const gameHost = process.env.WYD_TCP_HOST || "127.0.0.1";
const gamePort = integerEnv("WYD_TCP_PORT", 7556);
const allowedOrigins = new Set(
  (process.env.WYD_GATEWAY_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const bridges = new WeakMap();

const server = Bun.serve({
  port: gatewayPort,
  fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        gateway: "WEBWYD",
        target: `${gameHost}:${gamePort}`,
      });
    }

    if (url.pathname !== "/wyd") {
      return new Response("WEBWYD gateway", { status: 404 });
    }

    const origin = request.headers.get("origin") || "";
    if (allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
      return new Response("Origin not allowed", { status: 403 });
    }

    if (server.upgrade(request)) return;
    return new Response("WebSocket upgrade required", { status: 426 });
  },
  websocket: {
    open(ws) {
      const bridge = createBridge(ws);
      bridges.set(ws, bridge);
      bridge.connect();
    },
    message(ws, message) {
      const bridge = bridges.get(ws);
      if (!bridge) return;
      if (typeof message === "string") {
        bridge.fail("Frames de texto não são aceitos");
        return;
      }
      const packet = toUint8Array(message);
      bridge.receiveFromBrowser(packet);
    },
    close(ws) {
      bridges.get(ws)?.close();
      bridges.delete(ws);
    },
  },
});

console.log(`WEBWYD gateway ouvindo em ws://localhost:${server.port}/wyd`);
console.log(`Destino clássico: ${gameHost}:${gamePort}`);

function createBridge(ws) {
  const encoder = new ClassicCPSockEncoder();
  const decoder = new ClassicCPSockStreamDecoder();
  const pending = [];
  let tcp = null;
  let tcpReady = false;
  let closed = false;

  return {
    connect() {
      tcp = connectTcp({ host: gameHost, port: gamePort });

      tcp.on("connect", () => {
        if (closed) return;
        const init = Buffer.allocUnsafe(4);
        init.writeUInt32LE(CLASSIC_INIT_CODE >>> 0, 0);
        tcp.write(init);
        tcpReady = true;
        for (const packet of pending.splice(0)) sendToClassic(packet);
      });

      tcp.on("data", (chunk) => {
        if (closed) return;
        try {
          for (const packet of decoder.push(chunk)) {
            const type = packet[4]! | (packet[5]! << 8);
            if (type === ClassicOpcode.cnfAccountLogin && packet.byteLength >= 28) {
              encoder.setSendQueue(packet.subarray(12, 28));
            }
            ws.send(packet);
          }
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
        }
      });

      tcp.on("error", (error) => fail(`TCP clássico: ${error.message}`));
      tcp.on("close", () => {
        tcpReady = false;
        if (!closed) {
          closed = true;
          try { ws.close(1011, "Servidor clássico desconectado"); } catch {}
        }
      });
    },

    receiveFromBrowser(packet) {
      if (closed) return;
      try {
        validateDecodedFrame(packet);
        if (!tcpReady) {
          pending.push(packet.slice());
          return;
        }
        sendToClassic(packet);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    },

    close() {
      if (closed) return;
      closed = true;
      pending.length = 0;
      decoder.clear();
      encoder.clearSendQueue();
      tcp?.destroy();
      tcp = null;
    },

    fail,

  };

  function sendToClassic(packet) {
    if (!tcp || !tcpReady) throw new Error("TCP clássico ainda não conectado");
    const encoded = encoder.encode(packet);
    tcp.write(encoded);
  }

  function fail(message) {
    if (closed) return;
    console.error(`Gateway: ${message}`);
    closed = true;
    pending.length = 0;
    tcpReady = false;
    tcp?.destroy();
    tcp = null;
    try { ws.close(1011, "Falha no gateway WYD"); } catch {}
  }
}

function validateDecodedFrame(packet) {
  if (packet.byteLength < 12) throw new Error("Frame menor que MSG_STANDARD");
  if (packet.byteLength >= 131072) throw new Error("Frame excede o limite CPSock");
  const declared = packet[0]! | (packet[1]! << 8);
  if (declared !== packet.byteLength) {
    throw new Error(`Frame declara ${declared} bytes e recebeu ${packet.byteLength}`);
  }
}

function toUint8Array(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  }
  throw new TypeError("Frame WebSocket binário inválido");
}

function integerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} inválido: ${raw}`);
  }
  return value;
}
