# Proyecto Integrador JavaScript — Card Battle Arena

## Aclaraciones importantes
Va a ser con enfoque en POKEMON

## Descripción del proyecto

Juego web de cartas coleccionables con CRUD, Fetch API, Web Components y persistencia mediante API REST. Cada equipo desarrollará un juego web de cartas inspirado en una temática seleccionada por sus integrantes. Los cinco equipos deberán trabajar con temáticas diferentes; pueden utilizar universos como Pokémon, Digimon, Dragon Ball, Avatar: La Leyenda de Aang, Naruto, Marvel, DC u otros similares previamente definidos con el docente.

El objetivo académico principal es demostrar dominio de JavaScript Vanilla mediante el uso de Web Components, módulos ES6, Fetch API, métodos HTTP, manejo del DOM, eventos, asincronía, estructuras de datos, lógica de juego y persistencia de información.

El proyecto será desarrollado en parejas. Cada pareja deberá entregar una aplicación funcional construida con HTML, CSS y JavaScript Vanilla. Se permite utilizar Bootstrap o Tailwind CSS únicamente como apoyo visual.

Está prohibido utilizar React, Angular, Vue, Svelte u otros frameworks avanzados de frontend. También está prohibido sustituir `fetch()` por Axios u otra librería equivalente para el consumo de la API.

---

## Enunciado

La aplicación deberá simular un juego de cartas de combate entre un jugador y la máquina.

Cada equipo deberá crear inicialmente un pool de 20 cartas correspondiente a su temática. Cada carta contará con estadísticas, ataques, defensa, poder especial, imagen y recursos de audio. El usuario deberá registrarse con un nickname único, seleccionar cinco cartas, definir el orden de su mazo y enfrentarse contra cinco cartas seleccionadas por la máquina.

Paralelamente, la aplicación deberá contar con una sección de administración protegida por un login sencillo. Desde esta sección será posible gestionar las cartas utilizando un CRUD completo consumido mediante Fetch API.

---

## 1. Registro del jugador

Antes de iniciar una partida el usuario deberá registrarse con un nickname.

### Condiciones obligatorias

- El nickname es obligatorio.
- No puede existir otro jugador con el mismo nickname.
- La validación de duplicados debe realizarse consultando la API.
- Si el nickname ya existe, la aplicación debe informar al usuario y no crear un nuevo registro.
- Si es un nickname nuevo, se deberá registrar mediante una petición POST.
- Una vez registrado, el jugador podrá acceder al flujo de selección de cartas.
- Los puntos, victorias, derrotas y partidas jugadas se acumulan entre partidas.

Cada jugador debe manejar como mínimo:

```json
{
  "id": "player-001",
  "nickname": "JCMASTER",
  "points": 0,
  "wins": 0,
  "losses": 0,
  "gamesPlayed": 0,
  "createdAt": "2026-08-18T14:30:00.000Z"
}
```

---

## 2. Pool de cartas

El proyecto debe iniciar con 20 cartas precargadas en `src/data/db.json`.

Cada carta debe incluir como mínimo:

- Identificador único.
- Nombre.
- Tipo, elemento, categoría o equivalente según la temática.
- Imagen.
- Descripción breve.
- 250 puntos de vida base.
- Cuatro ataques.
- Una acción de defensa.
- Un poder especial.
- Estado activo/inactivo.
- Rutas o referencias de los recursos de audio correspondientes.

Los estudiantes serán responsables de crear o generar las imágenes y audios utilizados en su temática. Estos recursos forman parte del entregable.

---

## 3. Selección del mazo

Una vez registrado, el jugador deberá visualizar las cartas activas disponibles.

### Reglas

