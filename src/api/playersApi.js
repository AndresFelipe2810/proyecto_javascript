import API_URL from "./apiConfig.js";
import { request } from "./http.js";

export function getPlayers() {
  return request(`${API_URL}/players`, "No se pudieron obtener los jugadores");
}

export function getPlayer(id) {
  return request(`${API_URL}/players/${id}`, "No se pudo obtener el jugador");
}

export async function getPlayerByNickname(nickname) {
  const players = await getPlayers();
  return players.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase()) ?? null;
}

export function postPlayer(playerData) {
  return request(`${API_URL}/players`, "No se pudo registrar el jugador", { method: "POST", body: playerData });
}

export function patchPlayer(id, data) {
  return request(`${API_URL}/players/${id}`, "No se pudo actualizar el jugador", { method: "PATCH", body: data });
}
