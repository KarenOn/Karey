import assert from "node:assert/strict";
import test from "node:test";
import { resolveClinicalReminderKind } from "../src/lib/clinical-reminder-rules";

const now = new Date("2026-09-21T12:00:00.000Z");

test("recordatorio de vacuna distingue próxima y vencida", () => {
  assert.equal(resolveClinicalReminderKind({ source: "vaccine", dueDate: new Date("2026-09-25T12:00:00.000Z"), now, timeZone: "UTC" }), "vaccine-upcoming");
  assert.equal(resolveClinicalReminderKind({ source: "vaccine", dueDate: new Date("2026-09-20T12:00:00.000Z"), now, timeZone: "UTC" }), "vaccine-overdue");
});

test("control clínico respeta ventana de 30 días", () => {
  assert.equal(resolveClinicalReminderKind({ source: "visit", dueDate: new Date("2026-10-01T12:00:00.000Z"), now, timeZone: "UTC" }), "clinical-follow-up");
  assert.equal(resolveClinicalReminderKind({ source: "visit", dueDate: new Date("2026-09-20T12:00:00.000Z"), now, timeZone: "UTC" }), null);
  assert.equal(resolveClinicalReminderKind({ source: "visit", dueDate: new Date("2026-10-22T12:00:00.000Z"), now, timeZone: "UTC" }), null);
});
