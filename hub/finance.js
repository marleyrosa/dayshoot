// Contas do painel: o que entrou (pedidos pagos de todos os canais + lançamentos manuais), o que saiu (compras e despesas)
// e a carteira de clientes. Funções puras: recebem os dados lidos do disco e devolvem números prontos para a tela.
const CATEGORIAS_SAIDA = ["Insumos", "Embalagens", "Frete", "Taxas e comissões", "Marketing", "Equipamentos", "Impostos", "Outros"];
const CATEGORIAS_ENTRADA = ["Venda direta", "Outros"];

const cents = (v) => Math.round(Number(v || 0) * 100 + 1e-9);
const dia = (d) => String(d || "").slice(0, 10);
const mes = (d) => String(d || "").slice(0, 7);
const dentro = (d, de, ate) => (!de || dia(d) >= de) && (!ate || dia(d) <= ate);

// Pedido da loja chega só quando pago (sem status); o do Mercado Livre traz status.
const pago = (o) => !o.status || o.status === "paid";
const dataPedido = (o) => o.createdAt || o.paid || o.updatedAt || "";

function clienteDe(o) {
  const c = o.customer || {};
  if (c.email) return { chave: "email:" + String(c.email).toLowerCase(), nome: c.name || c.email, email: c.email, zip: c.zip || "" };
  if (o.buyerId) return { chave: "ml:" + o.buyerId, nome: "Comprador ML #" + o.buyerId, email: "", zip: "" };
  return { chave: "anon:" + o.id, nome: c.name || "Cliente sem cadastro", email: "", zip: c.zip || "" };
}

// Valida um lançamento vindo do painel. Valores em reais na tela, guardados em centavos.
function novoLancamento(b, agora = new Date()) {
  const tipo = b.tipo === "entrada" ? "entrada" : b.tipo === "saida" ? "saida" : null;
  if (!tipo) throw new Error("Tipo deve ser entrada ou saída.");
  const valor = cents(String(b.valor).replace(",", "."));
  if (!(valor > 0) || valor > 1e9) throw new Error("Valor inválido.");
  const data = dia(b.data) || dia(agora.toISOString());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Data inválida.");
  const cats = tipo === "saida" ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
  const categoria = cats.includes(b.categoria) ? b.categoria : "Outros";
  const descricao = String(b.descricao || "").trim().slice(0, 200);
  if (!descricao) throw new Error("Descreva o lançamento.");
  return {
    id: "L" + agora.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    tipo, data, categoria, descricao, valorCents: valor,
    fornecedor: String(b.fornecedor || "").trim().slice(0, 120),
    criadoEm: agora.toISOString(),
  };
}

function resumo({ orders = {}, lancamentos = [], de = "", ate = "" }) {
  const pedidos = Object.entries(orders).map(([k, o]) => ({ ...o, _id: k })).filter((o) => pago(o) && dentro(dataPedido(o), de, ate));
  const lanc = lancamentos.filter((l) => dentro(l.data, de, ate));
  const porMes = {}, porCanal = {}, porCategoria = {}, porKit = {};
  const m = (k) => (porMes[k] = porMes[k] || { mes: k, entradaCents: 0, saidaCents: 0, pedidos: 0 });
  let vendasCents = 0;
  for (const o of pedidos) {
    const v = cents(o.total);
    vendasCents += v;
    const pm = m(mes(dataPedido(o)));
    pm.entradaCents += v; pm.pedidos += 1;
    porCanal[o.channel || "outro"] = (porCanal[o.channel || "outro"] || 0) + v;
    for (const i of o.items || []) if (i.sku) porKit[i.sku] = (porKit[i.sku] || 0) + (Number(i.qty) || 0);
  }
  let outrasEntradasCents = 0, saidaCents = 0;
  for (const l of lanc) {
    if (l.tipo === "entrada") { outrasEntradasCents += l.valorCents; m(mes(l.data)).entradaCents += l.valorCents; }
    else { saidaCents += l.valorCents; m(mes(l.data)).saidaCents += l.valorCents; porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + l.valorCents; }
  }
  const entradaCents = vendasCents + outrasEntradasCents;
  return {
    periodo: { de, ate },
    entradaCents, vendasCents, outrasEntradasCents, saidaCents, saldoCents: entradaCents - saidaCents,
    pedidos: pedidos.length, ticketMedioCents: pedidos.length ? Math.round(vendasCents / pedidos.length) : 0,
    margemPct: entradaCents ? Math.round(((entradaCents - saidaCents) / entradaCents) * 1000) / 10 : null,
    porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
    porCanal, porCategoria,
    maisVendidos: Object.entries(porKit).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([sku, qty]) => ({ sku, qty })),
  };
}

function clientes({ orders = {}, subscriptions = {} }) {
  const assinantes = new Set(Object.values(subscriptions).map((s) => String((s.customer || {}).email || "").toLowerCase()).filter(Boolean));
  const mapa = {};
  for (const o of Object.values(orders)) {
    if (!pago(o)) continue;
    const c = clienteDe(o);
    const r = (mapa[c.chave] = mapa[c.chave] || { ...c, pedidos: 0, totalCents: 0, primeiro: "", ultimo: "", canais: [] });
    const d = dataPedido(o);
    r.pedidos += 1; r.totalCents += cents(o.total);
    if (!r.primeiro || d < r.primeiro) r.primeiro = d;
    if (d > r.ultimo) r.ultimo = d;
    if (!r.canais.includes(o.channel)) r.canais.push(o.channel);
  }
  return Object.values(mapa)
    .map(({ chave, ...r }) => ({ ...r, assinante: !!r.email && assinantes.has(r.email.toLowerCase()) }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

module.exports = { resumo, clientes, novoLancamento, CATEGORIAS_SAIDA, CATEGORIAS_ENTRADA };
