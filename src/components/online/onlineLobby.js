import { getPlayerByNickname } from "../../api/playersApi.js";
import { getMatch, patchMatch, postMatch } from "../../api/matchesApi.js";
import { DECK_SIZE } from "../../utils/battleEngine.js";
import { INVITACION_MS, crearMatch, msRestantes } from "../../utils/onlineMatch.js";
import { escapar } from "../../utils/validators.js";

const POLL_MS = 2000;

export class OnlineLobby extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.match = null;
    this.timer = null;
    this.iniciado = false;
  }

  connectedCallback() {
    if (this.iniciado) return;
    this.iniciado = true;
    this.renderMenu();
    this.addEventListener("click", (e) => this.manejarClick(e));
    this.addEventListener("submit", (e) => this.retar(e));
  }

  disconnectedCallback() {
    clearInterval(this.timer);
    if (this.match) patchMatch(this.match.id, { status: "cancelled", updatedAt: Date.now() }).catch(() => {});
  }

  renderMenu() {
    this.innerHTML = /* html */ `
      <section class="online-lobby">
        <h2>¿Cómo quieres jugar?</h2>
        <div class="mode-choice">
          <button type="button" class="mode-btn" data-mode="cpu">
            <strong>Contra CPU</strong><span>Combate clásico contra la máquina</span>
          </button>
          <button type="button" class="mode-btn" data-mode="online">
            <strong>Contra otro jugador</strong><span>Reta a un entrenador por su nickname</span>
          </button>
        </div>
      </section>
    `;
  }

  renderReto(mensaje = "", tipo = "") {
    this.innerHTML = /* html */ `
      <section class="online-lobby">
        <h2>Retar a un entrenador</h2>
        <form class="challenge-form">
          <label for="rivalNick">Nickname del rival</label>
          <input id="rivalNick" name="rival" autocomplete="off" required maxlength="20" />
          <div class="challenge-actions">
            <button type="button" data-mode="back">Volver</button>
            <button type="submit">Enviar reto</button>
          </div>
        </form>
        <p class="online-msg ${tipo}" role="status">${escapar(mensaje)}</p>
      </section>
    `;
    this.querySelector("#rivalNick").focus();
  }

  renderEspera() {
    const segundos = Math.ceil(msRestantes(this.match.createdAt + INVITACION_MS) / 1000);
    this.innerHTML = /* html */ `
      <section class="online-lobby">
        <h2>Esperando a ${escapar(this.match.p2Nickname)}...</h2>
        <div class="online-spinner" aria-hidden="true"></div>
        <p class="online-msg" role="status">El reto expira en <strong id="lobbyCountdown">${segundos}</strong> s</p>
        <button type="button" data-mode="cancel">Cancelar reto</button>
      </section>
    `;
  }

  manejarClick(e) {
    const modo = e.target.closest("[data-mode]")?.dataset.mode;
    if (modo === "cpu") this.dispatchEvent(new CustomEvent("play-cpu", { bubbles: true }));
    if (modo === "online") this.renderReto();
    if (modo === "back") this.renderMenu();
    if (modo === "cancel") this.cancelar("Reto cancelado.");
  }

  async retar(e) {
    e.preventDefault();
    const nickname = new FormData(e.target).get("rival").trim();
    if (!nickname) return this.renderReto("Escribe el nickname de tu rival.", "error");
    if (nickname.toLowerCase() === this.player.nickname.toLowerCase()) {
      return this.renderReto("No puedes retarte a ti mismo.", "error");
    }
    if ((this.player.unlockedCards ?? []).length < DECK_SIZE) {
      return this.renderReto(`Necesitas al menos ${DECK_SIZE} cartas desbloqueadas.`, "error");
    }

    e.target.querySelector("[type=submit]").disabled = true;
    try {
      const rival = await getPlayerByNickname(nickname);
      if (!rival) return this.renderReto(`No existe un jugador llamado "${nickname}".`, "error");
      if ((rival.unlockedCards ?? []).length < DECK_SIZE) {
        return this.renderReto(`${rival.nickname} aún no tiene ${DECK_SIZE} cartas desbloqueadas.`, "error");
      }
      this.match = await postMatch(crearMatch(this.player, rival));
    } catch (err) {
      return this.renderReto(err.message, "error");
    }

    this.renderEspera();
    this.timer = setInterval(() => this.consultar(), POLL_MS);
  }

  async consultar() {
    if (!this.match) return;
    const restante = msRestantes(this.match.createdAt + INVITACION_MS);
    const countdown = this.querySelector("#lobbyCountdown");
    if (countdown) countdown.textContent = Math.ceil(restante / 1000);
    if (restante === 0) return this.cancelar(`${this.match.p2Nickname} no respondió a tiempo.`);

    let actual;
    try {
      actual = await getMatch(this.match.id);
    } catch {
      return;
    }
    if (!this.match) return;

    if (actual.status === "selecting") {
      clearInterval(this.timer);
      this.match = null;
      this.dispatchEvent(new CustomEvent("match-ready", { detail: { match: actual }, bubbles: true }));
    } else if (actual.status === "cancelled") {
      clearInterval(this.timer);
      this.match = null;
      this.renderReto(`${actual.p2Nickname} rechazó el reto.`, "error");
    }
  }

  async cancelar(mensaje) {
    clearInterval(this.timer);
    const match = this.match;
    this.match = null;
    this.renderReto(mensaje);
    if (match) await patchMatch(match.id, { status: "cancelled", updatedAt: Date.now() }).catch(() => {});
  }
}

customElements.define("online-lobby", OnlineLobby);
