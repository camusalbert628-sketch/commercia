// Types pour le Module Pro : Gestion des Lots Commerciaux COMMERCIA

export interface LotItem {
  id: string;
  campaignId: string;
  businessId: string;
  name: string;
  reference?: string | null;
  category?: string | null;
  variant?: string | null;
  quantityReceived: number;
  quantitySold: number;
  quantityDefective: number;
  quantityRemaining: number;
  estimatedSellingPrice: number;
  unitCost: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LotSaleItem {
  id: string;
  saleId: string;
  lotItemId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
  grossProfit: number;
  lotItem?: LotItem;
}

export interface LotSale {
  id: string;
  campaignId: string;
  businessId: string;
  saleDate: string;
  channel: 'comptoir' | 'whatsapp' | 'facebook' | 'instagram' | 'site_web' | 'autre';
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  variableCosts: number;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'cancelled' | 'refunded';
  notes?: string | null;
  createdAt: string;
  items: LotSaleItem[];
}

export interface LotExpense {
  id: string;
  campaignId: string;
  businessId: string;
  amount: number;
  category: string;
  description?: string | null;
  expenseDate: string;
  createdAt: string;
}

export interface LotStockMovement {
  id: string;
  campaignId: string;
  lotItemId: string;
  type: 'sale' | 'defective' | 'adjustment' | 'return';
  quantity: number;
  reason?: string | null;
  createdAt: string;
  lotItem?: LotItem;
}

export interface CommercialLotCampaign {
  id: string;
  businessId: string;
  name: string;
  goodsType: string;
  description?: string | null;
  supplierName?: string | null;
  originCountry?: string | null;
  purchaseDate: string;
  purchaseCurrency: string;
  exchangeRate: number;
  purchasePriceOriginal: number;
  purchasePriceXaf: number;
  transportCost: number;
  customsCost: number;
  transactionFees: number;
  packagingCost: number;
  otherSupplyCosts: number;
  totalLandedCost: number;
  costAllocationMethod: 'unit' | 'value_weighted' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'closed';
  closedAt?: string | null;
  depletedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: LotItem[];
  sales?: LotSale[];
  expenses?: LotExpense[];
  movements?: LotStockMovement[];
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

export interface CampaignSummaryItem {
  id: string;
  name: string;
  goodsType: string;
  supplierName?: string | null;
  originCountry?: string | null;
  purchaseDate: string;
  purchasePriceOriginal: number;
  purchaseCurrency: string;
  totalLandedCost: number;
  status: 'draft' | 'active' | 'paused' | 'closed';
  createdAt: string;
  depletedAt?: string | null;
  depletionStats?: DepletionStats;
  topRecommendedChannel?: ChannelRecommendation | null;
  totalQuantityReceived: number;
  totalQuantitySold: number;
  totalQuantityDefective: number;
  totalQuantityRemaining: number;
  revenue: number;
  cogs: number;
  variableCosts: number;
  additionalExpenses: number;
  realizedProfit: number;
  remainingStockCostValue: number;
  remainingStockMarketValue: number;
  recoveryRate: number;
  isBreakevenReached: boolean;
  itemsCount: number;
  salesCount: number;
}

export interface LotsOverviewResponse {
  summary: {
    totalCampaigns: number;
    activeCampaignsCount: number;
    closedCampaignsCount: number;
    totalInvested: number;
    totalRevenue: number;
    totalCogs: number;
    totalVariableCosts: number;
    totalAdditionalExpenses: number;
    totalRealizedProfit: number;
    totalRemainingStockCost: number;
    totalRemainingStockMarketValue: number;
    globalRecoveryRate: number;
  };
  campaignsNeedingAttention: CampaignSummaryItem[];
  campaigns: CampaignSummaryItem[];
}

export interface LotFinancials {
  totalLandedCost: number;
  totalRevenue: number;
  totalCogs: number;
  totalVariableCosts: number;
  totalAdditionalExpenses: number;
  realizedProfit: number;
  netCashCollected: number;
  recoveryRate: number;
  remainingToBreakeven: number;
  isBreakevenReached: boolean;
  totalQuantityReceived: number;
  totalQuantitySold: number;
  totalQuantityDefective: number;
  totalQuantityRemaining: number;
  remainingStockCostValue: number;
  remainingStockMarketValue: number;
  potentialFutureProfit: number;
  avgSellingPrice: number;
  avgUnitCost: number;
  avgMcvu: number;
  unitsToBreakeven: number;
}

export interface LotCampaignDetailResponse {
  campaign: CommercialLotCampaign;
  financials: LotFinancials;
  depletionStats: DepletionStats;
  channelRecommendations: ChannelRecommendation[];
}
