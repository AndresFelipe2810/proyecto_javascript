import { getCards } from "../../api/cardsApi.js";
import { activarFallbackImagenes } from "../cards/tcgCard.js";
import { renderFighter } from "./battleCard.js";
import { renderActionButtons } from "./battleControls.js";
import {
  DECK_SIZE,
  MIN_ACTIVE_CARDS,
  createBattleCard,
  beginTurn,
  getActions,
  resolveAction,
  chooseMachineAction,
  isCardDefeated,
} from "../../utils/battleEngine.js";
import { shuffle } from "../../utils/random.js";
import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";
import { SOUNDS, playSound, playCardSound, isMuted, toggleMute } from "../../utils/audio.js";

const TURN_DELAY_MS = 900;
const DEFEAT_MS = 700;
const HIT_SOUND_DELAY_MS = 180;

const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const muteLabel = () => (isMuted() ? icon("volume-off") : icon("volume-on"));

export class BattleArena extends HTMLElement {
  constructor() {
    super();
    this.deckSource = [];
    this.playerDeck = [];
    this.enemyDeck = [];
    this.playerIndex = 0;
    this.enemyIndex = 0;
    this.currentTurn = null; // "player" | "machine"
    this.round = 1;
    this.statusMessage = "";
    this.startedAt = null;
    this.finished = false;
    this.error = null;
    this.turnTimer = null;
    this.autoMode = false;
    this.usedAuto = false;
    this.startToken = 0;
    this.firstSide = null;
    this.pendingFx = [];
    this.defeatTimer = null;

    // Un solo listener delegado: sobrevive a los re-renders de innerHTML
    this.addEventListener("click", (e) => this.handleClick(e));
  }

  disconnectedCallback() {
    this.startToken++;
    clearTimeout(this.turnTimer);
    clearTimeout(this.defeatTimer);
  }

  set deck(cards) {
    this.deckSource = [...cards];
    this.start();
  }

  async start() {
    const token = ++this.startToken;
    clearTimeout(this.turnTimer);
    clearTimeout(this.defeatTimer);
    this.pendingFx = [];
    this.finished = false;
    this.error = null;
    this.usedAuto = this.autoMode;
    this.innerHTML = `<section class="battle-arena"><p>Preparando batalla...</p></section>`;

    try {
      const allCards = await getCards();
      if (token !== this.startToken) return;
      const activeCards = allCards.filter((c) => c.active !== false);
      if (activeCards.length < MIN_ACTIVE_CARDS) {
        throw new Error(`Se necesitan al menos ${MIN_ACTIVE_CARDS} cartas activas (hay ${activeCards.length}).`);
      }

      // La máquina elige entre las cartas que el jugador NO eligió, sin repetir
      const chosenIds = new Set(this.deckSource.map((c) => c.id));
      const pool = activeCards.filter((c) => !chosenIds.has(c.id));
      if (pool.length < DECK_SIZE) {
        throw new Error("No hay suficientes cartas disponibles para la máquina.");
      }

      this.playerDeck = this.deckSource.map(createBattleCard);
      this.enemyDeck = shuffle(pool).slice(0, DECK_SIZE).map(createBattleCard);
      this.playerIndex = 0;
      this.enemyIndex = 0;
      this.round = 1;
      this.startedAt = new Date().toISOString();

      const playerStarts = Math.random() < 0.5;
      this.statusMessage = `${playerStarts ? "Tú" : "La máquina"} inicia la batalla.`;
      this.firstSide = playerStarts ? "player" : "machine";
      this.pendingFx.push({ side: "player", cls: "anim-enter" }, { side: "machine", cls: "anim-enter" });
      this.setTurn(this.firstSide);
    } catch (err) {
      if (token !== this.startToken) return;
      this.error = err.message;
      this.render();
    }
  }

  setTurn(side) {
    clearTimeout(this.turnTimer);
    this.currentTurn = side;

    // El cooldown del especial avanza al inicio de cada turno propio de la carta
    if (side === "player") {
      this.playerDeck[this.playerIndex] = beginTurn(this.playerDeck[this.playerIndex]);
    } else {
      this.enemyDeck[this.enemyIndex] = beginTurn(this.enemyDeck[this.enemyIndex]);
    }

    this.render();

    if (side === "machine" || this.autoMode) {
      this.turnTimer = setTimeout(() => this.autoAct(), TURN_DELAY_MS);
    }
  }

