# 🃏 Pokémon Card Battle Arena

Juego web de batallas de cartas por turnos con temática **Pokémon**. Los jugadores se registran, desbloquean cartas con sobres, arman un mazo de 5 y combaten contra la máquina; un administrador gestiona el catálogo de cartas (CRUD).

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
npm run dev      # Vite → http://localhost:5173
```

Pruebas: `npm test` (31 pruebas).

### Variables de entorno (`.env` / `.env.example`)

| Variable | Valor de ejemplo | Uso |
|---|---|---|
| `VITE_API_MODE` | `development` | Selecciona la URL de la API (`development` / `production`) |
| `VITE_API_DEV_URL` | `http://localhost:3000` | API en desarrollo |
| `VITE_API_PROD_URL` | `https://api-produccion.example.com` | API en producción |
| `VITE_ADMIN_NICKNAME` | `admin` | Nickname que activa el login de administrador |

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
│   │   └── progress/         # Sobres, memoria y ruleta
│   ├── utils/                # battleEngine, progression, audio, crypto, validators…
│   ├── styles/               # Tema global
│   └── data/db.json          # Cartas, jugadores, batallas y admin
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

**Sobres y progresión**
- Cada jugador reclama un sobre inicial de 5 cartas.
- Minijuego de memoria (hasta 2 partidas diarias) y ruleta para ganar más cartas/intentos.
- El mazo solo puede armarse con **cartas desbloqueadas**.

**Ranking**
- Tabla por puntos, con Top 3 destacado.

**CRUD (administrador)**
- Crear, editar (PUT), activar/desactivar (PATCH) y eliminar cartas. Debe haber mínimo 10 cartas activas.
