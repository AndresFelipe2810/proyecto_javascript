import { getPlayerByNickname, postPlayer } from "../../api/playersApi.js";
import { servidorListo } from "../../api/serverState.js";
import { loginAdmin } from "../../api/adminsApi.js";
import { ADMIN_NICKNAME } from "../../api/apiConfig.js";
import { validarNickname, validarPassword } from "../../utils/validators.js";
import { generarSalt, hashPassword, verificarPassword } from "../../utils/crypto.js";

const MODOS = {
  base: { boton: "Entrar a la arena", ayuda: "", auto: "current-password" },
  admin: { boton: "Entrar como admin", ayuda: "", auto: "current-password" },
  login: { boton: "Iniciar sesión", ayuda: "Nickname registrado. Ingresa tu contraseña.", auto: "current-password" },
  registro: {
    boton: "Crear cuenta",
    ayuda: "Nickname disponible. Crea una contraseña (mínimo 6 caracteres).",
    auto: "new-password",
  },
  legacy: { boton: "Entrar a la arena", ayuda: "Esta cuenta no tiene contraseña. Elige otro nickname.", auto: "current-password" },
};

const sinCredenciales = ({ passwordHash, salt, ...publico }) => publico;

export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this.enviando = false;
    this.modo = "base";
    this.jugadorExistente = null;
    this.consulta = 0;
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
          <input
            type="password"
            id="passwordInput"
            placeholder="Contraseña"
            autocomplete="current-password"
            hidden
          />
          <button type="submit">Entrar a la arena</button>
        </form>
        <p id="registerMessage" role="status"></p>
      </section>
    `;
  }

  disconnectedCallback() {
    window.removeEventListener("server-state", this.alServidor);
  }

  configurarEventos() {
    const form = this.querySelector("#registerForm");
    const input = this.querySelector("#nicknameInput");
    const msg = this.querySelector("#registerMessage");
    const boton = form.querySelector("button");
    const pass = this.querySelector("#passwordInput");
    const esAdmin = () => input.value.trim().toLowerCase() === ADMIN_NICKNAME;
    let temporizador;

    const aplicarModo = (modo) => {
      this.modo = modo;
      const cfg = MODOS[modo];
      const conClave = modo !== "base" && modo !== "legacy";
      pass.hidden = !conClave;
      pass.required = conClave;
      pass.autocomplete = cfg.auto;
      if (!conClave) pass.value = "";
      boton.textContent = cfg.boton;
      this.sincronizarServidor?.();
      msg.textContent = cfg.ayuda;
    };

    const detectarModo = async () => {
      const nickname = input.value.trim();
      const id = ++this.consulta;
      this.jugadorExistente = null;
      if (esAdmin()) return aplicarModo("admin");
      if (validarNickname(nickname)) return aplicarModo("base");
      try {
        const existente = await getPlayerByNickname(nickname);
        if (id !== this.consulta) return;
        this.jugadorExistente = existente;
        if (!existente) aplicarModo("registro");
        else if (!existente.passwordHash || !existente.salt) aplicarModo("legacy");
        else aplicarModo("login");
      } catch (err) {
        if (id !== this.consulta) return;
        aplicarModo("base");
        msg.textContent = err.message;
      }
    };

    input.addEventListener("input", () => {
      clearTimeout(temporizador);
      this.consulta++;
      if (esAdmin()) {
        detectarModo();
        return;
      }
      aplicarModo("base");
      temporizador = setTimeout(detectarModo, 300);
    });

    this.sincronizarServidor = () => {
      const listo = servidorListo();
      boton.disabled = this.enviando || !listo || this.modo === "legacy";
      boton.title = listo ? "" : "Esperando al servidor...";
    };
    this.alServidor = () => this.sincronizarServidor();
    window.addEventListener("server-state", this.alServidor);

    this.sincronizarServidor();

    const iniciar = (mensaje) => {
      this.enviando = true;
      boton.disabled = true;
      msg.textContent = mensaje;
    };

    const terminar = () => {
      this.enviando = false;
      this.sincronizarServidor();
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.enviando) return;
      clearTimeout(temporizador);

      const nickname = input.value.trim();

      if (esAdmin()) {
        iniciar("Validando credenciales...");
        try {
          const admin = await loginAdmin(nickname, pass.value);
          if (!admin) {
            msg.textContent = "Usuario o contraseña incorrectos.";
            return;
          }
          msg.textContent = "";
          this.dispatchEvent(new CustomEvent("admin-logged-in", { bubbles: true }));
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          terminar();
        }
        return;
      }

      const errorFormato = validarNickname(nickname);
      if (errorFormato) {
        msg.textContent = errorFormato;
        return;
      }

      if (this.modo === "base") {
        await detectarModo();
        if (this.modo === "base") return;
        msg.textContent = MODOS[this.modo].ayuda;
        pass.focus();
        return;
      }

      if (this.modo === "legacy") return;

      iniciar("Validando...");
      try {
        const existente = await getPlayerByNickname(nickname);

        if (this.modo === "login") {
          if (!existente) {
            await detectarModo();
            msg.textContent = "Esa cuenta ya no existe en el servidor. Puedes crearla de nuevo.";
            return;
          }
          if (!existente.passwordHash || !(await verificarPassword(existente, pass.value))) {
            msg.textContent = "Nickname o contraseña incorrectos.";
            return;
          }
          pass.value = "";
          msg.textContent = "";
          this.dispatchEvent(
            new CustomEvent("player-registered", { detail: sinCredenciales(existente), bubbles: true })
          );
          return;
        }

        if (existente) {
          msg.textContent = "Ese nickname ya está ocupado. ¡Prueba otro!";
          await detectarModo();
          return;
        }

        const errorPass = validarPassword(pass.value);
        if (errorPass) {
          msg.textContent = errorPass;
          return;
        }

        const salt = generarSalt();
        const player = await postPlayer({
          nickname,
          passwordHash: await hashPassword(pass.value, salt),
          salt,
          points: 0,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          unlockedCards: [],
          starterPackClaimed: false,
          spinsAvailable: 0,
          createdAt: new Date().toISOString(),
        });

        msg.textContent = `¡Bienvenido, ${nickname}! Registro guardado.`;
        input.value = "";
        pass.value = "";
        this.dispatchEvent(new CustomEvent("player-registered", { detail: sinCredenciales(player), bubbles: true }));
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        terminar();
      }
    });
  }
}

customElements.define("player-register", PlayerRegister);
