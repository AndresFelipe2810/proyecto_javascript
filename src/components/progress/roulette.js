import { getCards } from "../../api/cardsApi.js";
import { patchPlayer } from "../../api/playersApi.js";
import { resolverSorteo } from "../../utils/progression.js";
import { renderTcgCard, activarFallbackImagenes } from "../cards/tcgCard.js";

const CASILLAS = [
  { tipo: "carta", texto: "Carta nueva" },
  { tipo: "tiro", texto: "Tiro extra" },
  { tipo: "nada", texto: "Sin premio" },
  { tipo: "tiro", texto: "Tiro extra" },
  { tipo: "nada", texto: "Sin premio" },
];

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class CardRoulette extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.girando = false;
    this.activa = 0;
  }

  connectedCallback() {
    this.render();
    this.actualizarVista();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="progress-box roulette">
        <h2>Ruleta de sorteos</h2>
        <p class="progress-help">Cada giro cuesta 1 tiro. Hay 20% de probabilidad de desbloquear una carta nueva.</p>
        <p class="roulette-spins">Tiros disponibles: <strong id="spinCount">0</strong></p>
        <ol class="roulette-track" id="rouletteTrack">
          ${CASILLAS.map((c, i) => `<li class="roulette-cell" data-type="${c.tipo}" data-i="${i}">${c.texto}</li>`).join("")}
        </ol>
        <p id="rouletteStatus" role="status"></p>
        <div id="rouletteResult" class="roulette-result"></div>
        <button type="button" id="spinBtn">Girar</button>
      </section>
    `;
    this.querySelector("#spinBtn").addEventListener("click", () => this.girar());
  }

  setPlayer(player) {
    this.player = player;
    if (this.isConnected) this.actualizarVista();
  }

  actualizarVista() {
    const spins = this.player?.spinsAvailable ?? 0;
    this.querySelector("#spinCount").textContent = spins;
    this.querySelector("#spinBtn").disabled = this.girando || spins <= 0;
  }

  async girar() {
    if (this.girando || !this.player || (this.player.spinsAvailable ?? 0) <= 0) return;
    this.girando = true;
    this.actualizarVista();
    const status = this.querySelector("#rouletteStatus");
    this.querySelector("#rouletteResult").innerHTML = "";
    status.textContent = "Girando...";

    try {
      const cards = (await getCards()).filter((c) => c.active !== false);
      const unlocked = this.player.unlockedCards ?? [];
      const resultado = resolverSorteo(cards, unlocked);
      const spins = (this.player.spinsAvailable ?? 0) - 1 + (resultado.tipo === "tiro" ? 1 : 0);
      const cambios = { spinsAvailable: spins };
      if (resultado.tipo === "carta") cambios.unlockedCards = [...unlocked, resultado.carta.id];

      const actualizado = await patchPlayer(this.player.id, cambios);
      this.player = actualizado;
      this.dispatchEvent(new CustomEvent("progress-updated", { detail: actualizado, bubbles: true }));

      await this.animar(resultado.tipo);
      this.mostrarPremio(resultado);
    } catch (err) {
      status.textContent = `No se pudo girar. ${err.message}`;
    } finally {
      this.girando = false;
      this.actualizarVista();
    }
  }

  async animar(tipo) {
    const celdas = [...this.querySelectorAll(".roulette-cell")];
    const candidatas = celdas.filter((c) => c.dataset.type === tipo).map((c) => Number(c.dataset.i));
    const destino = candidatas[Math.floor(Math.random() * candidatas.length)];
    const pasos = celdas.length * 2 + ((destino - this.activa + celdas.length) % celdas.length);

    for (let paso = 0; paso <= pasos; paso++) {
      this.activa = (this.activa + (paso === 0 ? 0 : 1)) % celdas.length;
      celdas.forEach((c, i) => c.classList.toggle("is-active", i === this.activa));
      const progreso = paso / pasos;
      await esperar(50 + Math.round(progreso * progreso * 220));
    }
  }

  mostrarPremio({ tipo, carta }) {
    const status = this.querySelector("#rouletteStatus");
    const result = this.querySelector("#rouletteResult");
    if (tipo === "carta") {
      status.textContent = `¡Nueva carta desbloqueada: ${carta.name}!`;
      result.innerHTML = renderTcgCard(carta, { compact: true });
      activarFallbackImagenes(result);
    } else if (tipo === "tiro") {
      status.textContent = "¡Tiro extra! Recuperas tu giro.";
    } else {
      status.textContent = "Sin premio esta vez.";
    }
  }
}

customElements.define("card-roulette", CardRoulette);
