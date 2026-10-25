import { api } from './api';
import {
  LotsOverviewResponse,
  LotCampaignDetailResponse,
  CommercialLotCampaign,
  LotItem,
  LotSale,
  LotExpense,
} from '../types/lots';

export const lotsService = {
  // Public info / presentation
  async getModuleInfo(): Promise<{
    moduleName: string;
    version: string;
    isPro: boolean;
    benefits: Array<{ title: string; description: string }>;
  }> {
    return api.get('/lots/info');
  },

  // Overview with consolidated metrics
  async getOverview(): Promise<LotsOverviewResponse> {
    return api.get<LotsOverviewResponse>('/lots/overview');
  },

  // Single campaign detail with financials
  async getCampaign(id: string): Promise<LotCampaignDetailResponse> {
    return api.get<LotCampaignDetailResponse>(`/lots/campaigns/${id}`);
  },

  // Standalone channel velocity recommendations
  async getChannelRecommendations(id: string): Promise<{
    campaignId: string;
    campaignName: string;
    goodsType: string;
    recommendations: any[];
  }> {
    return api.get(`/lots/campaigns/${id}/channel-recommendations`);
  },

  // Create campaign (Wizard)
  async createCampaign(data: {
    name: string;
    goodsType: string;
    description?: string;
    supplierName?: string;
    originCountry?: string;
    purchaseDate?: string;
    purchaseCurrency?: string;
    exchangeRate?: number;
    purchasePriceOriginal?: number;
    transportCost?: number;
    customsCost?: number;
    transactionFees?: number;
    packagingCost?: number;
    otherSupplyCosts?: number;
    costAllocationMethod?: 'unit' | 'value_weighted' | 'custom';
    status?: 'draft' | 'active' | 'paused' | 'closed';
    notes?: string;
    items: Array<{
      name: string;
      reference?: string;
      category?: string;
      variant?: string;
      quantityReceived: number;
      estimatedSellingPrice?: number;
      customUnitCost?: number;
      notes?: string;
    }>;
  }): Promise<{ message: string; campaign: CommercialLotCampaign }> {
    return api.post('/lots/campaigns', data);
  },

  // Update status (active, paused, closed, draft)
  async updateStatus(id: string, status: 'draft' | 'active' | 'paused' | 'closed'): Promise<{ message: string; campaign: CommercialLotCampaign }> {
    return api.patch(`/lots/campaigns/${id}/status`, { status });
  },

  // Record a sale on a lot
  async recordSale(
    campaignId: string,
    data: {
      saleDate?: string;
      channel: 'comptoir' | 'whatsapp' | 'facebook' | 'instagram' | 'site_web' | 'autre';
      customerName?: string;
      customerPhone?: string;
      discountAmount?: number;
      variableCosts?: number;
      paymentMethod?: 'cash' | 'mobile_money' | 'bank_transfer' | 'credit';
      notes?: string;
      items: Array<{
        lotItemId: string;
        quantity: number;
        unitPrice: number;
      }>;
    }
  ): Promise<{ message: string; sale: LotSale }> {
    return api.post(`/lots/campaigns/${campaignId}/sales`, data);
  },

  // Record an expense on a lot
  async recordExpense(
    campaignId: string,
    data: {
      amount: number;
      category?: string;
      description?: string;
      expenseDate?: string;
    }
  ): Promise<{ message: string; expense: LotExpense }> {
    return api.post(`/lots/campaigns/${campaignId}/expenses`, data);
  },

  // Record stock adjustment (loss/defective/return)
  async recordStockAdjustment(
    campaignId: string,
    data: {
      lotItemId: string;
      type: 'defective' | 'adjustment' | 'return';
      quantity: number;
      reason?: string;
    }
  ): Promise<{ message: string }> {
    return api.post(`/lots/campaigns/${campaignId}/stock-adjustments`, data);
  },

  // Add an item to existing lot
  async addItem(
    campaignId: string,
    data: {
      name: string;
      reference?: string;
      category?: string;
      variant?: string;
      quantityReceived: number;
      estimatedSellingPrice?: number;
      unitCost?: number;
      notes?: string;
    }
  ): Promise<{ message: string; item: LotItem }> {
    return api.post(`/lots/campaigns/${campaignId}/items`, data);
  },
};
