import API_URL from "./apiConfig.js";

export async function loginAdmin(username, password) {
  const params = new URLSearchParams({ username, password });
  const response = await fetch(`${API_URL}/admins?${params}`);
  if (!response.ok) throw new Error(`No se pudo validar el acceso (${response.status})`);
  const admins = await response.json();
  return admins[0] ?? null;
}
