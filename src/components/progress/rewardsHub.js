import "./memoryGame.js";
import "./roulette.js";

export class RewardsHub extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.addEventListener("progress-updated", (e) => this.sincronizar(e.detail));
  }

  connectedCallback() {
    if (this.querySelector(".rewards-hub")) return;
    this.innerHTML = /* html */ `
      <section class="rewards-hub">
        <div class="rewards-slot" id="memorySlot"></div>
        <div class="rewards-slot" id="rouletteSlot"></div>
      </section>
    `;
    const memoria = document.createElement("memory-game");
    memoria.setPlayer(this.player);
    const ruleta = document.createElement("card-roulette");
    ruleta.player = this.player;
    this.querySelector("#memorySlot").append(memoria);
    this.querySelector("#rouletteSlot").append(ruleta);
  }

  sincronizar(player) {
    this.player = player;
    this.querySelectorAll("memory-game, card-roulette").forEach((el) => el.setPlayer(player));
  }
}

customElements.define("rewards-hub", RewardsHub);
