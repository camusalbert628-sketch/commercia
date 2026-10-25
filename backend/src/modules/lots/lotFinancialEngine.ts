/**
 * ============================================================================
 * COMMERCIA PRO - MOTEUR FINANCIER DE GESTION DES LOTS COMMERCIAUX
 * ============================================================================
 * Ce module centralise de manière pure, auditable et strictement testable :
 * 1. Le calcul de l'investissement total d'un lot et la ventilation des coûts.
 * 2. Le calcul du chiffre d'affaires net, des encaissements réels et des créances.
 * 3. Le calcul du coût des marchandises vendues (COGS) et du bénéfice net réalisé.
 * 4. La double valorisation du stock restant (coût de revient vs valeur potentielle de vente).
 * 5. Le taux de couverture/récupération du capital par les encaissements réels.
 * 6. Les alertes de performance basées sur des critères objectifs documentés.
 * 7. L'horodatage d'épuisement et les suggestions d'écoulement rapide.
 */

export interface LotAlert {
  id: string;
  code:
    | 'MARGE_NEGATIVE'
    | 'PRIX_INSUFFISANT'
    | 'STOCK_DORMANT'
    | 'AVARIES_CRITIQUES'
    | 'RECOUVREMENT_LENT'
    | 'CREANCES_ELEVEES';
  category: 'RENTABILITE' | 'STOCK' | 'TRESORERIE';
  severity: 'CRITIQUE' | 'AVERTISSEMENT' | 'INFO';
  title: string;
  problemDetected: string;
  dataPoints: Record<string, any>;
  ruleTriggered: string;
  recommendation: string;
}

export interface LotCampaignFinancials {
  // 1. INVESTISSEMENT TOTAL (Section 1)
  purchasePriceXaf: number;
  supplyCosts: {
    transportCost: number;
    customsCost: number;
    transactionFees: number;
    packagingCost: number;
    otherSupplyCosts: number;
    totalSupplyCosts: number;
  };
  totalLandedCost: number;
  additionalExpenses: {
    operatingExpenses: number;
    acquisitionExpenses: number;
    totalAdditionalExpenses: number;
  };

  // 2. CHIFFRE D'AFFAIRES & VENTES (Section 2)
  salesSummary: {
    totalSalesCount: number;
    admissibleSalesCount: number;
    pendingSalesCount: number;
    paidSalesCount: number;
    cancelledSalesCount: number;
    refundedSalesCount: number;
    grossSalesAmount: number;
    totalDiscountAmount: number;
    netTurnover: number;
    cashCollected: number;
    receivables: number;
    refundedAmount: number;
  };

  // 3. COÛT DES MARCHANDISES VENDUES & BÉNÉFICE RÉALISÉ (Section 3)
  cogs: {
    totalCostOfGoodsSold: number;
    avgUnitCostOfSoldItems: number;
  };
  variableSellingCosts: number;
  grossProfit: number;
  variableMargin: number;
  realizedNetProfit: number;

  // 4. VALEUR DU STOCK RESTANT (Section 4)
  stockValuation: {
    totalQuantityReceived: number;
    totalQuantitySold: number;
    totalQuantityDefective: number;
    totalQuantityRemaining: number;
    remainingStockCostValue: number; // A. Coût de revient du stock restant
    remainingStockMarketValue: number; // B. Valeur potentielle de vente du stock restant
    potentialFutureGrossMargin: number;
  };

  // 5. RÉCUPÉRATION DU CAPITAL & TRÉSORERIE (Section 5)
  capitalRecovery: {
    totalInvested: number;
    netCashInflow: number;
    cashRecoveredNet: number;
    capitalRemainingToRecover: number;
    capitalRecoveryRate: number;
    isCapitalFullyRecovered: boolean;
    receivablesPending: number;
    unitsToBreakeven: number;
  };

  // INDICATEURS UNITAIRES MOYENS
  unitAverages: {
    avgSellingPrice: number;
    avgUnitLandedCost: number;
    avgUnitGrossMargin: number;
  };

  // 6. ALERTES MULTICRITÈRES (Section 6)
  alerts: LotAlert[];
}

export interface DepletionStats {
  isDepleted: boolean;
  registeredAt: string;
  registeredAtFormatted: string;
  depletedAt: string | null;
  depletedAtFormatted: string | null;
  totalDurationDays: number | null;
  totalDurationHours: number | null;
  totalDurationMinutes: number | null;
  durationLabel: string;
  daysActive: number;
  hoursActive: number;
  dailyVelocity: number;
  estimatedDaysToDeplete: number | null;
  estimatedDepletionDate: string | null;
  estimatedDepletionLabel: string | null;
}

export interface ChannelRecommendation {
  channel: string;
  channelName: string;
  velocityScore: number;
  speedBadge: string;
  priority: 'HAUTE' | 'RECOMMANDÉE' | 'SECONDAIRE';
  estimatedDaysToSell: string;
  strategyTitle: string;
  recommendedAction: string;
  actionSteps: string[];
  suggestedOffer: string;
  copyableSalesScript: string;
  targetAudience: string;
  financialRationale: string;
  historicalVolumeOnThisChannel?: number;
}

/**
 * Calcul complet et auditable de tous les indicateurs d'un lot commercial.
 */
