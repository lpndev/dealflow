import { it, expect } from "bun:test";
import { parseBrlPrice } from "@/shared/money";

it("parses a simple brl price", () => {
  expect(parseBrlPrice("R$ 299,90")).toBe(299.9);
});

it("parses thousands with dot separator", () => {
  expect(parseBrlPrice("R$ 1.299,90")).toBe(1299.9);
});

it("parses an integer price without decimals", () => {
  expect(parseBrlPrice("R$ 1.999")).toBe(1999);
});

it("returns undefined for non-numeric text", () => {
  expect(parseBrlPrice("sem preço")).toBeUndefined();
});

it("returns undefined for empty input", () => {
  expect(parseBrlPrice("")).toBeUndefined();
});
