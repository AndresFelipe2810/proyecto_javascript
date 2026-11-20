import test from "node:test";
import assert from "node:assert/strict";
import { generarSalt, hashPassword, verificarPassword } from "../src/utils/crypto.js";
import { validarPassword } from "../src/utils/validators.js";

test("hashPassword es determinista y depende del salt", async () => {
  assert.equal(await hashPassword("secreto1", "a"), await hashPassword("secreto1", "a"));
  assert.notEqual(await hashPassword("secreto1", "a"), await hashPassword("secreto1", "b"));
});

test("generarSalt produce valores distintos de 32 hex", () => {
  const s = generarSalt();
  assert.match(s, /^[0-9a-f]{32}$/);
  assert.notEqual(s, generarSalt());
});

test("verificarPassword valida y rechaza", async () => {
  const salt = generarSalt();
  const player = { salt, passwordHash: await hashPassword("secreto1", salt) };
  assert.equal(await verificarPassword(player, "secreto1"), true);
  assert.equal(await verificarPassword(player, "otra"), false);
  assert.equal(await verificarPassword({ nickname: "legacy" }, "x"), false);
});

test("validarPassword exige mínimo 6", () => {
  assert.ok(validarPassword(""));
  assert.ok(validarPassword("12345"));
  assert.equal(validarPassword("123456"), null);
});

test("flujo completo: crear jugador -> guardar -> consultar -> verificar contraseña", async () => {
  const db = [];
  const guardar = (p) => {
    const guardado = { ...JSON.parse(JSON.stringify(p)), id: `id-${db.length}` };
    db.push(guardado);
    return guardado;
  };
  const buscar = (nick) => db.find((p) => p.nickname.toLowerCase() === nick.toLowerCase()) ?? null;

  const salt = generarSalt();
  guardar({ nickname: "Entrenador1", passwordHash: await hashPassword("clave-123", salt), salt, points: 0 });

  const existente = buscar("entrenador1");
  assert.ok(existente.passwordHash && existente.salt);
  assert.equal(await verificarPassword(existente, "clave-123"), true);
  assert.equal(await verificarPassword(existente, "clave-124"), false);
  assert.equal(await verificarPassword({ ...existente, points: 10, wins: 1 }, "clave-123"), true);
});
