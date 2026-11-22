import { getCards } from "../../api/cardsApi.js";
import { renderTcgCard, activarFallbackImagenes } from "../cards/tcgCard.js";
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
import { SOUNDS, playSound, playCardSound, isMuted, toggleMute } from "../../utils/audio.js";

const MACHINE_DELAY_MS = 900;
const DEFEAT_MS = 700;
const HIT_SOUND_DELAY_MS = 180;

const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const muteLabel = () => (isMuted() ? "🔇" : "🔊");

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
    this.machineTimer = null;
    this.startToken = 0;
    this.firstSide = null;
    this.pendingFx = [];
    this.defeatTimer = null;

    // Un solo listener delegado: sobrevive a los re-renders de innerHTML
    this.addEventListener("click", (e) => this.handleClick(e));
  }

  disconnectedCallback() {
    this.startToken++;
    clearTimeout(this.machineTimer);
    clearTimeout(this.defeatTimer);
  }

  set deck(cards) {
    this.deckSource = [...cards];
    this.start();
  }

  async start() {
    const token = ++this.startToken;
    clearTimeout(this.machineTimer);
    clearTimeout(this.defeatTimer);
    this.pendingFx = [];
    this.finished = false;
    this.error = null;
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
    clearTimeout(this.machineTimer);
    this.currentTurn = side;

    // El cooldown del especial avanza al inicio de cada turno propio de la carta
    if (side === "player") {
      this.playerDeck[this.playerIndex] = beginTurn(this.playerDeck[this.playerIndex]);
    } else {
      this.enemyDeck[this.enemyIndex] = beginTurn(this.enemyDeck[this.enemyIndex]);
    }

    this.render();

    if (side === "machine") {
      this.machineTimer = setTimeout(() => this.machineAct(), MACHINE_DELAY_MS);
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
      muteBtn.textContent = muteLabel();
      muteBtn.setAttribute("aria-pressed", String(isMuted()));
      muteBtn.setAttribute("aria-label", isMuted() ? "Activar sonido" : "Silenciar sonido");
      return;
    }

    const btn = e.target.closest("[data-action]");
    if (!btn || this.finished || this.currentTurn !== "player") return;

    const actions = getActions(this.playerDeck[this.playerIndex]);
    const action = actions[Number(btn.dataset.action)];
    if (!action || !action.enabled) return;

    this.performAction("player", action);
  }

  machineAct() {
    this.machineTimer = null;
    if (this.finished || this.currentTurn !== "machine") return;

    const action = chooseMachineAction(this.enemyDeck[this.enemyIndex]);
    this.performAction("machine", action);
  }

  performAction(side, action) {
    const isPlayer = side === "player";
    const actors = isPlayer ? this.playerDeck : this.enemyDeck;
    const targets = isPlayer ? this.enemyDeck : this.playerDeck;
    const ai = isPlayer ? this.playerIndex : this.enemyIndex;
    const ti = isPlayer ? this.enemyIndex : this.playerIndex;

    const { actor, target, log } = resolveAction(actors[ai], targets[ti], action);
    actors[ai] = actor;
    targets[ti] = target;

    const defeated = isCardDefeated(target);
    const targetSide = isPlayer ? "machine" : "player";
    this.queueActionFx(side, targetSide, action, actor, target, defeated);

    this.statusMessage = defeated ? `${log} ¡${target.name} fue derrotado!` : log;

    if (defeated) {
      this.currentTurn = null;
      clearTimeout(this.machineTimer);
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

  queueActionFx(side, targetSide, action, actor, target, defeated) {
    if (action.type === "defense") {
      this.pendingFx.push({ side, cls: "anim-defend" });
      playCardSound(actor, "defense");
      return;
    }

    this.pendingFx.push({ side, cls: action.type === "special" ? "anim-special" : "anim-attack" });
    this.pendingFx.push({ side: targetSide, cls: defeated ? "anim-defeated" : "anim-hit" });
    playCardSound(actor, action.type);
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
    clearTimeout(this.machineTimer);

    const won = this.enemyIndex >= DECK_SIZE;
    playSound(won ? SOUNDS.victory : SOUNDS.defeat);
    this.render();

    this.dispatchEvent(
      new CustomEvent("battle-finished", {
        detail: {
          won,
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
    const actions = getActions(pCard);

    const btn = (a, idx) => {
      const disabled = !myTurn || !a.enabled ? "disabled" : "";
      const dmg = a.type === "defense"
        ? `<span class="act-dmg">${Math.round((pCard.defense?.damageReduction ?? 0) * 100)}% menos</span>`
        : `<span class="act-dmg">${escapar(a.baseDamage)} DMG</span>`;
      const icon = a.type === "defense" ? "🛡️ " : a.type === "special" ? "★ " : "";
      const note = a.enabled ? "" : `<span class="act-note">${escapar(a.reason)}</span>`;
      return `<button class="action-btn action-${a.type}" data-action="${idx}" ${disabled}><span class="act-name">${icon}${escapar(a.name)}</span>${dmg}${note}</button>`;
    };
    const indexed = actions.map((a, idx) => ({ a, idx }));
    const group = (type) => indexed.filter((x) => x.a.type === type).map((x) => btn(x.a, x.idx)).join("");

    this.innerHTML = /* html */ `
      <section class="battle-arena">
        <div class="battle-hud">
          <span class="pill pill-round">Ronda ${this.round}</span>
          <span class="pill pill-turn" data-turn="${myTurn ? "player" : "machine"}">${myTurn ? "Tu turno" : "Turno del rival"}</span>
          <button id="muteBtn" class="mute-btn" type="button" aria-pressed="${isMuted()}" aria-label="${isMuted() ? "Activar sonido" : "Silenciar sonido"}">${muteLabel()}</button>
          <button id="abandonBtn" class="abandon-btn" type="button">Abandonar</button>
        </div>
        <p class="battle-status" role="status" aria-live="polite">${escapar(this.statusMessage)}</p>

        <div class="fighters">
          <div class="fighter" data-side="player">
            <p class="fighter-label">Tú ${this.playerIndex + 1}/${DECK_SIZE}</p>
            ${renderTcgCard(pCard, { compact: true, currentHp: pCard.currentHp })}
            <p class="fighter-status">${pCard.isDefending ? `<span class="pill pill-defending">🛡️ Defendiendo</span>` : ""}</p>
          </div>

          <div class="fighter" data-side="machine">
            <p class="fighter-label">Rival ${this.enemyIndex + 1}/${DECK_SIZE}</p>
            ${renderTcgCard(eCard, { compact: true, currentHp: eCard.currentHp })}
            <p class="fighter-status">${eCard.isDefending ? `<span class="pill pill-defending">🛡️ Defendiendo</span>` : ""}</p>
          </div>
        </div>

        <div class="battle-actions">
          <div class="attack-grid">${group("attack")}</div>
          <div class="utility-row">${group("defense")}${group("special")}</div>
        </div>
      </section>
    `;
    activarFallbackImagenes(this);
    this.flushFx();
  }
}

customElements.define("battle-arena", BattleArena);
