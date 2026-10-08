/* FONTE ÚNICA de preços e regras comerciais. O site (index.html) e o servidor (api/_catalog.js) leem este arquivo,
   então mudar um preço aqui muda nos dois. */
(function (g) {
  var C = {
    // preço por shot (R$) de cada kit
    kits: {
      "limpeza-intestinal": 6.2, "energia-foco": 6.9, emagrecimento: 6.4, rejuvenescimento: 7.5,
      "energia-forca": 6.5, imunidade: 5.9, sono: 6.6, digestiva: 6.0, detox: 6.3, "bem-estar": 5.8
    },
    // doses por pedido e desconto de cada plano. Só semanal, mensal e semestral são assinaturas (renovam sozinhas).
    plans: {
      avulso: { doses: 7, d: 0 }, semanal: { doses: 7, d: 0.05 }, mensal: { doses: 30, d: 0.12 }, semestral: { doses: 180, d: 0.25 }
    },
    // periodicidade da cobrança de cada assinatura
    recurring: {
      semanal: { frequency: 7, type: "days" }, mensal: { frequency: 1, type: "months" }, semestral: { frequency: 6, type: "months" }
    },
    accs: { CAIXA: 24.9, COPO: 29.9, MISTURADOR: 49.9, FRASCOS: 39.9 },
    discovery: [7, 10],
    // Frete: tabela por região do CEP (valores de referência; troque por cotação de transportadora quando houver contrato).
    shipping: {
      freeOver: 120,
      freePlans: ["mensal", "semestral"],
      regions: {
        SE: { name: "Sudeste", cents: 1490, days: "2 a 4" },
        S: { name: "Sul", cents: 1990, days: "3 a 5" },
        CO: { name: "Centro-Oeste", cents: 2290, days: "4 a 6" },
        NE: { name: "Nordeste", cents: 2790, days: "5 a 8" },
        N: { name: "Norte", cents: 3490, days: "6 a 10" }
      }
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = C; else g.CATALOG = C;
})(this);
