import { getCards } from "../../api/cardsApi.js";

export class DeckSelection extends HTMLElement {
  constructor() {
    super();
    this.selectedCards = [];
    this.maxCards = 3;
    this.render();
    this.configurarEventos();
    this.cargarCartas();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="deck-section">
        <h2>Selecciona tu equipo (<span id="count">0</span>/${this.maxCards})</h2>
        <div id="cardsGrid" style="display: flex; flex-wrap: wrap; gap: 1rem;"></div>
        <button id="startBattleBtn" disabled style="margin-top: 1rem;">
          ¡Ir a la Batalla!
        </button>
      </section>
    `;
  }

  configurarEventos() {
    const startBtn = this.querySelector("#startBattleBtn");
    startBtn.addEventListener("click", () => {
      if (this.selectedCards.length !== this.maxCards) return;

      this.dispatchEvent(
        new CustomEvent("deck-selected", {
          detail: { deck: [...this.selectedCards] },
          bubbles: true,
        })
      );
    });
  }

  async cargarCartas() {
    const cards = await getCards();
    const activeCards = cards.filter((c) => c.active !== false);
    const grid = this.querySelector("#cardsGrid");

    grid.innerHTML = activeCards
      .map(
        (card) => /* html */ `
        <article class="card-item" data-id="${card.id}" style="border: 1px solid #ccc; padding: 10px; cursor: pointer; width: 150px;">
          <h3>${card.name}</h3>
          <p>Tipo: ${card.type}</p>
          <p>HP: ${card.hp} | ATK: ${card.attack}</p>
        </article>
      `
      )
      .join("");

    grid.querySelectorAll(".card-item").forEach((el) => {
      el.addEventListener("click", () => {
        const card = activeCards.find((c) => String(c.id) === el.dataset.id);
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

    this.querySelector("#count").textContent = this.selectedCards.length;
    this.querySelector("#startBattleBtn").disabled =
      this.selectedCards.length !== this.maxCards;
  }
}

customElements.define("deck-selection", DeckSelection);