// node --test api/catalog.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { priceCart, quote, regionOf } = require("./_catalog");

const html = fs.readFileSync(path.join(__dirname, "../site/index.html"), "utf8");

test("o site lê os preços de catalog.js (sem cópia de preços no HTML)", () => {
  assert.match(html, /<script src="catalog\.js"><\/script>/);
  assert.doesNotMatch(html, /const KITS=\[\s*\["[^"]+","[^"]+","[^"]+","#[0-9a-f]{6}",[\d.]+,/);
  assert.doesNotMatch(html, /doses:\d+,d:[\d.]+/);
  assert.doesNotMatch(html, /\["\w+","[^"]+",[\d.]+,"(box|cup|mix|jars)"\]/);
});

test("calcula kit, Discovery e acessório em centavos", () => {
  const r = priceCart([
    { sku: "KIT-IMUNIDADE", plan: "avulso", qty: 2 },
    { sku: "KIT-DISCOVERY-7", qty: 1, mix: { imunidade: 4, detox: 3 } },
    { sku: "ACC-MISTURADOR", qty: 1 },
  ]);
  assert.strictEqual(r.lines[0].unit, 4130);
  assert.strictEqual(r.lines[1].unit, 4250);
  assert.strictEqual(r.subtotalCents, 4130 * 2 + 4250 + 4990);
});

test("rejeita preço vindo do cliente, sku e quantidades inválidos", () => {
  assert.strictEqual(priceCart([{ sku: "KIT-IMUNIDADE", plan: "avulso", qty: 1, unit: 0.01 }]).subtotalCents, 4130);
  for (const bad of [
    [], [{ sku: "KIT-NADA", plan: "avulso", qty: 1 }], [{ sku: "KIT-IMUNIDADE", plan: "x", qty: 1 }],
    [{ sku: "KIT-IMUNIDADE", plan: "avulso", qty: 0 }], [{ sku: "KIT-IMUNIDADE", plan: "avulso", qty: 1.5 }],
    [{ sku: "KIT-DISCOVERY-7", qty: 1, mix: { imunidade: 3 } }], [{ sku: "ACC-X", qty: 1 }],
  ]) assert.throws(() => priceCart(bad));
});

test("região pelo CEP", () => {
  const casos = { "01001000": "SE", "20040020": "SE", "30140071": "SE", "40020000": "NE", "50030230": "NE", "60115000": "NE", "66010000": "N",
    "69005000": "N", "70040010": "CO", "74000000": "CO", "76800000": "N", "77001000": "N", "78005000": "CO", "79002000": "CO", "80010000": "S", "88010000": "S", "90010000": "S" };
  for (const [z, r] of Object.entries(casos)) assert.strictEqual(regionOf(z), r, z);
  assert.throws(() => regionOf("123"));
});

test("frete por região e frete grátis (valor mínimo ou plano que já inclui)", () => {
  const um = [{ sku: "KIT-IMUNIDADE", plan: "avulso", qty: 1 }];
  assert.strictEqual(quote("01001000", um).shippingCents, 1490);
  assert.strictEqual(quote("69005000", um).shippingCents, 3490);
  assert.strictEqual(quote("01001000", um).totalCents, 4130 + 1490);
  assert.strictEqual(quote("01001000", [{ sku: "KIT-IMUNIDADE", plan: "avulso", qty: 3 }]).shippingCents, 0); // 123,90 >= 120
  assert.strictEqual(quote("69005000", [{ sku: "KIT-IMUNIDADE", plan: "mensal", qty: 1 }]).shippingCents, 0);
  assert.strictEqual(quote("69005000", [{ sku: "KIT-IMUNIDADE", plan: "semanal", qty: 1 }]).shippingCents, 3490);
});

test("assinatura só sozinha no carrinho", () => {
  const q = quote("01001000", [{ sku: "KIT-DETOX", plan: "mensal", qty: 1 }]);
  assert.strictEqual(q.subscription.plan, "mensal");
  assert.strictEqual(quote("01001000", [{ sku: "KIT-DETOX", plan: "avulso", qty: 1 }]).subscription, null);
  assert.throws(() => quote("01001000", [{ sku: "KIT-DETOX", plan: "mensal", qty: 1 }, { sku: "ACC-COPO", qty: 1 }]), /separadamente/);
});
