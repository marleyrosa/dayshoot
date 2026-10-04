# DayliShoot
Loja online de shots matinais naturais (início do projeto: 29/09/2026; meta de vendas: dezembro/2026).

- `site/` loja (HTML único, pronta para receber o endpoint do hub em `CONFIG.endpoints`)
- `hub/` servidor Node (Mercado Livre: pedidos, estoque, perguntas) + `deploy/setup.sh`
- `docs/` planner e catálogo de 20 modelos de shots

**Nunca** commitar `.env`, tokens nem `hub/data/` (já estão no `.gitignore`).
