import test from "node:test";
import assert from "node:assert/strict";
import {
  createBattleCard,
  beginTurn,
  getActions,
  resolveAction,
  chooseMachineAction,
  scoreBattle,
} from "../src/utils/battleEngine.js";

const base = {
  id: "c1",
  name: "Test",
  hp: 250,
  attacks: [20, 30, 40, 50].map((d, i) => ({ name: `a${i}`, baseDamage: d })),
  defense: { name: "Guard", damageReduction: 0.5 },
  special: { name: "Boom", baseDamage: 65, unlockTurn: 2, cooldown: 3 },
};
const special = (card) => getActions(card).find((a) => a.type === "special");

test("especial bloqueado en el primer turno y habilitado en el segundo", () => {
  let card = createBattleCard(base);
  assert.equal(special(card).enabled, false);
  card = resolveAction(card, createBattleCard(base), getActions(card)[0]).actor;
  assert.equal(special(card).enabled, true);
});

test("cooldown de 3 turnos propios tras usar el especial", () => {
  let card = { ...createBattleCard(base), turnsPlayed: 1 };
  const target = createBattleCard(base);
  card = resolveAction(card, target, special(card)).actor;
  assert.equal(card.specialCooldown, 3);
  for (const esperado of [2, 1, 0]) {
    card = beginTurn(card);
    assert.equal(card.specialCooldown, esperado);
  }
  assert.equal(special(card).enabled, true);
});

test("defensa reduce 50% el siguiente ataque y luego desaparece", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const attacker = createBattleCard(base);
  const defender = { ...createBattleCard(base), isDefending: true };
  const { target, damage } = resolveAction(attacker, defender, getActions(attacker)[3]);
  assert.ok(damage <= Math.round(50 * 1.15 * 0.5) + 1);
  assert.equal(target.isDefending, false);
});

test("daño nunca derrota de un golpe y la vida no baja de 0", (t) => {
  const attacker = { ...createBattleCard(base), turnsPlayed: 5 };
  for (let i = 0; i < 200; i++) {
    const { target } = resolveAction(attacker, createBattleCard(base), special(attacker));
    assert.ok(target.currentHp > 0);
  }
  t.mock.method(Math, "random", () => 0.5);
  const weak = { ...createBattleCard(base), currentHp: 5 };
  assert.equal(resolveAction(attacker, weak, getActions(attacker)[3]).target.currentHp, 0);
});

test("la máquina nunca elige acciones bloqueadas", () => {
  const card = createBattleCard(base);
  for (let i = 0; i < 200; i++) assert.notEqual(chooseMachineAction(card).type, "special");
});

test("puntos por victoria y derrota", () => {
  assert.deepEqual(scoreBattle(true), { result: "win", pointsAwarded: 50 });
  assert.deepEqual(scoreBattle(false), { result: "loss", pointsAwarded: 10 });
});

// Math.random fijo: 0.5 = golpe normal, 0.01 = esquivado, 0.1 = crítico (factor 0.88)
const atacar = (index, defender = createBattleCard(base)) => {
  const attacker = createBattleCard(base);
  return resolveAction(attacker, defender, getActions(attacker)[index]);
};

test("ataque esquivado: no quita vida y consume la defensa", (t) => {
  t.mock.method(Math, "random", () => 0.01);
  const res = atacar(3, { ...createBattleCard(base), isDefending: true });
  assert.equal(res.dodged, true);
  assert.equal(res.isCritical, false);
  assert.equal(res.damage, 0);
  assert.equal(res.target.currentHp, 250);
  assert.equal(res.target.isDefending, false);
  assert.match(res.log, /¡ATAQUE ESQUIVADO!/);
});

test("golpe crítico: daño x1.5 y redondeo solo al final", (t) => {
  t.mock.method(Math, "random", () => 0.1);
  const res = atacar(1);
  assert.equal(res.isCritical, true);
  assert.equal(res.damage, 40); // 30 x 0.88 x 1.5 = 39.6
  assert.equal(res.target.currentHp, 210);
  assert.match(res.log, /¡GOLPE CRÍTICO!/);
});

test("la defensa reduce 50% también un golpe crítico", (t) => {
  t.mock.method(Math, "random", () => 0.1);
  const res = atacar(3, { ...createBattleCard(base), isDefending: true });
  assert.equal(res.damage, 33); // 50 x 0.88 x 1.5 x 0.5
});

test("golpe normal: ni esquivado ni crítico", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const res = atacar(3);
  assert.equal(res.dodged, false);
  assert.equal(res.isCritical, false);
  assert.equal(res.damage, 50);
});

// Carta en su segundo turno: ya puede usar el especial
const usarEspecial = (defender = createBattleCard(base)) => {
  const attacker = { ...createBattleCard(base), turnsPlayed: 1 };
  return resolveAction(attacker, defender, special(attacker));
};

test("el especial puede esquivarse y aun así entra en cooldown", (t) => {
  t.mock.method(Math, "random", () => 0.01);
  const res = usarEspecial();
  assert.equal(res.dodged, true);
  assert.equal(res.target.currentHp, 250);
  assert.equal(res.actor.specialCooldown, 3);
});

test("el especial puede ser crítico", (t) => {
  t.mock.method(Math, "random", () => 0.1);
  const res = usarEspecial();
  assert.equal(res.isCritical, true);
  assert.equal(res.damage, 86); // 65 x 0.88 x 1.5 = 85.8
});

test("la defensa reduce también un especial crítico", (t) => {
  t.mock.method(Math, "random", () => 0.1);
  const res = usarEspecial({ ...createBattleCard(base), isDefending: true });
  assert.equal(res.damage, 43); // 65 x 0.88 x 1.5 x 0.5 = 42.9
});

test("la selección automática no usa el especial en cooldown", () => {
  const card = { ...createBattleCard(base), turnsPlayed: 5, specialCooldown: 2 };
  for (let i = 0; i < 200; i++) assert.notEqual(chooseMachineAction(card).type, "special");
});
