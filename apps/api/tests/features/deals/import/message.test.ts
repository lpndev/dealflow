import { it, expect } from "bun:test";
import { extractMessageHints } from "@/features/deals/import/message";

it("extracts de/por prices and coupon from a deal message", () => {
  const msg =
    "🔥 Fone JBL\nDe R$ 299,90 por R$ 149,90\nCupom: JBL10\nmercadolivre.com/p/MLB123";
  expect(extractMessageHints(msg)).toEqual({
    original: 299.9,
    current: 149.9,
    coupon: "JBL10",
  });
});

it("treats a lone por price as the current price", () => {
  expect(extractMessageHints("Por R$ 149 corre!")).toEqual({ current: 149 });
});

it("treats a single bare price as the current price", () => {
  expect(extractMessageHints("Air Fryer R$ 299,00")).toEqual({ current: 299 });
});

it("reads two bare prices as original then current", () => {
  expect(extractMessageHints("R$ 1.299,90 R$ 999,90")).toEqual({
    original: 1299.9,
    current: 999.9,
  });
});

it("ignores a coupon-looking word that is not a code", () => {
  expect(extractMessageHints("cupom para os primeiros")).toEqual({});
});

it("keeps an all-letters uppercase coupon code", () => {
  expect(extractMessageHints("use o cupom PRIMEIRA")).toEqual({
    coupon: "PRIMEIRA",
  });
});

it("returns empty for a message without prices or coupon", () => {
  expect(extractMessageHints("olha esse produto")).toEqual({});
});
