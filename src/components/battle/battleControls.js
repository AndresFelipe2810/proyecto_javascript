import { getActions } from "../../utils/battleEngine.js";
import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";

function renderButton(card, action, idx, myTurn) {
  const disabled = !myTurn || !action.enabled ? "disabled" : "";
  const dmg = action.type === "defense"
    ? `<span class="act-dmg">${Math.round((card.defense?.damageReduction ?? 0) * 100)}% menos</span>`
    : `<span class="act-dmg">${escapar(action.baseDamage)} DMG</span>`;
  const glyph = action.type === "defense" ? `${icon("shield")} ` : action.type === "special" ? `${icon("star")} ` : "";
  const note = action.enabled ? "" : `<span class="act-note">${escapar(action.reason)}</span>`;
  return `<button class="action-btn action-${action.type}" data-action="${idx}" ${disabled}><span class="act-name">${glyph}${escapar(action.name)}</span>${dmg}${note}</button>`;
}

export function renderActionButtons(card, myTurn) {
  const indexed = getActions(card).map((a, idx) => ({ a, idx }));
  const group = (type) =>
    indexed.filter((x) => x.a.type === type).map((x) => renderButton(card, x.a, x.idx, myTurn)).join("");
  return /* html */ `
    <div class="battle-actions">
      <div class="attack-grid">${group("attack")}</div>
      <div class="utility-row">${group("defense")}${group("special")}</div>
    </div>
  `;
}
