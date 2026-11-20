import { escapar } from "../../utils/validators.js";
import { getPlayers } from "../../api/playersApi.js";

export class GameLeaderboard extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.cargar();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="leaderboard">
        <h2>Ranking</h2>
        <p id="lbStatus">Cargando...</p>
        <div id="podium" style="display: flex; gap: 1rem; flex-wrap: wrap;"></div>
        <ol id="lbList"></ol>
      </section>
    `;
  }

  async cargar() {
    const status = this.querySelector("#lbStatus");
    try {
      const players = (await getPlayers()).sort(
        (a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.wins ?? 0) - (a.wins ?? 0) || (a.gamesPlayed ?? 0) - (b.gamesPlayed ?? 0)
      );
      status.textContent = players.length ? "" : "Aún no hay jugadores.";

      const medallas = ["1.er lugar", "2.º lugar", "3.er lugar"];
      this.querySelector("#podium").innerHTML = players
        .slice(0, 3)
        .map(
          (p, i) => /* html */ `
          <article class="podium-place place-${i + 1}">
            <span>${medallas[i]}</span>
            <h3>${escapar(p.nickname)}</h3>
            <p>Puntaje: ${p.points ?? 0}</p>
            <p>Victorias: ${p.wins ?? 0} · Partidas: ${p.gamesPlayed ?? 0}</p>
          </article>
        `
        )
        .join("");

      this.querySelector("#lbList").innerHTML = players
        .map(
          (p) => /* html */ `
          <li>${escapar(p.nickname)} — ${p.points ?? 0} pts · ${p.wins ?? 0} victorias · ${p.gamesPlayed ?? 0} partidas</li>
        `
        )
        .join("");
    } catch (err) {
      status.textContent = `No se pudo cargar el ranking. ${err.message}`;
    }
  }
}

customElements.define("game-leaderboard", GameLeaderboard);
