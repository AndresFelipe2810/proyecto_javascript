import { MIN_ACTIVE_CARDS } from "./battleEngine.js";

const ATAQUES_REQUERIDOS = 4;
const DANO_ESPECIAL_MIN = 55;
const DANO_ESPECIAL_MAX = 70;
const DANO_ATAQUE_MIN = 10;
const DANO_ATAQUE_MAX = 60;

export function escapar(texto = "") {
  return String(texto).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

export function validarNickname(nickname) {
  if (!nickname) return "El nickname es obligatorio.";
  if (!/^[\p{L}\p{N}_-]{3,16}$/u.test(nickname)) {
    return "El nickname debe tener entre 3 y 16 caracteres (letras, números, _ o -).";
  }
  return null;
}

export function validarCarta(carta, otras = []) {
  const errores = [];
  const nombre = (carta.name ?? "").trim().toLowerCase();
  if (nombre && otras.some((c) => c.id !== carta.id && c.name?.trim().toLowerCase() === nombre)) {
    errores.push("Ya existe una carta con ese nombre.");
  }
  if (carta.hp !== 250) errores.push("La carta debe tener 250 HP.");
  if (!carta.name) errores.push("El nombre es obligatorio.");
  if (!carta.type) errores.push("El tipo es obligatorio.");
  if (!carta.description) errores.push("La descripción es obligatoria.");
  if (carta.attacks.length !== ATAQUES_REQUERIDOS) errores.push("Deben existir 4 ataques.");
  carta.attacks.forEach((a, i) => {
    if (!a.name) errores.push(`El ataque ${i + 1} necesita nombre.`);
    if (!(a.baseDamage >= DANO_ATAQUE_MIN && a.baseDamage <= DANO_ATAQUE_MAX)) {
      errores.push(`El ataque ${i + 1} debe causar entre ${DANO_ATAQUE_MIN} y ${DANO_ATAQUE_MAX} de daño.`);
    }
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