- El jugador debe seleccionar exactamente 5 cartas diferentes.
- No se puede seleccionar dos veces la misma carta.
- Debe existir una forma clara de conocer cuántas cartas han sido seleccionadas.
- El jugador debe definir el orden en el que sus cinco cartas entrarán al combate.
- El orden puede implementarse mediante botones, controles de posición, arrastrar y soltar o cualquier mecanismo funcional desarrollado con JavaScript.
- La partida solo podrá iniciar cuando existan por lo menos 10 cartas activas en el pool.
- La máquina seleccionará cinco cartas diferentes entre las cartas que no fueron seleccionadas por el jugador.

Ejemplo:

**Mazo del jugador**

1. Carta A
2. Carta B
3. Carta C
4. Carta D
5. Carta E

---

## 4. Sistema de combate

Cada carta tendrá inicialmente:

**250 HP**

Cuando una carta pierde todos sus puntos de vida queda derrotada y entra la siguiente carta del mazo.

La carta vencedora **NO** recupera su vida.

Ejemplo:

- Carta del jugador: 74 / 250 HP
- Carta de la máquina: 0 / 250 HP

La carta de la máquina es derrotada.

Entra la siguiente carta de la máquina con 250 / 250 HP.

La carta del jugador continúa con 74 / 250 HP.

La partida termina cuando uno de los dos participantes pierde sus cinco cartas.

---

## 5. Inicio y turnos

Al comenzar la batalla se deberá sortear aleatoriamente quién realiza el primer turno.

Ejemplo conceptual:

```js
const iniciaJugador = Math.random() < 0.5;
```

Debe mostrarse visualmente quién inicia.

### Definiciones

- **Turno:** una acción realizada por uno de los participantes.
- **Ronda:** ciclo en el que ambos participantes han tenido oportunidad de realizar una acción.

Los turnos deberán alternarse correctamente.

---

## 6. Ataques

Cada carta debe tener exactamente cuatro ataques normales.

Se recomienda utilizar daños base aproximados como:

| Ataque | Daño base sugerido |
|--------|--------------------|
| Ataque 1 | 20 |
| Ataque 2 | 30 |
| Ataque 3 | 40 |
| Ataque 4 | 50 |

El daño real deberá incorporar un pequeño factor aleatorio para evitar que todos los ataques sean idénticos.

Fórmula sugerida:

```
dañoReal = dañoBase × factorAleatorio
```

Donde:

```
factorAleatorio = valor entre 0.85 y 1.15
```

El resultado final deberá redondearse a un número entero.

Ejemplo:

```js
const factor = 0.85 + Math.random() * 0.30;
const damage = Math.round(baseDamage * factor);
```

Los valores pueden variar ligeramente entre cartas, pero deben mantenerse equilibrados. No se permiten cartas capaces de derrotar normalmente a un oponente de 250 HP con un único ataque.

---

## 7. Defensa

Cada carta contará con una acción de defensa.

Al seleccionar defensa:

- La carta consume su turno.
- No causa daño durante ese turno.
- El siguiente ataque recibido tendrá una reducción del 50 %.
- Una vez recibido el ataque, el estado de defensa desaparece.
- La defensa debe representarse visualmente.
- La máquina también puede elegir defenderse.

Ejemplo de estado:

```js
isDefending = true;
```

---

## 8. Poder especial

Cada carta tendrá un poder especial.

### Reglas

- No estará disponible al inicio.
- Se habilita a partir del segundo turno de esa carta.
- Debe causar un daño mayor que los ataques normales.
- Daño base sugerido: entre 55 y 70 puntos.
- Después de utilizarse entra en un cooldown de tres turnos propios.
- Mientras el cooldown sea mayor que cero, no podrá utilizarse.
- La interfaz debe mostrar cuándo el poder está bloqueado y cuántos turnos faltan para volver a utilizarlo.

Ejemplo:

```
Poder especial utilizado
Cooldown: 3

Siguiente turno propio
Cooldown: 2

Siguiente turno propio
Cooldown: 1

Siguiente turno propio
Cooldown: 0
Poder disponible nuevamente
```

---

## 9. Máquina

