export async function parseOrThrow(response, mensaje) {
  if (!response.ok) throw new Error(`${mensaje} (${response.status})`);
  return response.status === 204 ? null : await response.json();
}

export async function request(url, mensaje, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }
  return parseOrThrow(response, mensaje);
}
