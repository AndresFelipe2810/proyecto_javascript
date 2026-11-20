import { getCards } from "../../api/cardsApi.js";
import { escapar } from "../../utils/validators.js";
import { renderTcgCard, activarFallbackImagenes } from "../cards/tcgCard.js";
import { DECK_SIZE, MIN_ACTIVE_CARDS } from "../../utils/battleEngine.js";

export class DeckSelection extends HTMLElement {
  constructor() {
    super();
    this.selectedCards = [];
    this.maxCards = DECK_SIZE;
    this.activeCards = [];
    this.render();
    this.configurarEventos();
    this.cargarCartas();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="deck-section">
        <h2>Selecciona tu equipo</h2>
        <div class="deck-bar">
          <span class="deck-counter">Mazo: <span id="count">0</span>/${this.maxCards}</span>
        </div>
        <p id="deckMessage"></p>
        <div id="cardsGrid"></div>
        <h3>Orden de combate</h3>
        <ol id="orderList"></ol>
        <div class="deck-actions">
          <button id="startBattleBtn" disabled>¡Ir a la Batalla!</button>
        </div>
      </section>
    `;
  }

  configurarEventos() {
    this.querySelector("#startBattleBtn").addEventListener("click", () => {
      if (!this.puedeIniciar()) return;

      this.dispatchEvent(
        new CustomEvent("deck-selected", {
          detail: { deck: [...this.selectedCards] },
          bubbles: true,
        })
      );
    });

    // Botones de orden (↑ / ↓) delegados en el componente
    this.addEventListener("click", (e) => {
      const move = e.target.closest("[data-move]");
      if (!move) return;
      this.moverCarta(Number(move.dataset.index), move.dataset.move === "up" ? -1 : 1);
    });
  }

  async cargarCartas() {
    const msg = this.querySelector("#deckMessage");
    msg.textContent = "Cargando cartas...";
    let cards;
    try {
      cards = await getCards();
    } catch (err) {
      msg.textContent = err.message;
      return;
    }
    this.activeCards = cards.filter((c) => c.active !== false);
    msg.textContent = "";

    if (this.activeCards.length < MIN_ACTIVE_CARDS) {
      this.querySelector("#deckMessage").textContent =
        `Se necesitan al menos ${MIN_ACTIVE_CARDS} cartas activas para jugar (hay ${this.activeCards.length}).`;
      return;
    }

    const grid = this.querySelector("#cardsGrid");
    grid.innerHTML = this.activeCards.map((card) => renderTcgCard(card)).join("");
    activarFallbackImagenes(grid);

    grid.querySelectorAll(".tcg-card").forEach((el) => {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-pressed", "false");
      const alternar = () => {
        const card = this.activeCards.find((c) => String(c.id) === el.dataset.id);
        this.toggleCard(card);
      };
      el.addEventListener("click", alternar);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          alternar();
        }
      });
    });
  }

  toggleCard(card) {
    const index = this.selectedCards.findIndex((c) => c.id === card.id);

    if (index > -1) {
      this.selectedCards.splice(index, 1);
    } else if (this.selectedCards.length < this.maxCards) {
      this.selectedCards.push(card);
    }

    this.actualizarVista();
  }

  marcarSeleccion() {
    this.querySelectorAll("#cardsGrid .tcg-card").forEach((el) => {
      const i = this.selectedCards.findIndex((c) => String(c.id) === el.dataset.id);
      el.classList.toggle("is-selected", i > -1);
      el.setAttribute("aria-pressed", String(i > -1));
      el.querySelector(".tcg-order")?.remove();
      if (i > -1) el.querySelector(".tcg-art")?.insertAdjacentHTML("afterbegin",`<span class="tcg-order">${i + 1}</span>`);
    });
  }

  moverCarta(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= this.selectedCards.length) return;

    [this.selectedCards[index], this.selectedCards[target]] = [
      this.selectedCards[target],
      this.selectedCards[index],
    ];
    this.actualizarVista();
  }

  actualizarVista() {
    const n = this.selectedCards.length;
    this.querySelector("#count").textContent = n;

    const faltan = this.maxCards - n;
    this.querySelector("#deckMessage").textContent =
      faltan > 0 ? `Te faltan ${faltan} carta(s) para completar el equipo.` : "";

    this.querySelector("#orderList").innerHTML = this.selectedCards
      .map(
        (card, i) => /* html */ `
        <li>
          ${escapar(card.name)}
          <button data-move="up" data-index="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button data-move="down" data-index="${i}" ${i === n - 1 ? "disabled" : ""}>↓</button>
        </li>
      `
      )
      .join("");

    this.marcarSeleccion();
    this.querySelector("#startBattleBtn").disabled = !this.puedeIniciar();
  }

  puedeIniciar() {
    return this.selectedCards.length === this.maxCards && this.activeCards.length >= MIN_ACTIVE_CARDS;
  }
}

customElements.define("deck-selection", DeckSelection);
