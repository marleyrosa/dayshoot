// Login do painel: uma senha (ADMIN_PASSWORD) e um cookie de sessão assinado (HMAC), sem banco e sem dependências.
const crypto = require("crypto");

const HORAS = 12;
const segredo = (E) => crypto.createHash("sha256").update(`${E.ADMIN_PASSWORD || ""}|${E.TOKEN_ENC_KEY || ""}|painel`).digest();
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function senhaOk(E, senha) {
  if (!E.ADMIN_PASSWORD || E.ADMIN_PASSWORD.length < 10) return false; // painel desligado sem senha forte
  return igual(crypto.createHash("sha256").update(String(senha || "")).digest("hex"), crypto.createHash("sha256").update(E.ADMIN_PASSWORD).digest("hex"));
}

function criarSessao(E, agora = Date.now()) {
  const exp = String(agora + HORAS * 3600e3);
  return exp + "." + crypto.createHmac("sha256", segredo(E)).update(exp).digest("base64url");
}

function sessaoOk(E, cookieHeader, agora = Date.now()) {
  if (!E.ADMIN_PASSWORD) return false;
  const m = String(cookieHeader || "").match(/(?:^|;\s*)ds_painel=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || !(+exp > agora)) return false;
  return igual(sig, crypto.createHmac("sha256", segredo(E)).update(exp).digest("base64url"));
}

// Secure só quando o acesso é HTTPS (atrás do Caddy/túnel); em http://localhost o navegador recusaria o cookie.
function cookie(valor, req, maxAge = HORAS * 3600) {
  const https = req.headers["x-forwarded-proto"] === "https";
  return `ds_painel=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
}

// Freio contra adivinhação de senha: 5 erros por IP em 15 minutos.
const erros = new Map();
function bloqueado(ip, agora = Date.now()) {
  const e = erros.get(ip);
  if (e && agora - e.desde > 15 * 60e3) { erros.delete(ip); return false; }
  return !!e && e.n >= 5;
}
function registrarErro(ip, agora = Date.now()) {
  const e = erros.get(ip) || { n: 0, desde: agora };
  e.n += 1; erros.set(ip, e);
}

module.exports = { senhaOk, criarSessao, sessaoOk, cookie, bloqueado, registrarErro };
