import { shuffle } from "./random.js";

export const DECK_SIZE = 5;
export const MIN_ACTIVE_CARDS = 10;
export const SPECIAL_COOLDOWN = 3;
export const DEFENSE_REDUCTION = 0.5;
export const CRITICAL_CHANCE = 0.12;
export const CRITICAL_MULTIPLIER = 1.5;
export const DODGE_CHANCE = 0.08;

export const POINTS_WIN = 50;
export const POINTS_LOSS = 10;

export function createBattleCard(card) {
  return {
    ...card,
    currentHp: card.hp,
    isDefending: false,
    turnsPlayed: 0,
    specialCooldown: 0,
  };
}

// Factor aleatorio entre 0.85 y 1.15 sobre el daño base (sin redondear)
export function rollDamage(baseDamage) {
  const factor = 0.85 + Math.random() * 0.3;
  return baseDamage * factor;
}

// Orden obligatorio: factor, esquive, crítico, defensa y redondeo
export function calcularGolpe(baseDamage, target) {
  let damage = rollDamage(baseDamage);

  const dodged = Math.random() < DODGE_CHANCE;
  if (dodged) {
    return { damage: 0, dodged: true, isCritical: false };
  }

  const isCritical = Math.random() < CRITICAL_CHANCE;
  if (isCritical) {
    damage = damage * CRITICAL_MULTIPLIER;
  }

  if (target.isDefending) {
    const reduction = target.defense?.damageReduction ?? DEFENSE_REDUCTION;
    damage = damage * (1 - reduction);
  }

  return { damage: Math.round(damage), dodged: false, isCritical };
}

export function applyDamage(card, damage) {
  const nextHp = Math.max(0, card.currentHp - damage);
  return {
    ...card,
    currentHp: nextHp,
    isDefending: false,
  };
}

export function isCardDefeated(card) {
  return card.currentHp <= 0;
}

// Se llama al inicio de cada turno propio de la carta: el cooldown avanza una vez por turno
export function beginTurn(card) {
  if (card.specialCooldown <= 0) return card;
  return { ...card, specialCooldown: card.specialCooldown - 1 };
}

// Lista de acciones disponibles con su estado. Las bloqueadas llevan un motivo para la UI.
export function getActions(card) {
  const actions = (card.attacks || []).map((atk, index) => ({
    type: "attack",
    index,
    name: atk.name,
    baseDamage: atk.baseDamage,
    enabled: true,
  }));

  actions.push({
    type: "defense",
    name: card.defense?.name || "Defensa",
    enabled: true,
  });

  if (card.special) {
    const nextTurn = card.turnsPlayed + 1;
    let reason = null;
    if (nextTurn < card.special.unlockTurn) {
      reason = `Disponible en el turno ${card.special.unlockTurn}`;
    } else if (card.specialCooldown > 0) {
      reason = `Cooldown: ${card.specialCooldown}`;
    }
    actions.push({
      type: "special",
      name: card.special.name,
      baseDamage: card.special.baseDamage,
      enabled: reason === null,
      reason,
    });
  }

  return actions;
}

// Aplica una acción de `actor` sobre `target`. Devuelve nuevos objetos y el texto del turno.
export function resolveAction(actor, target, action) {
  const nextActor = { ...actor, turnsPlayed: actor.turnsPlayed + 1 };

  if (action.type === "defense") {
    nextActor.isDefending = true;
    return { actor: nextActor, target, damage: 0, log: `${actor.name} se pone a la defensiva.` };
  }

  const { damage, dodged, isCritical } = calcularGolpe(action.baseDamage, target);
  const nextTarget = applyDamage(target, damage);

  if (action.type === "special") {
    nextActor.specialCooldown = actor.special?.cooldown ?? SPECIAL_COOLDOWN;
  }

  let log = `${actor.name} usó ${action.name} e hizo ${damage} de daño.`;
  if (dodged) log = `${actor.name} usó ${action.name}. ¡ATAQUE ESQUIVADO!`;
  if (isCritical) log = `¡GOLPE CRÍTICO! ${log}`;

  return { actor: nextActor, target: nextTarget, damage, dodged, isCritical, log };
}

// Elige una acción válida (nunca bloqueada). Prioriza el especial disponible y evita re-defenderse.
export function chooseMachineAction(card) {
  const enabled = getActions(card).filter((a) => a.enabled);
  const special = enabled.find((a) => a.type === "special");
  if (special && Math.random() < 0.6) return special;

  const candidates = enabled.filter((a) => a.type !== "defense" || (!card.isDefending && Math.random() < 0.25));
  return shuffle(candidates.length ? candidates : enabled)[0];
}

// Puntos y resultado de una partida terminada
export function scoreBattle(won) {
  return {
    result: won ? "win" : "loss",
    pointsAwarded: won ? POINTS_WIN : POINTS_LOSS,
  };
}
