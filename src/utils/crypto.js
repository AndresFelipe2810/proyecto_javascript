const aHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

export function generarSalt() {
  return aHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password, salt) {
  const datos = new TextEncoder().encode(`${salt}${password}`);
  return aHex(await crypto.subtle.digest("SHA-256", datos));
}

export async function verificarPassword(player, password) {
  if (!player?.passwordHash || !player?.salt) return false;
  return (await hashPassword(password, player.salt)) === player.passwordHash;
}
