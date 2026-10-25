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

export interface AcquisitionChannelData {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  budgetPlanned: number;
  acquisitionSpend: number;
  leadsCount: number;
  newCustomersCount: number;
  ordersCount: number;
  existingClientsOrders: number;
  itemsSold: number;
  grossRevenue: number;
  refundedRevenue: number;
  netRevenue: number;
  cogs: number;
  variableCosts: number;
  profitAfterAcquisition: number;
  profitPerItem: number;
  cac: number | null; // null si non calculable (0 client)
  roas: number | null; // null si non calculable (0 dépense)
  conversionRate: number | null;
  contributionMargin: number;
  isProfitable: boolean;
}

export interface GrowthSummary {
  totalAcquisitionSpend: number;
  totalLeads: number;
  totalNewCustomers: number;
  totalOrders: number;
  totalItemsSold: number;
  totalGrossRevenue: number;
  totalRefundedRevenue: number;
  totalNetRevenue: number;
  totalCogs: number;
  totalVariableCosts: number;
  totalProfitAfterAcquisition: number;
  totalFixedCosts: number;
  netOperatingProfit: number;
  globalCac: number | null;
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
}

export interface GrowthAnalyticsResponse {
  period: {
    key: string;
    label: string;
    start: string;
    end: string;
  };
  summary: GrowthSummary;
  breakEven: BreakEvenAnalysis;
  channels: AcquisitionChannelData[];
  bestChannel: AcquisitionChannelData | null;
  sourceDataCounts: {
    admissibleSalesCount: number;
    refundedSalesCount: number;
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
  variableBreakdown: {
    transport?: number;
    packaging?: number;
    delivery?: number;
    fees?: number;
    commission?: number;
    other?: number;
  };
  totalUnitsSold: number;
  totalRevenue: number;
  totalContributionProfit: number;
}

// Aliases
export type AcquisitionChannel = AcquisitionChannelData;
export type AcquisitionCampaign = AcquisitionCampaignData;
export type ProductProfitability = ProductProfitabilityData;
export type GrowthPeriod = AnalysisPeriodKey;
export type ChannelPerformance = AcquisitionChannelData;
