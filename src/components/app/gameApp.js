import "../auth/playerRegister.js";
import "../deck/deckSelector.js";

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.currentPlayer = null;
    this.selectedDeck = []; // <-- Agregado aquí
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <header>
        <h1>Pokémon Card Battle Arena</h1>
        <p id="playerInfo"></p>
      </header>
      <main id="app-content">
        <player-register></player-register>
      </main>
    `;
  }

  configurarEventos() {
    this.addEventListener("player-registered", (e) => {
      this.currentPlayer = e.detail;
      this.querySelector("#playerInfo").textContent = `Entrenador: ${this.currentPlayer.nickname}`;
      this.querySelector("#app-content").innerHTML = `<deck-selection></deck-selection>`;
    });

    // Escuchar selección de mazo y preparar la siguiente etapa
    this.addEventListener("deck-selected", (e) => {
      this.selectedDeck = e.detail.deck;
      this.querySelector("#app-content").innerHTML = /* html */ `
        <p>Mazo listo (${this.selectedDeck.length} cartas). Siguiente fase: batalla.</p>
      `;
    });
  }
}

customElements.define("card-game-app", GameApp);