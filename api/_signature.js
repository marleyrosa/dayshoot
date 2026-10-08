// Validação da assinatura dos webhooks do Mercado Pago (cabeçalhos x-signature e x-request-id).
// Manifesto assinado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com HMAC-SHA256 e o segredo do webhook.
const crypto = require("crypto");

const TOLERANCE_MS = 10 * 60 * 1000; // rejeita avisos antigos demais (replay)

// Retorna { ok, reason }. Sem segredo configurado, não bloqueia (a rota ainda confirma cada pagamento na API).
function verifySignature({ secret, signature, requestId, dataId, now = Date.now() }) {
  if (!secret) return { ok: true, reason: "sem-segredo" };
  if (!signature) return { ok: false, reason: "sem-assinatura" };
  const parts = Object.fromEntries(String(signature).split(",").map((p) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  if (!parts.ts || !parts.v1) return { ok: false, reason: "assinatura-mal-formada" };
  // o Mercado Pago usa o id em minúsculas quando ele é alfanumérico
  const id = /^[a-z0-9]+$/i.test(String(dataId || "")) ? String(dataId).toLowerCase() : String(dataId || "");
  const manifest = `id:${id};request-id:${requestId || ""};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(parts.v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: "assinatura-invalida" };
  const ts = Number(parts.ts);
  if (!Number.isFinite(ts) || Math.abs(now - (ts < 1e12 ? ts * 1000 : ts)) > TOLERANCE_MS) return { ok: false, reason: "assinatura-expirada" };
  return { ok: true, reason: "ok" };
}

module.exports = { verifySignature };
