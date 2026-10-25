import { api } from './api';
import {
  GrowthAnalyticsResponse,
  AcquisitionChannelData,
  AcquisitionCampaignData,
  ProductProfitabilityData,
  AnalysisPeriodKey,
} from '../types/growth';

export const growthService = {
  // 1. Récupérer l'analyse financière selon la période
  async getAnalytics(
    period: AnalysisPeriodKey = 'current_month',
    startDate?: string,
    endDate?: string,
    channelId?: string
  ): Promise<GrowthAnalyticsResponse> {
    const params = new URLSearchParams();
    params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (channelId) params.set('channelId', channelId);

    return api.get<GrowthAnalyticsResponse>(`/growth/analytics?${params.toString()}`);
  },

  // 2. Canaux
  async getChannels(): Promise<AcquisitionChannelData[]> {
    return api.get<AcquisitionChannelData[]>('/growth/channels');
  },

  async createChannel(data: {
    name: string;
    type?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<AcquisitionChannelData> {
    return api.post<AcquisitionChannelData>('/growth/channels', data);
  },

  async updateChannel(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      description: string;
      color: string;
      icon: string;
      isActive: boolean;
      isArchived: boolean;
    }>
  ): Promise<AcquisitionChannelData> {
    return api.put<AcquisitionChannelData>(`/growth/channels/${id}`, data);
  },

  async deleteChannel(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/growth/channels/${id}`);
  },

  // 3. Campagnes
  async getCampaigns(channelId?: string, status?: string): Promise<AcquisitionCampaignData[]> {
    const params = new URLSearchParams();
    if (channelId) params.set('channelId', channelId);
    if (status) params.set('status', status);
    return api.get<AcquisitionCampaignData[]>(`/growth/campaigns?${params.toString()}`);
  },

  async createCampaign(data: {
    channelId: string;
    name: string;
    startDate?: string;
    endDate?: string;
    budgetPlanned?: number;
    actualSpend?: number;
    leadsCount?: number;
    status?: string;
    notes?: string;
    recordExpense?: boolean;
  }): Promise<AcquisitionCampaignData> {
    return api.post<AcquisitionCampaignData>('/growth/campaigns', data);
  },

  async updateCampaign(
    id: string,
    data: Partial<AcquisitionCampaignData>
  ): Promise<AcquisitionCampaignData> {
    return api.put<AcquisitionCampaignData>(`/growth/campaigns/${id}`, data);
  },

  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/growth/campaigns/${id}`);
  },

  // 4. Rentabilité Produits & Services
  async getProductsProfitability(): Promise<ProductProfitabilityData[]> {
    return api.get<ProductProfitabilityData[]>('/growth/products-profitability');
  },

  // 5. Copilote IA
  async getAiAnalysis(period?: string, startDate?: string, endDate?: string): Promise<{
    periodLabel: string;
    recommendations: string[];
    dataUsed: { totalSalesAnalyzed: number; totalExpensesAnalyzed: number; activeChannelsCount: number };
  }> {
    return api.post('/growth/ai-analysis', { period, startDate, endDate });
  },

  // 6. Import CSV
  async importCampaignsCsv(rows: any[], dryRun: boolean = false): Promise<any> {
    return api.post('/growth/import/campaigns', { rows, dryRun });
  },
};