export function calculateLotFinancials(
  campaign: any,
  items: any[] = [],
  sales: any[] = [],
  expenses: any[] = []
): LotCampaignFinancials {
  // -------------------------------------------------------------
  // 1. INVESTISSEMENT TOTAL (Section 1)
  // -------------------------------------------------------------
  const purchasePriceXaf = Math.round(campaign.purchasePriceXaf || 0);
  const transportCost = Math.round(campaign.transportCost || 0);
  const customsCost = Math.round(campaign.customsCost || 0);
  const transactionFees = Math.round(campaign.transactionFees || 0);
  const packagingCost = Math.round(campaign.packagingCost || 0);
  const otherSupplyCosts = Math.round(campaign.otherSupplyCosts || 0);

  const totalSupplyCosts =
    transportCost + customsCost + transactionFees + packagingCost + otherSupplyCosts;
  const totalLandedCost = Math.round(
    campaign.totalLandedCost || purchasePriceXaf + totalSupplyCosts
  );

  // Dépenses additionnelles d'exploitation (post-réception)
  let operatingExpenses = 0;
  let acquisitionExpenses = 0;

  expenses.forEach((exp: any) => {
    const amt = Math.round(exp.amount || 0);
    const cat = (exp.category || '').toLowerCase();
    if (cat.includes('pub') || cat.includes('marketing') || cat.includes('acquisition') || exp.isAcquisition) {
      acquisitionExpenses += amt;
    } else {
      operatingExpenses += amt;
    }
  });

  const totalAdditionalExpenses = operatingExpenses + acquisitionExpenses;

  // -------------------------------------------------------------
  // 2. CHIFFRE D'AFFAIRES & VENTES (Section 2)
  // -------------------------------------------------------------
  let totalSalesCount = sales.length;
  let admissibleSalesCount = 0;
  let pendingSalesCount = 0;
  let paidSalesCount = 0;
  let cancelledSalesCount = 0;
  let refundedSalesCount = 0;

  let grossSalesAmount = 0;
  let totalDiscountAmount = 0;
  let netTurnover = 0;
  let cashCollected = 0;
  let receivables = 0;
  let refundedAmount = 0;
  let variableSellingCosts = 0;
  let totalCostOfGoodsSold = 0;

  sales.forEach((sale: any) => {
    const isCancelled = sale.paymentStatus === 'cancelled';
    const isRefunded = sale.paymentStatus === 'refunded';
    const isPending = sale.paymentStatus === 'pending';
    const isCredit = sale.paymentMethod === 'credit';
    const isPaid = sale.paymentStatus === 'paid' && !isCredit;

    if (isCancelled) {
      cancelledSalesCount++;
      return; // Les ventes annulées sont strictement exclues du CA
    }

    if (isRefunded) {
      refundedSalesCount++;
      const refAmt = Math.round(sale.netAmount || sale.totalAmount || 0);
      refundedAmount += refAmt;
      return; // Les ventes totalement remboursées ne contribuent pas au CA net
    }

    // Ventes admissibles
    admissibleSalesCount++;
    const lineGross = Math.round(sale.totalAmount || 0);
    const lineDiscount = Math.round(sale.discountAmount || 0);
    const lineNet = Math.max(0, lineGross - lineDiscount);
    const lineVarCost = Math.round(sale.variableCosts || 0);

    grossSalesAmount += lineGross;
    totalDiscountAmount += lineDiscount;
    netTurnover += lineNet;
    variableSellingCosts += lineVarCost;

    // Encaissements vs Créances clients
    // Supporte le champ amountPaid explicite si présent, sinon déduit du statut
    if (typeof sale.amountPaid === 'number' && typeof sale.amountDue === 'number') {
      cashCollected += Math.round(sale.amountPaid);
      receivables += Math.round(sale.amountDue);
      if (sale.amountDue > 0) pendingSalesCount++;
      if (sale.amountPaid > 0) paidSalesCount++;
    } else if (isPaid) {
      paidSalesCount++;
      cashCollected += lineNet;
    } else if (isPending || isCredit) {
      pendingSalesCount++;
      receivables += lineNet;
    } else {
      // Cas par défaut
      paidSalesCount++;
      cashCollected += lineNet;
    }

    // COGS des articles vendus lors de cette vente admissible
    if (Array.isArray(sale.items)) {
      sale.items.forEach((item: any) => {
        const qty = item.quantity || 1;
        const uCost = typeof item.unitCost === 'number' ? item.unitCost : 0;
        const lineCogs = Math.round(item.totalCost || qty * uCost);
        totalCostOfGoodsSold += lineCogs;
      });
    }
  });

  // -------------------------------------------------------------
  // 3. BÉNÉFICE RÉALISÉ (Section 3)
  // -------------------------------------------------------------
  const grossProfit = netTurnover - totalCostOfGoodsSold;
  const variableMargin = grossProfit - variableSellingCosts;
  const realizedNetProfit = variableMargin - totalAdditionalExpenses;

  // -------------------------------------------------------------
  // 4. VALEUR DU STOCK RESTANT (Section 4)
  // -------------------------------------------------------------
  let totalQuantityReceived = 0;
  let totalQuantitySold = 0;
  let totalQuantityDefective = 0;
  let totalQuantityRemaining = 0;
  let remainingStockCostValue = 0;
  let remainingStockMarketValue = 0;

  items.forEach((it: any) => {
    const received = it.quantityReceived || 0;
    const sold = it.quantitySold || 0;
    const defective = it.quantityDefective || 0;
    const remaining = it.quantityRemaining || Math.max(0, received - sold - defective);

    const uCost = it.unitCost || 0;
    const estPrice = it.estimatedSellingPrice || 0;

    totalQuantityReceived += received;
    totalQuantitySold += sold;
    totalQuantityDefective += defective;
    totalQuantityRemaining += remaining;

    remainingStockCostValue += Math.round(remaining * uCost);
    remainingStockMarketValue += Math.round(remaining * estPrice);
  });

  const potentialFutureGrossMargin = Math.max(0, remainingStockMarketValue - remainingStockCostValue);

  // -------------------------------------------------------------
  // 5. RÉCUPÉRATION DU CAPITAL (Section 5)
  // -------------------------------------------------------------
  // Règle financière explicite :
  // Le flux net encaissé = Encaissements réels des ventes - Frais variables décaissés - Dépenses payées du lot
  const netCashInflow = cashCollected - variableSellingCosts - totalAdditionalExpenses;
  const cashRecoveredNet = Math.max(0, netCashInflow);
  const capitalRemainingToRecover = Math.max(0, totalLandedCost - netCashInflow);
  const capitalRecoveryRate =
    totalLandedCost > 0
      ? Number(((netCashInflow / totalLandedCost) * 100).toFixed(1))
      : 0;
  const isCapitalFullyRecovered = netCashInflow >= totalLandedCost;

  // Indicateurs unitaires moyens
  const avgTargetPriceOfRemaining =
    totalQuantityRemaining > 0 ? Math.round(remainingStockMarketValue / totalQuantityRemaining) : 0;
  const avgSellingPrice =
    totalQuantitySold > 0
      ? Math.round(netTurnover / totalQuantitySold)
      : avgTargetPriceOfRemaining;
  const avgUnitCostOfSoldItems =
    totalQuantitySold > 0 ? Math.round((totalCostOfGoodsSold / totalQuantitySold) * 100) / 100 : 0;
  const avgUnitLandedCost =
    totalQuantityReceived > 0 ? Math.round((totalLandedCost / totalQuantityReceived) * 100) / 100 : 0;
  
  // Marge contributive unitaire de référence (priorité au prix réel constaté, sinon prix cible prévisionnel)
  const referencePrice = avgSellingPrice > 0 ? avgSellingPrice : avgTargetPriceOfRemaining;
  const avgUnitGrossMargin = Math.max(0, referencePrice - Math.round(avgUnitLandedCost));

  // Nombre d'unités à vendre pour atteindre le point mort (sur stock restant)
  // Nombre d'articles restants à vendre pour récupérer la mise restante
  const unitsToBreakeven =
    !isCapitalFullyRecovered && referencePrice > 0
      ? Math.ceil(capitalRemainingToRecover / referencePrice)
      : 0;

  // -------------------------------------------------------------
  // 6. ALERTES MULTICRITÈRES DOCUMENTÉES (Section 6)
  // -------------------------------------------------------------
  const alerts: LotAlert[] = [];
  const daysActive = Math.max(
    1,
    Math.floor((Date.now() - new Date(campaign.createdAt || campaign.purchaseDate).getTime()) / 86400000)
  );

  // Alerte 1: Marge Brute Négative (Rentabilité critique)
  if ((admissibleSalesCount >= 3 || totalQuantitySold >= 3) && grossProfit < 0) {
    alerts.push({
      id: `alert-marge-${campaign.id}`,
      code: 'MARGE_NEGATIVE',
      category: 'RENTABILITE',
      severity: 'CRITIQUE',
      title: 'Marge Brute Déficitaire',
      problemDetected: `Vos ventes génèrent une perte brute de ${Math.abs(grossProfit).toLocaleString('fr-FR')} FCFA.`,
      dataPoints: {
        chiffreAffairesNet: netTurnover,
        cogsMarchandisesVendues: totalCostOfGoodsSold,
        perteBrute: grossProfit,
      },
      ruleTriggered: 'Chiffre d\'affaires net inférieur au coût de revient des marchandises vendues sur au moins 3 ventes.',
      recommendation: 'Réévaluez immédiatement vos prix de vente au-dessus du coût de revient unitaire pour stopper les pertes.',
    });
  }

  // Alerte 2: Prix de vente insuffisant pour couvrir les charges d'exploitation
  if (
    admissibleSalesCount >= 3 &&
    grossProfit > 0 &&
    realizedNetProfit < 0 &&
    variableSellingCosts + totalAdditionalExpenses > grossProfit
  ) {
    alerts.push({
      id: `alert-charges-${campaign.id}`,
      code: 'PRIX_INSUFFISANT',
      category: 'RENTABILITE',
      severity: 'AVERTISSEMENT',
      title: 'Frais d\'Exploitation Supérieurs à la Marge',
      problemDetected: `Bien que la marge brute soit positive (+${grossProfit.toLocaleString('fr-FR')} FCFA), vos frais variables (${variableSellingCosts.toLocaleString('fr-FR')} FCFA) et dépenses d'exploitation (${totalAdditionalExpenses.toLocaleString('fr-FR')} FCFA) basculent le résultat en déficit de ${Math.abs(realizedNetProfit).toLocaleString('fr-FR')} FCFA.`,
      dataPoints: {
        margeBrute: grossProfit,
        fraisVariables: variableSellingCosts,
        depensesAdditionnelles: totalAdditionalExpenses,
        resultatNet: realizedNetProfit,
      },
      ruleTriggered: 'Charges d\'exploitation rattachées supérieures à la marge brute dégagée.',
      recommendation: 'Limitez les coûts de livraison ou de retouches/pressing, et appliquez une majoration de prix de 15% à 20%.',
    });
  }

  // Alerte 3: Avaries / Déchets anormaux
  if (
    totalQuantityReceived >= 10 &&
    totalQuantityDefective / totalQuantityReceived >= 0.08
  ) {
    const ratePct = ((totalQuantityDefective / totalQuantityReceived) * 100).toFixed(1);
    alerts.push({
      id: `alert-avaries-${campaign.id}`,
      code: 'AVARIES_CRITIQUES',
      category: 'STOCK',
      severity: 'AVERTISSEMENT',
      title: 'Taux Élevé de Déchets et Avaries',
      problemDetected: `${totalQuantityDefective} articles sur ${totalQuantityReceived} sont défectueux ou perdus (${ratePct}% du lot).`,
      dataPoints: {
        articlesAvaries: totalQuantityDefective,
        articlesRecus: totalQuantityReceived,
        tauxAvariesPourcent: Number(ratePct),
      },
      ruleTriggered: 'Taux d\'articles défectueux >= 8% du stock initial reçu.',
      recommendation: 'Signalez ces avaries à votre fournisseur pour obtenir un avoir sur votre prochaine commande et ventilez les pertes sur les pièces vendables.',
    });
  }

  // Alerte 4: Stock dormant après durée significative
  if (
    daysActive >= 21 &&
    totalQuantityRemaining > 0 &&
    totalQuantitySold < Math.ceil(totalQuantityReceived * 0.15)
  ) {
    const soldPct = ((totalQuantitySold / totalQuantityReceived) * 100).toFixed(1);
    alerts.push({
      id: `alert-stock-${campaign.id}`,
      code: 'STOCK_DORMANT',
      category: 'STOCK',
      severity: 'AVERTISSEMENT',
      title: 'Ralentissement Commercial / Stock Dormant',
      problemDetected: `Après ${daysActive} jours, seulement ${soldPct}% du lot a été vendu (${totalQuantitySold}/${totalQuantityReceived} pcs). ${totalQuantityRemaining} articles immobilisent votre trésorerie.`,
      dataPoints: {
        joursActifs: daysActive,
        articlesVendus: totalQuantitySold,
        articlesRestants: totalQuantityRemaining,
        coutStockImmobilise: remainingStockCostValue,
      },
      ruleTriggered: 'Lot actif depuis plus de 21 jours avec moins de 15% du stock écoulé.',
      recommendation: 'Activez immédiatement des ventes flash en statuts WhatsApp ou des lives TikTok avec offre pack pour relancer la vélocité.',
    });
  }

  // Alerte 5: Recouvrement du capital trop lent
  if (
    daysActive >= 30 &&
    capitalRecoveryRate < 35 &&
    totalQuantityRemaining > 0
  ) {
    alerts.push({
      id: `alert-recup-${campaign.id}`,
      code: 'RECOUVREMENT_LENT',
      category: 'TRESORERIE',
      severity: 'AVERTISSEMENT',
      title: 'Amortissement du Capital Ralenti',
      problemDetected: `Après 1 mois d'activité, vous n'avez récupéré que ${capitalRecoveryRate}% de votre investissement initial. Reste ${capitalRemainingToRecover.toLocaleString('fr-FR')} FCFA à amortir.`,
      dataPoints: {
        joursActifs: daysActive,
        tauxRecuperation: capitalRecoveryRate,
        capitalRestant: capitalRemainingToRecover,
      },
      ruleTriggered: 'Durée d\'exposition > 30 jours et taux de couverture de l\'investissement < 35%.',
      recommendation: 'Envisagez une cession partielle en demi-gros (pack revendeurs) pour sécuriser immédiatement le retour sur investissement.',
    });
  }

  // Alerte 6: Créances clients élevées non encaissées
  if (receivables > 0 && netTurnover > 0 && receivables >= netTurnover * 0.35) {
    const recPct = ((receivables / netTurnover) * 100).toFixed(1);
    alerts.push({
      id: `alert-creances-${campaign.id}`,
      code: 'CREANCES_ELEVEES',
      category: 'TRESORERIE',
      severity: 'INFO',
      title: 'Créances Clients Significatives',
      problemDetected: `${receivables.toLocaleString('fr-FR')} FCFA restent à encaisser chez vos clients (${recPct}% de vos ventes du lot).`,
      dataPoints: {
        creancesClients: receivables,
        chiffreAffairesNet: netTurnover,
        partCreancesPourcent: Number(recPct),
      },
      ruleTriggered: 'Créances clients >= 35% du chiffre d\'affaires net facturé.',
      recommendation: 'Priorisez le recouvrement des dettes en cours avant d\'accorder de nouvelles facilités de paiement sur ce lot.',
    });
  }

  return {
    purchasePriceXaf,
    supplyCosts: {
      transportCost,
      customsCost,
      transactionFees,
      packagingCost,
      otherSupplyCosts,
      totalSupplyCosts,
    },
    totalLandedCost,
    additionalExpenses: {
      operatingExpenses,
      acquisitionExpenses,
      totalAdditionalExpenses,
    },
    salesSummary: {
      totalSalesCount,
      admissibleSalesCount,
      pendingSalesCount,
      paidSalesCount,
      cancelledSalesCount,
      refundedSalesCount,
      grossSalesAmount,
      totalDiscountAmount,
      netTurnover,
      cashCollected,
      receivables,
      refundedAmount,
    },
    cogs: {
      totalCostOfGoodsSold,
      avgUnitCostOfSoldItems,
    },
    variableSellingCosts,
    grossProfit,
    variableMargin,
    realizedNetProfit,
    stockValuation: {
      totalQuantityReceived,
      totalQuantitySold,
      totalQuantityDefective,
      totalQuantityRemaining,
      remainingStockCostValue,
      remainingStockMarketValue,
      potentialFutureGrossMargin,
    },
    capitalRecovery: {
      totalInvested: totalLandedCost,
      netCashInflow,
      cashRecoveredNet,
      capitalRemainingToRecover,
      capitalRecoveryRate,
      isCapitalFullyRecovered,
      receivablesPending: receivables,
      unitsToBreakeven,
    },
    unitAverages: {
      avgSellingPrice,
      avgUnitLandedCost,
      avgUnitGrossMargin,
    },
    alerts,
  };
}

