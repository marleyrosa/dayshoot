// GET /api/status?id=<pagamento>  ou  ?sub=<assinatura>  -> { status }
// Pix: acompanha o pagamento. Cartão e assinatura: confirma no servidor quando o cliente volta do Mercado Pago.
const { mp } = require("./_mp");

module.exports = async (req, res) => {
  const q = req.query || {};
  const sub = String(q.sub || "").replace(/[^\w-]/g, ""), id = String(q.id || "").replace(/\D/g, "");
  if (!sub && !id) return res.status(400).json({ error: "Pagamento inválido." });
  try {
    if (sub) {
      const s = await mp("/preapproval/" + sub);
      // authorized = cartão aprovado e assinatura ativa
      return res.status(200).json({ status: s.status === "authorized" ? "approved" : s.status });
    }
    const p = await mp("/v1/payments/" + id);
    return res.status(200).json({ status: p.status, orderId: p.external_reference });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
