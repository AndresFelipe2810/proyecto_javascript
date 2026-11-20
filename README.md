 🃏 Pokémon TCG Battle — Proyecto JavaScript

Aplicación web de batallas de cartas coleccionables (TCG) inspirada en Pokémon, construida con JavaScript modular, integración con **PokéAPI** y persistencia local mediante **JSON Server**. Permite gestionar usuarios, armar mazos personalizados, administrar cartas desde un panel de control y librar batallas por turnos con una interfaz responsiva.

---

## ✨ Funcionalidades Principales

### 🔐 Autenticación y Roles
- **Login y registro unificado:** soporte para jugadores regulares y rol de administrador.
- **Seguridad en credenciales:** cifrado de contraseñas con **SHA-256 + salt**.
- **Persistencia de sesión:** manejo de sesión activa mediante `localStorage`.

### 🃏 Cartas TCG y PokéAPI
- **Catálogo inicial:** 20 cartas configuradas en `data/db.json` utilizando el *Official Artwork* de **PokéAPI**.
- **Resiliencia visual:** sistema de *fallback* automático si alguna imagen falla al cargar.
- **Componente TCG reutilizable:** soporte para **11 tipos elementales** y tipografía fluida escalada con unidades de contenedor (`cqw`).
- **CRUD de cartas (Admin):** creación, edición y eliminación de cartas con autocompletado de imágenes a través de `api/pokeApi.js`.

### 🗂️ Constructor de Mazos
- Selección de cartas con **orden numerado** y contador en tiempo real.
- Diseño adaptable a **2 columnas** en pantallas de hasta `720px`.
- Botón fijo inferior (*sticky*) **«¡Ir a la Batalla!»**, oculto hasta completar el mazo reglamentario.

### ⚔️ Sistema de Batalla por Turnos
- **Modo enfoque (`.is-battle`):** oculta la cabecera principal para maximizar el área de juego.
- **HUD interactivo:** indicadores tipo píldora para **Ronda**, **Turno** (*«Turno del rival»*) y estado **Defendiendo**.
- **Controles táctiles optimizados:** ataques organizados en cuadrícula `2×2` más una fila dedicada para **Defensa / Especial** (botones de al menos `48px` de altura y estados deshabilitados legibles).
- **Opción de abandono:** botón **«Abandonar»** con diálogo de confirmación.

### 🏆 Ranking
- Tabla de clasificación para consultar el desempeño de los jugadores registrados.

---

## 🛠️ Tecnologías Utilizadas

- **JavaScript (ES Modules)** — Lógica de aplicación, componentes y estado del juego.
- **HTML5 & CSS3** — Diseño responsivo, CSS Grid/Flexbox y *Container Query Units* (`cqw`).
- **PokéAPI** — Obtención de arte oficial y metadatos de Pokémon.
- **JSON Server** — API REST simulada respaldada por `data/db.json`.
- **Web Crypto API** — Hashing de contraseñas (`SHA-256` + `salt`).

---

## 📁 Estructura del Proyecto

```text
proyecto_javascript/
├── api/
│   └── pokeApi.js              # Integración y autocompletado con PokéAPI
├── components/
│   ├── app/
│   │   └── gameApp.js          # Orquestador principal y control de estado (.is-battle)
│   ├── battle/
│   │   ├── battle.js           # Lógica de turnos, HUD y acciones de combate
│   │   └── battleStyles.css    # Estilos del modo enfoque y controles de batalla
│   ├── cards/
│   │   ├── tcgCard.js          # Componente reutilizable de carta TCG
│   │   └── tcgCard.css         # Estilos de los 11 tipos y escalado con cqw
│   └── deck/
│       ├── deckSelector.js     # Selección numerada y validación del mazo
│       └── deckStyles.css      # Grid responsivo y botón sticky
├── data/
│   └── db.json                 # Base de datos local (cartas y jugadores)
├── styles/
│   └── theme.css               # Variables globales y tema visual
└── package.json                # Dependencias y scripts de ejecución/pruebas
```

---

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/AndresFelipe2810/proyecto_javascript.git
   cd proyecto_javascript
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de datos (JSON Server):**
   ```bash
   npx json-server --watch data/db.json
   ```
   *(Ajusta el puerto o usa el script configurado en tu `package.json` si corresponde).*

4. **Abrir la aplicación:**
   Sirve el proyecto con tu servidor local preferido (por ejemplo, **Live Server** en VS Code o `npx serve`) y ábrelo en el navegador.

---

## 🧪 Pruebas

El proyecto cuenta con una batería de pruebas automatizadas (actualmente **11 pruebas pasando**):

```bash
npm test
```

---

## 📌 Estado Actual y Pendientes (Roadmap)

- [ ] **Pruebas visuales en móvil (`375px–430px`):** verificar vista de batalla sin *scroll* indeseado, botón *sticky* del mazo y panel de administración.
- [ ] **Compatibilidad Safari/iOS:** validar renderizado de cartas y truncado (`…`) en nombres de ataques largos.
- [ ] **Seguridad y cuentas *legacy*:** migrar jugadores antiguos sin hash y evitar exponer `hash` + `salt` en `GET /players`.
- [ ] **Regla de abandono:** definir si abandonar una batalla debe contabilizarse como derrota en el ranking.

---

## 👤 Autor

- **Andrés Felipe** — [@AndresFelipe2810](https://github.com/AndresFelipe2810)
- **Nicolas Archila** - [@Nicolas121705](https://github.com/Nicolas121705)
