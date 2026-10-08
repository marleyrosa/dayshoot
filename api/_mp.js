// Cliente mínimo da API do Mercado Pago. O token só existe no servidor (variável de ambiente).
const API = "https://api.mercadopago.com";

async function mp(path, { method = "GET", body, idem } = {}) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw Object.assign(new Error("Pagamentos não configurados."), { status: 503 });
  const r = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(idem ? { "X-Idempotency-Key": idem } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("mercadopago", method, path, r.status, JSON.stringify(j).slice(0, 500));
    // detalhe seguro para diagnóstico (código e mensagem do provedor; nunca o token)
    const detail = { provider: r.status, message: String(j.message || j.error || "").slice(0, 200), cause: Array.isArray(j.cause) ? j.cause.slice(0, 3).map((c) => String(c.description || c.code || "").slice(0, 120)) : undefined };
    throw Object.assign(new Error("O provedor de pagamento recusou a solicitação."), { status: 502, detail });
  }
  return j;
}

const siteUrl = (req) => (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, "");
const reais = (c) => Math.round(c) / 100;

function cpfOk(s) {
  const d = String(s || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => { let t = 0; for (let i = 0; i < n; i++) t += +d[i] * (n + 1 - i); const r = (t * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +d[9] && dv(10) === +d[10];
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

module.exports = { mp, siteUrl, reais, cpfOk, readBody };
