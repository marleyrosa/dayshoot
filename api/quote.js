// POST /api/quote { zip, items } -> subtotal, frete, total (o mesmo cálculo que /api/pay usa para cobrar)
const { quote } = require("./_catalog");
const { reais, readBody } = require("./_mp");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  try {
    const { zip, items } = readBody(req);
    const q = quote(zip, items);
    return res.status(200).json({
      subtotal: reais(q.subtotalCents), shipping: reais(q.shippingCents), total: reais(q.totalCents),
      free: q.free, region: q.regionName, days: q.days, subscription: q.subscription ? q.subscription.plan : null,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Erro ao calcular o frete." });
  }
};
