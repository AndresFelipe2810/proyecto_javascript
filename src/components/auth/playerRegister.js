import { getPlayerByNickname, postPlayer } from "../../api/playersApi.js";
import { validarNickname } from "../../utils/validators.js";

export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this.enviando = false;
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
            maxlength="16"
            required
          />
          <button type="submit">Entrar a la arena</button>
        </form>
        <p id="registerMessage" role="status"></p>
      </section>
    `;
  }

  configurarEventos() {
    const form = this.querySelector("#registerForm");
    const input = this.querySelector("#nicknameInput");
    const msg = this.querySelector("#registerMessage");
    const boton = form.querySelector("button");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.enviando) return;

      const nickname = input.value.trim();
      const errorFormato = validarNickname(nickname);
      if (errorFormato) {
        msg.textContent = errorFormato;
        return;
      }

      this.enviando = true;
      boton.disabled = true;
      msg.textContent = "Validando nickname...";

      try {
        if (await getPlayerByNickname(nickname)) {
          msg.textContent = "Ese nickname ya está ocupado. ¡Prueba otro!";
          return;
        }

        const player = await postPlayer({
          nickname,
          points: 0,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          createdAt: new Date().toISOString(),
        });

        msg.textContent = `¡Bienvenido, ${nickname}! Registro guardado.`;
        input.value = "";
        this.dispatchEvent(new CustomEvent("player-registered", { detail: player, bubbles: true }));
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        this.enviando = false;
        boton.disabled = false;
      }
    });
  }
}

customElements.define("player-register", PlayerRegister);
