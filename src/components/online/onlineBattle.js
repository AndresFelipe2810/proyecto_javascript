import { getMatch, patchMatch } from "../../api/matchesApi.js";
import { activarFallbackImagenes } from "../cards/tcgCard.js";
import { renderFighter } from "../battle/battleCard.js";
import { renderActionButtons } from "../battle/battleControls.js";
import { DECK_SIZE, getActions } from "../../utils/battleEngine.js";
import {
  TURNO_MS,
  aplicarAbandono,
  aplicarAccion,
  aplicarTimeout,
  cartaActiva,
  debeAplicarTimeout,
  estaTerminada,
  msRestantes,
  parcheBatalla,
  rival,
  rolDe,
} from "../../utils/onlineMatch.js";
import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";
import { SOUNDS, playSound, playCardSound, isMuted, toggleMute } from "../../utils/audio.js";

const POLL_MS = 1500;
const TICK_MS = 250;
const HIT_SOUND_DELAY_MS = 180;

const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export class OnlineBattle extends HTMLElement {
  constructor() {
    super();
    this.match = null;
    this.player = null;
    this.rol = null;
    this.state = null;
    this.enviando = false;
    this.consultando = false;
    this.terminado = false;
    this.pendingFx = [];
    this.pollTimer = null;
    this.tickTimer = null;
    this.addEventListener("click", (e) => this.manejarClick(e));
  }

  connectedCallback() {
    if (this.rol) return;
    this.rol = rolDe(this.match, this.player.id);
    this.host = this.closest("card-game-app");
    this.state = this.match.battleState;
    this.pendingFx.push({ side: "player", cls: "anim-enter" }, { side: "machine", cls: "anim-enter" });
    this.render();
    if (estaTerminada(this.state)) return this.finalizar();
    this.pollTimer = setInterval(() => this.consultar(), POLL_MS);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  disconnectedCallback() {
    this.detener();
    if (!this.terminado) this.escribir((s) => aplicarAbandono(s, this.rol));
  }

  detener() {
    clearInterval(this.pollTimer);
    clearInterval(this.tickTimer);
  }

  nick(role) {
    return this.match[`${role}Nickname`];
  }

  sideDe(role) {
    return role === this.rol ? "player" : "machine";
  }

  manejarClick(e) {
    if (e.target.closest("#exitOnlineBtn")) {
      this.dispatchEvent(new CustomEvent("online-exit", { bubbles: true }));
      return;
    }
    if (e.target.closest("#abandonBtn")) {
      if (confirm("¿Abandonar la partida? Contará como derrota.")) this.escribir((s) => aplicarAbandono(s, this.rol));
      return;
    }
    const muteBtn = e.target.closest("#muteBtn");
    if (muteBtn) {
      toggleMute();
      muteBtn.innerHTML = isMuted() ? icon("volume-off") : icon("volume-on");
      muteBtn.setAttribute("aria-pressed", String(isMuted()));
      return;
    }
    const btn = e.target.closest("[data-action]");
    if (!btn || this.enviando || this.state.turn !== this.rol) return;
    this.escribir((s) => aplicarAccion(s, this.rol, Number(btn.dataset.action)));
  }

  // Control optimista: solo se escribe si nadie cambió el estado desde la última lectura
  async escribir(transformar) {
    if (this.enviando) return;
    this.enviando = true;
    this.actualizarBotones();
    try {
      const actual = await getMatch(this.match.id);
      if (actual.battleState?.seq !== this.state.seq || estaTerminada(actual.battleState)) {
        return this.aplicarRemoto(actual);
      }
      const next = transformar(actual.battleState);
      if (!next) return;
      this.aplicarRemoto(await patchMatch(actual.id, parcheBatalla(actual, next)));
    } catch (err) {
      this.mostrarEstado(err.message);
    } finally {
      this.enviando = false;
      this.actualizarBotones();
    }
  }

  async consultar() {
    if (this.consultando || this.enviando || this.terminado) return;
    this.consultando = true;
    try {
      this.aplicarRemoto(await getMatch(this.match.id));
    } catch {
      // Se reintenta en el siguiente ciclo
    } finally {
      this.consultando = false;
    }
  }

  tick() {
    if (this.terminado || !this.state) return;
    const restante = msRestantes(this.state.turnDeadline);
    const bar = this.querySelector("#turnBar");
    const txt = this.querySelector("#turnCountdown");
    if (bar) bar.style.width = `${(restante / TURNO_MS) * 100}%`;
    if (txt) txt.textContent = Math.ceil(restante / 1000);
    if (!this.enviando && debeAplicarTimeout(this.state, this.rol)) {
      this.escribir((s) => aplicarTimeout(s, s.turn));
    }
  }

  aplicarRemoto(match) {
    const nuevo = match.battleState;
    if (!nuevo || nuevo.seq <= this.state.seq) return;
    const previo = this.state;
    this.match = match;
    this.state = nuevo;
    this.reproducirEvento(previo, nuevo);
    if (estaTerminada(nuevo)) return this.finalizar();
    this.render();
  }

  reproducirEvento(previo, nuevo) {
    const ev = nuevo.lastEvent;
    if (!ev || !["attack", "special", "defense"].includes(ev.type)) return;

    const side = this.sideDe(ev.actor);
    const targetRole = rival(ev.actor);
    const actorCard = cartaActiva(nuevo, ev.actor);
    const targetCard = cartaActiva(previo, targetRole);

    if (ev.type === "defense") {
      this.pendingFx.push({ side, cls: "anim-defend" });
      playCardSound(actorCard, "defense");
      return;
    }

    this.pendingFx.push({ side, cls: ev.type === "special" ? "anim-special" : "anim-attack" });
    this.pendingFx.push({ side: this.sideDe(targetRole), cls: ev.defeated ? "anim-enter" : "anim-hit" });
    playCardSound(actorCard, ev.type);
    setTimeout(() => {
      if (ev.defeated) {
        playCardSound(targetCard, "defeated");
        if (!estaTerminada(nuevo)) setTimeout(() => playSound(SOUNDS.enter), 500);
      } else {
        playSound(SOUNDS.hit);
      }
    }, HIT_SOUND_DELAY_MS);
  }

  finalizar() {
    if (this.terminado) return;
    this.terminado = true;
    this.detener();

    const won = this.state.winner === this.rol;
    if (this.isConnected) {
      playSound(won ? SOUNDS.victory : SOUNDS.defeat);
      this.render();
    }

    // Si el jugador salió de la vista, el evento se emite en la app para registrar igual la derrota
    const destino = this.isConnected ? this : this.host;
    destino?.dispatchEvent(
      new CustomEvent("battle-finished", {
        detail: {
          won,
          mode: "online",
          matchId: this.match.id,
          playerDeck: this.match[`${this.rol}Deck`],
          machineDeck: this.match[`${rival(this.rol)}Deck`],
          startedAt: this.match.startedAt,
          endedAt: new Date().toISOString(),
        },
        bubbles: true,
      })
    );
  }

  mensaje() {
    const ev = this.state.lastEvent;
    if (!ev || ev.type === "start") return `${this.nick(this.state.firstTurn)} inicia la batalla.`;
    if (ev.type === "abandon") return `${this.nick(ev.actor)} abandonó la partida.`;
    return ev.log;
  }

  mostrarEstado(texto) {
    const el = this.querySelector(".battle-status");
    if (el) el.textContent = texto;
  }

  actualizarBotones() {
    if (this.terminado) return;
    const habilitado = !this.enviando && this.state.turn === this.rol;
    const acciones = getActions(cartaActiva(this.state, this.rol));
    this.querySelectorAll(".battle-actions .action-btn").forEach((b) => {
      b.disabled = !habilitado || !acciones[Number(b.dataset.action)]?.enabled;
    });
  }

  render() {
    if (this.terminado) {
      const won = this.state.winner === this.rol;
      this.innerHTML = /* html */ `
        <section class="battle-end ${won ? "is-win anim-win" : "is-loss anim-loss"}">
          <h2>${won ? "¡Ganaste la batalla online!" : `${escapar(this.nick(rival(this.rol)))} ganó la batalla.`}</h2>
          <p class="battle-status" role="status">${escapar(this.mensaje())}</p>
          <button id="exitOnlineBtn" class="action-btn action-attack">Volver al menú</button>
        </section>
      `;
      return;
    }

    const yo = cartaActiva(this.state, this.rol);
    const otro = cartaActiva(this.state, rival(this.rol));
    const miTurno = this.state.turn === this.rol;
    const rivalNick = this.nick(rival(this.rol));

    this.innerHTML = /* html */ `
      <section class="battle-arena online-battle">
        <div class="battle-hud">
          <span class="pill pill-round">Ronda ${this.state.round}</span>
          <span class="pill pill-turn" data-turn="${miTurno ? "player" : "machine"}">
            ${miTurno ? "Tu turno" : `Turno de ${escapar(rivalNick)}...`} · <strong id="turnCountdown"></strong> s
          </span>
          <button id="muteBtn" class="mute-btn" type="button" aria-pressed="${isMuted()}" aria-label="Silenciar o activar sonido">${isMuted() ? icon("volume-off") : icon("volume-on")}</button>
          <button id="abandonBtn" class="abandon-btn" type="button">Abandonar</button>
        </div>
        <div class="timer-bar ${miTurno ? "is-mine" : ""}"><span id="turnBar"></span></div>
        <p class="battle-status" role="status" aria-live="polite">${escapar(this.mensaje())}</p>

        <div class="fighters">
          ${renderFighter("player", `Tú ${this.state[this.rol].index + 1}/${DECK_SIZE}`, yo)}
          ${renderFighter("machine", `${rivalNick} ${this.state[rival(this.rol)].index + 1}/${DECK_SIZE}`, otro)}
        </div>

        ${renderActionButtons(yo, miTurno)}
      </section>
    `;
    this.actualizarBotones();
    activarFallbackImagenes(this);
    this.tick();
    this.flushFx();
  }

  flushFx() {
    const fx = this.pendingFx;
    this.pendingFx = [];
    if (prefersReducedMotion()) return;
    fx.forEach(({ side, cls }) => {
      const el = this.querySelector(`.fighter[data-side="${side}"]`);
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      el.addEventListener("animationend", (e) => e.target === el && el.classList.remove(cls), { once: true });
    });
  }
}

customElements.define("online-battle", OnlineBattle);
