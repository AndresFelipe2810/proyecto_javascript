import { getCards } from "../../api/cardsApi.js";
import { escapar } from "../../utils/validators.js";
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
        <h2>Selecciona tu equipo (<span id="count">0</span>/${this.maxCards})</h2>
        <p id="deckMessage"></p>
        <div id="cardsGrid" style="display: flex; flex-wrap: wrap; gap: 1rem;"></div>
        <h3>Orden de combate</h3>
        <ol id="orderList"></ol>
        <button id="startBattleBtn" disabled style="margin-top: 1rem;">
          ¡Ir a la Batalla!
        </button>
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
    grid.innerHTML = this.activeCards
      .map(
        (card) => /* html */ `
        <article class="card-item" data-id="${escapar(card.id)}" style="border: 1px solid #ccc; padding: 10px; cursor: pointer; width: 150px;">
          <h3>${escapar(card.name)}</h3>
          <p>Tipo: ${escapar(card.type)}</p>
          <p>HP: ${card.hp} | Ataques: ${card.attacks?.length ?? 0}</p>
        </article>
      `
      )
      .join("");

    grid.querySelectorAll(".card-item").forEach((el) => {
      el.addEventListener("click", () => {
        const card = this.activeCards.find((c) => String(c.id) === el.dataset.id);
        this.toggleCard(card, el);
      });
    });
  }

  toggleCard(card, element) {
    const index = this.selectedCards.findIndex((c) => c.id === card.id);

    if (index > -1) {
      this.selectedCards.splice(index, 1);
      element.style.borderColor = "#ccc";
    } else if (this.selectedCards.length < this.maxCards) {
      this.selectedCards.push(card);
      element.style.borderColor = "green";
    }

    this.actualizarVista();
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

    this.querySelector("#startBattleBtn").disabled = !this.puedeIniciar();
  }

  puedeIniciar() {
    return this.selectedCards.length === this.maxCards && this.activeCards.length >= MIN_ACTIVE_CARDS;
  }
}

customElements.define("deck-selection", DeckSelection);
