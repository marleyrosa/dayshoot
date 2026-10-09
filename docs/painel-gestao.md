# Painel de Gestão DayliShoot — plano executável

Painel interno para acompanhar o que entra, o que sai, os pedidos, os clientes, o estoque e as perguntas, com o Claude como operador central (Mercado Livre → Hub → Pedidos, Estoque, Perguntas, Vendas). Roda dentro do hub (`hub/`), no mesmo servidor que já recebe os pedidos, em `https://SEU-HUB/painel`.

## 1. Definição do produto
- **Problema:** as vendas chegam por canais diferentes (loja própria, Mercado Livre) e as compras de insumos ficam em papel, então não dá para saber, num só lugar, quanto entrou, quanto saiu e quem são os clientes.
- **Público:** a operação da DayliShoot (dono e quem ajudar na produção e nos envios), no computador ou no celular.
- **Diferencial:** os pedidos pagos entram sozinhos (Mercado Pago e Mercado Livre caem no hub), o estoque baixa em todos os canais sem duplicar, e o Claude rascunha as respostas aos compradores, sempre com aprovação humana.
- **Métrica principal:** saldo do mês (entradas − saídas) com margem bruta ≥ 60%, a meta do planner.

## 2. Escopo do MVP (em ordem de prioridade)
1. ✅ Login com senha e sessão segura (cookie assinado, bloqueio após 5 tentativas).
2. ✅ Visão geral: Entrou, Saiu, Saldo, margem, pedidos pagos e ticket médio, por período.
3. ✅ Compras e despesas: lançar insumos, embalagens, frete, taxas, marketing etc., com fornecedor; também entradas fora do site (feira, venda direta).
4. ✅ Pedidos: lista de todos os canais com itens e total; botão para buscar os pedidos do Mercado Livre.
5. ✅ Clientes: quem comprou, quantas vezes, quanto gastou, última compra e quem é assinante.
6. ✅ Estoque por SKU com alerta de baixo (≤ 5) e envio das quantidades ao Mercado Livre.
7. ✅ Perguntas do Mercado Livre com rascunho do Claude e botão Responder.
8. ⏭ Depois do lançamento: tarifas do Mercado Livre/Mercado Pago lançadas automaticamente como saída, exportar CSV, Shopee e Amazon.

## 3. Stack recomendada
- **Backend:** o próprio hub em Node 20+ sem dependências; menos peças para manter num Orange Pi de 1 GB.
- **Frontend:** uma página HTML com JavaScript puro servida pelo hub; abre no celular, sem build.
- **Banco de dados:** arquivos JSON em `hub/data/` agora; trocar por SQLite quando passar de ~1.000 pedidos/mês (mesmo servidor, sem custo).

## 4. Modelo de dados
- **Pedidos** (`orders.json`): id, canal (loja-propria/mercadolivre), data, status, cliente (nome, e-mail, CEP, endereço), itens (SKU, quantidade), total, pagamento.
- **Lançamentos** (`lancamentos.json`): id, tipo (entrada/saída), data, categoria, descrição, fornecedor, valor em centavos.
- **Assinaturas** (`subscriptions.json`): id, cliente com endereço, kit, plano.
- **Estoque** (`stock.json`): SKU → quantidade; `stock-log.json` evita baixar duas vezes o mesmo pedido.
- **Perguntas** (`questions.json`): id, anúncio, texto, status, rascunho do Claude.
- **Clientes:** calculados a partir dos pedidos (agrupados por e-mail ou comprador do ML), sem tabela própria por enquanto.

## 5. Estrutura de pastas
```
dayshoot/
├─ site/            loja (Vercel)
├─ api/             pagamento, frete, webhook do Mercado Pago (Vercel)
├─ hub/             servidor da operação (Orange Pi)
│  ├─ server.js     rotas: Mercado Livre, pedidos, estoque, perguntas, painel
│  ├─ finance.js    contas: entradas, saídas, saldo, clientes
│  ├─ auth.js       login do painel
│  ├─ painel.html   a tela do painel
│  ├─ painel.test.js
│  ├─ deploy/setup.sh
│  └─ data/         JSONs (fora do Git)
└─ docs/            planner, modelos de shots, este plano
```

## 6. Autenticação e cobrança
- **Painel:** acesso só seu. O `setup.sh` gera a `ADMIN_PASSWORD`; você entra em `/painel` com ela e a sessão dura 12 horas. Para trocar a senha, edite `/etc/dayshoot-hub.env` e reinicie o serviço (todas as sessões caem).
- **Clientes da loja:** não precisam de conta; compram com e-mail e CPF no checkout.
- **Cobrança:** Mercado Pago, que já está no site (Pix, cartão e assinaturas semanal/mensal/semestral). É o mais simples para o Brasil e o mesmo ecossistema do Mercado Livre. Cada pagamento aprovado vira pedido no hub e aparece no painel.

## 7. Roadmap de lançamento
- **Semana 1 (base):** ligar o Orange Pi (Armbian + Node + túnel/HTTPS), rodar `setup.sh`, abrir `/painel`, cadastrar os SKUs no estoque e lançar as compras já feitas (insumos, frascos, folders).
- **Semana 2 (MVP):** apontar `HUB_ORDERS_URL` e `STORE_API_KEY` na Vercel para os pedidos da loja caírem no hub; criar o app no Mercado Livre e autorizar a conta (`/ml/auth`); fazer uma compra de teste com o token de teste do Mercado Pago e conferir no painel.
- **Semana 3 (publicar e cobrar):** trocar para o token de produção do Mercado Pago, publicar os anúncios no Mercado Livre, ligar os webhooks e acompanhar o saldo diariamente.

## 8. Checklist de lançamento
1. Domínio próprio apontado para a Vercel (loja) e um subdomínio para o hub (ex.: `hub.seudominio.com.br`).
2. Hub no ar com HTTPS (`/health` responde `ok`).
3. Painel abrindo em `/painel` com a senha gerada.
4. Variáveis da Vercel preenchidas: `MP_ACCESS_TOKEN`, `SITE_URL`, `MP_WEBHOOK_SECRET`, `HUB_ORDERS_URL`, `STORE_API_KEY`.
5. Webhook do Mercado Pago cadastrado em `SITE_URL/api/webhook` com a assinatura secreta.
6. App do Mercado Livre criado, redirect e webhook cadastrados, conta autorizada.
7. SKUs do estoque iguais aos do site e mapeados em `hub/data/ml-items.json`.
8. Uma compra de teste em Pix e uma em cartão aparecendo em Pedidos, Clientes e na Visão geral.
9. Página de venda revisada (preços, frete, Discovery, contraindicações) e QR dos folders apontando para o domínio final.
10. Analytics na loja (Vercel Web Analytics, gratuito) e backup diário de `hub/data/` (cópia para um pendrive ou Google Drive).
