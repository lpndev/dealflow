import { it, expect } from "bun:test";
import { parsePrice, formatBrl } from "@/shared/money";

it("parses a brl price with comma decimals", () => {
  expect(parsePrice("R$ 299,90")).toBe(299.9);
});

it("parses brl thousands with dot and comma", () => {
  expect(parsePrice("R$ 1.299,90")).toBe(1299.9);
});

it("parses a plain dot decimal from the form", () => {
  expect(parsePrice("299.9")).toBe(299.9);
});

it("parses an integer", () => {
  expect(parsePrice("1299")).toBe(1299);
});

it("returns undefined for non-numeric text", () => {
  expect(parsePrice("sem preço")).toBeUndefined();
});

it("returns undefined for empty input", () => {
  expect(parsePrice("")).toBeUndefined();
});

it("formats a value as brl", () => {
  expect(formatBrl(299.9)).toBe("R$ 299,90");
});

it("formats thousands with a dot separator", () => {
  expect(formatBrl(1299.9)).toBe("R$ 1.299,90");
});

it("formats an integer with cents", () => {
  expect(formatBrl(1999)).toBe("R$ 1.999,00");
});
