import { getCards } from "../../api/cardsApi.js";
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

const MACHINE_DELAY_MS = 900;

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

    // Un solo listener delegado: sobrevive a los re-renders de innerHTML
    this.addEventListener("click", (e) => this.handleClick(e));
  }

  disconnectedCallback() {
    this.startToken++;
    clearTimeout(this.machineTimer);
  }

  set deck(cards) {
    this.deckSource = [...cards];
    this.start();
  }

  async start() {
    const token = ++this.startToken;
    clearTimeout(this.machineTimer);
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

    let message = log;
    if (isCardDefeated(target)) {
      message += ` ¡${target.name} fue derrotado!`;
      if (isPlayer) this.enemyIndex += 1;
      else this.playerIndex += 1;
    }
    this.statusMessage = message;

    if (this.enemyIndex >= DECK_SIZE || this.playerIndex >= DECK_SIZE) {
      this.endBattle();
      return;
    }

    // Una ronda se completa cuando actúa el segundo participante del sorteo
    if (side !== this.firstSide) this.round += 1;
    this.setTurn(isPlayer ? "machine" : "player");
  }

  endBattle() {
    this.finished = true;
    this.currentTurn = null;
    clearTimeout(this.machineTimer);

    const won = this.enemyIndex >= DECK_SIZE;
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
          <button id="restartBtn">Volver a seleccionar mazo</button>
        </section>
      `;
      return;
    }

    if (this.finished) {
      const won = this.enemyIndex >= DECK_SIZE;
      this.innerHTML = /* html */ `
        <section class="battle-end">
          <h2>${won ? "¡Ganaste la batalla!" : "La CPU ganó la batalla."}</h2>
          <p class="battle-status">${escapar(this.statusMessage)}</p>
          <button id="restartBtn">Volver a seleccionar mazo</button>
        </section>
      `;
      return;
    }

    const pCard = this.playerDeck[this.playerIndex];
    const eCard = this.enemyDeck[this.enemyIndex];
    const myTurn = this.currentTurn === "player";
    const actions = getActions(pCard);

    const label = (a) => {
      if (a.type === "attack") return `${a.name} (${a.baseDamage} DMG)`;
      if (a.type === "defense") return `Defensa: ${a.name}`;
      return `Poder: ${a.name} (${a.baseDamage} DMG)`;
    };

    this.innerHTML = /* html */ `
      <section class="battle-arena">
        <p>Ronda ${this.round} · <strong>${myTurn ? "Tu turno" : "Turno de la máquina"}</strong></p>
        <p class="battle-status">${escapar(this.statusMessage)}</p>

        <div style="display: flex; justify-content: space-between; gap: 2rem;">
          <article class="fighter">
            <h3>Tu carta (${this.playerIndex + 1}/${DECK_SIZE}): ${escapar(pCard.name)}</h3>
            <p>HP: ${pCard.currentHp} / ${pCard.hp}</p>
            ${pCard.isDefending ? "<p>🛡️ Defendiendo</p>" : ""}
          </article>

          <article class="fighter">
            <h3>Rival (${this.enemyIndex + 1}/${DECK_SIZE}): ${escapar(eCard.name)}</h3>
            <p>HP: ${eCard.currentHp} / ${eCard.hp}</p>
            ${eCard.isDefending ? "<p>🛡️ Defendiendo</p>" : ""}
          </article>
        </div>

        <div class="battle-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${actions
            .map((a, idx) => {
              const disabled = !myTurn || !a.enabled ? "disabled" : "";
              const note = a.enabled ? "" : ` — ${a.reason}`;
              return `<button class="action-btn action-${a.type}" data-action="${idx}" ${disabled}>${escapar(label(a))}${escapar(note)}</button>`;
            })
            .join("")}
        </div>
      </section>
    `;
  }
}

customElements.define("battle-arena", BattleArena);
