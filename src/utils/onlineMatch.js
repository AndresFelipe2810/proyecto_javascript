import { DECK_SIZE, createBattleCard, beginTurn, getActions, resolveAction, isCardDefeated } from "./battleEngine.js";
import { shuffle } from "./random.js";

export const SELECCION_MS = 20000;
export const TURNO_MS = 25000;
export const GRACIA_MS = 5000;
export const MAX_TIMEOUTS = 3;
export const INVITACION_MS = 60000;

export const rival = (role) => (role === "p1" ? "p2" : "p1");

export function rolDe(match, playerId) {
  if (match?.p1Id === playerId) return "p1";
  if (match?.p2Id === playerId) return "p2";
  return null;
}

export function msRestantes(deadline, now = Date.now()) {
  return Math.max(0, (deadline ?? 0) - now);
}

export function crearMatch(retador, retado, now = Date.now()) {
  return {
    p1Id: retador.id,
    p1Nickname: retador.nickname,
    p2Id: retado.id,
    p2Nickname: retado.nickname,
    status: "waiting",
    selectionDeadline: null,
    p1Deck: [],
    p2Deck: [],
    battleState: null,
    winnerId: null,
    startedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function invitacionVigente(match, playerId, now = Date.now()) {
  return (
    match.status === "waiting" &&
    match.p2Id === playerId &&
    match.p1Id !== playerId &&
    now - match.createdAt <= INVITACION_MS
  );
}

// Completa la selección del jugador con cartas al azar de su colección, sin repetir
export function completarMazo(seleccion, disponibles, n = DECK_SIZE) {
  const elegidas = [...new Set(seleccion.map(String))].slice(0, n);
  const resto = shuffle(disponibles.map(String).filter((id) => !elegidas.includes(id)));
  return [...elegidas, ...resto].slice(0, n);
}

export function mazoCompleto(deck, n = DECK_SIZE) {
  return Array.isArray(deck) && deck.length === n;
}

// p1 inicia la batalla; p2 solo lo hace si p1 no respondió tras el periodo de gracia
export function debeIniciarBatalla(match, miRol, now = Date.now()) {
  if (match.status !== "selecting" || match.battleState) return false;
  if (!mazoCompleto(match.p1Deck) || !mazoCompleto(match.p2Deck)) return false;
  return miRol === "p1" || now >= match.selectionDeadline + GRACIA_MS;
}

export function seleccionVencida(match, now = Date.now()) {
  if (match.status !== "selecting") return false;
  const incompleta = !mazoCompleto(match.p1Deck) || !mazoCompleto(match.p2Deck);
  return incompleta && now >= match.selectionDeadline + GRACIA_MS * 2;
}

export function cartaActiva(state, role) {
  return state[role].cards[state[role].index];
}

export function estaTerminada(state) {
  return Boolean(state?.winner);
}

export function iniciarBatalla(cartasP1, cartasP2, { now = Date.now(), rng = Math.random } = {}) {
  const first = rng() < 0.5 ? "p1" : "p2";
  return {
    seq: 1,
    turn: first,
    firstTurn: first,
    round: 1,
    turnDeadline: now + TURNO_MS,
    p1: { index: 0, cards: cartasP1.map(createBattleCard) },
    p2: { index: 0, cards: cartasP2.map(createBattleCard) },
    timeouts: { p1: 0, p2: 0 },
    winner: null,
    lastEvent: { seq: 1, actor: first, type: "start", log: "" },
  };
}

function pasarTurno(state, role, now) {
  const siguiente = rival(role);
  if (role !== state.firstTurn) state.round += 1;
  state.turn = siguiente;
  state.turnDeadline = now + TURNO_MS;
  const i = state[siguiente].index;
  state[siguiente].cards[i] = beginTurn(state[siguiente].cards[i]);
}

function terminar(state, ganadorRole) {
  state.winner = ganadorRole;
  state.turn = null;
  state.turnDeadline = null;
}

export function aplicarAccion(state, role, actionIndex, now = Date.now()) {
  if (estaTerminada(state) || state.turn !== role) return null;
  const action = getActions(cartaActiva(state, role))[actionIndex];
  if (!action?.enabled) return null;

  const next = structuredClone(state);
  const enemigo = rival(role);
  const res = resolveAction(cartaActiva(next, role), cartaActiva(next, enemigo), action);
  next[role].cards[next[role].index] = res.actor;
  next[enemigo].cards[next[enemigo].index] = res.target;

  const defeated = isCardDefeated(res.target);
  next.seq += 1;
  next.timeouts[role] = 0;
  next.lastEvent = {
    seq: next.seq,
    actor: role,
    type: action.type,
    actionName: action.name,
    damage: res.damage,
    defeated,
    log: defeated ? `${res.log} ¡${res.target.name} fue derrotado!` : res.log,
  };

  if (defeated) {
    next[enemigo].index += 1;
    if (next[enemigo].index >= next[enemigo].cards.length) {
      terminar(next, role);
      return next;
    }
  }

  pasarTurno(next, role, now);
  return next;
}

export function aplicarTimeout(state, role, now = Date.now()) {
  if (estaTerminada(state) || state.turn !== role) return null;

  const next = structuredClone(state);
  next.seq += 1;
  next.timeouts[role] += 1;
  next.lastEvent = {
    seq: next.seq,
    actor: role,
    type: "timeout",
    log: `Tiempo agotado: ${cartaActiva(next, role).name} pierde el turno.`,
  };

  if (next.timeouts[role] >= MAX_TIMEOUTS) {
    next.lastEvent.log += " Derrota por inactividad.";
    terminar(next, rival(role));
    return next;
  }

  pasarTurno(next, role, now);
  return next;
}

export function aplicarAbandono(state, role) {
  if (estaTerminada(state)) return null;
  const next = structuredClone(state);
  next.seq += 1;
  next.lastEvent = { seq: next.seq, actor: role, type: "abandon", log: "El rival abandonó la partida." };
  terminar(next, rival(role));
  return next;
}

// El jugador activo aplica el timeout al llegar a 0; el rival espera un margen extra por si el activo se desconectó
export function debeAplicarTimeout(state, miRol, now = Date.now()) {
  if (estaTerminada(state) || !state.turnDeadline) return false;
  const margen = state.turn === miRol ? 0 : GRACIA_MS;
  return now >= state.turnDeadline + margen;
}

export function parcheBatalla(match, state, now = Date.now()) {
  const terminada = estaTerminada(state);
  return {
    battleState: state,
    status: terminada ? "finished" : "battling",
    winnerId: terminada ? match[`${state.winner}Id`] : null,
    updatedAt: now,
  };
}
