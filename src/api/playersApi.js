import API_URL from "./apiConfig.js";

export async function getPlayers() {
  const response = await fetch(`${API_URL}/players`);
  return await response.json();
}

export async function getPlayer(id) {
  const response = await fetch(`${API_URL}/players/${id}`);
  if (!response.ok) throw new Error(`No se pudo obtener el jugador (${response.status})`);
  return await response.json();
}

export async function postPlayer(playerData) {
  const response = await fetch(`${API_URL}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playerData),
  });
  return await response.json();
}

export async function patchPlayer(id, data) {
  const response = await fetch(`${API_URL}/players/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`No se pudo actualizar el jugador (${response.status})`);
  return await response.json();
}
