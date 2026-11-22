# 🃏 Pokémon Card Battle Arena

Juego web de batallas de cartas por turnos con temática **Pokémon**. Los jugadores se registran, desbloquean cartas con sobres, arman un mazo de 5 y combaten contra la máquina o contra otro jugador online; un administrador gestiona el catálogo de cartas (CRUD).

**Integrantes**
- Andrés Felipe — [@AndresFelipe2810](https://github.com/AndresFelipe2810)
- Nicolas Archila — [@Nicolas121705](https://github.com/Nicolas121705)

**Fecha de entrega:** 23 de noviembre de 2026, 06:00 p. m.
**Enlace de publicación:** _pendiente_

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

Pruebas: `npm test` (48 pruebas).

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
