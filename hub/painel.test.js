// node --test hub/painel.test.js
const test = require("node:test");
const assert = require("node:assert");
const { resumo, clientes, novoLancamento } = require("./finance");
const A = require("./auth");

const orders = {
  "DS-1": { id: "DS-1", channel: "loja-propria", createdAt: "2026-10-02T10:00:00Z", total: 82.6, customer: { name: "Ana", email: "Ana@x.com" }, items: [{ sku: "KIT-IMUNIDADE", qty: 2 }] },
  "DS-2": { id: "DS-2", channel: "loja-propria", createdAt: "2026-10-05T10:00:00Z", total: 41.3, customer: { name: "Ana", email: "ana@x.com" }, items: [{ sku: "KIT-DETOX", qty: 1 }] },
  "ML-9": { id: 9, channel: "mercadolivre", status: "paid", paid: "2026-09-20T10:00:00Z", total: 50, buyerId: 77, items: [{ sku: "KIT-IMUNIDADE", qty: 1 }] },
  "ML-8": { id: 8, channel: "mercadolivre", status: "cancelled", paid: "2026-10-03T10:00:00Z", total: 999, buyerId: 78, items: [] },
};
const lancamentos = [
  { id: "L1", tipo: "saida", data: "2026-10-01", categoria: "Insumos", descricao: "gengibre", valorCents: 3000 },
  { id: "L2", tipo: "saida", data: "2026-09-15", categoria: "Embalagens", descricao: "frascos", valorCents: 10000 },
  { id: "L3", tipo: "entrada", data: "2026-10-07", categoria: "Venda direta", descricao: "feira", valorCents: 2000 },
];

test("resumo soma entradas (pedidos pagos + lançamentos) e saídas no período", () => {
  const r = resumo({ orders, lancamentos, de: "2026-10-01", ate: "2026-10-31" });
  assert.strictEqual(r.vendasCents, 8260 + 4130);
  assert.strictEqual(r.entradaCents, 8260 + 4130 + 2000);
  assert.strictEqual(r.saidaCents, 3000);
  assert.strictEqual(r.saldoCents, 8260 + 4130 + 2000 - 3000);
  assert.strictEqual(r.pedidos, 2);
  assert.deepStrictEqual(r.porCategoria, { Insumos: 3000 });
  assert.deepStrictEqual(r.maisVendidos[0], { sku: "KIT-IMUNIDADE", qty: 2 });
});

test("resumo sem período agrupa por mês e ignora pedido cancelado", () => {
  const r = resumo({ orders, lancamentos });
  assert.strictEqual(r.pedidos, 3);
  assert.deepStrictEqual(r.porMes.map((m) => m.mes), ["2026-09", "2026-10"]);
  assert.deepStrictEqual(r.porMes[0], { mes: "2026-09", entradaCents: 5000, saidaCents: 10000, pedidos: 1 });
  assert.deepStrictEqual(r.porCanal, { "loja-propria": 12390, mercadolivre: 5000 });
});

test("clientes juntam pedidos pelo e-mail e marcam assinantes", () => {
  const c = clientes({ orders, subscriptions: { S1: { customer: { email: "ANA@x.com" } } } });
  assert.strictEqual(c.length, 2);
  assert.strictEqual(c[0].nome, "Ana");
  assert.strictEqual(c[0].pedidos, 2);
  assert.strictEqual(c[0].totalCents, 12390);
  assert.strictEqual(c[0].assinante, true);
  assert.strictEqual(c[1].nome, "Comprador ML #77");
});

test("lançamento valida tipo, valor e descrição", () => {
  const l = novoLancamento({ tipo: "saida", valor: "12,50", data: "2026-10-09", categoria: "Insumos", descricao: " limão " });
  assert.strictEqual(l.valorCents, 1250);
  assert.strictEqual(l.descricao, "limão");
  assert.strictEqual(novoLancamento({ tipo: "saida", valor: 1, descricao: "x", categoria: "Inventada" }).categoria, "Outros");
  for (const b of [{ tipo: "x", valor: 1, descricao: "a" }, { tipo: "saida", valor: 0, descricao: "a" }, { tipo: "saida", valor: "abc", descricao: "a" }, { tipo: "saida", valor: 1, descricao: " " }, { tipo: "saida", valor: 1, descricao: "a", data: "ontem" }])
    assert.throws(() => novoLancamento(b));
});

test("login: senha forte obrigatória, sessão assinada e com validade", () => {
  const E = { ADMIN_PASSWORD: "senha-muito-forte", TOKEN_ENC_KEY: "ab" };
  assert.strictEqual(A.senhaOk(E, "senha-muito-forte"), true);
  assert.strictEqual(A.senhaOk(E, "errada"), false);
  assert.strictEqual(A.senhaOk({ ADMIN_PASSWORD: "curta" }, "curta"), false);
  const s = A.criarSessao(E, 1000);
  assert.strictEqual(A.sessaoOk(E, "x=1; ds_painel=" + s, 2000), true);
  assert.strictEqual(A.sessaoOk(E, "ds_painel=" + s, 1000 + 13 * 3600e3), false);
  assert.strictEqual(A.sessaoOk({ ...E, ADMIN_PASSWORD: "outra-senha-forte" }, "ds_painel=" + s, 2000), false);
  const [exp, sig] = s.split(".");
  assert.strictEqual(A.sessaoOk(E, `ds_painel=${exp}.${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`, 2000), false);
  assert.strictEqual(A.sessaoOk(E, `ds_painel=${+exp + 9e9}.${sig}`, 2000), false);
  assert.strictEqual(A.sessaoOk({}, "ds_painel=" + s, 2000), false);
});

test("bloqueia após 5 senhas erradas", () => {
  for (let i = 0; i < 5; i++) A.registrarErro("1.2.3.4", 0);
  assert.strictEqual(A.bloqueado("1.2.3.4", 1000), true);
  assert.strictEqual(A.bloqueado("1.2.3.4", 16 * 60e3), false);
});
