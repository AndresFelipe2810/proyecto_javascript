import "../auth/playerRegister.js";
import "../deck/deckSelector.js";
import "../battle/battle.js";
import "../leaderboard/leaderboard.js";
import "../cards/cards.js";
import { getBattles, postBattle } from "../../api/battlesApi.js";
import { getPlayer, patchPlayer } from "../../api/playersApi.js";
import { scoreBattle } from "../../utils/battleEngine.js";
import { escapar } from "../../utils/validators.js";

const REINTENTOS = 3;
const SESSION_KEY = "cardBattle.playerId";
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const leerSesion = () => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};

const guardarSesion = (id) => {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento: la sesión solo dura mientras la pestaña esté abierta
  }
};

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.currentPlayer = null;
    this.selectedDeck = [];
    this.batallaActiva = false;
    this.sincronizando = null;
    this.adminLogged = false;
    this.render();
    this.configurarEventos();
  }

  connectedCallback() {
    this.restaurarSesion();
  }

  render() {
    this.innerHTML = /* html */ `
      <header>
        <h1>Pokémon Card Battle Arena</h1>
        <nav>
          <button id="navPlay">Jugar</button>
          <button id="navRanking">Ranking</button>
          <button id="navLogout" hidden>Salir de admin</button>
          <button id="navSwitchPlayer" hidden>Cambiar jugador</button>
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
    this.addEventListener("player-registered", (e) => this.iniciarSesion(e.detail));

    this.addEventListener("deck-selected", (e) => {
      if (!this.currentPlayer) {
        this.mostrarRegistro();
        return;
      }
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

    this.addEventListener("battle-restart", () => {
      this.batallaActiva = false;
      this.mostrarSeleccionMazo();
    });

    this.addEventListener("admin-logged-in", () => {
      this.adminLogged = true;
      this.querySelector("#saveStatus").textContent = "";
      this.actualizarNavAdmin();
      this.mostrarAdmin();
    });

    this.querySelector("#navPlay").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      if (this.currentPlayer) this.mostrarSeleccionMazo();
      else this.mostrarRegistro();
    });

    this.querySelector("#navRanking").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      this.querySelector("#app-content").innerHTML = `<game-leaderboard></game-leaderboard>`;
    });

    this.querySelector("#navLogout").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      this.adminLogged = false;
      this.actualizarNavAdmin();
      if (this.currentPlayer) this.mostrarSeleccionMazo();
      else this.mostrarRegistro();
    });

    this.querySelector("#navSwitchPlayer").addEventListener("click", () => {
      if (!this.confirmarSalida()) return;
      this.cerrarSesion();
    });

    window.addEventListener("beforeunload", (e) => {
      if (!this.batallaActiva) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  async restaurarSesion() {
    const id = leerSesion();
    if (!id) return;
    try {
      this.iniciarSesion(await getPlayer(id), false);
      this.sincronizarJugador(id);
    } catch {
      guardarSesion(null);
    }
  }

  iniciarSesion(player, irAMazo = true) {
    this.currentPlayer = player;
    guardarSesion(player.id);
    this.actualizarEncabezado();
    if (!this.batallaActiva && (irAMazo || this.querySelector("player-register"))) this.mostrarSeleccionMazo();
  }

  cerrarSesion() {
    this.currentPlayer = null;
    this.selectedDeck = [];
    guardarSesion(null);
    this.actualizarEncabezado();
    this.querySelector("#saveStatus").textContent = "";
    this.mostrarRegistro();
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
    this.querySelector("#navSwitchPlayer").hidden = !p;
    this.querySelector("#playerInfo").innerHTML = p
      ? `Entrenador: ${escapar(p.nickname)} · ${p.points ?? 0} pts · ${p.wins ?? 0}V ${p.losses ?? 0}D`
      : "";
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
        playerId: this.currentPlayer.id,
        playerNickname: this.currentPlayer.nickname,
        result,
        pointsAwarded,
        playerDeck,
        machineDeck,
        startedAt,
        endedAt,
      });
    } catch (err) {
      status.textContent = `No se pudo guardar la partida. ${err.message}`;
      return;
    }

    const ok = await this.sincronizarJugador(this.currentPlayer.id);
    if (ok) status.textContent = `Partida guardada (+${battle.pointsAwarded} pts).`;
  }

  // Idempotente: los totales del jugador se recalculan desde su historial de partidas
  sincronizarJugador(playerId) {
    if (this.sincronizando) return this.sincronizando.then(() => this.sincronizarJugador(playerId));
    this.sincronizando = this.sincronizarConReintentos(playerId).finally(() => {
      this.sincronizando = null;
    });
    return this.sincronizando;
  }

  async sincronizarConReintentos(playerId) {
    let ultimoError;
    for (let intento = 1; intento <= REINTENTOS; intento++) {
      try {
        const [actual, partidas] = await Promise.all([
          getPlayer(playerId),
          getBattles(`?playerId=${encodeURIComponent(playerId)}`),
        ]);
        const wins = partidas.filter((b) => b.result === "win").length;
        const totales = {
          points: partidas.reduce((sum, b) => sum + (b.pointsAwarded ?? 0), 0),
          wins,
          losses: partidas.length - wins,
          gamesPlayed: partidas.length,
        };
        const cambia = Object.keys(totales).some((k) => actual[k] !== totales[k]);
        const jugador = cambia ? await patchPlayer(playerId, totales) : actual;
        if (this.currentPlayer?.id === jugador.id) {
          this.currentPlayer = jugador;
          this.actualizarEncabezado();
        }
        return true;
      } catch (err) {
        ultimoError = err;
        await esperar(400 * intento);
      }
    }
    this.mostrarReintento(playerId, ultimoError);
    return false;
  }

  mostrarReintento(playerId, err) {
    const status = this.querySelector("#saveStatus");
    status.textContent = `La partida se registró, pero no se actualizaron tus estadísticas. ${err?.message ?? ""} `;
    const boton = document.createElement("button");
    boton.textContent = "Reintentar";
    boton.addEventListener("click", async () => {
      status.textContent = "Reintentando...";
      if (await this.sincronizarJugador(playerId)) status.textContent = "Estadísticas actualizadas.";
    });
    status.append(boton);
  }
}

customElements.define("card-game-app", GameApp);
