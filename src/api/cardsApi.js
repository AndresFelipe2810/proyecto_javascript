import API_URL from "./apiConfig.js";
import { request } from "./http.js";

export function getCards() {
  return request(`${API_URL}/cards`, "No se pudieron obtener las cartas");
}

export function postCard(card) {
  return request(`${API_URL}/cards`, "No se pudo crear la carta", { method: "POST", body: card });
}

export function putCard(id, card) {
  return request(`${API_URL}/cards/${id}`, "No se pudo reemplazar la carta", { method: "PUT", body: card });
}

export function patchCard(id, data) {
  return request(`${API_URL}/cards/${id}`, "No se pudo actualizar la carta", { method: "PATCH", body: data });
}

export function deleteCard(id) {
  return request(`${API_URL}/cards/${id}`, "No se pudo eliminar la carta", { method: "DELETE" });
}
