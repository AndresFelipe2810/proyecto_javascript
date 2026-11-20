import "../auth/playerRegister.js";
import "../deck/deckSelector.js";
import "../battle/battle.js";
import "../leaderboard/leaderboard.js";
import { postBattle } from "../../api/battlesApi.js";
import { getPlayer, patchPlayer } from "../../api/playersApi.js";
import { scoreBattle } from "../../utils/battleEngine.js";

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.currentPlayer = null;
    this.selectedDeck = [];
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <header>
        <h1>Pokémon Card Battle Arena</h1>
        <nav>
          <button id="navPlay">Jugar</button>
          <button id="navRanking">Ranking</button>
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
      const container = this.querySelector("#app-content");
      container.innerHTML = `<battle-arena></battle-arena>`;
      container.querySelector("battle-arena").deck = this.selectedDeck;
    });

    this.addEventListener("battle-finished", (e) => this.guardarPartida(e.detail));
    this.addEventListener("battle-restart", () => this.mostrarSeleccionMazo());

    this.querySelector("#navPlay").addEventListener("click", () => {
      if (this.currentPlayer) this.mostrarSeleccionMazo();
      else this.mostrarRegistro();
    });

    this.querySelector("#navRanking").addEventListener("click", () => {
      this.querySelector("#app-content").innerHTML = `<game-leaderboard></game-leaderboard>`;
    });
  }

  actualizarEncabezado() {
    const p = this.currentPlayer;
    this.querySelector("#playerInfo").textContent =
      `Entrenador: ${p.nickname} · ${p.points ?? 0} pts · ${p.wins ?? 0}V ${p.losses ?? 0}D`;
  }

  mostrarSeleccionMazo() {
    this.querySelector("#app-content").innerHTML = `<deck-selection></deck-selection>`;
  }

  mostrarRegistro() {
    this.querySelector("#app-content").innerHTML = `<player-register></player-register>`;
  }

  // Registra la partida y acumula puntos/contadores del jugador (+50 victoria, +10 derrota)
  async guardarPartida({ won, playerDeck, machineDeck, startedAt, endedAt }) {
    if (!this.currentPlayer) return;

    const { result, pointsAwarded } = scoreBattle(won);
    const status = this.querySelector("#saveStatus");
    status.textContent = "Guardando partida...";

    try {
      await postBattle({
        id: `battle-${Date.now()}`,
        playerId: this.currentPlayer.id,
        playerNickname: this.currentPlayer.nickname,
        result,
        pointsAwarded,
        playerDeck,
        machineDeck,
        startedAt,
        endedAt,
      });

      // Releer al jugador para no sobrescribir cambios hechos en otra pestaña
      const actual = await getPlayer(this.currentPlayer.id);
      this.currentPlayer = await patchPlayer(actual.id, {
        points: actual.points + pointsAwarded,
        wins: actual.wins + (won ? 1 : 0),
        losses: actual.losses + (won ? 0 : 1),
        gamesPlayed: actual.gamesPlayed + 1,
      });

      this.actualizarEncabezado();
      status.textContent = `Partida guardada (+${pointsAwarded} pts).`;
    } catch (err) {
      status.textContent = `No se pudo guardar la partida. ${err.message}`;
    }
  }
}

customElements.define("card-game-app", GameApp);
