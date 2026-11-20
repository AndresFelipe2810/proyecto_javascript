import { getCards } from "../../api/cardsApi.js";
import { crearCarta, formularioCarta, leerFormulario } from "./createCards.js";
import { cambiarEstadoCarta, editarCartaCompleta } from "./editCards.js";
import { eliminarCarta } from "./deleteCards.js";
import { escapar, puedeQuitarActiva, validarCarta } from "../../utils/validators.js";
import { MIN_ACTIVE_CARDS } from "../../utils/battleEngine.js";

export class AdminCards extends HTMLElement {
  constructor() {
    super();
    this.cartas = [];
    this.editando = null;
    this.render();
    this.configurarEventos();
    this.cargar();
  }

  render() {
    this.innerHTML = /* html */ `
      <section class="admin-cards">
        <h2>Administración de cartas</h2>
        <p id="adminStatus" role="status"></p>
        <button id="nuevaCarta" type="button">Nueva carta</button>
        <form id="cardForm" hidden></form>
        <div id="adminList"></div>
      </section>
    `;
  }

  configurarEventos() {
    this.querySelector("#nuevaCarta").addEventListener("click", () => this.abrirFormulario(null));

    this.querySelector("#cardForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.guardarFormulario(e.target);
    });

    this.querySelector("#cardForm").addEventListener("click", (e) => {
      if (e.target.id === "cancelarForm") this.cerrarFormulario();
    });

    this.querySelector("#adminList").addEventListener("click", (e) => {
      const boton = e.target.closest("[data-action]");
      if (!boton) return;
      const carta = this.cartas.find((c) => String(c.id) === boton.dataset.id);
      if (!carta) return;

      const acciones = {
        editar: () => this.abrirFormulario(carta),
        toggle: () => this.alternarActiva(carta),
        eliminar: () => this.eliminar(carta),
      };
      acciones[boton.dataset.action]?.();
    });
  }

  setEstado(texto) {
    this.querySelector("#adminStatus").textContent = texto;
  }

  async cargar() {
    try {
      this.cartas = await getCards();
      this.renderLista();
    } catch (err) {
      this.setEstado(err.message);
    }
  }

  renderLista() {
    this.querySelector("#adminList").innerHTML = this.cartas
      .map(
        (c) => /* html */ `
        <article class="admin-card" data-id="${escapar(c.id)}">
          <h3>${escapar(c.name)}</h3>
          <p>${escapar(c.type)} · ${c.active === false ? "Inactiva" : "Activa"} · ID ${escapar(c.id)}</p>
          <button type="button" data-action="editar" data-id="${escapar(c.id)}">Editar (PUT)</button>
          <button type="button" data-action="toggle" data-id="${escapar(c.id)}">
            ${c.active === false ? "Activar" : "Desactivar"} (PATCH)
          </button>
          <button type="button" data-action="eliminar" data-id="${escapar(c.id)}">Eliminar (DELETE)</button>
        </article>`
      )
      .join("");
  }

  abrirFormulario(carta) {
    this.editando = carta;
    const form = this.querySelector("#cardForm");
    form.innerHTML = /* html */ `
      <h3>${carta ? `Editar ${escapar(carta.name)}` : "Nueva carta"}</h3>
      ${formularioCarta(carta ?? {})}
      <button type="submit">${carta ? "Guardar cambios" : "Crear carta"}</button>
      <button type="button" id="cancelarForm">Cancelar</button>
    `;
    form.hidden = false;
  }

  cerrarFormulario() {
    this.editando = null;
    this.querySelector("#cardForm").hidden = true;
  }

  async guardarFormulario(form) {
    const base = this.editando ?? {};
    const datos = leerFormulario(form, base);
    const errores = validarCarta(datos);
    if (errores.length) {
      this.setEstado(errores.join(" "));
      return;
    }

    try {
      if (this.editando) await editarCartaCompleta(datos);
      else await crearCarta(datos, this.cartas);
      this.setEstado("Carta guardada.");
      this.cerrarFormulario();
      await this.cargar();
    } catch (err) {
      this.setEstado(err.message);
    }
  }

  async alternarActiva(carta) {
    const nuevoEstado = carta.active === false;
    if (!nuevoEstado && !puedeQuitarActiva(this.cartas, carta)) {
      this.setEstado(`Debe haber al menos ${MIN_ACTIVE_CARDS} cartas activas.`);
      return;
    }
    try {
      await cambiarEstadoCarta(carta.id, nuevoEstado);
      await this.cargar();
    } catch (err) {
      this.setEstado(err.message);
    }
  }

  async eliminar(carta) {
    if (!puedeQuitarActiva(this.cartas, carta)) {
      this.setEstado(`Debe haber al menos ${MIN_ACTIVE_CARDS} cartas activas.`);
      return;
    }
    if (!confirm(`¿Eliminar la carta ${carta.name}?`)) return;
    try {
      await eliminarCarta(carta.id);
      await this.cargar();
    } catch (err) {
      this.setEstado(err.message);
    }
  }
}

customElements.define("admin-cards", AdminCards);