- La máquina deberá tomar decisiones automáticamente durante sus turnos.
- No se debe implementar inteligencia artificial real.
- Debe existir una función JavaScript que determine las acciones disponibles para la carta de la máquina y seleccione una acción válida.

La máquina podrá utilizar:

- Ataque 1.
- Ataque 2.
- Ataque 3.
- Ataque 4.
- Defensa.
- Poder especial, únicamente cuando esté desbloqueado y su cooldown sea cero.

La lógica debe evitar seleccionar acciones que se encuentren bloqueadas.

---

## 10. Leaderboard

Cuando finalice una partida se deberá actualizar el jugador.

### Sistema de puntos

- **Victoria:** +50 puntos
- **Derrota:** +10 puntos

También deben actualizarse:

- Victorias.
- Derrotas.
- Partidas jugadas.

La aplicación deberá mostrar un leaderboard ordenado de mayor a menor puntaje.

Como mínimo deberá existir una presentación visual destacada para:

1. 1.er lugar
2. 2.º lugar
3. 3.er lugar

Cada posición deberá mostrar como mínimo:

- Nickname.
- Puntaje.
- Victorias.
- Partidas jugadas.

Los puntos de un jugador son acumulativos.

---

## 11. Historial de partidas

Al finalizar una partida se deberá almacenar un registro de batalla.

Cada registro debe contener como mínimo:

- ID de la partida.
- ID del jugador.
- Nickname.
- Resultado.
- Puntos obtenidos.
- IDs de las cinco cartas del jugador.
- IDs de las cinco cartas de la máquina.
- Fecha/hora de inicio.
- Fecha/hora de finalización.

---

## 12. Administración de cartas

La aplicación deberá contar con una sección de administración para gestionar el pool de cartas.

### Login administrativo

El administrador ingresará mediante:

- Usuario.
- Contraseña.

Las credenciales estarán precargadas en `db.json`.

Ejemplo:

```json
{
  "id": "admin-001",
  "username": "admin",
  "password": "cards2026"
}
```

La aplicación deberá validar las credenciales consultando la API.

Solo después de una validación correcta se mostrará el panel de administración.

> **Nota:** Este login tiene únicamente una finalidad académica. Al almacenar credenciales directamente en `db.json` no representa un sistema de seguridad real y no debe utilizarse como patrón de autenticación para aplicaciones productivas.

---

## 13. CRUD obligatorio de cartas

Desde el panel administrativo debe existir un CRUD completamente funcional.

Se evaluarán obligatoriamente los cinco métodos HTTP:

| Método | Uso obligatorio |
|--------|-----------------|
| GET | Consultar y listar cartas |
| POST | Crear una carta |
| PUT | Reemplazar o editar completamente una carta |
| PATCH | Actualizar parcialmente una carta |
| DELETE | Eliminar una carta |

Ejemplo de PATCH

Puede utilizarse para modificar únicamente:

```json
{
  "active": false
}
```

El estudiante debe demostrar la diferencia práctica entre PUT y PATCH.

Todos estos métodos deben consumirse utilizando Fetch API.

---

## 14. Fetch API

Las peticiones HTTP deberán estar aisladas dentro de:

```
src/api/
```

Ejemplo:

```
src/api/cardsApi.js
src/api/playersApi.js
src/api/adminsApi.js
src/api/battlesApi.js
```

Un archivo de API puede exportar las funciones relacionadas con una entidad:

```js
export async function getCards() {}
export async function postCard(card) {}
export async function putCard(card, id) {}
export async function patchCard(data, id) {}
export async function deleteCard(id) {}
```

Está prohibido colocar las peticiones Fetch directamente dentro del HTML.

---

## 15. JSON Server (opcional)

> Estas funcionalidades se pueden implementar con LocalStorage.

El proyecto puede utilizar JSON Server durante el desarrollo.

El archivo principal se encontrará en:

```
src/data/db.json
```

Debe poder iniciarse el servidor local y consumir los recursos mediante HTTP.

Ejemplo:

