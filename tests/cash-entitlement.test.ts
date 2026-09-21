import assert from "node:assert/strict";
import test from "node:test";
import { canCloseCashSession, canUseCashOperationally } from "../src/lib/server/cash";

test("Caja exige entitlement comercial y activación operativa", () => {
  assert.equal(canUseCashOperationally({ cashEntitled: false, cashEnabled: false }), false);
  assert.equal(canUseCashOperationally({ cashEntitled: false, cashEnabled: true }), false);
  assert.equal(canUseCashOperationally({ cashEntitled: true, cashEnabled: false }), false);
  assert.equal(canUseCashOperationally({ cashEntitled: true, cashEnabled: true }), true);
});

test("solo responsable o permiso explícito puede cerrar sesión", () => {
  assert.equal(canCloseCashSession("user-a", "user-a", false), true);
  assert.equal(canCloseCashSession("user-a", "user-b", false), false);
  assert.equal(canCloseCashSession("user-a", "user-b", true), true);
});
