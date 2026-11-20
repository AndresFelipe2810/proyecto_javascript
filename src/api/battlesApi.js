import API_URL from "./apiConfig.js";

async function parseOrThrow(response, mensaje) {
  if (!response.ok) throw new Error(`${mensaje} (${response.status})`);
  return await response.json();
}

export async function getBattles(query = "") {
  const response = await fetch(`${API_URL}/battles${query}`);
  return await parseOrThrow(response, "No se pudieron obtener las partidas");
}

export async function postBattle(battleData) {
  const response = await fetch(`${API_URL}/battles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(battleData),
  });
  return await parseOrThrow(response, "No se pudo guardar la partida");
}

export async function patchBattle(id, data) {
  const response = await fetch(`${API_URL}/battles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await parseOrThrow(response, "No se pudo marcar la partida como aplicada");
}
