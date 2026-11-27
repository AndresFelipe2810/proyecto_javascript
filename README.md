# 🃏 Pokémon Card Battle Arena

Juego web de batallas de cartas por turnos con temática **Pokémon**. Los jugadores se registran, desbloquean cartas con sobres, arman un mazo de 5 y combaten contra la máquina o contra otro jugador online; un administrador gestiona el catálogo de cartas (CRUD).

**Integrantes**
- Andrés Felipe — [@AndresFelipe2810](https://github.com/AndresFelipe2810)
- Nicolas Archila — [@Nicolas121705](https://github.com/Nicolas121705)

**Fecha de entrega:** 23 de noviembre de 2026, 06:00 p. m.
**Enlace de publicación:** [GitHub Pages](https://andresfelipe2810.github.io/proyecto_javascript/)

---

## 📝 Actualización que se hizo para el examen

A la batalla contra la máquina le agregué modo automático, golpe crítico y esquivar ataque, todo con JavaScript Vanilla y reutilizando el motor que ya teníamos.

**Modo Manual / Automático**
- En la batalla hay dos botones: **Manual** y **Automático**, y se puede cambiar en plena partida.
- En automático mi carta juega sola con la misma estrategia de la máquina (`chooseMachineAction`), los botones de ataque se bloquean y sale el aviso "Batalla controlada automáticamente".
- Cada turno espera 900 ms para que se vea lo que pasa. Se usa un solo `setTimeout` (nada de `setInterval`), así que nunca se montan dos turnos al tiempo.
- El temporizador se corta al cambiar a manual, al terminar la partida o al salir de la batalla.
- Si en la partida se usó el automático, queda guardada en el historial con `"mode": "automatic"` (si no, `"cpu"`).

**Golpe crítico y esquivar**
- Crítico: **12 %** de probabilidad, daño **×1.5**.
- Esquivar: **8 %** de probabilidad, daño **0**.
- Salen los mensajes **¡GOLPE CRÍTICO!** y **¡ATAQUE ESQUIVADO!**, cada uno con su animación.
- Aplican también para el especial, y como el online usa el mismo motor, allá también pasan (se ve el mensaje, sin la animación nueva).

**Orden en que se calcula el golpe** (`calcularGolpe`)
1. Daño base × factor aleatorio (0.85–1.15).
2. Se mira si esquiva: si esquiva, daño 0 y ahí termina.
3. Si no, se mira si es crítico (×1.5).
4. Si el rival se estaba defendiendo, se baja el 50 %.
5. Se redondea una sola vez y se resta la vida (nunca queda por debajo de 0).

**Dónde está cada cosa**
- `src/utils/battleEngine.js`: las probabilidades (`CRITICAL_CHANCE`, `CRITICAL_MULTIPLIER`, `DODGE_CHANCE`) y el cálculo del golpe.
- `src/components/battle/battle.js`: el control de turnos (`setTurn`, `advanceTurn`), el automático (`setMode`, `autoAct`) y las animaciones.
- `src/components/battle/battleStyles.css`: estilos de los botones, el aviso y las animaciones.
- `tests/`: pruebas del crítico, el esquive y el especial, fijando `Math.random` para que no fallen al azar.

---

## 🛠️ Tecnologías

- JavaScript Vanilla (ES Modules)
- Web Components
- Fetch API
- Vite (servidor de desarrollo y build)
- JSON Server (API REST sobre `src/data/db.json`)
- Web Crypto API (SHA-256 + salt para contraseñas)
- PokéAPI (imágenes oficiales de las cartas)

---

## 🚀 Instalación y ejecución

```bash
git clone https://github.com/AndresFelipe2810/proyecto_javascript.git
cd proyecto_javascript
npm install
cp .env.example .env
```

En dos terminales:

```bash
npm run server   # JSON Server → http://localhost:3000
npm run dev      # Vite → http://localhost:5173/proyecto_javascript/
```

Pruebas: `npm test` (56 pruebas).

### Variables de entorno (`.env` / `.env.example`)

| Variable | Valor de ejemplo | Uso |
|---|---|---|
| `VITE_API_MODE` | `development` | Selecciona la URL de la API (`development` / `production`) |
| `VITE_API_DEV_URL` | `http://localhost:3000` | API en desarrollo |
| `VITE_API_PROD_URL` | `https://tu-servicio.onrender.com` | API en producción (Render) |
| `VITE_ADMIN_NICKNAME` | `admin` | Nickname que activa el login de administrador |

### ☁️ Despliegue

**Backend (Render, plan gratuito)**
1. En Render: *New → Web Service* conectado a este repositorio.
2. Build command: `npm install` · Start command: `npm run start:api` (Render define `$PORT`).
3. Copia la URL pública (`https://<servicio>.onrender.com`) y comprueba `…/cards`.
4. Aviso: el disco del plan gratuito es efímero; los jugadores/partidas creados se reinician al redesplegar o reiniciar el servicio. Además el servicio se duerme tras ~15 min sin uso: la app muestra **“Despertando servidor…”** y el botón **“Conectar / Despertar servidor”** mientras arranca (~1 min).

**Frontend (GitHub Pages)**
1. *Settings → Pages → Source: GitHub Actions*.
2. *Settings → Secrets and variables → Actions → Variables*: crea `VITE_API_URL` con la URL de Render.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml` (`npm ci`, `npm test`, `npm run build`) y publica `dist/` en `https://andresfelipe2810.github.io/proyecto_javascript/`.
4. `vite.config.js` usa `base: '/proyecto_javascript/'`; las rutas de `public/` (sonidos) se resuelven con `import.meta.env.BASE_URL`.

### 🔑 Credenciales de administrador (evaluación)

- Usuario: `admin`
- Contraseña: `cards2026`

---

## 📁 Estructura principal

```text
├── index.html
├── public/sounds/            # 8 efectos de audio (.mp3)
├── src/
│   ├── app.js                # Punto de entrada
│   ├── api/                  # Fetch: cartas, jugadores, batallas, admins, PokéAPI, config
│   ├── components/
│   │   ├── app/              # Orquestador (gameApp)
│   │   ├── auth/             # Registro / login
│   │   ├── battle/           # Batalla, HUD y estilos
│   │   ├── cards/            # Carta TCG y CRUD de admin
│   │   ├── deck/             # Selector de mazo
│   │   ├── leaderboard/      # Ranking
│   │   ├── online/           # Lobby, invitaciones, selección y batalla online
│   │   └── progress/         # Sobres, memoria y ruleta
│   ├── utils/                # battleEngine, onlineMatch, progression, audio, crypto, validators…
│   ├── styles/               # Tema global
│   └── data/db.json          # Cartas, jugadores, batallas, salas (matches) y admin
└── tests/                    # Pruebas con node:test
```

---

## 🎮 Reglas del juego

**Combate**
- Mazo de 5 cartas; cada carta tiene 250 HP, 4 ataques, una defensa y un ataque especial.
- Daño = daño base × factor aleatorio (0.85–1.15). Ningún ataque elimina de un golpe.
- **Defensa:** reduce el siguiente daño recibido un 50% y se consume.
- **Especial:** bloqueado en el turno 1; se desbloquea desde el turno 2 y tiene enfriamiento de 3 turnos.
- El HP no se recupera. Inicia un jugador al azar; gana quien deja sin cartas al rival.
- Victoria: **+50 puntos**. Derrota: **+10 puntos**.

**Multijugador online**
- En *Jugar* elige **Contra CPU** o **Contra otro jugador**: escribe el nickname del rival (debe existir y tener 5 cartas desbloqueadas).
- El rival recibe un aviso para **Aceptar** o **Rechazar** (el reto expira a los 60 s).
- Ambos eligen su mazo en **20 s** sincronizados; si el tiempo se agota, el mazo se completa al azar con cartas desbloqueadas.
- Cada turno dura **25 s**. Si se agota, se pierde el turno; 3 turnos perdidos seguidos = derrota por inactividad. Abandonar = derrota.
- Sincronización por **HTTP polling** sobre `/matches/:id` (sin WebSockets). Cada jugador registra su partida en `battles` y sus estadísticas se recalculan (puntos, victorias, bono de Memoria).

**Sobres y progresión**
- Cada jugador reclama un sobre inicial de 5 cartas.
- Minijuego de memoria (hasta 2 partidas diarias) y ruleta para ganar más cartas/intentos.
- El mazo solo puede armarse con **cartas desbloqueadas**.

**Ranking**
- Tabla por puntos, con Top 3 destacado.

**CRUD (administrador)**
- Crear, editar (PUT), activar/desactivar (PATCH) y eliminar cartas. Debe haber mínimo 10 cartas activas.
