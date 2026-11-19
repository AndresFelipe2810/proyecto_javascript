import '../auth/playerRegister.js';

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.render();
  }

  render() {
    this.innerHTML = /* html */ `
      <header>
        <h1>Pokémon Card Battle Arena</h1>
      </header>
      <main id="app-content">
        <player-register></player-register>
      </main>
    `;
  }
}

customElements.define('card-game-app', GameApp);