```
http://localhost:3000/cards
http://localhost:3000/players
http://localhost:3000/admins
http://localhost:3000/battles
```

Se recomienda crear un script de npm para facilitar su ejecución.

Ejemplo:

```json
{
  "scripts": {
    "dev": "vite",
    "server": "json-server --watch src/data/db.json --port 3000"
  }
}
```

---

## 16. Entornos Development / Production (opcional)

El proyecto debe incluir un archivo `.env` para cambiar la URL de la API.

Ejemplo:

```
VITE_API_MODE=development
VITE_API_DEV_URL=http://localhost:3000
VITE_API_PROD_URL=https://api-produccion.example.com
```

La selección debe realizarse desde JavaScript utilizando una estructura `switch`.

Ejemplo conceptual:

```js
let API_URL;

switch (import.meta.env.VITE_API_MODE) {
  case 'production':
    API_URL = import.meta.env.VITE_API_PROD_URL;
    break;

  case 'development':
  default:
    API_URL = import.meta.env.VITE_API_DEV_URL;
    break;
}
```

### Reglas

- JSON Server en desarrollo.
- El cambio de entorno mediante `.env` y `switch`.
- Para producción se permite utilizar una API compatible consumida mediante `fetch()`, por ejemplo Supabase REST o MockAPI.
- Railway puede utilizarse para desplegar JSON Server, pero su uso es sugerido y no obligatorio.
- Si se utiliza Supabase, el consumo debe hacerse con Fetch API; no se deberá reemplazar el ejercicio por un SDK que oculte las peticiones HTTP.
- El archivo `.env` no debe almacenar contraseñas privadas ni secretos sensibles.
- Se debe entregar un `.env.example` con la estructura necesaria.

---

## 17. Web Components obligatorios

Toda la interfaz debe construirse mediante Web Components utilizando la sintaxis trabajada durante las clases.

El patrón esperado es:

```js
export class ExampleComponent extends HTMLElement {
  constructor() {
    super();
    this.render();
    this.configurarEventos();
  }

  render() {
    this.innerHTML = /* html */ `
      <section>
        ...
      </section>
    `;
  }

  configurarEventos() {
    // Eventos del componente
  }
}

customElements.define('example-component', ExampleComponent);
```

No es obligatorio utilizar Shadow DOM.

Los componentes deben dividirse por responsabilidad.

---

## 18. Composición de componentes

La organización debe seguir el mismo patrón utilizado durante las clases.

Para la entidad cards, por ejemplo:

```
components/
└── cards/
    ├── cards.js
    ├── createCards.js
    ├── editCards.js
    ├── deleteCards.js
    └── cardsStyles.css
```

`cards.js` funciona como componente principal de consulta/listado e importa los componentes u operaciones necesarias de creación, edición y eliminación.

Ejemplo:

```js
import { crearCarta } from './createCards.js';
import { editarCartaCompleta } from './editCards.js';
import { eliminarCarta } from './deleteCards.js';
```

El componente principal será el que posteriormente se conecte con el componente padre o con `app.js`.

---

## 19. Estructura de carpetas sugerida

