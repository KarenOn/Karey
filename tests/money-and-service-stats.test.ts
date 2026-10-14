import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "@/lib/formatters";
import { calculateAverageServicePrice, countActiveServicesWithoutDuration } from "@/lib/service-stats";

test("formatMoney formats DOP with deterministic RD$ prefix", () => {
  assert.equal(formatMoney(550), "RD$550.00");
  assert.equal(formatMoney(1250), "RD$1,250.00");
  assert.equal(formatMoney(0), "RD$0.00");
});

test("formatMoney preserves non-DOP currency", () => {
  assert.match(formatMoney(550, "USD"), /US\$/);
});

test("service average includes all rows and treats missing price as zero", () => {
  assert.equal(calculateAverageServicePrice([{ price: "100" }, { price: "50" }, { price: null }]), 50);
  assert.equal(calculateAverageServicePrice([]), 0);
});

test("service stats count only active services without a valid duration", () => {
  assert.equal(countActiveServicesWithoutDuration([
    { isActive: true, durationMins: null },
    { isActive: true, durationMins: 0 },
    { isActive: true, durationMins: -10 },
    { isActive: true, durationMins: Number.NaN },
    { isActive: true, durationMins: 30 },
    { isActive: false, durationMins: null },
  ]), 4);
  assert.equal(countActiveServicesWithoutDuration([]), 0);
});
