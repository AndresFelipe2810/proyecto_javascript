// En GitHub Pages la app vive en /proyecto_javascript/: las rutas de public/ necesitan ese prefijo
export function rutaPublica(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return path;
  const base = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
  return path.startsWith(`${base}/`) ? path : `${base}${path}`;
}
