# Planner — DayliShoot (Shots Matinais Naturais)
Início: 29/09/2026 · Vendas: dezembro/2026 · Canais: loja própria, Mercado Livre, Shopee, Amazon (Mercado Livre primeiro)

## Conceito
Shots de 50 ml em kits por objetivo, compra avulsa ou assinatura (semanal, mensal, semestral) + acessórios (caixa, copo, misturador, frascos).
Kits (10): limpeza intestinal, energia e foco, emagrecimento, rejuvenescimento, energia e força, imunidade, qualidade do sono, saúde digestiva, detox, bem-estar geral. MVP sugerido: 3 a 4 kits.

## Fase 0 — Decisões (semanas 1-2)
- [ ] Formato: fresco (cadeia fria, validade curta) ou pó/sachê (estável)
- [ ] CNPJ, alvará, registro sanitário; regras da ANVISA para rotulagem e alegações
- [ ] Linguagem de rótulo/anúncio sem promessas de saúde

## Fase 1 — Estruturação e pesquisa
- [ ] Conta de vendedor no Mercado Livre (primeiro), depois Shopee e Amazon
- [ ] 3 orçamentos: ervas/ingredientes, frascos, copos/acessórios, embalagens
- [ ] Análise de concorrência e diferenciais

## Fase 2 — Desenvolvimento
- [ ] Testar receitas (3-5 por kit, degustação cega com 10-20 pessoas) — base: docs/modelos-20-shots.html
- [ ] Definir kits, validade, custos e margem (meta bruta ≥ 60%)
- [ ] Identidade visual e embalagens
- [x] Primeira versão do site (site/index.html)

## Arquitetura de automação (Hub Claude)
Entradas: Mercado Livre, Shopee, Amazon → Hub (Claude) → módulos: Pedidos, Estoque, Perguntas, Vendas.
- [x] Servidor Mercado Livre v0.1 (hub/server.js) — falta testar com conta real
- [ ] Servidor online + domínio HTTPS; cadastrar redirect e webhook no painel do ML
- [ ] Autorizar conta vendedora (/ml/auth); mapear SKU ↔ anúncios (hub/data/ml-items.json)
- [ ] Módulo Perguntas: Claude rascunha, humano aprova
- [ ] Módulo Vendas (painel); depois Shopee e Amazon
- [ ] Trocar JSON por banco de dados antes de escalar

## Fase 3 — Produção e lançamento
- [ ] Lote-piloto (30-50 clientes) · logística · cadastro nos marketplaces · início das vendas

## Marketing
Material educativo físico/digital · folders em academias (QR com cupom; expandir após 1 mês) · parceria com profissional de saúde · redes sociais (preparo, depoimentos, hábitos) · lista de espera em novembro.

## FAQ (base)
Por que tomar? · Benefícios (potenciais) · Sabor forte · Contraindicações · Quanto tempo para sentir diferença.

## Meta
Marca de shots naturais com recorrência por assinatura, presença em marketplaces e crescimento por marketing educativo e parcerias locais.
