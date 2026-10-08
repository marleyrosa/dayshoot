// POST /api/webhook  (notificações do Mercado Pago). Não confiamos no corpo: buscamos tudo na API com o nosso token.
// Pedido pago (avulso ou cada renovação de assinatura) -> enviado ao hub (HUB_ORDERS_URL + STORE_API_KEY) para baixar o estoque.
// O hub não duplica: o id do pedido de cada cobrança é único e estável (reenvio do Mercado Pago não baixa estoque duas vezes).
const { mp, readBody } = require("./_mp");
const { verifySignature } = require("./_signature");

async function toHub(order) {
  if (!process.env.HUB_ORDERS_URL) return true;
  const r = await fetch(process.env.HUB_ORDERS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.STORE_API_KEY || "" },
    body: JSON.stringify(order),
  });
  if (!r.ok) console.error("hub recusou o pedido", order.id, r.status);
  return r.ok;
}

module.exports = async (req, res) => {
  const b = readBody(req), q = req.query || {};
  const type = b.type || q.type || q.topic;
  const id = String((b.data && b.data.id) || q["data.id"] || q.id || "").replace(/[^\w-]/g, "");
  // Assinatura do Mercado Pago (MP_WEBHOOK_SECRET): rejeita avisos forjados antes de qualquer consulta.
  const sig = verifySignature({
    secret: process.env.MP_WEBHOOK_SECRET, signature: req.headers["x-signature"], requestId: req.headers["x-request-id"],
    dataId: q["data.id"] || (b.data && b.data.id) || "",
  });
  if (!sig.ok) { console.warn("webhook rejeitado:", sig.reason); return res.status(401).json({ ok: false }); }
  if (!id) return res.status(200).json({ ok: true });
  try {
    if (type === "payment") {
      const p = await mp("/v1/payments/" + id);
      const m = p.metadata || {};
      // pagamentos de assinatura chegam como "payment" também, mas sem metadata de pedido: são tratados abaixo
      if (p.status === "approved" && m.order_id) {
        const ok = await toHub({
          id: m.order_id, channel: "loja-propria", currency: "BRL", createdAt: p.date_approved,
          customer: { name: m.customer_name, email: m.email, zip: m.zip, address: m.address }, items: m.items || [],
          shipping: m.shipping, total: p.transaction_amount, payment: { provider: "mercadopago", id: p.id, method: p.payment_type_id },
        });
        if (!ok) return res.status(500).json({ ok: false }); // o Mercado Pago tenta de novo
      }
    } else if (type === "subscription_authorized_payment") {
      // uma cobrança (a 1ª ou cada renovação) da assinatura
      const ap = await mp("/authorized_payments/" + id);
      const paidOk = ap.status === "processed" && ap.payment && ap.payment.status === "approved";
      if (paidOk) {
        const s = await mp("/preapproval/" + ap.preapproval_id);
        const d = JSON.parse(Buffer.from(String(s.external_reference), "base64url").toString("utf8"));
        const ok = await toHub({
          id: `${d.o}-${id}`, channel: "loja-propria", currency: "BRL", createdAt: ap.date_created,
          customer: { name: d.m, email: s.payer_email, zip: d.z, address: { number: d.n, complement: d.c } },
          items: [{ sku: d.s, plan: d.p, qty: d.q }], total: ap.transaction_amount,
          payment: { provider: "mercadopago", id: ap.payment.id, method: "subscription", subscriptionId: ap.preapproval_id },
        });
        if (!ok) return res.status(500).json({ ok: false });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("webhook", type, e.message);
    return res.status(500).json({ ok: false });
  }
};
