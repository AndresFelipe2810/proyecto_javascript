let estado = "checking";

export const servidorListo = () => estado === "online";

export function publicarEstadoServidor(nuevo) {
  estado = nuevo;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("server-state", { detail: nuevo }));
  }
}
