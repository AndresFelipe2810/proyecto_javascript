import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";
import { rutaPublica } from "../../utils/assets.js";

const TIPOS = new Set(["fire", "water", "grass", "electric", "psychic", "ghost", "dragon", "normal", "fighting", "dark", "fairy"]);

export function claveTipo(tipo) {
  const k = String(tipo ?? "").trim().toLowerCase();
  return TIPOS.has(k) ? k : "normal";
}

export function renderTcgCard(card, { selected = false, order = null, compact = false, currentHp = null } = {}) {
  const tipo = claveTipo(card.type);
  const icono = icon(tipo);
  const hp = currentHp ?? card.hp;
  const hpMax = currentHp != null ? `<small>/${escapar(card.hp)}</small>` : "";
  const imagen = card.image
    ? `<img src="${escapar(rutaPublica(card.image))}" alt="${escapar(card.name)}" loading="lazy" data-tcg-img />`
    : "";
  const ataques = (card.attacks ?? [])
    .map(
      (a) =>
        `<li><span title="${escapar(a.name)}">${escapar(a.name)}</span><b>${escapar(a.baseDamage)}</b></li>`
    )
    .join("");

  return /* html */ `
    <article class="tcg-card${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}"
      data-type="${tipo}" data-id="${escapar(card.id)}"
      aria-label="${escapar(card.name)}, tipo ${escapar(card.type)}, HP ${escapar(hp)}">
      <header class="tcg-head">
        <span class="tcg-stage">BASIC</span>
        <h3 class="tcg-name" title="${escapar(card.name)}">${escapar(card.name)}</h3>
        <span class="tcg-hp"><small>HP</small>${escapar(hp)}${hpMax}</span>
        <span class="tcg-type" title="${escapar(card.type)}">${icono}</span>
      </header>
      <div class="tcg-art">
        ${order ? `<span class="tcg-order">${order}</span>` : ""}
        ${imagen}
        <span class="tcg-fallback" aria-hidden="true">${icono}</span>
      </div>
      <div class="tcg-body">
        <ul class="tcg-attacks">${ataques}</ul>
        <p class="tcg-extra">
          <span class="tcg-extra-icon" aria-hidden="true">${icon("shield")}</span>
          <span class="tcg-extra-name" title="${escapar(card.defense?.name)}">${escapar(card.defense?.name)}</span>
          <span class="tcg-extra-val">−${Math.round((card.defense?.damageReduction ?? 0) * 100)}%</span>
        </p>
        <p class="tcg-extra">
          <span class="tcg-extra-icon" aria-hidden="true">${icon("star")}</span>
          <span class="tcg-extra-name" title="${escapar(card.special?.name)}">${escapar(card.special?.name)}</span>
          <span class="tcg-extra-val">${escapar(card.special?.baseDamage)}</span>
        </p>
        <p class="tcg-desc">${escapar(card.description)}</p>
      </div>
    </article>`;
}

export function activarFallbackImagenes(root) {
  root.querySelectorAll("img[data-tcg-img]").forEach((img) => {
    const fallar = () => img.closest(".tcg-art")?.classList.add("no-image");
    img.addEventListener("error", fallar, { once: true });
    if (img.complete && img.naturalWidth === 0) fallar();
  });
}
