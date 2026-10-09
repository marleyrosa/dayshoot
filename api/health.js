// GET /api/health -> diagnóstico da configuração, sem expor segredos (nunca devolve o valor do token).
const { cleanToken } = require("./_mp");

// Sem a chave da loja (header x-api-key = STORE_API_KEY), responde só se está no ar.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.STORE_API_KEY;
  if (!key || req.headers["x-api-key"] !== key) return res.status(200).json({ ok: true });
  const raw = String(process.env.MP_ACCESS_TOKEN || ""), t = cleanToken(raw);
  const kind = t.startsWith("APP_USR-") ? "APP_USR" : t.startsWith("TEST-") ? "TEST" : t ? "outro" : "vazio";
  res.status(200).json({
    token: { definido: raw.length > 0, tamanhoOriginal: raw.length, tamanhoLimpo: t.length, formato: kind, tinhaEspacoOuQuebra: raw !== t },
    siteUrl: process.env.SITE_URL || null,
    hub: Boolean(process.env.HUB_ORDERS_URL),
  });
};
