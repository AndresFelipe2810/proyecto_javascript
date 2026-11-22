import { getCards } from "../../api/cardsApi.js";
import { patchPlayer } from "../../api/playersApi.js";
import { MEMORIA, construirParejas, consumirIntentoMemoria, intentosMemoria } from "../../utils/progression.js";
import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";
import { claveTipo } from "../cards/tcgCard.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class MemoryGame extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.ocupado = false;
    this.bloqueado = false;
    this.abiertas = [];
    this.encontradas = 0;
    this.intentosUsados = 0;
  }

  connectedCallback() {
    this.render();
    this.actualizarCuota();
  }

  setPlayer(player) {
    this.player = player;
    this.actualizarCuota();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="progress-box memory-game">
        <h2>Memoria</h2>
        <div class="memory-stats">
          <span class="memory-chip" id="memoryQuota"></span>
          <span class="memory-chip">Tablero <strong id="memoryAttempts">0/${MEMORIA.intentos}</strong></span>
        </div>
        <p class="progress-help">+1 extra cada ${MEMORIA.partidasPorBono} partidas</p>
        <button type="button" id="memoryPlay">Jugar</button>
        <p id="memoryStatus" role="status"></p>
        <div class="memory-board" id="memoryBoard"></div>
      </section>
    `;
    this.querySelector("#memoryPlay").addEventListener("click", () => this.iniciar());
  }

  actualizarCuota() {
    const quota = this.querySelector("#memoryQuota");
    if (!quota) return;
    const { diarios, extra, total } = this.player
      ? intentosMemoria(this.player)
      : { diarios: 0, extra: 0, total: 0 };
    quota.textContent = `Intentos hoy ${diarios}/${MEMORIA.diarios}${extra ? ` · Extra ${extra}` : ""}`;
    this.querySelector("#memoryPlay").disabled = this.ocupado || total === 0;
    if (!this.ocupado && !this.querySelector("#memoryBoard").innerHTML) {
      this.querySelector("#memoryStatus").textContent = total === 0
        ? "Sin intentos hoy. Vuelve mañana o gana partidas para obtener extra."
        : "Pulsa Jugar para empezar.";
    }
  }

  async iniciar() {
    if (this.ocupado || !this.player) return;
    const cambio = consumirIntentoMemoria(this.player);
    if (!cambio) return;

    this.ocupado = true;
    this.bloqueado = true;
    const status = this.querySelector("#memoryStatus");
    const board = this.querySelector("#memoryBoard");
    status.textContent = "Cargando…";
    board.innerHTML = "";
    this.actualizarCuota();

    let fichas;
    try {
      const cards = (await getCards()).filter((c) => c.active !== false);
      if (cards.length < MEMORIA.parejas) throw new Error("No hay cartas suficientes.");
      fichas = construirParejas(cards);
      this.aplicarJugador(await patchPlayer(this.player.id, cambio));
    } catch (err) {
      status.textContent = `No se pudo iniciar: ${err.message}`;
      this.ocupado = false;
      this.actualizarCuota();
      return;
    }

    this.abiertas = [];
    this.encontradas = 0;
    this.intentosUsados = 0;
    this.actualizarIntentos();
    status.textContent = "Encuentra las parejas.";
    board.style.setProperty("--cols", 4);
    board.innerHTML = fichas.map((f, i) => this.plantillaFicha(f, i)).join("");
    board.querySelectorAll(".memory-card").forEach((el) =>
      el.addEventListener("click", () => this.voltear(el))
    );
    this.bloqueado = false;
  }

  actualizarIntentos() {
    this.querySelector("#memoryAttempts").textContent = `${this.intentosUsados}/${MEMORIA.intentos}`;
  }

  aplicarJugador(player) {
    this.player = player;
    this.dispatchEvent(new CustomEvent("progress-updated", { detail: player, bubbles: true }));
  }

  plantillaFicha(ficha, i) {
    const { card } = ficha;
    const nombre = escapar(card.name);
    const imagen = card.image
      ? `<img src="${escapar(card.image)}" alt="" loading="lazy" />`
      : `<span class="memory-fallback">${icon(claveTipo(card.type))}</span>`;
    return /* html */ `
      <button type="button" class="memory-card" data-index="${i}" data-pair="${escapar(ficha.pairId)}"
        data-name="${nombre}" aria-label="Carta boca abajo ${i + 1}">
        <span class="memory-face memory-back">${icon("star")}</span>
        <span class="memory-face memory-front">${imagen}<span class="memory-name">${nombre}</span></span>
      </button>`;
  }

  voltear(el) {
    if (this.bloqueado || el.classList.contains("is-flipped") || el.classList.contains("is-matched")) return;
    el.classList.add("is-flipped");
    this.abiertas.push(el);
    if (this.abiertas.length === 2) this.comparar();
  }

  async comparar() {
    this.bloqueado = true;
    const [a, b] = this.abiertas;
    this.intentosUsados++;
    this.actualizarIntentos();

    if (a.dataset.pair === b.dataset.pair) {
      a.classList.add("is-matched");
      b.classList.add("is-matched");
      a.setAttribute("aria-label", `Pareja encontrada: ${a.dataset.name}`);
      b.setAttribute("aria-label", `Pareja encontrada: ${b.dataset.name}`);
      this.encontradas++;
      this.abiertas = [];
      this.bloqueado = false;
      if (this.encontradas === MEMORIA.parejas) await this.completar();
      return;
    }

    await esperar(700);
    a.classList.remove("is-flipped");
    b.classList.remove("is-flipped");
    this.abiertas = [];
    if (this.intentosUsados >= MEMORIA.intentos) return this.fallar();
    this.bloqueado = false;
  }

  fallar() {
    this.bloqueado = true;
    this.ocupado = false;
    const { total } = intentosMemoria(this.player);
    this.querySelector("#memoryStatus").textContent = total ? "Sin intentos de tablero." : "Sin intentos hoy.";
    this.actualizarCuota();
  }

  async completar() {
    const status = this.querySelector("#memoryStatus");
    status.textContent = "¡Completado! Guardando…";
    this.bloqueado = true;
    try {
      this.aplicarJugador(await patchPlayer(this.player.id, {
        spinsAvailable: (this.player.spinsAvailable ?? 0) + 1,
      }));
      status.textContent = "¡Completado! +1 tiro.";
    } catch (err) {
      status.textContent = `No se guardó el tiro: ${err.message}`;
    }
    this.ocupado = false;
    this.actualizarCuota();
  }
}

customElements.define("memory-game", MemoryGame);
