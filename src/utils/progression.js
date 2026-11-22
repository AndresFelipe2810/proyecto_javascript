import { shuffle } from "./random.js";

export const PROBABILIDAD_CARTA = 0.2;
export const PROBABILIDAD_TIRO = 0.4;
export const TAMANO_SOBRE = 5;
export const MEMORIA = { parejas: 6, intentos: 12, diarios: 2, partidasPorBono: 3 };

const DEFAULTS = {
  unlockedCards: [],
  starterPackClaimed: false,
  spinsAvailable: 0,
  memoryDate: "",
  memoryPlaysToday: 0,
  memoryBonus: 0,
};

export function necesitaProgresoInicial(player) {
  const faltantes = {};
  for (const [clave, valor] of Object.entries(DEFAULTS)) {
    if (player[clave] === undefined || player[clave] === null) faltantes[clave] = valor;
  }
  return faltantes;
}

export function normalizarProgreso(player) {
  return { ...DEFAULTS, ...player };
}

export function generarSobre(cards, unlocked = [], n = TAMANO_SOBRE) {
  const ids = new Set(unlocked.map(String));
  const disponibles = cards.filter((c) => !ids.has(String(c.id)));
  const pool = shuffle(disponibles.length >= n ? disponibles : cards);
  const ordenadas = [...pool].sort((a, b) => (a.hp ?? 0) - (b.hp ?? 0));
  const tercio = Math.max(1, Math.floor(ordenadas.length / 3));
  const bandas = [ordenadas.slice(0, tercio), ordenadas.slice(tercio, tercio * 2), ordenadas.slice(tercio * 2)];

  const elegidas = [];
  for (let i = 0; elegidas.length < n && i < n * 3; i++) {
    const banda = bandas[i % 3];
    const carta = banda.find((c) => !elegidas.includes(c));
    if (carta) elegidas.push(carta);
  }
  for (const c of pool) {
    if (elegidas.length >= n) break;
    if (!elegidas.includes(c)) elegidas.push(c);
  }
  return shuffle(elegidas).slice(0, n);
}

export function resolverSorteo(cards, unlocked = [], rng = Math.random) {
  const ids = new Set(unlocked.map(String));
  const nuevas = cards.filter((c) => !ids.has(String(c.id)));
  const r = rng();

  if (r < PROBABILIDAD_CARTA) {
    if (nuevas.length === 0) return { tipo: "tiro" };
    const carta = nuevas[Math.min(nuevas.length - 1, Math.floor(rng() * nuevas.length))];
    return { tipo: "carta", carta };
  }
  if (r < PROBABILIDAD_CARTA + PROBABILIDAD_TIRO) return { tipo: "tiro" };
  return { tipo: "nada" };
}

export function hoy(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function intentosMemoria(player, fecha = new Date()) {
  const usadosHoy = player.memoryDate === hoy(fecha) ? player.memoryPlaysToday ?? 0 : 0;
  const diarios = Math.max(0, MEMORIA.diarios - usadosHoy);
  const extra = player.memoryBonus ?? 0;
  return { diarios, extra, total: diarios + extra };
}

export function consumirIntentoMemoria(player, fecha = new Date()) {
  const { diarios, extra } = intentosMemoria(player, fecha);
  if (diarios > 0) {
    const usadosHoy = player.memoryDate === hoy(fecha) ? player.memoryPlaysToday ?? 0 : 0;
    return { memoryDate: hoy(fecha), memoryPlaysToday: usadosHoy + 1 };
  }
  if (extra > 0) return { memoryBonus: extra - 1 };
  return null;
}

export function bonoPorPartidas(gamesPlayed, procesadas) {
  if (procesadas === undefined) return { bono: 0, procesadas: gamesPlayed };
  const bloques = Math.max(0, Math.floor((gamesPlayed - procesadas) / MEMORIA.partidasPorBono));
  return { bono: bloques, procesadas: procesadas + bloques * MEMORIA.partidasPorBono };
}

export function construirParejas(cards, n = MEMORIA.parejas) {
  const elegidas = shuffle(cards).slice(0, n);
  return shuffle([...elegidas, ...elegidas].map((c, i) => ({ key: `${c.id}-${i}`, card: c })))
    .map((ficha) => ({ ...ficha, pairId: ficha.card.id }));
}
