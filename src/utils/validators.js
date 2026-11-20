import { MIN_ACTIVE_CARDS } from "./battleEngine.js";

const ATAQUES_REQUERIDOS = 4;
const DANO_ESPECIAL_MIN = 55;
const DANO_ESPECIAL_MAX = 70;

export function escapar(texto = "") {
  return String(texto).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

export function validarCarta(carta) {
  const errores = [];
  if (!carta.name) errores.push("El nombre es obligatorio.");
  if (!carta.type) errores.push("El tipo es obligatorio.");
  if (!carta.description) errores.push("La descripción es obligatoria.");
  if (carta.attacks.length !== ATAQUES_REQUERIDOS) errores.push("Deben existir 4 ataques.");
  carta.attacks.forEach((a, i) => {
    if (!a.name) errores.push(`El ataque ${i + 1} necesita nombre.`);
    if (!(a.baseDamage > 0)) errores.push(`El ataque ${i + 1} necesita un daño positivo.`);
  });
  if (!carta.defense.name) errores.push("La defensa necesita nombre.");
  if (!carta.special.name) errores.push("El poder especial necesita nombre.");
  const danio = carta.special.baseDamage;
  if (!(danio >= DANO_ESPECIAL_MIN && danio <= DANO_ESPECIAL_MAX)) {
    errores.push(`El poder especial debe causar entre ${DANO_ESPECIAL_MIN} y ${DANO_ESPECIAL_MAX} de daño.`);
  }
  return errores;
}

export function puedeQuitarActiva(cartas, carta) {
  if (carta.active === false) return true;
  const activas = cartas.filter((c) => c.active !== false).length;
  return activas - 1 >= MIN_ACTIVE_CARDS;
}
