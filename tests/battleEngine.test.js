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

test("defensa reduce 50% el siguiente ataque y luego desaparece", () => {
  const attacker = createBattleCard(base);
  const defender = { ...createBattleCard(base), isDefending: true };
  const { target, damage } = resolveAction(attacker, defender, getActions(attacker)[3]);
  assert.ok(damage <= Math.round(50 * 1.15 * 0.5) + 1);
  assert.equal(target.isDefending, false);
});

test("daño nunca derrota de un golpe y la vida no baja de 0", () => {
  const attacker = { ...createBattleCard(base), turnsPlayed: 5 };
  for (let i = 0; i < 200; i++) {
    const { target } = resolveAction(attacker, createBattleCard(base), special(attacker));
    assert.ok(target.currentHp > 0);
  }
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
