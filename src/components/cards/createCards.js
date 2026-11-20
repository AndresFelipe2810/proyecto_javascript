import { postCard } from "../../api/cardsApi.js";
import { escapar } from "../../utils/validators.js";

const SONIDOS_BASE = {
  attack: "/sounds/attack.mp3",
  defense: "/sounds/defense.mp3",
  special: "/sounds/special.mp3",
  defeated: "/sounds/defeated.mp3",
};

export function formularioCarta(carta = {}) {
  const ataques = [0, 1, 2, 3]
    .map(
      (i) => /* html */ `
      <fieldset>
        <legend>Ataque ${i + 1}</legend>
        <input name="atk${i}Name" placeholder="Nombre" value="${escapar(carta.attacks?.[i]?.name)}" required />
        <input name="atk${i}Damage" type="number" min="1" value="${carta.attacks?.[i]?.baseDamage ?? 20 + i * 10}" required />
      </fieldset>`
    )
    .join("");

  return /* html */ `
    <input name="name" placeholder="Nombre" value="${escapar(carta.name)}" required />
    <input name="type" placeholder="Tipo" value="${escapar(carta.type)}" required />
    <input name="image" placeholder="Ruta de imagen" value="${escapar(carta.image)}" />
    <textarea name="description" placeholder="Descripción" required>${escapar(carta.description)}</textarea>
    ${ataques}
    <input name="defenseName" placeholder="Nombre de defensa" value="${escapar(carta.defense?.name)}" required />
    <input name="specialName" placeholder="Nombre de especial" value="${escapar(carta.special?.name)}" required />
    <input name="specialDamage" type="number" min="55" max="70" value="${carta.special?.baseDamage ?? 65}" required />
  `;
}

export function leerFormulario(form, base = {}) {
  const v = (nombre) => form.elements[nombre].value.trim();
  return {
    ...base,
    name: v("name"),
    type: v("type"),
    image: v("image"),
    description: v("description"),
    hp: 250,
    attacks: [0, 1, 2, 3].map((i) => ({
      id: base.attacks?.[i]?.id ?? `atk-${i + 1}`,
      name: v(`atk${i}Name`),
      baseDamage: Number(v(`atk${i}Damage`)),
    })),
    defense: { name: v("defenseName"), damageReduction: 0.5 },
    special: {
      name: v("specialName"),
      baseDamage: Number(v("specialDamage")),
      unlockTurn: 2,
      cooldown: 3,
    },
    sounds: base.sounds ?? SONIDOS_BASE,
    active: base.active ?? true,
    createdAt: base.createdAt ?? new Date().toISOString(),
  };
}

export function siguienteId(cartas) {
  const max = cartas.reduce((m, c) => {
    const n = Number(String(c.id).replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `card-${String(max + 1).padStart(3, "0")}`;
}

export function crearCarta(datos, cartas) {
  return postCard({ ...datos, id: siguienteId(cartas), createdAt: new Date().toISOString() });
}
