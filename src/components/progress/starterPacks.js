import { getCards } from "../../api/cardsApi.js";
import { patchPlayer } from "../../api/playersApi.js";
import { generarSobre } from "../../utils/progression.js";
import { renderTcgCard, activarFallbackImagenes } from "../cards/tcgCard.js";

const SOBRES = [
  { id: "fuego", nombre: "Sobre Fuego", clase: "pack-fire" },
  { id: "agua", nombre: "Sobre Agua", clase: "pack-water" },
  { id: "planta", nombre: "Sobre Planta", clase: "pack-grass" },
];

export class StarterPacks extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.ocupado = false;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="progress-box starter-packs">
        <h2>Elige tu sobre inicial</h2>
        <p class="progress-help">Recibirás 5 cartas para empezar. Elige uno de los 3 sobres.</p>
        <div class="pack-grid">
          ${SOBRES.map(
            (s) => /* html */ `
            <button type="button" class="pack ${s.clase}" data-pack="${s.id}" aria-label="${s.nombre}">
              <span class="pack-name">${s.nombre}</span>
            </button>`
          ).join("")}
        </div>
        <p id="packMessage" role="status"></p>
        <div id="packResult" class="pack-result"></div>
        <button type="button" id="packContinue" hidden>Continuar al mazo</button>
      </section>
    `;
    this.querySelectorAll("[data-pack]").forEach((btn) =>
      btn.addEventListener("click", () => this.abrirSobre(btn))
    );
    this.querySelector("#packContinue").addEventListener("click", () => this.dispatchEvent(new CustomEvent("progress-done", { bubbles: true })));
  }

  async abrirSobre(boton) {
    if (this.ocupado || !this.player) return;
    this.ocupado = true;
    this.querySelectorAll("[data-pack]").forEach((b) => (b.disabled = true));
    const msg = this.querySelector("#packMessage");
    msg.textContent = "Abriendo sobre...";

    try {
      const cards = await getCards();
      const activas = cards.filter((c) => c.active !== false);
      const nuevas = generarSobre(activas, this.player.unlockedCards ?? []);
      const unlockedCards = [...new Set([...(this.player.unlockedCards ?? []), ...nuevas.map((c) => c.id)])];
      const actualizado = await patchPlayer(this.player.id, {
        unlockedCards,
        starterPackClaimed: true,
        spinsAvailable: (this.player.spinsAvailable ?? 0) + 1,
      });
      this.player = actualizado;
      this.mostrarResultado(boton.dataset.pack, nuevas);
      this.dispatchEvent(new CustomEvent("progress-updated", { detail: actualizado, bubbles: true }));
    } catch (err) {
      msg.textContent = err.message;
      this.querySelectorAll("[data-pack]").forEach((b) => (b.disabled = false));
    } finally {
      this.ocupado = false;
    }
  }

  mostrarResultado(packId, cartas) {
    const nombre = SOBRES.find((s) => s.id === packId)?.nombre ?? "Sobre";
    this.querySelector("#packMessage").textContent = `¡${nombre} abierto! Obtuviste ${cartas.length} cartas y 1 tiro de ruleta.`;
    this.querySelector(".pack-grid").hidden = true;
    const grid = this.querySelector("#packResult");
    grid.innerHTML = cartas.map((c) => renderTcgCard(c, { compact: true })).join("");
    activarFallbackImagenes(grid);
    this.querySelector("#packContinue").hidden = false;
  }
}

customElements.define("starter-packs", StarterPacks);
