# DayliShoot Hub — Mercado Livre + Painel de gestão (v0.2)
Pedidos, estoque, perguntas e o painel `/painel` (entradas, saídas, compras, clientes). Node 18+, sem dependências.

## Painel de gestão
Abra `https://SEU-DOMINIO/painel` e entre com a `ADMIN_PASSWORD` do `.env` (o `deploy/setup.sh` já gera uma). Plano completo em `docs/painel-gestao.md`.
Para testar no seu computador: crie `hub/.env` com `ADMIN_PASSWORD=` (10+ caracteres) e `STORE_API_KEY=`, rode `node --env-file=.env server.js` dentro de `hub/` e abra `http://localhost:3000/painel`.

## Antes de rodar (você faz)
1. Criar a aplicação no painel de desenvolvedores do Mercado Livre (developers.mercadolivre.com.br).
2. Em "URL de redirect", cadastrar `https://SEU-DOMINIO/ml/callback` (precisa ser HTTPS público).
3. Em notificações (webhooks), cadastrar `https://SEU-DOMINIO/ml/webhook` e marcar os tópicos de pedidos e perguntas.
4. Copiar `.env.example` para `.env` e preencher. Rodar: `node --env-file=.env server.js`
5. Abrir `/ml/auth` no navegador e autorizar a conta vendedora (uma vez).

## Rotas (protegidas por header `x-api-key`, exceto as 3 primeiras)
`GET /health` · `GET /ml/auth` · `GET /ml/callback` · `POST /ml/webhook`
`POST /orders` (site da loja; renovações trazem `subscriptionOf` e recebem o endereço salvo) · `POST /subscriptions` (endereço completo de cada assinatura) · `GET /orders` · `GET /ml/sync-orders`
`GET|PUT /stock` · `GET /ml/push-stock` (precisa de `data/ml-items.json`: `{"KIT-IMUNIDADE":"MLB..."}`)
`GET /questions` · `POST /questions/:id/answer` `{ "text": "..." }`
`GET /painel` · `POST /painel/login` `{ "senha": "..." }` · `POST /painel/logout` (públicas)
`GET /painel/api/resumo?de=AAAA-MM-DD&ate=AAAA-MM-DD` · `GET /painel/api/clientes` · `GET|POST /painel/api/lancamentos` · `DELETE /painel/api/lancamentos/:id`
As rotas protegidas aceitam o header `x-api-key` ou o cookie de sessão do painel.

## Regras embutidas
- Tokens criptografados (AES-256-GCM), enviados só no header, nunca logados; refresh automático antes de expirar e salvando o novo refresh_token.
- Webhook responde 200 na hora e processa depois.
- Estoque baixa uma vez por pedido (sem duplicar) em qualquer canal, incluindo a loja própria.
- Painel: senha com 10+ caracteres (sem ela fica desligado), sessão de 12 h em cookie HttpOnly/SameSite=Strict assinado, bloqueio após 5 senhas erradas por 15 min.
- Claude só rascunha respostas; o envio exige aprovação humana via `/questions/:id/answer`.
- Para a loja usar: preencher `CONFIG.endpoints.orders` com `https://SEU-DOMINIO/orders` (o envio do header x-api-key deve ficar num servidor, não no navegador).

## Limitações desta versão
Armazenamento em JSON (trocar por banco antes de escalar), sem etiqueta/nota fiscal, sem teste com conta real. Validar nomes de campos na documentação do ML ao integrar.
