import { deleteCard } from "../../api/cardsApi.js";

export function eliminarCarta(id) {
  return deleteCard(id);
}
