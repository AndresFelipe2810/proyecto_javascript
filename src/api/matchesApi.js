import API_URL from "./apiConfig.js";
import { request } from "./http.js";

export function getMatches(query = "") {
  return request(`${API_URL}/matches${query}`, "No se pudieron obtener las salas");
}

export function getMatch(id) {
  return request(`${API_URL}/matches/${id}`, "No se pudo obtener la sala");
}

export function postMatch(matchData) {
  return request(`${API_URL}/matches`, "No se pudo crear la sala", { method: "POST", body: matchData });
}

export function patchMatch(id, data) {
  return request(`${API_URL}/matches/${id}`, "No se pudo actualizar la sala", { method: "PATCH", body: data });
}

export function deleteMatch(id) {
  return request(`${API_URL}/matches/${id}`, "No se pudo eliminar la sala", { method: "DELETE" });
}