  handleClick(e) {
    if (e.target.closest("#restartBtn")) {
      this.dispatchEvent(new CustomEvent("battle-restart", { bubbles: true }));
      return;
    }

    if (e.target.closest("#abandonBtn")) {
      this.dispatchEvent(new CustomEvent("battle-abandon", { bubbles: true }));
      return;
    }

    const muteBtn = e.target.closest("#muteBtn");
    if (muteBtn) {
      toggleMute();
      muteBtn.innerHTML = muteLabel();
      muteBtn.setAttribute("aria-pressed", String(isMuted()));
      muteBtn.setAttribute("aria-label", isMuted() ? "Activar sonido" : "Silenciar sonido");
      return;
    }

    const modeBtn = e.target.closest("[data-battle-mode]");
    if (modeBtn) {
      this.setMode(modeBtn.dataset.battleMode === "automatic");
      return;
    }

    const btn = e.target.closest("[data-action]");
    if (!btn || this.autoMode || this.finished || this.currentTurn !== "player") return;

    const actions = getActions(this.playerDeck[this.playerIndex]);
    const action = actions[Number(btn.dataset.action)];
    if (!action || !action.enabled) return;

    this.performAction("player", action);
  }

  setMode(auto) {
    if (this.finished || this.autoMode === auto) return;
    this.autoMode = auto;
    if (auto) this.usedAuto = true;

    // Solo cambia mi turno: el de la máquina ya está programado. No usa setTurn para no bajar el cooldown
    if (this.currentTurn === "player") {
      clearTimeout(this.turnTimer);
      if (auto) this.turnTimer = setTimeout(() => this.autoAct(), TURN_DELAY_MS);
    }

    this.render();
  }

  // Juega el turno actual sin botones: siempre la máquina, y también el jugador en modo automático
  autoAct() {
    this.turnTimer = null;
    if (this.finished || !this.currentTurn) return;

    const side = this.currentTurn;
    const card = side === "player" ? this.playerDeck[this.playerIndex] : this.enemyDeck[this.enemyIndex];
    this.performAction(side, chooseMachineAction(card));
  }

  performAction(side, action) {
    const isPlayer = side === "player";
    const actors = isPlayer ? this.playerDeck : this.enemyDeck;
    const targets = isPlayer ? this.enemyDeck : this.playerDeck;
    const ai = isPlayer ? this.playerIndex : this.enemyIndex;
    const ti = isPlayer ? this.enemyIndex : this.playerIndex;

    const { actor, target, log, dodged, isCritical } = resolveAction(actors[ai], targets[ti], action);
    actors[ai] = actor;
    targets[ti] = target;

    const defeated = isCardDefeated(target);
    const targetSide = isPlayer ? "machine" : "player";
    this.queueActionFx(side, targetSide, action, actor, target, defeated, dodged, isCritical);

    this.statusMessage = defeated ? `${log} ¡${target.name} fue derrotado!` : log;

    if (defeated) {
      this.currentTurn = null;
      clearTimeout(this.turnTimer);
      this.render();
      this.defeatTimer = setTimeout(() => this.afterDefeat(side), DEFEAT_MS);
      return;
    }

    this.advanceTurn(side);
  }

  afterDefeat(side) {
    this.defeatTimer = null;
    if (side === "player") this.enemyIndex += 1;
    else this.playerIndex += 1;

    if (this.enemyIndex >= DECK_SIZE || this.playerIndex >= DECK_SIZE) {
      this.endBattle();
      return;
    }

    this.pendingFx.push({ side: side === "player" ? "machine" : "player", cls: "anim-enter" });
    playSound(SOUNDS.enter);
    this.advanceTurn(side);
  }

  advanceTurn(side) {
    // Una ronda se completa cuando actúa el segundo participante del sorteo
    if (side !== this.firstSide) this.round += 1;
    this.setTurn(side === "player" ? "machine" : "player");
  }

  queueActionFx(side, targetSide, action, actor, target, defeated, dodged, isCritical) {
    if (action.type === "defense") {
      this.pendingFx.push({ side, cls: "anim-defend" });
      playCardSound(actor, "defense");
      return;
    }

    this.pendingFx.push({ side, cls: action.type === "special" ? "anim-special" : "anim-attack" });
    let targetCls = "anim-hit";
    if (isCritical) targetCls = "anim-critical";
    if (dodged) targetCls = "anim-dodge";
    if (defeated) targetCls = "anim-defeated";
    this.pendingFx.push({ side: targetSide, cls: targetCls });
    playCardSound(actor, action.type);

    if (dodged) return;
    setTimeout(() => {
      if (defeated) playCardSound(target, "defeated");
      else playSound(SOUNDS.hit);
    }, HIT_SOUND_DELAY_MS);
  }

