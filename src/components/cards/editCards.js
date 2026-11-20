import { patchCard, putCard } from "../../api/cardsApi.js";

// PUT: reemplaza la carta completa
export function editarCartaCompleta(carta) {
  return putCard(carta.id, carta);
}

// PATCH: actualiza solo el campo indicado
export function cambiarEstadoCarta(id, active) {
  return patchCard(id, { active });
}
