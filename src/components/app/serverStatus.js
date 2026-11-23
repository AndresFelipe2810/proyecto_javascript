import { pingServer } from "../../api/healthApi.js";
import { publicarEstadoServidor } from "../../api/serverState.js";

const ESPERAS_MS = [2000, 4000, 6000, 8000, 10000];
const TEXTOS = {
  checking: "Comprobando servidor...",
  waking: "Despertando servidor...",
  online: "En línea",
  offline: "Sin conexión",
};

export class ServerStatus extends HTMLElement {
  constructor() {
    super();
    this.estado = "checking";
    this.conectando = false;
    this.alCambiar = (e) => {
      if (!this.conectando) this.setEstado(e.detail);
    };
  }

  connectedCallback() {
    this.render();
    window.addEventListener("api-status", this.alCambiar);
    this.addEventListener("click", (e) => {
      if (e.target.closest("#wakeBtn")) this.conectar();
    });
    this.conectar();
  }

  disconnectedCallback() {
    window.removeEventListener("api-status", this.alCambiar);
  }

  render() {
    publicarEstadoServidor(this.estado);
    const cargando = this.estado !== "online";
    const intento = this.intento ? ` (intento ${this.intento}/${ESPERAS_MS.length + 1})` : "";
    const boton =
      this.estado === "offline" || this.estado === "waking"
        ? `<button id="wakeBtn" type="button" class="wake-btn" ${this.conectando ? "disabled" : ""}>${this.conectando ? "Conectando..." : "Conectar / Despertar servidor"}</button>`
        : "";
    const texto = `${TEXTOS[this.estado]}${this.estado === "waking" ? intento : ""}`;
    this.innerHTML = /* html */ `
      <span class="server-pill" data-state="${this.estado}" role="status">
        <span class="server-dot" aria-hidden="true"></span>${this.estado === "online" ? texto : ""}
      </span>
      ${
        cargando
          ? `<div class="server-overlay" role="alert" aria-live="polite">
              <img class="server-art" src="${import.meta.env.BASE_URL}images/pikachu-desconexion.png" alt="" />
              <h1>Pokémon Card Battle Arena</h1>
              <span class="server-spinner" aria-hidden="true"></span>
              <p>${texto}</p>
              ${boton}
            </div>`
          : ""
      }
    `;
  }

  setEstado(estado) {
    if (this.estado === estado) return;
    this.estado = estado;
    this.render();
  }

  // Render (plan gratuito) apaga el servidor tras inactividad: el primer arranque puede tardar ~1 min
  async conectar() {
    if (this.conectando) return;
    this.conectando = true;
    this.intento = 0;
    this.setEstado("checking");
    let ok = await pingServer();
    for (const espera of ESPERAS_MS) {
      if (ok) break;
      this.intento += 1;
      this.estado = "waking";
      this.render();
      await new Promise((r) => setTimeout(r, espera));
      ok = await pingServer();
    }
    this.conectando = false;
    this.intento = 0;
    this.setEstado(ok ? "online" : "offline");
    if (ok) window.dispatchEvent(new CustomEvent("api-reconnected"));
  }
}

customElements.define("server-status", ServerStatus);