```
cardBattle/
│
├── public/
│   ├── images/
│   │   └── cards/
│   ├── sounds/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── api/
│   │   ├── apiConfig.js
│   │   ├── cardsApi.js
│   │   ├── playersApi.js
│   │   ├── adminsApi.js
│   │   └── battlesApi.js
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── app/
│   │   │   └── gameApp.js
│   │   │
│   │   ├── auth/
│   │   │   ├── playerRegister.js
│   │   │   ├── adminLogin.js
│   │   │   └── authStyles.css
│   │   │
│   │   ├── cards/
│   │   │   ├── cards.js
│   │   │   ├── createCards.js
│   │   │   ├── editCards.js
│   │   │   ├── deleteCards.js
│   │   │   └── cardsStyles.css
│   │   │
│   │   ├── deck/
│   │   │   ├── deckSelector.js
│   │   │   └── deckStyles.css
│   │   │
│   │   ├── battle/
│   │   │   ├── battle.js
│   │   │   ├── battleCard.js
│   │   │   ├── battleControls.js
│   │   │   └── battleStyles.css
│   │   │
│   │   └── leaderboard/
│   │       ├── leaderboard.js
│   │       └── leaderboardStyles.css
│   │
│   ├── data/
│   │   └── db.json
│   │
│   ├── utils/
│   │   ├── battleEngine.js
│   │   ├── random.js
│   │   └── validators.js
│   │
│   └── app.js
│
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

Se permiten pequeñas variaciones siempre que se conserve la separación clara entre:

- API.
- Componentes.
- Datos.
- Utilidades.
- Recursos visuales y de audio.

---

## 20. index.html y app.js

`index.html` debe mantenerse mínimo.

Ejemplo:

```html
<body>
  <card-game-app></card-game-app>
  <script type="module" src="/src/app.js"></script>
