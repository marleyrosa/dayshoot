// POST /api/pay  { method: "pix" | "card", customer: {name,email,zip,cpf,address}, items: [...] }
// pix  -> cria o pagamento e devolve o QR Code (o cliente paga no app do banco)
// card -> Checkout Pro do Mercado Pago: o cartão (crédito ou débito) é digitado na página do Mercado Pago, nunca neste site
// assinatura (plano semanal/mensal/semestral) -> assinatura do Mercado Pago, só no cartão, renova sozinha
const crypto = require("crypto");
const { quote, RECURRING } = require("./_catalog");
const { mp, siteUrl, reais, cpfOk, readBody } = require("./_mp");

const clean = (v, n) => String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const bad = (m) => Object.assign(new Error(m), { status: 400 });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  try {
    const { method, customer = {}, items } = readBody(req);
    const name = clean(customer.name, 80), email = clean(customer.email, 120);
    const zip = String(customer.zip || "").replace(/\D/g, ""), cpf = String(customer.cpf || "").replace(/\D/g, "");
    const a = customer.address || {};
    const address = { street: clean(a.street, 80), district: clean(a.district, 60), city: clean(a.city, 60), uf: clean(a.uf, 2).toUpperCase(), number: clean(a.number, 10), complement: clean(a.complement, 20) };
    if (name.length < 3) throw bad("Informe seu nome.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad("Informe um e-mail válido.");
    if (!cpfOk(cpf)) throw bad("CPF inválido.");
    if (!address.number) throw bad("Informe o número do endereço.");
    if (method !== "pix" && method !== "card") throw bad("Forma de pagamento inválida.");

    const q = quote(zip, items); // valida o carrinho, calcula frete e detecta assinatura
    const { lines, subtotalCents, shippingCents, totalCents, subscription } = q;
    if (subscription && method !== "card") throw bad("Assinaturas são pagas no cartão de crédito, com renovação automática.");

    const orderId = "PED-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
    const [first, ...rest] = name.split(/\s+/), last = rest.join(" ") || first;
    const base = siteUrl(req);
    const meta = {
      order_id: orderId, zip, customer_name: name, email, address, shipping: reais(shippingCents),
      items: lines.map(({ sku, plan, qty, mix }) => ({ sku, plan, qty, ...(mix ? { mix } : {}) })),
    };

    if (subscription) {
      // Sem banco de dados: os dados do pedido viajam na referência (até 256 caracteres) para o webhook montar cada renovação.
      const ref = Buffer.from(JSON.stringify({ o: orderId, s: subscription.sku, p: subscription.plan, q: subscription.qty, z: zip, n: address.number, c: address.complement, m: name.slice(0, 30) })).toString("base64url");
      const r = RECURRING[subscription.plan], amount = reais(totalCents); // cada cobrança já inclui o frete
      const sub = await mp("/preapproval", {
        method: "POST",
        body: {
          reason: `Assinatura DayliShoot · ${subscription.title}`.slice(0, 120),
          external_reference: ref, payer_email: email, back_url: base + "/?pay=ok", status: "pending",
          auto_recurring: { frequency: r.frequency, frequency_type: r.type, transaction_amount: amount, currency_id: "BRL" },
        },
      });
      return res.status(200).json({ orderId, total: amount, subscription: subscription.plan, url: sub.init_point });
    }

    if (method === "pix") {
      const p = await mp("/v1/payments", {
        method: "POST", idem: orderId,
        body: {
          transaction_amount: reais(totalCents),
          description: "Pedido DayliShoot " + orderId,
          payment_method_id: "pix",
          external_reference: orderId,
          date_of_expiration: new Date(Date.now() + 30 * 60e3).toISOString().replace("Z", "+00:00"),
          notification_url: base + "/api/webhook",
          payer: { email, first_name: first, last_name: last, identification: { type: "CPF", number: cpf } },
          metadata: meta,
        },
      });
      const t = p.point_of_interaction && p.point_of_interaction.transaction_data;
      if (!t || !t.qr_code) throw Object.assign(new Error("Não foi possível gerar o Pix."), { status: 502 });
      return res.status(200).json({
        id: p.id, orderId, status: p.status, total: reais(totalCents), shipping: reais(shippingCents),
        qrCode: t.qr_code, qrCodeBase64: t.qr_code_base64, expiresAt: p.date_of_expiration,
      });
    }

    const pref = await mp("/checkout/preferences", {
      method: "POST",
      body: {
        items: lines.map((l) => ({ id: l.sku, title: l.title, quantity: l.qty, unit_price: reais(l.unit), currency_id: "BRL" })),
        shipments: { cost: reais(shippingCents), mode: "not_specified" },
        payer: { name: first, surname: last, email, identification: { type: "CPF", number: cpf } },
        external_reference: orderId,
        back_urls: { success: base + "/?pay=ok", failure: base + "/?pay=falhou", pending: base + "/?pay=pendente" },
        auto_return: "approved",
        notification_url: base + "/api/webhook",
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }], installments: 12 },
        metadata: meta,
      },
    });
    return res.status(200).json({ orderId, total: reais(totalCents), shipping: reais(shippingCents), subtotal: reais(subtotalCents), url: pref.init_point });
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    return res.status(status).json({ error: status === 500 ? "Erro interno ao processar o pagamento." : e.message });
  }
};
