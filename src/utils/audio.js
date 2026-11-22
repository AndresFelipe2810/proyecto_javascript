const STORAGE_KEY = "battle-muted";

export const SOUNDS = {
  attack: "/sounds/ataque.mp3",
  defense: "/sounds/defensa.mp3",
  special: "/sounds/especial.mp3",
  defeated: "/sounds/derrotada.mp3",
  hit: "/sounds/dano.mp3",
  enter: "/sounds/entrada.mp3",
  victory: "/sounds/victoria.mp3",
  defeat: "/sounds/derrota.mp3",
};

const cache = new Map();
const missing = new Set();
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* almacenamiento no disponible */
  }
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function cardSound(card, kind) {
  return card?.sounds?.[kind] || SOUNDS[kind];
}

function tryPlay(path) {
  if (!path || missing.has(path) || typeof Audio === "undefined") return Promise.reject(new Error("sin audio"));
  let base = cache.get(path);
  if (!base) {
    base = new Audio(path);
    base.preload = "auto";
    cache.set(path, base);
  }
  const instance = base.cloneNode();
  instance.volume = 0.6;
  return instance.play().then(
    () => instance,
    (err) => {
      if (err?.name !== "NotAllowedError") missing.add(path);
      return Promise.reject(err);
    }
  );
}

export function playSound(path, fallbackPath = null) {
  if (muted) return;
  try {
    tryPlay(path).catch((err) => {
      // El autoplay bloqueado no se reintenta: el fallback fallaría igual
      if (err?.name === "NotAllowedError") return;
      if (fallbackPath && fallbackPath !== path) tryPlay(fallbackPath).catch(() => {});
    });
  } catch {
    /* sin audio disponible */
  }
}

export function playCardSound(card, kind) {
  playSound(cardSound(card, kind), SOUNDS[kind]);
}
