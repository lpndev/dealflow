import { it, expect } from "bun:test";
import {
  renderPublication,
  DEFAULT_TEMPLATE,
} from "@/features/publications/render";

it("renders a full offer", () => {
  const content = renderPublication({
    title: "Air Fryer Mondial 5L",
    originalPrice: 499,
    currentPrice: 299,
    coupon: "CASA20",
    affiliateUrl: "https://mercadolivre.com/sec/aff",
  });

  expect(content).toBe(
    [
      "🔥 *Air Fryer Mondial 5L*",
      "",
      "~De R$ 499,00~",
      "💰 *Por R$ 299,00*",
      "",
      "🎟 Cupom: *CASA20*",
      "",
      "🛒 https://mercadolivre.com/sec/aff",
    ].join("\n"),
  );
});

it("omits the original price block when there is no original price", () => {
  const content = renderPublication({
    title: "Fone JBL",
    currentPrice: 199,
    affiliateUrl: "https://aff",
  });

  expect(content).not.toContain("De ");
  expect(content).toContain("💰 *Por R$ 199,00*");
});

it("keeps coupon optional", () => {
  const content = renderPublication({
    title: "Fone JBL",
    currentPrice: 199,
    affiliateUrl: "https://aff",
  });

  expect(content).not.toContain("Cupom");
});

it("always uses the affiliate url", () => {
  const content = renderPublication({
    title: "Fone JBL",
    currentPrice: 199,
    affiliateUrl: "https://mercadolivre.com/sec/ours",
  });

  expect(content).toContain("🛒 https://mercadolivre.com/sec/ours");
});

it("renders a custom template with placeholders", () => {
  const content = renderPublication(
    {
      title: "Air Fryer",
      currentPrice: 299,
      affiliateUrl: "https://aff",
    },
    "OFERTA: {titulo}\nSó {por}\nCompre: {link}",
  );

  expect(content).toBe("OFERTA: Air Fryer\nSó R$ 299,00\nCompre: https://aff");
});

it("drops a template line whose only placeholder is empty", () => {
  const content = renderPublication(
    {
      title: "Air Fryer",
      currentPrice: 299,
      affiliateUrl: "https://aff",
    },
    "{titulo}\nCupom: {cupom}\n{link}",
  );

  expect(content).not.toContain("Cupom");
  expect(content).toBe("Air Fryer\nhttps://aff");
});

it("the default template reproduces the classic format", () => {
  const content = renderPublication({
    title: "Air Fryer",
    originalPrice: 499,
    currentPrice: 299,
    coupon: "CASA20",
    affiliateUrl: "https://aff",
  });
  expect(content).toBe(
    renderPublication(
      {
        title: "Air Fryer",
        originalPrice: 499,
        currentPrice: 299,
        coupon: "CASA20",
        affiliateUrl: "https://aff",
      },
      DEFAULT_TEMPLATE,
    ),
  );
});
