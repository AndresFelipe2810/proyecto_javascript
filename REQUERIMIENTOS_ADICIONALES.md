# (3H) Modo batalla automática + Golpe crítico y Esquivar ataque

El examen será una extensión individual del proyecto **Card Battle Arena** desarrollado previamente en parejas.

Cada estudiante contará con **3 horas** para implementar nuevas mecánicas sobre el proyecto original.

El punto de partida será exactamente el **hash del último commit entregado** antes de la fecha límite del proyecto. El estudiante no deberá reconstruir la aplicación desde cero; deberá comprender, extender y mantener la arquitectura existente.

El objetivo del examen es comprobar que cada estudiante puede trabajar individualmente sobre una base de código real, entender el motor de batalla desarrollado en equipo y añadir nuevas reglas utilizando **JavaScript Vanilla, Web Components, eventos, asincronía y manejo de estado**.

No se requiere rediseñar la aplicación. La prioridad será la **funcionalidad, integración y dominio técnico**.

---

## Punto de partida

Antes de comenzar el examen se deberá identificar:

- Repositorio utilizado en el proyecto.
- Hash del commit oficial entregado.
- Estado funcional original del proyecto.

Cada estudiante deberá trabajar sobre una copia o rama individual creada a partir de ese commit.

Nombre sugerido de rama:

```
exam/ApellidoNombre
```

---

## Funcionalidades a implementar

### 1. Modo de batalla automática

El proyecto original permite que el jugador seleccione manualmente sus acciones mientras la máquina actúa automáticamente.

Durante el examen deberá agregarse un segundo modo:

- MANUAL
- AUTOMÁTICO

En modo automático:

- La carta del jugador también será controlada mediante una estrategia programada en JavaScript.
- La máquina seguirá tomando sus propias decisiones.
- Ningún participante requerirá presionar botones de ataque para continuar.
- Cada acción deberá ejecutarse con una pausa visible para permitir comprender lo que ocurre.
- Se deberán mantener las animaciones y actualizaciones del DOM.
- El sistema deberá continuar respetando turnos, vida, defensa, poder especial y cooldown.
- Cuando una carta sea derrotada deberá ingresar automáticamente la siguiente.
- La batalla deberá detenerse al finalizar la partida.
- No se permiten ciclos infinitos ni múltiples turnos ejecutándose simultáneamente.

Se permite utilizar:

- `setTimeout()`
- o una estrategia equivalente basada en `Promises`.

No se recomienda utilizar intervalos permanentes difíciles de detener.

---

### 2. Selección automática de acciones

En modo automático cada participante deberá construir una lista de acciones válidas.

Ejemplo conceptual:

```js
const availableActions = [
  ...attacks,
  defense
];

if (specialUnlocked && cooldown === 0) {
  availableActions.push(special);
}
```

Posteriormente deberá seleccionar una acción válida.

La estrategia puede ser aleatoria o incluir reglas sencillas.

Ejemplos opcionales:

- Aumentar la posibilidad de defenderse si la vida es baja.
- Priorizar el poder especial cuando esté disponible.
- Evitar defenderse demasiadas veces consecutivas.

No es obligatorio implementar una inteligencia artificial avanzada.

---

### 3. Golpe crítico

Cada ataque que cause daño tendrá una probabilidad de convertirse en golpe crítico.

**Regla obligatoria**

- Probabilidad de golpe crítico: **12 %**
- Multiplicador de daño: **×1.5**

Ejemplo:

```js
const isCritical = Math.random() < 0.12;
```

Si un ataque normal causa:

```
40 puntos
```

y se convierte en crítico:

```
40 × 1.5 = 60 puntos
```

La interfaz deberá mostrar claramente el evento:

```
¡GOLPE CRÍTICO!
```

o un mensaje equivalente.

Debe existir una retroalimentación visual o sonora diferenciada.

---

### 4. Esquivar ataque

Cada carta que vaya a recibir daño tendrá una probabilidad de esquivar completamente el ataque.

**Regla obligatoria**

- Probabilidad de esquivar: **8 %**
- Daño recibido: **0**

Ejemplo:

```js
const dodged = Math.random() < 0.08;
```

