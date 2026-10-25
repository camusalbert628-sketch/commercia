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
  const avgSellingPrice =
    totalQuantitySold > 0 ? Math.round(netTurnover / totalQuantitySold) : 0;
  const avgUnitCostOfSoldItems =
    totalQuantitySold > 0 ? Math.round((totalCostOfGoodsSold / totalQuantitySold) * 100) / 100 : 0;
  const avgUnitLandedCost =
    totalQuantityReceived > 0 ? Math.round((totalLandedCost / totalQuantityReceived) * 100) / 100 : 0;
  const avgUnitGrossMargin = Math.max(0, avgSellingPrice - Math.round(avgUnitLandedCost));

  // Nombre d'unités à vendre pour atteindre le point mort (sur stock restant)
  const unitsToBreakeven =
    !isCapitalFullyRecovered && avgUnitGrossMargin > 0
      ? Math.ceil(capitalRemainingToRecover / avgUnitGrossMargin)
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
      estimatedDepletionLabel = `Épuisement estimé dans ~${estimatedDaysToDeplete} jours (vers le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(estDate)}) au rythme actuel de ${dailyVelocity} pcs/jour`;
    } else {
      const benchmarkVelocity = Math.max(2, Math.round(totalReceived / 15));
      estimatedDaysToDeplete = Math.ceil(totalRemaining / benchmarkVelocity);
      const estDate = new Date(nowMs + estimatedDaysToDeplete * 86400000);
      estimatedDepletionDate = estDate.toISOString();
      estimatedDepletionLabel = `Aucune vente récente. Avec les canaux recommandés ci-dessous (~${benchmarkVelocity} pcs/j), épuisement possible en ~${estimatedDaysToDeplete} jours.`;
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

  // 1. WhatsApp Business
  const waScore = goods.includes('vetement') || goods.includes('frip') || goods.includes('chauss') ? 97 : 93;
  const waPriceEx = avgSellingPrice > 0 ? avgSellingPrice.toLocaleString('fr-FR') : '3 500';
  recommendations.push({
    channel: 'whatsapp',
    channelName: 'WhatsApp Business & Statuts VIP',
    velocityScore: waScore,
    speedBadge: '⚡ Vente Flash (24h - 48h)',
    priority: 'HAUTE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Drop Exclusif en Statut & Listes VIP',
    recommendedAction: `Diffusez les articles restants en vidéos portées ou photos sur vos statuts WhatsApp et dans vos listes de diffusion VIP avec compte à rebours ("Exclusivité 24h").`,
    actionSteps: [
      'Prenez 5 photos/vidéos courtes sous lumière naturelle des meilleures pièces.',
      'Publiez en statut WhatsApp à 12h30 ou 19h00 avec prix affiché en gros et appel à l\'action.',
      'Exigez une réservation ferme avec acompte Mobile Money pour bloquer l\'article.',
    ],
    suggestedOffer: isRecovered
      ? `Offre Liquidation : "Achetez 2 pièces à ${waPriceEx} FCFA, la 3ème est OFFERTE !" (Valable 24h)`
      : `Offre Flash Arrivage : "${waPriceEx} FCFA pièce. -15% supplémentaire pour toute commande avant ce soir 21h !"`,
    copyableSalesScript: `🔥 NOUVEL ARRIVAGE FLASH ! Les plus belles pièces de notre lot (${campaign.name}) viennent d'être déballées ! Quantité très limitée. Prix exceptionnel : ${waPriceEx} FCFA. Écrivez-nous tout de suite pour réserver la vôtre avant rupture ! 🚀`,
    targetAudience: 'Clients fidèles, contacts réguliers du carnet d\'adresses, acheteurs compulsifs.',
    financialRationale:
      recoveryRate < 50
        ? `Taux de récupération à ${recoveryRate}% : ce canal n'a aucun coût marketing (0 FCFA) et génère des encaissements cash immédiats pour rembourser vos ${remainingToBreakeven.toLocaleString('fr-FR')} FCFA restants.`
        : `Capital remboursé à ${recoveryRate}% : tout le cash encaissé sur WhatsApp est 100% du bénéfice net net pour votre trésorerie.`,
    historicalVolumeOnThisChannel: salesByChannel['whatsapp'] || 0,
  });

  // 2. TikTok Live
  const ttScore = goods.includes('vetement') || goods.includes('frip') || goods.includes('cosmet') ? 94 : 88;
  recommendations.push({
    channel: 'tiktok',
    channelName: 'TikTok Live & Vidéos Déballage',
    velocityScore: ttScore,
    speedBadge: '🔥 Volume Massif (1 à 3 Lives)',
    priority: 'HAUTE',
    estimatedDaysToSell: '1 à 3 sessions Live',
    strategyTitle: 'Vente Interactive Déballage / Essayage en Direct',
    recommendedAction: `Organisez un live TikTok de 45 à 90 minutes où vous présentez les ${remaining} articles restants un par un avec un numéro étiqueté. Les spectateurs réservent directement par commentaire.`,
    actionSteps: [
      'Numérotez les articles restants de 1 à ' + Math.min(50, remaining) + ' avec des étiquettes visibles.',
      'Lancez un live avec un titre accrocheur : "Déstockage massif / Premier arrivé premier servi".',
      'Encaissez instantanément par Mobile Money pendant le direct et préparez les colis.',
    ],
    suggestedOffer: `Packs Flash en Live : "Le portant complet à prix unique choc ou 3 articles = livraison gratuite offerte".`,
    copyableSalesScript: `🔴 EN DIRECT MAINTENANT ! Grand déballage du lot ${campaign.name} ! Pièces uniques à saisir tout de suite. Rejoignez le live pour choisir vos articles avant que tout ne parte ! 🛍️`,
    targetAudience: 'Audience jeune, acheteurs en ligne impulsifs, chasseurs de bonnes affaires.',
    financialRationale: `Le format Live supprime la friction d'achat et permet de liquider 30 à 60 articles en une seule session.`,
    historicalVolumeOnThisChannel: salesByChannel['tiktok'] || 0,
  });

  // 3. Vente Comptoir
  recommendations.push({
    channel: 'comptoir',
    channelName: 'Vente Flash Comptoir & Pack Déstockage',
    velocityScore: 87,
    speedBadge: '🏪 Vente Directe Boutique (3-5 jours)',
    priority: 'RECOMMANDÉE',
    estimatedDaysToSell: '3 à 5 jours',
    strategyTitle: 'Mise en Avant Tête de Gondole & Vente Croisée',
    recommendedAction: `Placez les articles du lot bien en vue à l'entrée de la boutique ou sur le comptoir avec une affiche percutante. Proposez-les systématiquement en vente additionnelle en caisse.`,
    actionSteps: [
      'Aménagez une table ou un portant "Sélection Spéciale Arrivage" à l\'entrée.',
      'Formez les vendeurs à proposer l\'article à chaque passage en caisse.',
      'Affichez une réduction immédiate pour l\'achat groupé de 2 ou 3 articles.',
    ],
    suggestedOffer: `Offre Panier : "Pour tout achat en boutique, repartez avec cet article du lot pour seulement ${Math.round(avgSellingPrice * 0.8).toLocaleString('fr-FR')} FCFA au lieu de ${avgSellingPrice.toLocaleString('fr-FR')} FCFA !"`,
    copyableSalesScript: `📢 Spécial en boutique cette semaine : arrivage direct et déstockage exclusif sur notre lot ${campaign.name} ! Venez découvrir et essayer sur place.`,
    targetAudience: 'Clients de passage, clientèle locale du quartier, habitués de la boutique.',
    financialRationale: `0 coût de livraison, 0 risque de retour. Encaissement cash physique immédiat.`,
    historicalVolumeOnThisChannel: salesByChannel['comptoir'] || 0,
  });

  // 4. Demi-Gros / Revendeurs
  const revendeursScore = isRecovered || recoveryRate >= 70 ? 92 : 81;
  recommendations.push({
    channel: 'revendeurs',
    channelName: 'Demi-Gros / Revendeurs & Partenaires',
    velocityScore: revendeursScore,
    speedBadge: '📦 Liquidation Express en Bloc (24h - 48h)',
    priority: isRecovered ? 'HAUTE' : 'RECOMMANDÉE',
    estimatedDaysToSell: '24 à 48 heures',
    strategyTitle: 'Cession en Gros / Demi-Gros pour Liquider le Stock Restant',
    recommendedAction: `Proposez les ${remaining} articles restants en 2 ou 3 packs à des revendeurs de marché ou marchands partenaires avec une petite marge unitaire garantie.`,
    actionSteps: [
      'Regroupez les articles en packs de 15, 25 ou 50 pièces homogènes.',
      'Fixez un prix de gros attrayant (coût de revient + 20-25%).',
      'Contactez directement 3 revendeurs de confiance par téléphone pour une reprise en bloc.',
    ],
    suggestedOffer: `Pack Revendeur : "${Math.min(30, remaining)} pièces cédées en lot unique à prix grossiste pour libérer votre espace de stockage immédiatement".`,
    copyableSalesScript: `Bonjour, j'ai un stock disponible de ${remaining} pièces de qualité (${campaign.goodsType}) prêtes à la revente avec une excellente marge pour vous. Je cède le lot complet en demi-gros. Si intéressé, appelez-moi pour voir les pièces aujourd'hui !`,
    targetAudience: 'Boutiquiers partenaires, revendeurs indépendants, vendeuses ambulantes.',
    financialRationale: isRecovered
      ? `Vous avez déjà rentabilisé le lot ! Vendre en bloc à un revendeur vous permet d'encaisser 100% de bénéfice net d'un seul coup sans perdre de temps au détail.`
      : `Permet de solder rapidement le montant restant à rembourser (${remainingToBreakeven.toLocaleString('fr-FR')} FCFA) en une seule transaction.`,
    historicalVolumeOnThisChannel: salesByChannel['autre'] || 0,
  });

  // 5. Facebook Marketplace
  const fbScore = goods.includes('electr') || goods.includes('tel') ? 95 : 78;
  recommendations.push({
    channel: 'facebook',
    channelName: 'Facebook Marketplace & Groupes d\'Achat/Vente',
    velocityScore: fbScore,
    speedBadge: '💬 Vente Locale Gratuite (3 à 7 jours)',
    priority: 'SECONDAIRE',
    estimatedDaysToSell: '3 à 7 jours',
    strategyTitle: 'Multi-diffusion dans les Groupes de Vente de votre Ville',
    recommendedAction: `Publiez 3 à 5 annonces ciblées sur Facebook Marketplace et partagez-les dans les groupes locaux de votre ville.`,
    actionSteps: [
      'Créez une annonce Marketplace avec localisation précise.',
      'Partagez l\'annonce dans 10 groupes d\'achats/ventes actifs de votre ville.',
      'Répondez immédiatement aux messages Messenger avec votre contact WhatsApp.',
    ],
    suggestedOffer: `Livraison rapide le jour même offerte pour toute commande passée avant 14h.`,
    copyableSalesScript: `Disponibles en quantité limitée ! Articles ${campaign.goodsType} neufs / premier choix (${campaign.name}). Prix promo exceptionnel : ${avgSellingPrice.toLocaleString('fr-FR')} FCFA. Contactez-moi par WhatsApp ou Messenger pour livraison rapide aujourd'hui !`,
    targetAudience: 'Utilisateurs Facebook locaux en recherche active de bonnes affaires.',
    financialRationale: `Canal gratuit avec une portée massive locale pour toucher des personnes en dehors de votre cercle habituel.`,
    historicalVolumeOnThisChannel: salesByChannel['facebook'] || 0,
  });

  recommendations.sort((a, b) => b.velocityScore - a.velocityScore);
  return recommendations;
}
