import API_URL from "./apiConfig.js";
import { request } from "./http.js";

export async function loginAdmin(username, password) {
  const params = new URLSearchParams({ username, password });
  const admins = await request(`${API_URL}/admins?${params}`, "No se pudo validar el acceso");
  return admins[0] ?? null;
}
