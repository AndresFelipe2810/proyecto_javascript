import "../auth/playerRegister.js";
import "../deck/deckSelector.js";
import "../battle/battle.js";
import "../leaderboard/leaderboard.js";
import "../auth/adminLogin.js";
import "../cards/cards.js";
import { getBattles, patchBattle, postBattle } from "../../api/battlesApi.js";
import { getPlayer, patchPlayer } from "../../api/playersApi.js";
import { scoreBattle } from "../../utils/battleEngine.js";

const REINTENTOS = 3;
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.currentPlayer = null;
    this.selectedDeck = [];
    this.batallaActiva = false;
    this.pendientes = new Map();
    this.adminLogged = false;
    this.render();
    this.configurarEventos();
  }

  connectedCallback() {
    this.reconciliarPendientes();
  }

  render() {
    this.innerHTML = /* html */ `
      <header>
        <h1>Pokémon Card Battle Arena</h1>
        <nav>
          <button id="navPlay">Jugar</button>
          <button id="navRanking">Ranking</button>
          <button id="navAdmin">Administración</button>
          <button id="navLogout" hidden>Salir de admin</button>
        </nav>
        <p id="playerInfo"></p>
        <p id="saveStatus" role="status"></p>
      </header>
      <main id="app-content">
        <player-register></player-register>
      </main>
    `;
  }

  configurarEventos() {
    this.addEventListener("player-registered", (e) => {
      this.currentPlayer = e.detail;
      this.actualizarEncabezado();
      this.mostrarSeleccionMazo();
    });

    // Escuchar selección de mazo y montar la arena de batalla
    this.addEventListener("deck-selected", (e) => {
      this.selectedDeck = e.detail.deck;
      this.batallaActiva = true;
      const container = this.querySelector("#app-content");
      container.innerHTML = `<battle-arena></battle-arena>`;
      container.querySelector("battle-arena").deck = this.selectedDeck;
    });

    this.addEventListener("battle-finished", (e) => {
      this.batallaActiva = false;
      this.guardarPartida(e.detail);
    });
    this.addEventListener("battle-restart", () => this.mostrarSeleccionMazo());

    this.querySelector("#navPlay").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      if (this.currentPlayer) this.mostrarSeleccionMazo();
      else this.mostrarRegistro();
    });

    this.querySelector("#navRanking").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      this.querySelector("#app-content").innerHTML = `<game-leaderboard></game-leaderboard>`;
    });

    this.addEventListener("admin-logged-in", () => {
      this.adminLogged = true;
      this.actualizarNavAdmin();
      this.mostrarAdmin();
    });

    this.querySelector("#navAdmin").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      if (this.adminLogged) this.mostrarAdmin();
      else this.querySelector("#app-content").innerHTML = `<admin-login></admin-login>`;
    });

    this.querySelector("#navLogout").addEventListener("click", () => {
      this.adminLogged = false;
      this.actualizarNavAdmin();
      this.querySelector("#app-content").innerHTML = `<admin-login></admin-login>`;
    });
  }

  actualizarNavAdmin() {
    this.querySelector("#navLogout").hidden = !this.adminLogged;
  }

  mostrarAdmin() {
    this.querySelector("#app-content").innerHTML = `<admin-cards></admin-cards>`;
  }

  confirmarSalida() {
    if (!this.batallaActiva) return true;
    if (!confirm("Hay una batalla en curso. Si sales, la partida se perderá. ¿Continuar?")) return false;
    this.batallaActiva = false;
    return true;
  }

  actualizarEncabezado() {
    const p = this.currentPlayer;
    if (!p) return;
    this.querySelector("#playerInfo").textContent =
      `Entrenador: ${p.nickname} · ${p.points ?? 0} pts · ${p.wins ?? 0}V ${p.losses ?? 0}D`;
  }

  mostrarSeleccionMazo() {
    this.querySelector("#app-content").innerHTML = `<deck-selection></deck-selection>`;
  }

  mostrarRegistro() {
    this.querySelector("#app-content").innerHTML = `<player-register></player-register>`;
  }

  async guardarPartida({ won, playerDeck, machineDeck, startedAt, endedAt }) {
    if (!this.currentPlayer) return;

    const { result, pointsAwarded } = scoreBattle(won);
    const status = this.querySelector("#saveStatus");
    status.textContent = "Guardando partida...";

    let battle;
    try {
      battle = await postBattle({
        id: `battle-${Date.now()}`,
        playerId: this.currentPlayer.id,
        playerNickname: this.currentPlayer.nickname,
        result,
        pointsAwarded,
        playerDeck,
        machineDeck,
        startedAt,
        endedAt,
        statsApplied: false,
      });
    } catch (err) {
      status.textContent = `No se pudo guardar la partida. ${err.message}`;
      return;
    }

    await this.aplicarEstadisticas(battle);
  }

  // Acumula puntos y contadores del jugador; si falla, deja la partida pendiente con reintento
  async aplicarEstadisticas(battle) {
    const estado = this.pendientes.get(battle.id) ?? { battle, jugadorActualizado: false };
    this.pendientes.set(battle.id, estado);
    const status = this.querySelector("#saveStatus");
    let ultimoError;

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      try {
        if (!estado.jugadorActualizado) {
          await this.actualizarJugador(battle);
          estado.jugadorActualizado = true;
        }
        await patchBattle(battle.id, { statsApplied: true });
        this.pendientes.delete(battle.id);
        this.actualizarEncabezado();
        status.textContent = `Partida guardada (+${battle.pointsAwarded} pts).`;
        return true;
      } catch (err) {
        ultimoError = err;
        await esperar(400 * intento);
      }
    }

    this.mostrarReintento(battle, ultimoError);
    return false;
  }

  async actualizarJugador(battle) {
    const won = battle.result === "win";
    const actual = await getPlayer(battle.playerId);
    const actualizado = await patchPlayer(actual.id, {
      points: (actual.points ?? 0) + battle.pointsAwarded,
      wins: (actual.wins ?? 0) + (won ? 1 : 0),
      losses: (actual.losses ?? 0) + (won ? 0 : 1),
      gamesPlayed: (actual.gamesPlayed ?? 0) + 1,
    });
    if (this.currentPlayer?.id === actualizado.id) this.currentPlayer = actualizado;
  }

  mostrarReintento(battle, err) {
    const status = this.querySelector("#saveStatus");
    status.textContent = `La partida se registró, pero no se actualizaron tus estadísticas. ${err?.message ?? ""} `;
    const boton = document.createElement("button");
    boton.textContent = "Reintentar";
    boton.addEventListener("click", () => this.aplicarEstadisticas(battle));
    status.append(boton);
  }

  // Aplica estadísticas de partidas guardadas que quedaron sin aplicar (p. ej. tras recargar)
  async reconciliarPendientes() {
    try {
      const pendientes = await getBattles("?statsApplied=false");
      for (const battle of pendientes) {
        if (!this.pendientes.has(battle.id)) await this.aplicarEstadisticas(battle);
      }
    } catch {
      // Se reintentará al volver a cargar la aplicación
    }
  }
}

customElements.define("card-game-app", GameApp);
