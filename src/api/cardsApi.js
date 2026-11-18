import API_URL from "./apiConfig.js";

export async function getCards() {
  const res = await fetch(`${API_URL}/cards`);
  return await res.json();
}

export async function postCard(card) {
  const res = await fetch(`${API_URL}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  return await res.json();
}

export async function putCard(id, card) {
  const res = await fetch(`${API_URL}/cards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  return await res.json();
}

export async function patchCard(id, data) {
  const res = await fetch(`${API_URL}/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function deleteCard(id) {
  const res = await fetch(`${API_URL}/cards/${id}`, {
    method: "DELETE",
  });
  return await res.json();
}