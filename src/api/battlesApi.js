import API_URL from "./apiConfig.js";
import { request } from "./http.js";

export function getBattles(query = "") {
  return request(`${API_URL}/battles${query}`, "No se pudieron obtener las partidas");
}

export function postBattle(battleData) {
  return request(`${API_URL}/battles`, "No se pudo guardar la partida", { method: "POST", body: battleData });
}

export function patchBattle(id, data) {
  return request(`${API_URL}/battles/${id}`, "No se pudo actualizar la partida", { method: "PATCH", body: data });
}
