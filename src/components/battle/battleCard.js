import { renderTcgCard } from "../cards/tcgCard.js";
import { escapar } from "../../utils/validators.js";
import { icon } from "../../utils/icons.js";

export function renderFighter(side, label, card) {
  return /* html */ `
    <div class="fighter" data-side="${side}">
      <p class="fighter-label">${escapar(label)}</p>
      ${renderTcgCard(card, { compact: true, currentHp: card.currentHp })}
      <p class="fighter-status">${card.isDefending ? `<span class="pill pill-defending">${icon("shield")} Defendiendo</span>` : ""}</p>
    </div>
  `;
}
