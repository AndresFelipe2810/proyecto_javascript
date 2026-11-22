import "../deck/deckSelector.js";
import { getCards } from "../../api/cardsApi.js";
import { getMatch, patchMatch } from "../../api/matchesApi.js";
import {
  SELECCION_MS,
  completarMazo,
  debeIniciarBatalla,
  iniciarBatalla,
  msRestantes,
  rival,
  rolDe,
  seleccionVencida,
} from "../../utils/onlineMatch.js";
import { escapar } from "../../utils/validators.js";

const POLL_MS = 1500;
const TICK_MS = 250;

export class OnlineDeckSelect extends HTMLElement {
  constructor() {
    super();
    this.match = null;
    this.player = null;
    this.rol = null;
    this.enviado = false;
    this.cerrado = false;
    this.consultando = false;
    this.pollTimer = null;
    this.tickTimer = null;
  }

  connectedCallback() {
    if (this.rol) return;
    this.rol = rolDe(this.match, this.player.id);
    this.render();
    this.addEventListener("deck-selected", (e) => {
      e.stopPropagation();
      this.enviarMazo(e.detail.deck.map((c) => String(c.id)));
    });
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.pollTimer = setInterval(() => this.consultar(), POLL_MS);
  }

  disconnectedCallback() {
    clearInterval(this.tickTimer);
    clearInterval(this.pollTimer);
    if (!this.cerrado) patchMatch(this.match.id, { status: "cancelled", updatedAt: Date.now() }).catch(() => {});
  }

  render() {
    const rivalNick = this.match[`${rival(this.rol)}Nickname`];
    this.innerHTML = /* html */ `
      <section class="online-select">
        <div class="online-timer">
          <span>Combate contra <strong>${escapar(rivalNick)}</strong></span>
          <span class="countdown" aria-live="off"><strong id="selCountdown">20</strong> s</span>
        </div>
        <div class="timer-bar"><span id="selBar"></span></div>
        <p class="online-msg" id="selMsg" role="status">Elige tus 5 cartas antes de que acabe el tiempo.</p>
        <deck-selection></deck-selection>
      </section>
    `;
    this.querySelector("deck-selection").player = this.player;
  }

  tick() {
    const restante = msRestantes(this.match.selectionDeadline);
    this.querySelector("#selCountdown").textContent = Math.ceil(restante / 1000);
    this.querySelector("#selBar").style.width = `${(restante / SELECCION_MS) * 100}%`;
    if (restante === 0 && !this.enviado) this.autocompletar();
  }

  autocompletar() {
    const selector = this.querySelector("deck-selection");
    const seleccion = (selector?.selectedCards ?? []).map((c) => String(c.id));
    const disponibles = selector?.activeCards?.length
      ? selector.activeCards.map((c) => String(c.id))
      : this.player.unlockedCards ?? [];
    this.enviarMazo(completarMazo(seleccion, disponibles));
  }

  async enviarMazo(ids) {
    if (this.enviado) return;
    this.enviado = true;
    const msg = this.querySelector("#selMsg");
    msg.textContent = "Enviando mazo...";
    try {
      this.match = await patchMatch(this.match.id, { [`${this.rol}Deck`]: ids, updatedAt: Date.now() });
      this.querySelector("deck-selection")?.remove();
      msg.textContent = "¡Mazo listo! Esperando al rival...";
    } catch (err) {
      this.enviado = false;
      msg.textContent = err.message;
    }
  }

  async consultar() {
    if (this.consultando || this.cerrado) return;
    this.consultando = true;
    try {
      const actual = await getMatch(this.match.id);
      this.match = actual;
      if (actual.status === "cancelled") return this.salir("match-cancelled", { mensaje: "La partida fue cancelada." });
      if (actual.status === "battling") return this.salir("match-started", { match: actual });
      if (seleccionVencida(actual)) {
        await patchMatch(actual.id, { status: "cancelled", updatedAt: Date.now() });
        return this.salir("match-cancelled", { mensaje: "Un jugador no eligió su mazo a tiempo." });
      }
      if (debeIniciarBatalla(actual, this.rol)) await this.iniciar(actual);
    } catch {
      // Error de red puntual: se reintenta en el siguiente ciclo
    } finally {
      this.consultando = false;
    }
  }

  async iniciar(match) {
    const cards = await getCards();
    const porId = new Map(cards.map((c) => [String(c.id), c]));
    const mazo = (ids) => ids.map((id) => porId.get(String(id))).filter(Boolean);

    const fresco = await getMatch(match.id);
    if (fresco.battleState) return;
    const now = Date.now();
    const actualizado = await patchMatch(match.id, {
      battleState: iniciarBatalla(mazo(match.p1Deck), mazo(match.p2Deck), { now }),
      status: "battling",
      startedAt: new Date(now).toISOString(),
      updatedAt: now,
    });
    this.salir("match-started", { match: actualizado });
  }

  salir(evento, detail) {
    this.cerrado = true;
    clearInterval(this.tickTimer);
    clearInterval(this.pollTimer);
    this.dispatchEvent(new CustomEvent(evento, { detail, bubbles: true }));
  }
}

customElements.define("online-deck-select", OnlineDeckSelect);
