export async function obtenerArtwork(nombre) {
  const slug = String(nombre ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!slug) return "";
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data?.sprites?.other?.["official-artwork"]?.front_default ?? "";
  } catch {
    return "";
  }
}