/**
 * Consolidation globale de toutes les campagnes pour le tableau de bord général (Section 7).
 * Recalculée directement à partir des données sources sans jamais moyenner des pourcentages !
 */
export function consolidateLotsOverview(
  campaignsData: Array<{
    campaign: any;
    items: any[];
    sales: any[];
    expenses: any[];
  }>
) {
  let totalInvested = 0;
  let totalGrossTurnover = 0;
  let totalDiscounts = 0;
  let totalNetTurnover = 0;
  let totalCashCollected = 0;
  let totalReceivables = 0;
  let totalCogs = 0;
  let totalVariableCosts = 0;
  let totalAdditionalExpenses = 0;
  let totalRemainingStockCost = 0;
  let totalRemainingStockMarketValue = 0;
  let activeCampaignsCount = 0;
  let closedCampaignsCount = 0;

  const allAlerts: LotAlert[] = [];

  const campaignsSummaries = campaignsData.map(({ campaign, items, sales, expenses }) => {
    const fin = calculateLotFinancials(campaign, items, sales, expenses);
    const depStats = calculateDepletionStats(campaign, items, sales);
    const recs = generateFastSellingChannelRecommendations(campaign, fin, sales);

    totalInvested += fin.totalLandedCost;
    totalGrossTurnover += fin.salesSummary.grossSalesAmount;
    totalDiscounts += fin.salesSummary.totalDiscountAmount;
    totalNetTurnover += fin.salesSummary.netTurnover;
    totalCashCollected += fin.salesSummary.cashCollected;
    totalReceivables += fin.salesSummary.receivables;
    totalCogs += fin.cogs.totalCostOfGoodsSold;
    totalVariableCosts += fin.variableSellingCosts;
    totalAdditionalExpenses += fin.additionalExpenses.totalAdditionalExpenses;
    totalRemainingStockCost += fin.stockValuation.remainingStockCostValue;
    totalRemainingStockMarketValue += fin.stockValuation.remainingStockMarketValue;

    if (campaign.status === 'active') activeCampaignsCount++;
    if (campaign.status === 'closed') closedCampaignsCount++;

    if (fin.alerts.length > 0) {
      allAlerts.push(...fin.alerts);
    }

    return {
      id: campaign.id,
      name: campaign.name,
      goodsType: campaign.goodsType,
      supplierName: campaign.supplierName,
      originCountry: campaign.originCountry,
      purchaseDate: campaign.purchaseDate,
      purchasePriceOriginal: campaign.purchasePriceOriginal,
      purchaseCurrency: campaign.purchaseCurrency,
      totalLandedCost: fin.totalLandedCost,
      status: campaign.status,
      createdAt: campaign.createdAt,
      depletedAt: campaign.depletedAt,
      depletionStats: depStats,
      topRecommendedChannel: recs[0] || null,
      financials: fin,
      // Backwards compatible fields for list table
      totalQuantityReceived: fin.stockValuation.totalQuantityReceived,
      totalQuantitySold: fin.stockValuation.totalQuantitySold,
      totalQuantityDefective: fin.stockValuation.totalQuantityDefective,
      totalQuantityRemaining: fin.stockValuation.totalQuantityRemaining,
      revenue: fin.salesSummary.netTurnover,
      cashCollected: fin.salesSummary.cashCollected,
      receivables: fin.salesSummary.receivables,
      cogs: fin.cogs.totalCostOfGoodsSold,
      variableCosts: fin.variableSellingCosts,
      additionalExpenses: fin.additionalExpenses.totalAdditionalExpenses,
      realizedProfit: fin.realizedNetProfit,
      remainingStockCostValue: fin.stockValuation.remainingStockCostValue,
      remainingStockMarketValue: fin.stockValuation.remainingStockMarketValue,
      recoveryRate: fin.capitalRecovery.capitalRecoveryRate,
      isBreakevenReached: fin.capitalRecovery.isCapitalFullyRecovered,
      itemsCount: items.length,
      salesCount: fin.salesSummary.admissibleSalesCount,
      alertsCount: fin.alerts.length,
    };
  });

  const totalRealizedProfit =
    totalNetTurnover - totalCogs - totalVariableCosts - totalAdditionalExpenses;
  const globalNetCashInflow =
    totalCashCollected - totalVariableCosts - totalAdditionalExpenses;
  const globalRecoveryRate =
    totalInvested > 0
      ? Number(((globalNetCashInflow / totalInvested) * 100).toFixed(1))
      : 0;

  return {
    summary: {
      totalCampaigns: campaignsData.length,
      activeCampaignsCount,
      closedCampaignsCount,
      totalInvested,
      totalGrossTurnover,
      totalDiscounts,
      totalRevenue: totalNetTurnover,
      totalCashCollected,
      totalReceivables,
      totalCogs,
      totalVariableCosts,
      totalAdditionalExpenses,
      totalRealizedProfit,
      totalRemainingStockCost,
      totalRemainingStockMarketValue,
      globalRecoveryRate,
      globalNetCashInflow,
    },
    alerts: allAlerts,
    campaignsNeedingAttention: campaignsSummaries.filter(c => c.alertsCount > 0),
    campaigns: campaignsSummaries,
  };
}

