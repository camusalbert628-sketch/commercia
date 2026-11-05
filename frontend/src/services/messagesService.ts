import { api } from './api';

export interface UserMessageItem {
  id: string; // Recipient ID for read actions
  messageId: string;
  title: string;
  content: string;
  importance: 'info' | 'important' | 'urgent';
  status: 'unread' | 'read';
  type: 'individual' | 'group' | 'campaign' | 'broadcast' | 'personal';
  channel: string;
  senderName: string;
  deliveredAt: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessagesResponse {
  messages: UserMessageItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

export const messagesService = {
  async getMessages(params?: {
    search?: string;
    filter?: string;
    page?: number;
    limit?: number;
  }): Promise<MessagesResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.filter && params.filter !== 'all') query.append('filter', params.filter);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return api.get<MessagesResponse>(`/messages${qs ? `?${qs}` : ''}`);
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return api.get<{ unreadCount: number }>('/messages/unread-count');
  },

  async getMessage(id: string): Promise<{ message: UserMessageItem }> {
    return api.get<{ message: UserMessageItem }>(`/messages/${id}`);
  },

  async markAsRead(id: string): Promise<{ success: boolean; unreadCount: number }> {
    return api.patch<{ success: boolean; unreadCount: number }>(`/messages/${id}/read`, {});
  },

  async markAllAsRead(): Promise<{ success: boolean; updatedCount: number; unreadCount: number }> {
    return api.patch<{ success: boolean; updatedCount: number; unreadCount: number }>(
      '/messages/actions/mark-all-read',
      {}
    );
  },
};

