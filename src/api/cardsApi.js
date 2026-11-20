import API_URL from "./apiConfig.js";

async function parseOrThrow(response, mensaje) {
  if (!response.ok) throw new Error(`${mensaje} (${response.status})`);
  return response.status === 204 ? null : await response.json();
}

export async function getCards() {
  const response = await fetch(`${API_URL}/cards`);
  return parseOrThrow(response, "No se pudieron obtener las cartas");
}

export async function postCard(card) {
  const response = await fetch(`${API_URL}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  return parseOrThrow(response, "No se pudo crear la carta");
}

export async function putCard(id, card) {
  const response = await fetch(`${API_URL}/cards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  return parseOrThrow(response, "No se pudo reemplazar la carta");
}

export async function patchCard(id, data) {
  const response = await fetch(`${API_URL}/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseOrThrow(response, "No se pudo actualizar la carta");
}

export async function deleteCard(id) {
  const response = await fetch(`${API_URL}/cards/${id}`, { method: "DELETE" });
  return parseOrThrow(response, "No se pudo eliminar la carta");
}