  flushFx() {
    const fx = this.pendingFx;
    this.pendingFx = [];
    if (prefersReducedMotion()) {
      fx.filter((f) => f.cls === "anim-defeated").forEach((f) => this.playAnim(f.side, f.cls));
      return;
    }
    fx.forEach((f) => this.playAnim(f.side, f.cls));
  }

  playAnim(side, cls) {
    const el = this.querySelector(`.fighter[data-side="${side}"]`);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (cls === "anim-defeated") return;
    el.addEventListener(
      "animationend",
      (e) => {
        if (e.target === el) el.classList.remove(cls);
      },
      { once: true }
    );
  }

  endBattle() {
    this.finished = true;
    this.currentTurn = null;
    clearTimeout(this.turnTimer);

    const won = this.enemyIndex >= DECK_SIZE;
    playSound(won ? SOUNDS.victory : SOUNDS.defeat);
    this.render();

    this.dispatchEvent(
      new CustomEvent("battle-finished", {
        detail: {
          won,
          mode: this.usedAuto ? "automatic" : "cpu",
          playerDeck: this.deckSource.map((c) => c.id),
          machineDeck: this.enemyDeck.map((c) => c.id),
          startedAt: this.startedAt,
          endedAt: new Date().toISOString(),
        },
        bubbles: true,
      })
    );
  }

  render() {
    if (this.error) {
      this.innerHTML = /* html */ `
        <section class="battle-end">
          <p class="error">${escapar(this.error)}</p>
          <button id="restartBtn" class="action-btn action-attack">Volver a seleccionar mazo</button>
        </section>
      `;
      return;
    }

    if (this.finished) {
      const won = this.enemyIndex >= DECK_SIZE;
      this.innerHTML = /* html */ `
        <section class="battle-end ${won ? "is-win anim-win" : "is-loss anim-loss"}">
          <h2>${won ? "¡Ganaste la batalla!" : "La CPU ganó la batalla."}</h2>
          <p class="battle-status" role="status">${escapar(this.statusMessage)}</p>
          <button id="restartBtn" class="action-btn action-attack">Volver a seleccionar mazo</button>
        </section>
      `;
      return;
    }

    const pCard = this.playerDeck[this.playerIndex];
    const eCard = this.enemyDeck[this.enemyIndex];
    const myTurn = this.currentTurn === "player";

    this.innerHTML = /* html */ `
      <section class="battle-arena">
        <div class="battle-hud">
          <span class="pill pill-round">Ronda ${this.round}</span>
          <span class="pill pill-turn" data-turn="${myTurn ? "player" : "machine"}">${myTurn ? "Tu turno" : "Turno del rival"}</span>
          <button id="muteBtn" class="mute-btn" type="button" aria-pressed="${isMuted()}" aria-label="${isMuted() ? "Activar sonido" : "Silenciar sonido"}">${muteLabel()}</button>
          <button id="abandonBtn" class="abandon-btn" type="button">Abandonar</button>
        </div>
        <p class="battle-status" role="status" aria-live="polite">${escapar(this.statusMessage)}</p>
        ${this.autoMode ? `<p class="auto-notice">Batalla controlada automáticamente</p>` : ""}

        <div class="fighters">
          ${renderFighter("player", `Tú ${this.playerIndex + 1}/${DECK_SIZE}`, pCard)}
          ${renderFighter("machine", `Rival ${this.enemyIndex + 1}/${DECK_SIZE}`, eCard)}
        </div>

        <div class="mode-toggle">
          <button class="mode-toggle-btn" type="button" data-battle-mode="manual" aria-pressed="${!this.autoMode}">Manual</button>
          <button class="mode-toggle-btn" type="button" data-battle-mode="automatic" aria-pressed="${this.autoMode}">Automático</button>
        </div>
        ${renderActionButtons(pCard, myTurn && !this.autoMode)}
      </section>
    `;
    activarFallbackImagenes(this);
    this.flushFx();
  }
}

customElements.define("battle-arena", BattleArena);
