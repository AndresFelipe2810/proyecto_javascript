import { getMatch, patchMatch } from "../../api/matchesApi.js";
import { SELECCION_MS, invitacionVigente } from "../../utils/onlineMatch.js";
import { escapar } from "../../utils/validators.js";

export class MatchInvite extends HTMLElement {
  constructor() {
    super();
    this.match = null;
    this.player = null;
    this.ocupado = false;
    this.addEventListener("click", (e) => {
      const accion = e.target.closest("[data-invite]")?.dataset.invite;
      if (accion === "accept") this.aceptar();
      if (accion === "reject") this.rechazar();
    });
  }

  connectedCallback() {
    this.render();
  }

  render(mensaje = "") {
    this.innerHTML = /* html */ `
      <aside class="match-invite" role="alertdialog" aria-labelledby="inviteTitle">
        <p id="inviteTitle"><strong>${escapar(this.match.p1Nickname)}</strong> te reta a un combate online</p>
        <div class="invite-actions">
          <button type="button" data-invite="reject">Rechazar</button>
          <button type="button" data-invite="accept">Aceptar</button>
        </div>
        <p class="online-msg error" role="status">${escapar(mensaje)}</p>
      </aside>
    `;
  }

  async aceptar() {
    if (this.ocupado) return;
    this.ocupado = true;
    try {
      const actual = await getMatch(this.match.id);
      if (!invitacionVigente(actual, this.player.id)) {
        this.render("El reto ya no está disponible.");
        setTimeout(() => this.cerrar(), 2000);
        return;
      }
      const now = Date.now();
      const match = await patchMatch(actual.id, {
        status: "selecting",
        selectionDeadline: now + SELECCION_MS,
        updatedAt: now,
      });
      this.dispatchEvent(new CustomEvent("match-accepted", { detail: { match }, bubbles: true }));
      this.remove();
    } catch (err) {
      this.ocupado = false;
      this.render(err.message);
    }
  }

  async rechazar() {
    if (this.ocupado) return;
    this.ocupado = true;
    await patchMatch(this.match.id, { status: "cancelled", updatedAt: Date.now() }).catch(() => {});
    this.cerrar();
  }

  cerrar() {
    this.dispatchEvent(new CustomEvent("match-invite-closed", { detail: { id: this.match.id }, bubbles: true }));
    this.remove();
  }
}

customElements.define("match-invite", MatchInvite);