</body>
```

`app.js` debe funcionar únicamente como punto de entrada de módulos y Web Components.

Ejemplo:

```js
import './components/app/gameApp.js';
```

No se permitirá concentrar la lógica completa de la aplicación dentro de `app.js`.

---

## 21. Estructura mínima obligatoria de db.json

El archivo debe tener como mínimo cuatro recursos:

```json
{
  "admins": [
    {
      "id": "admin-001",
      "username": "admin",
      "password": "cards2026"
    }
  ],
  "players": [],
  "cards": [
    {
      "id": "card-001",
      "name": "Voltaris",
      "type": "Electric",
      "image": "/images/cards/voltaris.webp",
      "description": "Guardián eléctrico especializado en ataques rápidos.",
      "hp": 250,
      "attacks": [
        {
          "id": "attack-01",
          "name": "Spark Shot",
          "baseDamage": 20
        },
        {
          "id": "attack-02",
          "name": "Volt Rush",
          "baseDamage": 30
        },
        {
          "id": "attack-03",
          "name": "Thunder Pulse",
          "baseDamage": 40
        },
        {
          "id": "attack-04",
          "name": "Storm Breaker",
          "baseDamage": 50
        }
      ],
      "defense": {
        "name": "Static Shield",
        "damageReduction": 0.5
      },
      "special": {
        "name": "Final Thunder",
        "baseDamage": 65,
        "unlockTurn": 2,
        "cooldown": 3
      },
      "sounds": {
        "attack": "/sounds/attack-electric.mp3",
        "defense": "/sounds/defense-electric.mp3",
        "special": "/sounds/special-electric.mp3",
        "defeated": "/sounds/defeated.mp3"
      },
      "active": true,
      "createdAt": "2026-08-18T00:00:00.000Z"
    }
  ],
  "battles": []
}
```

El arreglo `cards` deberá contener 20 cartas precargadas al momento de la entrega.

Ejemplo de batalla almacenada:

```json
{
  "id": "battle-001",
  "playerId": "player-001",
  "playerNickname": "JCMASTER",
  "result": "win",
  "pointsAwarded": 50,
  "playerDeck": [
    "card-001",
    "card-002",
    "card-003",
    "card-004",
    "card-005"
  ],
  "machineDeck": [
    "card-006",
    "card-007",
    "card-008",
    "card-009",
    "card-010"
  ],
  "startedAt": "2026-08-20T20:00:00.000Z",
  "endedAt": "2026-08-20T20:08:32.000Z"
}
```

---

## 22. Animaciones CSS

La aplicación deberá contener animaciones o transiciones para representar como mínimo:

- Ataque.
- Recepción de daño.
- Defensa.
- Activación del poder especial.
- Carta derrotada.
- Entrada de una nueva carta.
- Victoria.
- Derrota.

Las animaciones deben activarse de acuerdo con eventos generados desde JavaScript.

---

## 23. Audio

El proyecto deberá utilizar efectos de sonido relacionados con la temática escogida.

Como mínimo deben existir sonidos para:

- Ataque.
- Defensa.
- Poder especial.
- Carta derrotada.
- Victoria.
- Derrota.

Los estudiantes serán responsables de producir, generar o preparar estos recursos.

No se evaluará únicamente la calidad artística; se evaluará principalmente que los sonidos se integren correctamente con la lógica y los eventos del juego.

---

## 24. Diseño esperado

- Diseño responsive para móvil, tablet y desktop.
- Identidad visual coherente con la temática seleccionada.
- Cartas visualmente diferenciables.
- Barra o indicador de vida.
- Estado del turno claramente visible.
- Poder especial bloqueado/desbloqueado de forma comprensible.
- Cooldown visible.
- Botones de ataque y defensa claramente identificados.
- Estados de error, carga y éxito.
- Leaderboard atractivo con especial énfasis en el Top 3.
- Navegación clara entre juego, ranking y administración.

---

## 25. Publicación

La publicación del frontend es obligatoria en GitHub Pages.

Se permite utilizar servicios como:

- Vercel.
- Netlify.
- Otro hosting estático compatible.

El enlace publicado deberá incluirse en el `README.md` y en la entrega.

La publicación del backend mediante Railway es opcional.

---

## 26. README.md

El repositorio deberá incluir un `README.md` que contenga como mínimo:

- Nombre del proyecto.
- Integrantes.
- Temática seleccionada.
- Descripción.
- Tecnologías utilizadas.
- Instrucciones de instalación.
- Comando para iniciar Vite.
- Comando para iniciar JSON Server.
- Variables requeridas en `.env`.
- Credenciales de administrador para evaluación.
- Estructura principal del proyecto.
- Enlace de publicación.
- Explicación breve de las reglas del juego.

---

## 27. Entrega en GitHub

El proyecto se desarrollará en parejas.

El repositorio debe ser accesible al docente.

Nombre sugerido:

```
ProyectoCardBattle_JavaScript_Apellido1Nombre1_Apellido2Nombre2
```

La entrega deberá incluir obligatoriamente:

1. Link del repositorio.
2. Hash completo del último commit válido.
3. Link del frontend publicado.
4. `README.md`.
5. Código completo.
6. `db.json` con las 20 cartas.
7. Recursos visuales y de audio.

### Fecha límite

**23 de noviembre de 2026 — 06:00 p. m.**

Para la calificación se tomará como referencia el hash del último commit realizado antes de la fecha y hora límite.

Los commits posteriores no reemplazarán el hash reportado para la evaluación original.

Se espera que ambos integrantes hayan participado de manera verificable en el desarrollo y en el historial de commits.

---

## Requisitos técnicos

- HTML5.
- CSS3.
- JavaScript Vanilla.
- ES Modules.
- Web Components.
- Fetch API.
- CRUD completo.
- GET, POST, PUT, PATCH, DELETE.
- Archivo `.env`.
- Cambio de entorno Development / Production mediante `switch`.
- Persistencia de jugadores, cartas y partidas.
- Animaciones CSS.
- Efectos de sonido.
- Diseño responsive.
- Publicación del frontend.
- Git y GitHub.
- `README.md`.

---

## Resultado esperado

El equipo debe entregar un juego web de cartas completamente funcional, desarrollado con JavaScript Vanilla y Web Components, en el que un jugador pueda registrar un nickname único, seleccionar y ordenar cinco cartas, combatir contra cinco cartas seleccionadas por la máquina y acumular resultados en un leaderboard.

El sistema deberá demostrar el uso real de Fetch API mediante un CRUD administrativo completo de cartas. La aplicación deberá conservar una arquitectura modular, separar la lógica de API de los componentes, utilizar archivos `.env`, manejar eventos y estado desde JavaScript e integrar imágenes, sonidos y animaciones correspondientes a la temática escogida.

El entregable final deberá estar alojado en GitHub, contar con un frontend publicado y poder ser sustentado técnicamente por ambos integrantes.