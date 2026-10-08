// Cálculo de preço e frete no SERVIDOR: o valor cobrado nunca vem do navegador.
// Os preços ficam em site/catalog.js (fonte única, lida também pelo site).
const C = require("../site/catalog.js");
const { kits: KITS, plans: PLANS, accs: ACCS, recurring: RECURRING, shipping: SHIP } = C;

const cents = (v) => Math.round(v * 100 + 1e-9);
const fail = (m) => Object.assign(new Error(m), { status: 400 });

// Região pelo prefixo do CEP (tabela dos Correios por faixa). Sem dependência externa.
function regionOf(zip) {
  const z = String(zip).replace(/\D/g, "");
  if (z.length !== 8) throw fail("CEP deve ter 8 números.");
  const p = +z.slice(0, 2);
  if (p <= 39) return "SE";            // SP, RJ, ES, MG
  if (p <= 65) return "NE";            // BA, SE, PE, AL, PB, RN, CE, PI, MA
  if (p <= 69) return "N";             // PA, AM, AC, AP, RR
  if (p <= 76) return +z.slice(0, 3) >= 768 && p === 76 ? "N" : "CO"; // DF, GO (76800+ = RO)
  if (p === 77) return "N";            // TO
  if (p <= 79) return "CO";            // MT, MS
  return "S";                          // PR, SC, RS
}

// Recalcula cada linha do carrinho a partir do catálogo.
function priceCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > 40) throw fail("Carrinho inválido.");
  let total = 0;
  const lines = items.map((it) => {
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw fail("Quantidade inválida.");
    const sku = String(it.sku || "");
    let unit, title, plan = "avulso";
    if (sku.startsWith("ACC-")) {
      const p = ACCS[sku.slice(4)];
      if (p == null) throw fail("Produto inválido.");
      unit = cents(p); title = sku.slice(4, 5) + sku.slice(5).toLowerCase();
    } else if (sku.startsWith("KIT-DISCOVERY-")) {
      const n = Number(sku.slice(14));
      if (!C.discovery.includes(n) || !it.mix || typeof it.mix !== "object") throw fail("Discovery inválido.");
      let shots = 0, sum = 0;
      for (const [id, q] of Object.entries(it.mix)) {
        if (!(id in KITS) || !Number.isInteger(q) || q < 1) throw fail("Discovery inválido.");
        shots += q; sum += q * KITS[id];
      }
      if (shots !== n) throw fail("Discovery inválido.");
      unit = cents(sum); title = `Discovery ${n} shots`;
    } else if (sku.startsWith("KIT-")) {
      const id = sku.slice(4).toLowerCase(), pl = PLANS[it.plan];
      if (!(id in KITS) || !pl) throw fail("Produto inválido.");
      plan = it.plan;
      unit = cents(KITS[id] * pl.doses * (1 - pl.d)); title = `Kit ${id} (${plan})`;
    } else throw fail("Produto inválido.");
    total += unit * qty;
    return { sku, plan, qty, unit, title, ...(it.mix ? { mix: it.mix } : {}) };
  });
  return { lines, subtotalCents: total };
}

// Assinatura = kit com plano semanal/mensal/semestral. Regra do mercado: assinatura é finalizada sozinha no carrinho,
// só no cartão (renovação automática), e cada cobrança já inclui o frete.
function split(lines) {
  const subs = lines.filter((l) => RECURRING[l.plan]);
  if (subs.length && lines.length > 1) throw fail("Assinaturas são finalizadas separadamente: deixe só a assinatura no carrinho.");
  return subs[0] || null;
}

function shippingFor(zip, lines, subtotalCents) {
  const region = regionOf(zip), r = SHIP.regions[region];
  const free = subtotalCents >= cents(SHIP.freeOver) || lines.some((l) => SHIP.freePlans.includes(l.plan));
  return { region, regionName: r.name, days: r.days, free, shippingCents: free ? 0 : r.cents };
}

// Tudo que o checkout precisa: linhas, frete, total e (se houver) a assinatura.
function quote(zip, items) {
  const { lines, subtotalCents } = priceCart(items);
  const subscription = split(lines);
  const ship = shippingFor(zip, lines, subtotalCents);
  return { lines, subtotalCents, ...ship, totalCents: subtotalCents + ship.shippingCents, subscription };
}

module.exports = { priceCart, quote, regionOf, shippingFor, cents, RECURRING };
