import { loginAdmin } from "../../api/adminsApi.js";

export class AdminLogin extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="admin-login">
        <h2>Acceso administrador</h2>
        <form id="adminForm">
          <input type="text" name="username" placeholder="Usuario" required />
          <input type="password" name="password" placeholder="Contraseña" required />
          <button type="submit">Entrar</button>
        </form>
        <p id="adminMessage" role="alert"></p>
      </section>
    `;
  }

  configurarEventos() {
    const form = this.querySelector("#adminForm");
    const msg = this.querySelector("#adminMessage");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { username, password } = form.elements;
      msg.textContent = "Validando credenciales...";
      try {
        const admin = await loginAdmin(username.value.trim(), password.value);
        if (!admin) {
          msg.textContent = "Usuario o contraseña incorrectos.";
          return;
        }
        form.reset();
        msg.textContent = "";
        this.dispatchEvent(new CustomEvent("admin-logged-in", { bubbles: true }));
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }
}

customElements.define("admin-login", AdminLogin);