/**
 * Calcul précis des statistiques d'épuisement et de durée.
 */
export function calculateDepletionStats(
  campaign: any,
  items: any[] = [],
  sales: any[] = []
): DepletionStats {
  const registeredAtDate = new Date(campaign.createdAt || Date.now());
  const totalReceived = items.reduce((s: number, i: any) => s + (i.quantityReceived || 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.quantitySold || 0), 0);
  const totalRemaining = items.reduce((s: number, i: any) => s + (i.quantityRemaining || 0), 0);

  const isDepleted = totalRemaining === 0 && totalReceived > 0;
  const depletedAtDate = campaign.depletedAt
    ? new Date(campaign.depletedAt)
    : isDepleted && sales.length > 0
    ? new Date(sales[0].saleDate || sales[0].createdAt)
    : null;

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const registeredAtFormatted = dateFormatter.format(registeredAtDate);
  const depletedAtFormatted = depletedAtDate ? dateFormatter.format(depletedAtDate) : null;

  if (isDepleted && depletedAtDate) {
    const diffMs = Math.max(0, depletedAtDate.getTime() - registeredAtDate.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    let durationLabel = '';
    if (days > 0) {
      durationLabel = `Écoulé en ${days} jour${days > 1 ? 's' : ''}, ${hours}h et ${minutes}min`;
    } else if (hours > 0) {
      durationLabel = `Écoulé en ${hours}h et ${minutes}min`;
    } else {
      durationLabel = `Écoulé en ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    return {
      isDepleted: true,
      registeredAt: registeredAtDate.toISOString(),
      registeredAtFormatted,
      depletedAt: depletedAtDate.toISOString(),
      depletedAtFormatted,
      totalDurationDays: days,
      totalDurationHours: hours,
      totalDurationMinutes: minutes,
      durationLabel,
      daysActive: days,
      hoursActive: hours,
      dailyVelocity: days > 0 ? Number((totalSold / days).toFixed(1)) : totalSold,
      estimatedDaysToDeplete: 0,
      estimatedDepletionDate: depletedAtDate.toISOString(),
      estimatedDepletionLabel: `Totalement épuisé le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(depletedAtDate)}`,
    };
  }

  // En cours d'activité
  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - registeredAtDate.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const daysActive = Math.floor(totalMinutes / (60 * 24));
  const hoursActive = Math.floor((totalMinutes % (60 * 24)) / 60);

  const durationLabel =
    daysActive > 0
      ? `En cours depuis ${daysActive} jour${daysActive > 1 ? 's' : ''} et ${hoursActive}h`
      : `Enregistré aujourd'hui (${hoursActive}h d'activité)`;

  const effectiveDays = Math.max(1, daysActive);
  const dailyVelocity = totalSold > 0 ? Number((totalSold / effectiveDays).toFixed(1)) : 0;

  let estimatedDaysToDeplete: number | null = null;
  let estimatedDepletionDate: string | null = null;
  let estimatedDepletionLabel: string | null = null;

  if (totalRemaining > 0) {
    if (dailyVelocity > 0) {
      estimatedDaysToDeplete = Math.ceil(totalRemaining / dailyVelocity);
      const estDate = new Date(nowMs + estimatedDaysToDeplete * 86400000);
      estimatedDepletionDate = estDate.toISOString();
      estimatedDepletionLabel = `Rythme actuel : ${dailyVelocity} pcs/jour. Épuisement estimé des ${totalRemaining} pcs restantes dans ~${estimatedDaysToDeplete} jours (vers le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(estDate)}).`;
    } else {
      const benchmarkVelocity = Math.max(2, Math.round(totalReceived / 15));
      estimatedDaysToDeplete = Math.ceil(totalRemaining / benchmarkVelocity);
      const estDate = new Date(nowMs + estimatedDaysToDeplete * 86400000);
      estimatedDepletionDate = estDate.toISOString();
      estimatedDepletionLabel = `Épuisement estimé dans ~${estimatedDaysToDeplete} jours au rythme cible de ~${benchmarkVelocity} pcs/jour (vers le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(estDate)}).`;
    }
  }

  return {
    isDepleted: false,
    registeredAt: registeredAtDate.toISOString(),
    registeredAtFormatted,
    depletedAt: null,
    depletedAtFormatted: null,
    totalDurationDays: null,
    totalDurationHours: null,
    totalDurationMinutes: null,
    durationLabel,
    daysActive,
    hoursActive,
    dailyVelocity,
    estimatedDaysToDeplete,
    estimatedDepletionDate,
    estimatedDepletionLabel,
  };
}

/**
 * Générateur de recommandations d'écoulement rapide basées sur les marges réelles.
 */
export function generateFastSellingChannelRecommendations(
  campaign: any,
  financials: any,
  lotSales: any[] = []
): ChannelRecommendation[] {
  const goods = (campaign.goodsType || '').toLowerCase();
  const remaining = financials.stockValuation?.totalQuantityRemaining ?? (financials.totalQuantityRemaining || 0);
  const isRecovered = financials.capitalRecovery?.isCapitalFullyRecovered ?? financials.isBreakevenReached;
  const recoveryRate = financials.capitalRecovery?.capitalRecoveryRate ?? (financials.recoveryRate || 0);
  const avgSellingPrice = financials.unitAverages?.avgSellingPrice ?? (financials.avgSellingPrice || 0);
  const remainingToBreakeven = financials.capitalRecovery?.capitalRemainingToRecover ?? (financials.remainingToBreakeven || 0);

  const salesByChannel: Record<string, number> = {};
  lotSales.forEach((s: any) => {
    const ch = s.channel || 'comptoir';
    salesByChannel[ch] = (salesByChannel[ch] || 0) + (s.netAmount || 0);
  });

  const recommendations: ChannelRecommendation[] = [];

  const isPhoneOrElectronics =
    goods.includes('electr') ||
    goods.includes('tel') ||
    goods.includes('phone') ||
    goods.includes('redmi') ||
    goods.includes('smartphone');

  const itemName = campaign.items?.[0]?.name || campaign.name;

  // 1. WhatsApp Business
  const waScore = isPhoneOrElectronics ? 98 : 95;
  const waPriceEx = avgSellingPrice > 0 ? avgSellingPrice.toLocaleString('fr-FR') : '85 000';
  recommendations.push({
    channel: 'whatsapp',
    channelName: 'WhatsApp Business & Statuts VIP',
    velocityScore: waScore,
    speedBadge: '⚡ Vente Flash (24h - 48h)',
    priority: 'HAUTE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Drop Exclusif en Statut & Listes VIP',
    recommendedAction: `Diffusez les ${remaining} articles (${itemName}) en vidéos d'unboxing ou photos en haute définition sur vos statuts WhatsApp et dans vos listes de diffusion VIP avec compte à rebours ("Offre spéciale 24h").`,
    actionSteps: [
      'Prenez 3 photos nettes du produit déballé et de sa boîte sous bonne lumière.',
      'Publiez en statut WhatsApp à 12h30 ou 19h00 avec prix affiché en gros (' + waPriceEx + ' FCFA) et appel à l\'action.',
      'Exigez une réservation ferme avec acompte Mobile Money pour bloquer l\'appareil.',
    ],
    suggestedOffer: isRecovered
      ? `Offre Liquidation : "${itemName} à ${waPriceEx} FCFA avec accessoires ou film protecteur offert !"`
      : `Offre Flash Arrivage : "${itemName} neuf scellé à ${waPriceEx} FCFA au lieu de 95 000 FCFA. Livraison gratuite aujourd'hui !"`,
    copyableSalesScript: `🔥 ARRIVAGE OFFICIEL ! ${itemName} neufs scellés en stock immédiat ! Prix promo exceptionnel : ${waPriceEx} FCFA. Quantités limitées. Écrivez-nous tout de suite pour bloquer votre exemplaire avant rupture ! 🚀`,
    targetAudience: 'Clients fidèles, contacts réguliers, amateurs de smartphones fiables et performants.',
    financialRationale:
      recoveryRate < 50
        ? `Taux de récupération à ${recoveryRate}% : ce canal n'a aucun coût publicitaire (0 FCFA) et génère des encaissements cash immédiats pour rembourser vos ${remainingToBreakeven.toLocaleString('fr-FR')} FCFA restants.`
        : `Capital remboursé à ${recoveryRate}% : tout le cash encaissé sur WhatsApp est 100% de la marge nette liquide pour votre trésorerie.`,
    historicalVolumeOnThisChannel: salesByChannel['whatsapp'] || 0,
  });

  // 2. Facebook Marketplace & Groupes
  const fbScore = isPhoneOrElectronics ? 96 : 82;
  recommendations.push({
    channel: 'facebook',
    channelName: 'Facebook Marketplace & Groupes d\'Achat/Vente',
    velocityScore: fbScore,
    speedBadge: '💬 Vente Rapide Ciblée (2 à 5 jours)',
    priority: 'HAUTE',
    estimatedDaysToSell: '2 à 5 jours',
    strategyTitle: 'Multi-diffusion Marketplace & Groupes Spécialisés Tech/Smartphones',
    recommendedAction: `Publiez 3 à 5 annonces ciblées sur Facebook Marketplace et partagez-les dans les groupes d'achats/ventes de votre ville.`,
    actionSteps: [
      'Créez une annonce Marketplace avec localisation précise.',
      'Partagez l\'annonce dans 10 groupes d\'achats/ventes actifs de votre ville.',
      'Répondez immédiatement aux messages Messenger avec votre contact WhatsApp.',
    ],
    suggestedOffer: `Garantie incluse + remise de 3 000 FCFA pour tout retrait immédiat en boutique.`,
    copyableSalesScript: `📱 DISPONIBLES MAINTENANT : ${itemName} authentiques neufs en boîte ! Prix promo exceptionnel : ${waPriceEx} FCFA. Possibilité de tester sur place. Contactez-moi par WhatsApp ou Messenger pour livraison rapide aujourd'hui !`,
    targetAudience: 'Acheteurs locaux en recherche active de téléphones neufs au meilleur prix.',
    financialRationale: `Canal gratuit avec une portée massive locale pour toucher des acheteurs prêts à payer comptant.`,
    historicalVolumeOnThisChannel: salesByChannel['facebook'] || 0,
  });

  // 3. Vente Comptoir
  recommendations.push({
    channel: 'comptoir',
    channelName: 'Vente Flash Comptoir & Vitrine Boutique',
    velocityScore: 90,
    speedBadge: '🏪 Vente Directe Boutique (1 à 3 jours)',
    priority: 'RECOMMANDÉE',
    estimatedDaysToSell: '1 à 3 jours',
    strategyTitle: 'Mise en Avant Vitrine & Présentoir Caisse',
    recommendedAction: `Placez les ${itemName} bien en vue dans la vitrine principale avec une étiquette de prix choc (${waPriceEx} FCFA). Proposez-les activement à chaque client passant en boutique.`,
    actionSteps: [
      'Exposez un modèle de démonstration en vitrine allumé et manipulable.',
      'Affichez clairement le prix promotionnel et les caractéristiques clés.',
      'Proposez une coque ou verre trempé en vente additionnelle.',
    ],
    suggestedOffer: `Offre Boutique : "${itemName} à ${waPriceEx} FCFA + configuration et transfert de données offerts sur place !"`,
    copyableSalesScript: `📢 Arrivage direct en boutique : ${itemName} à prix grossiste (${waPriceEx} FCFA) ! Passez découvrir et tester en magasin.`,
    targetAudience: 'Clients de passage, clientèle locale du quartier, habitués de la boutique.',
    financialRationale: `0 coût de livraison, 0 risque de retour. Encaissement cash physique immédiat.`,
    historicalVolumeOnThisChannel: salesByChannel['comptoir'] || 0,
  });

  // 4. TikTok Live & Vidéos Déballage
  const ttScore = isPhoneOrElectronics ? 89 : 94;
  recommendations.push({
    channel: 'tiktok',
    channelName: 'TikTok Live & Vidéos Déballage / Test Tech',
    velocityScore: ttScore,
    speedBadge: '🔥 Volume Massif (1 à 3 Vidéos/Lives)',
    priority: 'RECOMMANDÉE',
    estimatedDaysToSell: '1 à 3 sessions Live',
    strategyTitle: 'Unboxing en Direct & Démonstration Caméra/Autonomie',
    recommendedAction: `Organisez un live ou une courte vidéo TikTok montrant le déballage, la qualité d'écran et la batterie du ${itemName}. Les spectateurs réservent directement par commentaire ou WhatsApp.`,
    actionSteps: [
      'Présentez le smartphone en main avec démonstration de fluidité et de l\'appareil photo.',
      'Affichez le numéro WhatsApp en gros sur l\'écran pour commande immédiate.',
      'Encaissez instantanément par Mobile Money pendant le direct.',
    ],
    suggestedOffer: `Packs Flash en Live : "Le téléphone à ${waPriceEx} FCFA + écouteurs offerts pour les 3 premières commandes".`,
    copyableSalesScript: `🔴 EN DIRECT ! Test complet du ${itemName} ! Regardez la fluidité et l'écran ! Pièces limitées à ${waPriceEx} FCFA. Écrivez en commentaire pour réserver le vôtre ! 🛍️`,
    targetAudience: 'Audience jeune, passionnés de technologie, acheteurs en ligne impulsifs.',
    financialRationale: `Le format vidéo démontre la qualité réelle et déclenche des décisions d'achat immédiates.`,
    historicalVolumeOnThisChannel: salesByChannel['tiktok'] || 0,
  });

  // 5. Demi-Gros / Revendeurs
  const revendeursScore = isRecovered || recoveryRate >= 70 ? 92 : 84;
  recommendations.push({
    channel: 'revendeurs',
    channelName: 'Demi-Gros / Revendeurs & Partenaires',
    velocityScore: revendeursScore,
    speedBadge: '📦 Liquidation Express en Bloc (24h - 48h)',
    priority: isRecovered ? 'HAUTE' : 'RECOMMANDÉE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Cession en Gros / Demi-Gros par Packs de 5 à 10 pièces',
    recommendedAction: `Proposez les ${remaining} articles restants en packs de 5 ou 10 pièces à d'autres boutiques ou revendeurs partenaires avec une marge attrayante pour eux.`,
    actionSteps: [
      'Regroupez les smartphones par packs de 5 ou 10 pièces scellées.',
      'Fixez un prix de demi-gros (ex: 80 000 FCFA / pc garantissant votre bénéfice).',
      'Contactez directement 3 revendeurs par téléphone pour une reprise en bloc.',
    ],
    suggestedOffer: `Pack Revendeur : "Lot de 5 pièces cédé à prix grossiste pour récupérer votre trésorerie immédiatement".`,
    copyableSalesScript: `Bonjour, j'ai un stock disponible de ${remaining} pièces de ${itemName} neufs scellés prêtes à la revente avec une excellente marge pour vous. Je cède en demi-gros par 5 pièces. Si intéressé, appelez-moi aujourd'hui !`,
    targetAudience: 'Boutiquiers partenaires, revendeurs indépendants de téléphones, marchands de marché.',
    financialRationale: isRecovered
      ? `Vous avez déjà rentabilisé le lot ! Vendre en bloc à un revendeur vous permet d'encaisser 100% de bénéfice net d'un seul coup sans perdre de temps au détail.`
      : `Permet de solder rapidement le montant restant à rembourser (${remainingToBreakeven.toLocaleString('fr-FR')} FCFA) en une seule transaction.`,
    historicalVolumeOnThisChannel: salesByChannel['autre'] || 0,
  });

  recommendations.sort((a, b) => b.velocityScore - a.velocityScore);
  return recommendations;
}
