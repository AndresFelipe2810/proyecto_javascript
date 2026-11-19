import { getPlayers, postPlayer } from "../../api/playersApi.js";

export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="register-box">
        <h2>Registro de Entrenador</h2>
        <form id="registerForm">
          <input
            type="text"
            id="nicknameInput"
            placeholder="Elige tu nickname único"
            required
          />
          <button type="submit">Entrar a la arena</button>
        </form>
        <p id="registerMessage"></p>
      </section>
    `;
  }

  configurarEventos() {
    const form = this.querySelector("#registerForm");
    const input = this.querySelector("#nicknameInput");
    const msg = this.querySelector("#registerMessage");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nickname = input.value.trim();
      if (!nickname) return;

      msg.textContent = "Validando nickname...";
      const players = await getPlayers();

      const exists = players.some(
        (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (exists) {
        msg.textContent = "Ese nickname ya está ocupado. ¡Prueba otro!";
        return;
      }

      const newPlayer = {
        id: `player-${Date.now()}`,
        nickname,
        points: 0,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        createdAt: new Date().toISOString(),
      };

      await postPlayer(newPlayer);
      this.dispatchEvent(
        new CustomEvent("player-registered", {
          detail: newPlayer,
          bubbles: true,
        })
      );
      msg.textContent = `¡Bienvenido, ${nickname}! Registro guardado.`;
      input.value = "";
    });
  }
}

customElements.define("player-register", PlayerRegister);