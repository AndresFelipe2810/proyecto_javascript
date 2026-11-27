import test from "node:test";
import assert from "node:assert/strict";
import {
  TURNO_MS,
  GRACIA_MS,
  MAX_TIMEOUTS,
  INVITACION_MS,
  rival,
  rolDe,
  msRestantes,
  crearMatch,
  invitacionVigente,
  completarMazo,
  debeIniciarBatalla,
  seleccionVencida,
  iniciarBatalla,
  cartaActiva,
  aplicarAccion,
  aplicarTimeout,
  aplicarAbandono,
  debeAplicarTimeout,
  parcheBatalla,
} from "../src/utils/onlineMatch.js";

const NOW = 1_000_000;
const carta = (id) => ({
  id,
  name: `Carta ${id}`,
  hp: 250,
  attacks: [20, 30, 40, 50].map((d, i) => ({ name: `a${i}`, baseDamage: d })),
  defense: { name: "Guard", damageReduction: 0.5 },
  special: { name: "Boom", baseDamage: 65, unlockTurn: 2, cooldown: 3 },
});
const mazo = (prefijo) => [1, 2, 3, 4, 5].map((i) => carta(`${prefijo}${i}`));
const batalla = (rng = () => 0.1) => iniciarBatalla(mazo("a"), mazo("b"), { now: NOW, rng });
const p1 = { id: "u1", nickname: "Ash" };
const p2 = { id: "u2", nickname: "Misty" };

test("rival y rolDe identifican a cada jugador", () => {
  const match = crearMatch(p1, p2, NOW);
  assert.equal(rival("p1"), "p2");
  assert.equal(rolDe(match, "u1"), "p1");
  assert.equal(rolDe(match, "u2"), "p2");
  assert.equal(rolDe(match, "otro"), null);
});

test("crearMatch arranca en espera con los dos jugadores", () => {
  const match = crearMatch(p1, p2, NOW);
  assert.equal(match.status, "waiting");
  assert.equal(match.p1Nickname, "Ash");
  assert.equal(match.p2Id, "u2");
  assert.deepEqual(match.p1Deck, []);
});

test("msRestantes nunca es negativo", () => {
  assert.equal(msRestantes(NOW + 500, NOW), 500);
  assert.equal(msRestantes(NOW - 500, NOW), 0);
});

test("invitacionVigente solo para el retado y antes de expirar", () => {
  const match = crearMatch(p1, p2, NOW);
  assert.equal(invitacionVigente(match, "u2", NOW + 1000), true);
  assert.equal(invitacionVigente(match, "u1", NOW + 1000), false);
  assert.equal(invitacionVigente(match, "u2", NOW + INVITACION_MS + 1), false);
  assert.equal(invitacionVigente({ ...match, status: "cancelled" }, "u2", NOW), false);
});

test("completarMazo respeta la selección y rellena sin repetir", () => {
  const deck = completarMazo(["c1", "c2"], ["c1", "c2", "c3", "c4", "c5", "c6"]);
  assert.equal(deck.length, 5);
  assert.deepEqual(deck.slice(0, 2), ["c1", "c2"]);
  assert.equal(new Set(deck).size, 5);
});

test("debeIniciarBatalla: p1 inicia, p2 solo tras la gracia", () => {
  const ids = ["1", "2", "3", "4", "5"];
  const match = { status: "selecting", selectionDeadline: NOW, p1Deck: ids, p2Deck: ids, battleState: null };
  assert.equal(debeIniciarBatalla(match, "p1", NOW), true);
  assert.equal(debeIniciarBatalla(match, "p2", NOW), false);
  assert.equal(debeIniciarBatalla(match, "p2", NOW + GRACIA_MS), true);
  assert.equal(debeIniciarBatalla({ ...match, p2Deck: [] }, "p1", NOW), false);
});

test("seleccionVencida cancela si falta un mazo tras la gracia", () => {
  const match = { status: "selecting", selectionDeadline: NOW, p1Deck: ["1", "2", "3", "4", "5"], p2Deck: [] };
  assert.equal(seleccionVencida(match, NOW + GRACIA_MS), false);
  assert.equal(seleccionVencida(match, NOW + GRACIA_MS * 2), true);
});

