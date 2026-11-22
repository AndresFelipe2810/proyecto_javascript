import test from "node:test";
import assert from "node:assert/strict";
import {
  necesitaProgresoInicial,
  normalizarProgreso,
  generarSobre,
  resolverSorteo,
  construirParejas,
  MEMORIA,
  hoy,
  intentosMemoria,
  consumirIntentoMemoria,
  bonoPorPartidas,
} from "../src/utils/progression.js";

const cartas = (n) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, hp: 100 + i * 10 }));
const HOY = new Date(2026, 10, 22);
const AYER = new Date(2026, 10, 21);

test("necesitaProgresoInicial solo devuelve campos faltantes", () => {
  assert.deepEqual(necesitaProgresoInicial({ points: 5 }), {
    unlockedCards: [],
    starterPackClaimed: false,
    spinsAvailable: 0,
    memoryDate: "",
    memoryPlaysToday: 0,
    memoryBonus: 0,
  });
  assert.deepEqual(
    necesitaProgresoInicial({
      unlockedCards: ["c1"],
      starterPackClaimed: true,
      spinsAvailable: 2,
      memoryDate: "2026-11-22",
      memoryPlaysToday: 1,
      memoryBonus: 0,
    }),
    {}
  );
});

test("normalizarProgreso conserva estadísticas existentes", () => {
  const p = normalizarProgreso({ nickname: "a", wins: 3 });
  assert.equal(p.wins, 3);
  assert.deepEqual(p.unlockedCards, []);
  assert.equal(p.spinsAvailable, 0);
  assert.equal(p.memoryBonus, 0);
});

test("generarSobre devuelve 5 cartas sin duplicados", () => {
  const sobre = generarSobre(cartas(20));
  assert.equal(sobre.length, 5);
  assert.equal(new Set(sobre.map((c) => c.id)).size, 5);
});

test("generarSobre prioriza cartas no desbloqueadas", () => {
  const sobre = generarSobre(cartas(8), ["c0", "c1", "c2"]);
  assert.ok(sobre.every((c) => !["c0", "c1", "c2"].includes(c.id)));
});

test("resolverSorteo da carta nueva con rng < 0.20", () => {
  const r = resolverSorteo(cartas(5), ["c0"], () => 0.19);
  assert.equal(r.tipo, "carta");
  assert.notEqual(r.carta.id, "c0");
});

test("resolverSorteo no da carta con rng >= 0.20", () => {
  assert.equal(resolverSorteo(cartas(5), [], () => 0.2).tipo, "tiro");
  assert.equal(resolverSorteo(cartas(5), [], () => 0.7).tipo, "nada");
});

test("resolverSorteo usa tiro extra si ya tiene todas las cartas", () => {
  const todas = cartas(20).map((c) => c.id);
  assert.equal(resolverSorteo(cartas(20), todas, () => 0.1).tipo, "tiro");
});

test("construirParejas genera n pares con mismo pairId", () => {
  const fichas = construirParejas(cartas(10), 4);
  assert.equal(fichas.length, 8);
  const conteo = {};
  fichas.forEach((f) => (conteo[f.pairId] = (conteo[f.pairId] ?? 0) + 1));
  assert.ok(Object.values(conteo).every((v) => v === 2));
  assert.equal(Object.keys(conteo).length, 4);
});

test("MEMORIA fija el tablero difícil con 2 intentos diarios y bono cada 3 partidas", () => {
  assert.deepEqual(MEMORIA, { parejas: 6, intentos: 12, diarios: 2, partidasPorBono: 3 });
});

test("construirParejas usa 6 parejas por defecto (tablero difícil)", () => {
  const fichas = construirParejas(cartas(10));
  assert.equal(fichas.length, 12);
  assert.equal(new Set(fichas.map((f) => f.pairId)).size, 6);
});

test("hoy devuelve fecha local YYYY-MM-DD", () => {
  assert.equal(hoy(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(hoy(HOY), "2026-11-22");
});

test("jugador nuevo tiene 2 intentos diarios y 0 extra", () => {
  assert.deepEqual(intentosMemoria({ memoryDate: "", memoryPlaysToday: 0, memoryBonus: 0 }, HOY), {
    diarios: 2,
    extra: 0,
    total: 2,
  });
});

test("consumir un intento diario registra fecha y aumenta el uso del día", () => {
  const jugador = { memoryDate: "2026-11-22", memoryPlaysToday: 0, memoryBonus: 0 };
  assert.deepEqual(consumirIntentoMemoria(jugador, HOY), { memoryDate: "2026-11-22", memoryPlaysToday: 1 });
  const segundo = { memoryDate: "2026-11-22", memoryPlaysToday: 1, memoryBonus: 0 };
  assert.deepEqual(consumirIntentoMemoria(segundo, HOY), { memoryDate: "2026-11-22", memoryPlaysToday: 2 });
});

test("al cambiar de día los intentos diarios se reinician", () => {
  const jugador = { memoryDate: "2026-11-21", memoryPlaysToday: 2, memoryBonus: 0 };
  assert.equal(intentosMemoria(jugador, HOY).total, 2);
  assert.deepEqual(consumirIntentoMemoria(jugador, HOY), { memoryDate: "2026-11-22", memoryPlaysToday: 1 });
  assert.equal(intentosMemoria(jugador, AYER).total, 0);
});

test("los intentos extra se usan solo después de agotar los diarios", () => {
  const agotado = { memoryDate: "2026-11-22", memoryPlaysToday: 2, memoryBonus: 2 };
  assert.deepEqual(intentosMemoria(agotado, HOY), { diarios: 0, extra: 2, total: 2 });
  assert.deepEqual(consumirIntentoMemoria(agotado, HOY), { memoryBonus: 1 });

  const conDiarios = { memoryDate: "2026-11-22", memoryPlaysToday: 1, memoryBonus: 2 };
  assert.deepEqual(consumirIntentoMemoria(conDiarios, HOY), { memoryDate: "2026-11-22", memoryPlaysToday: 2 });
});

test("los extra acumulados no caducan al cambiar de día", () => {
  const jugador = { memoryDate: "2026-11-21", memoryPlaysToday: 2, memoryBonus: 3 };
  assert.deepEqual(intentosMemoria(jugador, HOY), { diarios: 2, extra: 3, total: 5 });
});

test("sin intentos disponibles no se puede consumir", () => {
  const jugador = { memoryDate: "2026-11-22", memoryPlaysToday: 2, memoryBonus: 0 };
  assert.equal(intentosMemoria(jugador, HOY).total, 0);
  assert.equal(consumirIntentoMemoria(jugador, HOY), null);
});

test("bonoPorPartidas fija la línea base sin dar bonos retroactivos", () => {
  assert.deepEqual(bonoPorPartidas(7, undefined), { bono: 0, procesadas: 7 });
});

test("bonoPorPartidas da 1 intento por cada 3 partidas nuevas", () => {
  assert.deepEqual(bonoPorPartidas(9, 7), { bono: 0, procesadas: 7 });
  assert.deepEqual(bonoPorPartidas(10, 7), { bono: 1, procesadas: 10 });
  assert.deepEqual(bonoPorPartidas(13, 7), { bono: 2, procesadas: 13 });
  assert.deepEqual(bonoPorPartidas(6, 0), { bono: 2, procesadas: 6 });
});

test("bonoPorPartidas no duplica bonos ya procesados", () => {
  assert.deepEqual(bonoPorPartidas(10, 10), { bono: 0, procesadas: 10 });
  assert.deepEqual(bonoPorPartidas(11, 10), { bono: 0, procesadas: 10 });
});
