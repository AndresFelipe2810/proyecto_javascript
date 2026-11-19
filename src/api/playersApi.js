import API_URL from "./apiConfig.js";

export async function getPlayers() {
  const response = await fetch(`${API_URL}/players`);
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