// DayliShoot Hub — módulo Mercado Livre (Pedidos, Estoque, Perguntas). Node 18+, sem dependências.
const http=require("http"),fs=require("fs"),crypto=require("crypto"),path=require("path");
const F=require("./finance"),A=require("./auth");
const E=process.env,API="https://api.mercadolibre.com",DATA=E.HUB_DATA_DIR||"./data";
fs.mkdirSync(DATA,{recursive:true});
/* ---------- armazenamento simples (JSON) ---------- */
const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(`${DATA}/${f}`,"utf8"))}catch{return d}};
const wr=(f,v)=>fs.writeFileSync(`${DATA}/${f}`,JSON.stringify(v,null,2));
/* ---------- tokens criptografados (AES-256-GCM) ---------- */
const key=()=>Buffer.from(E.TOKEN_ENC_KEY||"","hex");
function saveTokens(t){const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key(),iv);
 const enc=Buffer.concat([c.update(JSON.stringify(t)),c.final()]);fs.writeFileSync(`${DATA}/tokens.enc`,Buffer.concat([iv,c.getAuthTag(),enc]))}
function loadTokens(){try{const b=fs.readFileSync(`${DATA}/tokens.enc`),d=crypto.createDecipheriv("aes-256-gcm",key(),b.subarray(0,12));
 d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]))}catch{return null}}
async function tokenReq(params){
 const r=await fetch(`${API}/oauth/token`,{method:"POST",headers:{accept:"application/json","content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:E.ML_APP_ID,client_secret:E.ML_CLIENT_SECRET,...params})});
 if(!r.ok)throw new Error("oauth "+r.status);const j=await r.json();
 const t={access_token:j.access_token,refresh_token:j.refresh_token,user_id:j.user_id,expires_at:Date.now()+(j.expires_in-300)*1000};saveTokens(t);return t}
async function accessToken(){let t=loadTokens();if(!t)throw new Error("Vendedor não autorizado: abra /ml/auth");
 if(Date.now()>=t.expires_at)t=await tokenReq({grant_type:"refresh_token",refresh_token:t.refresh_token}); // guarda o NOVO refresh_token
 return t}
async function ml(path,opt={}){const t=await accessToken();
 const r=await fetch(API+path,{...opt,headers:{authorization:`Bearer ${t.access_token}`,"content-type":"application/json",...(opt.headers||{})}});
 if(!r.ok)throw new Error(`ML ${r.status} ${path}`);return r.json()}
/* ---------- Pedidos ---------- */
async function syncOrder(id){const o=await ml(`/orders/${id}`);const db=rd("orders.json",{});
 db["ML-"+o.id]={channel:"mercadolivre",id:o.id,status:o.status,total:o.total_amount,paid:o.date_closed||o.date_created,
  items:(o.order_items||[]).map(i=>({mlItemId:i.item.id,sku:i.item.seller_sku||i.item.seller_custom_field,title:i.item.title,qty:i.quantity,unit:i.unit_price})),
  shippingId:o.shipping&&o.shipping.id,buyerId:o.buyer&&o.buyer.id,updatedAt:new Date().toISOString()};
 wr("orders.json",db);if(o.status==="paid")decrementStock(db["ML-"+o.id].items,"ML-"+o.id);return db["ML-"+o.id]}
async function syncRecentOrders(){const t=await accessToken();const r=await ml(`/orders/search?seller=${t.user_id}&order.status=paid&sort=date_desc&limit=50`);
 for(const o of r.results||[])await syncOrder(o.id);return (r.results||[]).length}
/* ---------- Estoque (fonte da verdade = data/stock.json por SKU) ---------- */
function decrementStock(items,ref){const s=rd("stock.json",{}),log=rd("stock-log.json",{});
 for(const i of items){if(!i.sku||log[ref+i.sku])continue;s[i.sku]=Math.max(0,(s[i.sku]||0)-i.qty);log[ref+i.sku]=1}wr("stock.json",s);wr("stock-log.json",log)}
async function pushStock(){const s=rd("stock.json",{}),map=rd("ml-items.json",{}),out=[]; // map: {SKU:"MLB123..."}
 for(const [sku,qty] of Object.entries(s)){if(!map[sku])continue;await ml(`/items/${map[sku]}`,{method:"PUT",body:JSON.stringify({available_quantity:qty})});out.push(sku)}return out}
/* ---------- Perguntas: o Claude só rascunha; a resposta exige aprovação humana ---------- */
async function syncQuestion(id){const q=await ml(`/questions/${id}`),db=rd("questions.json",{});
 db[q.id]={id:q.id,itemId:q.item_id,text:q.text,status:q.status,draft:db[q.id]?.draft||await draftAnswer(q.text),approved:false};wr("questions.json",db)}
async function draftAnswer(text){if(!E.ANTHROPIC_API_KEY)return "";try{
 const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":E.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},
 body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:300,system:"Você responde perguntas de compradores de shots matinais naturais. Seja cordial e breve. NUNCA prometa cura, tratamento ou resultado de saúde; para dúvidas de saúde, sugira consultar um profissional. Se não souber, diga que vai verificar.",messages:[{role:"user",content:text}]})});
 return (await r.json()).content?.[0]?.text||""}catch{return ""}}