La interfaz deberá informar:

```
¡ATAQUE ESQUIVADO!
```

o un mensaje equivalente.

---

### 5. Orden de resolución de eventos

Para evitar interpretaciones diferentes, cada ataque deberá resolverse en este orden:

1. Seleccionar ataque.
2. Calcular factor aleatorio de daño.
3. Determinar si el defensor esquiva.
4. Si esquiva:
   - daño final = 0
   - termina la resolución del daño.
5. Si NO esquiva:
   - determinar golpe crítico.
6. Si es crítico:
   - daño × 1.5.
7. Si el defensor estaba defendiendo:
   - aplicar reducción del 50 %.
8. Redondear daño final.
9. Restar HP.
10. Actualizar interfaz.
11. Verificar si la carta fue derrotada.

La vida nunca podrá mostrarse por debajo de cero:

```js
currentHp = Math.max(0, currentHp - damage);
```

---

### 6. Compatibilidad con el poder especial

Los nuevos eventos probabilísticos deberán integrarse con el motor existente.

El estudiante deberá asegurar que:

- El poder especial continúe desbloqueándose en el turno correspondiente.
- El cooldown continúe funcionando.
- El modo automático no pueda utilizar el especial cuando esté bloqueado.
- Un especial también pueda ser esquivado.
- Un especial también pueda producir golpe crítico.
- La defensa continúe reduciendo el daño cuando corresponda.

---

### 7. Controles del modo automático

La interfaz deberá permitir seleccionar el modo antes de iniciar una partida o cambiar a modo automático desde un control claramente identificado.

Como mínimo debe existir:

- Modo manual
- Modo automático

Cuando el modo automático esté activo:

- Los botones manuales podrán deshabilitarse.
- El usuario deberá visualizar claramente que la batalla está siendo controlada automáticamente.
- No debe ser posible generar dos acciones simultáneas mediante clicks.

---

### 8. Finalización y persistencia

El nuevo modo no deberá romper el flujo existente.

Al terminar:

- Se determina victoria o derrota.
- Se asignan los puntos correspondientes.
- Se actualiza el jugador.
- Se almacena la partida.
- Se actualiza el leaderboard.
- Se detienen los temporizadores pendientes.

El modo de juego puede almacenarse en el historial:

```json
{
  "mode": "automatic"
}
```

---

## Restricciones técnicas

El examen deberá conservar las mismas tecnologías del proyecto:

- JavaScript Vanilla.
- Web Components.
- Fetch API.
- JSON Server.
- HTML.
- CSS.
- Vite.
- ES Modules.

No se permite migrar el proyecto a React, Angular, Vue, Svelte u otro framework.

La nueva funcionalidad deberá integrarse con la arquitectura ya existente y no concentrarse completamente en `app.js`.

---

## Entrega del examen

El examen es individual.

Tiempo disponible: **3 horas**

Al finalizar cada estudiante deberá entregar:

1. Link del repositorio o rama utilizada.
2. Hash del último commit realizado dentro del tiempo del examen.
3. Identificación clara de los archivos modificados.
4. Aplicación ejecutable.
5. Breve actualización del README indicando las funcionalidades agregadas.

El docente podrá solicitar durante la sustentación:

- Explicar una función.
- Modificar una probabilidad.
- Cambiar un multiplicador.
- Explicar un temporizador.
- Identificar cómo se controla el turno.
- Mostrar dónde se determina el golpe crítico.
- Mostrar dónde se resuelve el esquive.
- Explicar cómo se detiene la batalla automática.

---

## Resultado esperado

Al finalizar las tres horas, cada estudiante deberá haber extendido individualmente el juego entregado por su equipo para incorporar un modo de batalla completamente automático, golpes críticos con probabilidad del 12 % y esquives con probabilidad del 8 %.

La solución deberá reutilizar el motor de combate existente, respetar las reglas de turnos, defensa, poder especial y cooldown, mantener la persistencia de resultados y demostrar un manejo correcto de eventos, estado, temporizadores y JavaScript Vanilla.

La evaluación priorizará la capacidad del estudiante para comprender, modificar, integrar y sustentar código real, no la creación de nuevas pantallas o un rediseño visual.