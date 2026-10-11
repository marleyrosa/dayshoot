---
version: 1
name: DayliShoot
description: Loja de shots matinais naturais. Visual "Forest": verde profundo + papel claro + um único acento lima. Tipografia sans (Bricolage Grotesque nos títulos, Figtree no texto), cantos arredondados em três tamanhos e botões em pílula. Claro e escuro seguem a preferência do sistema.

colors:
  forest-900: "#093b25"   # promo, badges, botões sobre lima, hero e rodapé
  forest-700: "#0e5a35"
  green-600: "#0f7a42"    # texto/ícone verde no modo claro
  lime-400: "#a8e24f"     # ÚNICO acento: destaque do título, contador, badges
  lime-500: "#7cc93a"
  paper: "#f6f2e7"        # fundo claro
  card: "#fffdf8"
  ink: "#10261a"          # texto principal claro
  muted: "#56685b"
  border: "#e3dcc8"
  mint: "#e2f2d8"
  dark-bg: "#0c1611"
  dark-card: "#13211a"
  dark-ink: "#e6efe7"
  dark-muted: "#9fb4a6"
  dark-border: "#26392d"

typography:
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: clamp(36px, 5vw, 64px)
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.035em
  heading:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: clamp(28px, 3.4vw, 42px)
    fontWeight: 700
    letterSpacing: -0.03em
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: 16px
    lineHeight: 1.55
  price:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: 25px
    fontWeight: 700
    fontFeature: tnum

rounded:
  sm: 14px     # inputs, selects, avisos, faixa de benefícios, guia de ingredientes, FAQ
  md: 22px     # cards de produto, planos, passos, modal, filtros
  lg: 32px     # blocos de seção: hero, Discovery, newsletter, rodapé
  pill: 9999px # todo botão e chip

components:
  button-primary:
    background: "linear-gradient(180deg, #c6f06a, #7cc93a)"
    textColor: "#0a2a18"
    rounded: "{rounded.pill}"
  button-add-to-cart:
    background: "linear-gradient(180deg, #17a05c, #0e5a35)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
  badge:
    background: "{colors.forest-900}"
    textColor: "{colors.lime-400}"
    rounded: "{rounded.pill}"
---

## Overview

DayliShoot vende shots naturais de 50 ml em kits por objetivo. O site é uma loja de página única (`site/index.html`), em português, para quem compra pelo celular. A marca fala de ritual e herança de família, sem prometer cura. O visual precisa parecer natural e confiável, não "suplemento agressivo".

## Colors

- Uma cor de acento só: **lima**. Laranja, roxo ou azul não entram em botões, badges ou destaques. As cores dos kits aparecem apenas dentro dos frascos e do fundo da foto.
- Verde profundo é a cor de marca para superfícies fortes (hero, Discovery, rodapé, plano em destaque).
- No modo escuro, os tokens trocam em `@media (prefers-color-scheme: dark)`. Texto de marca vira lima (`--ink`) e verde de texto vira `#8fd46a` (`--g1t`). Fotos de produto e a faixa do copo continuam em fundo claro.
- Nada de brilho neon (glow) em sombras. Sombras são verdes escuras e suaves.

## Typography

- Títulos: Bricolage Grotesque 700, espaçamento negativo. Destaque dentro do título é só por cor (lima), na mesma fonte. Não misturar serifada.
- Texto: Figtree 400/500/600.
- Preços e totais usam números tabulares.
- Títulos com `text-wrap: balance`, parágrafos com `text-wrap: pretty`.

## Layout

- Container de 1240px com 16px de margem lateral.
- Hero: no máximo 2 linhas de título, subtítulo com até 20 palavras e 2 botões, todos visíveis sem rolar no notebook e no celular.
- No celular, a foto do hero vem depois do texto e dos botões.
- Só 1 "eyebrow" (rótulo pequeno em maiúsculas) por página: o do hero.

## Do's and Don'ts

Faça:
- Use `R()` (Intl, pt-BR) para qualquer valor em reais.
- Dê `width` e `height` a toda `<img>`; `loading="lazy"` abaixo da dobra.
- Mantenha foco visível (`:focus-visible`) e devolva o foco ao fechar o modal e o carrinho.
- Teste nos dois modos (claro e escuro) e em 390px de largura.

Não faça:
- Travessão (— ou –) em qualquer texto visível. Use vírgula, ponto ou hífen.
- Mais de um "·" por linha.
- Etiquetas sobrepostas em fotos (exceto o badge "Novo"/"Mais vendido" do card).
- Bolinhas coloridas decorativas antes de títulos.
- Alterar IDs de seção (`#kits`, `#discovery`, `#planos`…), nomes de campos do checkout ou textos legais sem combinar antes.

## Responsive Behavior

- Quebra principal em 860px: grids viram 1 ou 2 colunas, busca ocupa a linha inteira, filtros saem da lateral.
- Rodapé: 4 colunas, 2 abaixo de 860px, 1 abaixo de 480px.
- `prefers-reduced-motion`: sem transições nem elevação no hover.