test("iniciarBatalla crea 5 cartas por lado con 250 HP y fija el turno", () => {
  const state = batalla(() => 0.9);
  assert.equal(state.turn, "p2");
  assert.equal(state.turnDeadline, NOW + TURNO_MS);
  assert.equal(state.p1.cards.length, 5);
  assert.equal(cartaActiva(state, "p2").currentHp, 250);
});

test("aplicarAccion rechaza el turno ajeno y acciones bloqueadas", () => {
  const state = batalla();
  assert.equal(aplicarAccion(state, "p2", 0, NOW), null);
  assert.equal(aplicarAccion(state, "p1", 5, NOW), null);
});

test("aplicarAccion daña, alterna turno, sube seq y no muta el original", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const state = batalla();
  const next = aplicarAccion(state, "p1", 3, NOW + 10);
  assert.ok(cartaActiva(next, "p2").currentHp < 250);
  assert.equal(cartaActiva(state, "p2").currentHp, 250);
  assert.equal(next.turn, "p2");
  assert.equal(next.seq, 2);
  assert.equal(next.turnDeadline, NOW + 10 + TURNO_MS);
  assert.equal(next.lastEvent.seq, 2);
  assert.equal(next.lastEvent.type, "attack");
});

test("la ronda avanza cuando actúa el segundo jugador", () => {
  let state = batalla();
  state = aplicarAccion(state, "p1", 0, NOW);
  assert.equal(state.round, 1);
  state = aplicarAccion(state, "p2", 4, NOW);
  assert.equal(state.round, 2);
});

test("carta derrotada da paso a la siguiente y el vencedor no se cura", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const state = batalla();
  state.p1.cards[0].currentHp = 74;
  state.p2.cards[0].currentHp = 1;
  const next = aplicarAccion(state, "p1", 0, NOW);
  assert.equal(next.lastEvent.defeated, true);
  assert.equal(next.p2.index, 1);
  assert.equal(cartaActiva(next, "p2").currentHp, 250);
  assert.equal(cartaActiva(next, "p1").currentHp, 74);
});

test("derrotar la última carta termina con ganador", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const state = batalla();
  state.p2.index = 4;
  state.p2.cards[4].currentHp = 1;
  const next = aplicarAccion(state, "p1", 0, NOW);
  assert.equal(next.winner, "p1");
  assert.equal(next.turn, null);
  const parche = parcheBatalla({ p1Id: "u1", p2Id: "u2" }, next, NOW);
  assert.equal(parche.status, "finished");
  assert.equal(parche.winnerId, "u1");
});

test("aplicarTimeout pasa el turno y tras el máximo da la derrota", () => {
  let state = batalla();
  state = aplicarTimeout(state, "p1", NOW);
  assert.equal(state.turn, "p2");
  assert.equal(state.timeouts.p1, 1);
  assert.equal(cartaActiva(state, "p2").currentHp, 250);

  state.timeouts.p1 = MAX_TIMEOUTS - 1;
  state.turn = "p1";
  const fin = aplicarTimeout(state, "p1", NOW);
  assert.equal(fin.winner, "p2");
});

test("una acción reinicia el contador de timeouts", () => {
  const state = batalla();
  state.timeouts.p1 = 2;
  assert.equal(aplicarAccion(state, "p1", 0, NOW).timeouts.p1, 0);
});

test("aplicarAbandono da la victoria al rival", () => {
  const next = aplicarAbandono(batalla(), "p1");
  assert.equal(next.winner, "p2");
  assert.equal(next.lastEvent.type, "abandon");
  assert.equal(aplicarAbandono(next, "p2"), null);
});

test("debeAplicarTimeout: el activo al vencer, el pasivo tras la gracia", () => {
  const state = batalla();
  const vence = state.turnDeadline;
  assert.equal(debeAplicarTimeout(state, "p1", vence - 1), false);
  assert.equal(debeAplicarTimeout(state, "p1", vence), true);
  assert.equal(debeAplicarTimeout(state, "p2", vence), false);
  assert.equal(debeAplicarTimeout(state, "p2", vence + GRACIA_MS), true);
});
