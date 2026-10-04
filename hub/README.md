# DayliShoot Hub — Mercado Livre (v0.1)
Pedidos, estoque e perguntas. Node 18+, sem dependências.

## Antes de rodar (você faz)
1. Criar a aplicação no painel de desenvolvedores do Mercado Livre (developers.mercadolivre.com.br).
2. Em "URL de redirect", cadastrar `https://SEU-DOMINIO/ml/callback` (precisa ser HTTPS público).
3. Em notificações (webhooks), cadastrar `https://SEU-DOMINIO/ml/webhook` e marcar os tópicos de pedidos e perguntas.
4. Copiar `.env.example` para `.env` e preencher. Rodar: `node --env-file=.env server.js`
5. Abrir `/ml/auth` no navegador e autorizar a conta vendedora (uma vez).

## Rotas (protegidas por header `x-api-key`, exceto as 3 primeiras)
`GET /health` · `GET /ml/auth` · `GET /ml/callback` · `POST /ml/webhook`
`POST /orders` (site da loja) · `GET /orders` · `GET /ml/sync-orders`
`GET|PUT /stock` · `GET /ml/push-stock` (precisa de `data/ml-items.json`: `{"KIT-IMUNIDADE":"MLB..."}`)
`GET /questions` · `POST /questions/:id/answer` `{ "text": "..." }`

## Regras embutidas
- Tokens criptografados (AES-256-GCM), enviados só no header, nunca logados; refresh automático antes de expirar e salvando o novo refresh_token.
- Webhook responde 200 na hora e processa depois.
- Estoque baixa uma vez por pedido (sem duplicar) em qualquer canal, incluindo a loja própria.
- Claude só rascunha respostas; o envio exige aprovação humana via `/questions/:id/answer`.
- Para a loja usar: preencher `CONFIG.endpoints.orders` com `https://SEU-DOMINIO/orders` (o envio do header x-api-key deve ficar num servidor, não no navegador).

## Limitações desta versão
Armazenamento em JSON (trocar por banco antes de escalar), sem etiqueta/nota fiscal, sem teste com conta real. Validar nomes de campos na documentação do ML ao integrar.