async function answerQuestion(id,text){return ml("/answers",{method:"POST",body:JSON.stringify({question_id:+id,text})})}
/* ---------- HTTP ---------- */
const body=req=>new Promise(r=>{let b="";req.on("data",c=>{b+=c;if(b.length>1e6)req.destroy()});req.on("end",()=>{try{r(JSON.parse(b||"{}"))}catch{r({})}})});
const send=(res,c,o)=>{res.writeHead(c,{"content-type":"application/json"});res.end(JSON.stringify(o))};
const authed=req=>(E.STORE_API_KEY&&req.headers["x-api-key"]===E.STORE_API_KEY)||A.sessaoOk(E,req.headers.cookie);
/* ---------- Painel de gestão (/painel): login por senha, cookie de sessão; dados pelas rotas /painel/api ---------- */
const PAINEL=fs.readFileSync(path.join(__dirname,"painel.html"),"utf8");
const ipDe=req=>{const ra=req.socket.remoteAddress||"";return /^(::1|127\.|::ffff:127\.)/.test(ra)?String(req.headers["x-forwarded-for"]||ra).split(",")[0].trim():ra};
function painel(req,res,u){
 if(u.pathname==="/painel"&&req.method==="GET"){res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-frame-options":"DENY","x-content-type-options":"nosniff",
  "content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(PAINEL);return true}
 return false}
async function painelLogin(req,res){const ip=ipDe(req);
 if(A.bloqueado(ip))return send(res,429,{error:"Muitas tentativas. Aguarde 15 minutos."});
 if(!E.ADMIN_PASSWORD||E.ADMIN_PASSWORD.length<10)return send(res,503,{error:"Painel desligado: defina ADMIN_PASSWORD (10+ caracteres) no .env do hub."});
 const {senha}=await body(req);if(!A.senhaOk(E,senha)){A.registrarErro(ip);return send(res,401,{error:"Senha incorreta."})}
 res.writeHead(200,{"content-type":"application/json","set-cookie":A.cookie(A.criarSessao(E),req)});res.end('{"ok":1}')}
async function painelApi(req,res,u){
 const de=(u.searchParams.get("de")||"").slice(0,10),ate=(u.searchParams.get("ate")||"").slice(0,10);
 if(u.pathname==="/painel/api/resumo")return send(res,200,F.resumo({orders:rd("orders.json",{}),lancamentos:rd("lancamentos.json",[]),de,ate}));
 if(u.pathname==="/painel/api/clientes")return send(res,200,F.clientes({orders:rd("orders.json",{}),subscriptions:rd("subscriptions.json",{})}));
 if(u.pathname==="/painel/api/categorias")return send(res,200,{saida:F.CATEGORIAS_SAIDA,entrada:F.CATEGORIAS_ENTRADA});
 if(u.pathname==="/painel/api/lancamentos"&&req.method==="GET")return send(res,200,rd("lancamentos.json",[]).filter(l=>(!de||l.data>=de)&&(!ate||l.data<=ate)).sort((a,b)=>b.data.localeCompare(a.data)));
 if(u.pathname==="/painel/api/lancamentos"&&req.method==="POST"){let l;try{l=F.novoLancamento(await body(req))}catch(e){return send(res,400,{error:e.message})}
  const db=rd("lancamentos.json",[]);db.push(l);wr("lancamentos.json",db);return send(res,201,l)}
 const d=u.pathname.match(/^\/painel\/api\/lancamentos\/(L[\w]+)$/);
 if(d&&req.method==="DELETE"){const db=rd("lancamentos.json",[]),n=db.filter(l=>l.id!==d[1]);if(n.length===db.length)return send(res,404,{error:"não encontrado"});wr("lancamentos.json",n);return send(res,200,{ok:1})}
 return send(res,404,{error:"não encontrado"})}
let states=new Set();
http.createServer(async(req,res)=>{const u=new URL(req.url,"http://x");
 try{
 if(u.pathname==="/health")return send(res,200,{ok:true});
 if(painel(req,res,u))return;
 if(u.pathname==="/painel/login"&&req.method==="POST")return painelLogin(req,res);
 if(u.pathname==="/painel/logout"&&req.method==="POST"){res.writeHead(200,{"content-type":"application/json","set-cookie":A.cookie("",req,0)});return res.end('{"ok":1}')}
 if(u.pathname==="/ml/auth"){const s=crypto.randomBytes(12).toString("hex");states.add(s);
  res.writeHead(302,{location:`${E.ML_AUTH_HOST}/authorization?response_type=code&client_id=${E.ML_APP_ID}&redirect_uri=${encodeURIComponent(E.ML_REDIRECT_URI)}&state=${s}`});return res.end()}
 if(u.pathname==="/ml/callback"){const s=u.searchParams.get("state");if(!states.delete(s))return send(res,400,{error:"state inválido"});
  await tokenReq({grant_type:"authorization_code",code:u.searchParams.get("code"),redirect_uri:E.ML_REDIRECT_URI});return send(res,200,{ok:"Vendedor autorizado"})}
 if(u.pathname==="/ml/webhook"&&req.method==="POST"){const n=await body(req);send(res,200,{ok:1}); // responder rápido (HTTP 200)
  const id=String(n.resource||"").split("/").pop();
  if(n.topic&&n.topic.startsWith("orders"))syncOrder(id).catch(e=>console.error(e.message));
  if(n.topic==="questions")syncQuestion(id).catch(e=>console.error(e.message));return}
 if(!authed(req))return send(res,401,{error:"x-api-key inválida"}); // tudo abaixo é protegido
 if(u.pathname.startsWith("/painel/api/"))return painelApi(req,res,u);
 if(u.pathname==="/subscriptions"&&req.method==="POST"){const sb=await body(req);if(!sb.id||!sb.customer)return send(res,400,{error:"assinatura inválida"});
  const db=rd("subscriptions.json",{});db[sb.id]={...sb,createdAt:new Date().toISOString()};wr("subscriptions.json",db);return send(res,201,{ok:1})}
 if(u.pathname==="/orders"&&req.method==="POST"){const o=await body(req);if(!o.id||!Array.isArray(o.items)||!o.items.length)return send(res,400,{error:"pedido inválido"});
  const sb=o.subscriptionOf&&rd("subscriptions.json",{})[o.subscriptionOf]; // renovação: completa o endereço salvo na assinatura
  if(sb)o.customer={...sb.customer,...o.customer,address:{...sb.customer.address,...(o.customer||{}).address}};
  const db=rd("orders.json",{});db[o.id]={channel:"loja-propria",...o};wr("orders.json",db);decrementStock(o.items.map(i=>({sku:i.sku,qty:i.qty})),o.id);return send(res,201,{ok:1})}
 if(u.pathname==="/orders"&&req.method==="GET")return send(res,200,rd("orders.json",{}));
 if(u.pathname==="/ml/sync-orders")return send(res,200,{synced:await syncRecentOrders()});
 if(u.pathname==="/stock"&&req.method==="GET")return send(res,200,rd("stock.json",{}));
 if(u.pathname==="/stock"&&req.method==="PUT"){wr("stock.json",await body(req));return send(res,200,{ok:1})}
 if(u.pathname==="/ml/push-stock")return send(res,200,{updated:await pushStock()});
 if(u.pathname==="/questions")return send(res,200,rd("questions.json",{}));
 const m=u.pathname.match(/^\/questions\/(\d+)\/answer$/);
 if(m&&req.method==="POST"){const {text}=await body(req);if(!text)return send(res,400,{error:"texto obrigatório"});await answerQuestion(m[1],text);return send(res,200,{ok:1})}
 send(res,404,{error:"não encontrado"})}catch(e){console.error(e.message);send(res,500,{error:"erro interno"})}
}).listen(E.PORT||3000,()=>console.log("DayliShoot Hub na porta",E.PORT||3000));
