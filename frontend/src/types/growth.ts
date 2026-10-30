// Types pour le Module Croissance Clients & CAC COMMERCIA

export type AnalysisPeriodKey =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'current_month'
  | 'previous_month'
  | 'quarter'
  | 'custom';

export type AttributionModelKey = 'first_touch' | 'last_touch';

export interface AcquisitionChannelData {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  budgetPlanned: number;
  adSpend: number;
  otherAcquisitionSpend?: number;
  acquisitionSpend: number;
  leadsCount: number;
  newCustomersCount: number;
  ordersCount: number;
  existingClientsOrders: number;
  cancelledOrdersCount?: number;
  refundedOrdersCount?: number;
  itemsSold: number;
  grossRevenue: number;
  refundedRevenue: number;
  cancelledRevenue?: number;
  netRevenue: number;
  collectedRevenue?: number;
  cogs: number;
  variableCosts: number;
  profitAfterAcquisition: number;
  profitPerItem: number;
  cac: number | null; // null si non calculable (0 client)
  adCac?: number | null; // CAC publicitaire pur
  totalCac?: number | null; // CAC incluant toutes les dépenses
  roas: number | null; // null si non calculable (0 dépense)
  conversionRate: number | null;
  contributionMargin: number;
  isProfitable: boolean;
}

export interface GrowthSummary {
  totalAcquisitionSpend: number;
  totalAdSpend?: number;
  totalLeads: number;
  totalNewCustomers: number;
  totalOrders: number;
  totalCancelledOrders?: number;
  totalRefundedOrders?: number;
  totalItemsSold: number;
  totalGrossRevenue: number;
  totalRefundedRevenue: number;
  totalCancelledRevenue?: number;
  totalNetRevenue: number;
  totalCollectedRevenue?: number;
  totalCogs: number;
  totalVariableCosts: number;
  totalProfitAfterAcquisition: number;
  totalFixedCosts: number;
  netOperatingProfit: number;
  globalCac: number | null;
  globalAdCac?: number | null;
  globalRoas: number | null;
  averageOrderValue: number;
  globalConversionRate: number | null;
  globalContributionMargin: number;
}

export interface BreakEvenAnalysis {
  avgSellingPrice: number;
  avgVariableCostPerUnit: number;
  mcvu: number;
  tmcv: number;
  breakEvenRevenue: number | null;
  breakEvenUnits: number | null;
  marginOfSafety: number | null;
  safetyIndex: number | null;
  maxCompatibleAdBudget: number;
  explanation?: string;
}

export interface GrowthAnalyticsResponse {
  period: {
    key: string;
    label: string;
    start: string;
    end: string;
    attributionModel?: string;
  };
  summary: GrowthSummary;
  breakEven: BreakEvenAnalysis;
  channels: AcquisitionChannelData[];
  bestChannel: AcquisitionChannelData | null;
  sourceDataCounts: {
    admissibleSalesCount: number;
    refundedSalesCount: number;
    cancelledSalesCount?: number;
    pendingSalesCount?: number;
    expensesCount: number;
    campaignsCount: number;
  };
}

export interface AcquisitionCampaignData {
  id: string;
  businessId: string;
  channelId: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  budgetPlanned: number;
  actualSpend: number;
  leadsCount: number;
  status: 'active' | 'completed' | 'paused' | 'draft';
  notes?: string | null;
  channel?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface ProductVariableBreakdown {
  transport?: number;
  packaging?: number;
  delivery?: number;
  fees?: number;
  commission?: number;
  internet?: number;
  other?: number;
}

export interface ProductProfitabilityData {
  id: string;
  name: string;
  reference?: string | null;
  category: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  unitVariableCosts: number;
  unitContributionMargin: number;
  maxAcceptableCac: number;
  variableBreakdown: ProductVariableBreakdown;
  totalUnitsSold: number;
  totalRevenue: number;
  totalContributionProfit: number;
}

export interface GrowthSaleItem {
  id?: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  variableCosts: number;
  totalPrice: number;
}

export interface GrowthSaleData {
  id: string;
  saleDate: string;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  variableCosts: number;
  paymentMethod: string;
  status: 'completed' | 'paid' | 'delivered' | 'pending' | 'cancelled' | 'refunded';
  notes?: string | null;
  customerId?: string | null;
  channelId?: string | null;
  campaignId?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    firstChannelId?: string | null;
  } | null;
  channel?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  items: GrowthSaleItem[];
}

export interface CreateGrowthSalePayload {
  saleDate?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  paidAmount?: number;
  paymentMethod?: 'cash' | 'mobile_money' | 'bank_transfer' | 'credit';
  status?: 'completed' | 'paid' | 'delivered' | 'pending' | 'cancelled' | 'refunded';
  channelId?: string;
  campaignId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderVariableCosts?: number;
  notes?: string;
}

export interface TargetSimulationResult {
  targetProfit: number;
  currentFixedCosts: number;
  avgPrice: number;
  avgCost: number;
  unitMargin: number;
  tmcv: number;
  requiredUnits: number;
  requiredRevenue: number;
  maxSafeAdBudget: number;
  explanation: string;
}

// Aliases
export type AcquisitionChannel = AcquisitionChannelData;
export type AcquisitionCampaign = AcquisitionCampaignData;
export type ProductProfitability = ProductProfitabilityData;
export type GrowthPeriod = AnalysisPeriodKey;
export type ChannelPerformance = AcquisitionChannelData;
