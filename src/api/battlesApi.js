import API_URL from "./apiConfig.js";

export async function postBattle(battleData) {
  const response = await fetch(`${API_URL}/battles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(battleData),
  });
  if (!response.ok) throw new Error(`No se pudo guardar la partida (${response.status})`);
  return await response.json();
}
