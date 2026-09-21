import {
  ClassicSession,
  WebSocketClassicTransport,
  type ClassicCharacterSummary,
  type ClassicSessionSnapshot,
} from "../network";

const WEB_CLIENT_MAC_KEY = "webwyd.web-client-mac";

export interface ClassicOnlineBootOptions {
  readonly gatewayUrl?: string;
  readonly onField: (session: ClassicSession) => void;
}

/**
 * Minimal classic session gate. It deliberately lives outside GameApp so no
 * Three.js/world resources are created before TMSrv confirms CharacterLogin.
 */
export class ClassicOnlineBoot {
  readonly session: ClassicSession;
  readonly #root: HTMLElement;
  readonly #status: HTMLElement;
  readonly #message: HTMLElement;
  readonly #loginForm: HTMLFormElement;
  readonly #account: HTMLInputElement;
  readonly #password: HTMLInputElement;
  readonly #submit: HTMLButtonElement;
  readonly #characters: HTMLElement;
  readonly #gateway: HTMLElement;
  readonly #cleanups: Array<() => void> = [];
  #enteredField = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly options: ClassicOnlineBootOptions,
  ) {
    const gatewayUrl = options.gatewayUrl ?? defaultGatewayUrl();
    this.session = new ClassicSession(new WebSocketClassicTransport(gatewayUrl));

    this.#root = document.createElement("section");
    this.#root.className = "online-boot";
    this.#root.setAttribute("aria-label", "Login online WYD");
    this.#root.innerHTML = `
      <div class="online-boot-window">
        <div class="online-boot-emblem" aria-hidden="true">WYD</div>
        <p class="eyebrow">WITH YOUR DESTINY · WEB GATEWAY</p>
        <h1>Conectar ao servidor</h1>
        <p class="online-boot-gateway"></p>
        <form class="online-login-form" autocomplete="on">
          <label>
            <span>Conta</span>
            <input name="account" type="text" maxlength="16" autocomplete="username" required />
          </label>
          <label>
            <span>Senha</span>
            <input name="password" type="password" maxlength="12" autocomplete="current-password" required />
          </label>
          <button type="submit">ENTRAR</button>
        </form>
        <div class="online-session-status" aria-live="polite">Aguardando login.</div>
        <div class="online-session-message" aria-live="assertive"></div>
        <section class="online-character-select" aria-label="Personagens da conta"></section>
        <footer>
          <span>Modo online experimental</span>
          <small>Credenciais não são armazenadas · conexão via gateway WSS/WebSocket</small>
        </footer>
      </div>
    `;
    this.container.appendChild(this.#root);

    this.#status = required<HTMLElement>(this.#root, ".online-session-status");
    this.#message = required<HTMLElement>(this.#root, ".online-session-message");
    this.#loginForm = required<HTMLFormElement>(this.#root, ".online-login-form");
    this.#account = required<HTMLInputElement>(this.#root, 'input[name="account"]');
    this.#password = required<HTMLInputElement>(this.#root, 'input[name="password"]');
    this.#submit = required<HTMLButtonElement>(this.#root, 'button[type="submit"]');
    this.#characters = required<HTMLElement>(this.#root, ".online-character-select");
    this.#gateway = required<HTMLElement>(this.#root, ".online-boot-gateway");
    this.#gateway.textContent = gatewayUrl;

    this.#loginForm.addEventListener("submit", this.loginSubmitted);
    this.#cleanups.push(
      this.session.on("state", (snapshot) => this.renderState(snapshot)),
      this.session.on("message", (message) => {
        this.#message.textContent = message;
      }),
      this.session.on("error", (error) => {
        this.#message.textContent = error.message;
        this.#submit.disabled = false;
      }),
    );
  }

  focus(): void {
    this.#account.focus();
  }

  detachUi(): void {
    this.#loginForm.removeEventListener("submit", this.loginSubmitted);
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    this.#root.remove();
  }

  dispose(): void {
    this.detachUi();
    this.session.close(1000, "WEBWYD online boot encerrado");
    this.session.dispose();
  }

  private readonly loginSubmitted = (event: SubmitEvent): void => {
    event.preventDefault();
    const account = this.#account.value.trim();
    const password = this.#password.value;
    if (!account || !password) return;

    this.#message.textContent = "";
    this.#submit.disabled = true;
    try {
      this.session.login(account, password, webClientMac());
      // Never retain the password in the DOM after the packet is constructed.
      this.#password.value = "";
    } catch (error) {
      this.#password.value = "";
      this.#submit.disabled = false;
      this.#message.textContent = error instanceof Error ? error.message : String(error);
    }
  };

  private renderState(snapshot: ClassicSessionSnapshot): void {
    this.#status.textContent = stateLabel(snapshot);
    this.#submit.disabled = !["idle", "disconnected", "error"].includes(snapshot.state);

    if (snapshot.state === "character-select") {
      this.renderCharacters(snapshot.characters);
      this.#loginForm.classList.add("is-complete");
    } else if (snapshot.state !== "entering-world") {
      this.#characters.replaceChildren();
    }

    if (snapshot.state === "field" && !this.#enteredField) {
      this.#enteredField = true;
      this.#status.textContent = "Personagem confirmado. Carregando Field…";
      this.detachUi();
      this.options.onField(this.session);
    }
  }

  private renderCharacters(characters: readonly ClassicCharacterSummary[]): void {
    const fragment = document.createDocumentFragment();
    for (let slot = 0; slot < 4; slot++) {
      const character = characters[slot];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "online-character-card";
      button.dataset.slot = String(slot);
      if (!character?.name) {
        button.disabled = true;
        button.innerHTML = `<strong>Slot ${slot + 1}</strong><span>Vazio</span>`;
      } else {
        button.innerHTML = `
          <strong>${escapeHtml(character.name)}</strong>
          <span>Lv. ${character.level}</span>
          <small>${character.homeTownX}, ${character.homeTownY}</small>
        `;
        button.addEventListener("click", () => {
          this.#message.textContent = "";
          for (const candidate of this.#characters.querySelectorAll<HTMLButtonElement>("button")) {
            candidate.disabled = true;
          }
          try {
            this.session.selectCharacter(slot);
          } catch (error) {
            this.#message.textContent = error instanceof Error ? error.message : String(error);
            this.renderCharacters(this.session.snapshot.characters);
          }
        }, { once: true });
      }
      fragment.appendChild(button);
    }
    this.#characters.replaceChildren(fragment);
  }
}

export function resolveOnlineGatewayUrl(search = window.location.search): string {
  const query = new URLSearchParams(search);
  const requested = query.get("gateway");
  if (!requested) return defaultGatewayUrl();

  try {
    const url = new URL(requested);
    if (url.protocol === "ws:" || url.protocol === "wss:") return url.toString();
  } catch {
    // Fall back to the local/default gateway below.
  }
  return defaultGatewayUrl();
}

function defaultGatewayUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname || "localhost"}:8787/wyd`;
}

function webClientMac(): string {
  try {
    const existing = window.localStorage.getItem(WEB_CLIENT_MAC_KEY);
    if (existing && /^02(?::[0-9a-f]{2}){5}$/i.test(existing)) return existing;

    // Browsers cannot expose the physical NIC MAC. Generate a locally
    // administered identifier (02 bit) solely for classic packet compatibility.
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    bytes[0] = 0x02;
    const value = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(":");
    window.localStorage.setItem(WEB_CLIENT_MAC_KEY, value);
    return value;
  } catch {
    return "02:00:00:00:00:01";
  }
}

function stateLabel(snapshot: ClassicSessionSnapshot): string {
  switch (snapshot.state) {
    case "idle": return "Aguardando login.";
    case "connecting": return "Conectando ao gateway…";
    case "authenticating": return "Autenticando no TMSrv…";
    case "character-select": return `${snapshot.accountName ?? "Conta"} · selecione um personagem`;
    case "entering-world": return "Entrando no mundo…";
    case "field": return "Field confirmado.";
    case "disconnected": return "Servidor desconectado.";
    case "error": return "Falha na sessão.";
  }
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento online ausente: ${selector}`);
  return element;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}
