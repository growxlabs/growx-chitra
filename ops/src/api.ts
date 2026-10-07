import type {
  OperatorUser,
  OverviewResponse,
  BusinessSummary,
  BusinessDetail,
  JobSummary,
  JobDetail,
  PaymentSummary,
  PaymentDetail,
  CreditLedgerEntry,
  SafetyOverview,
  DeletionRequestItem,
  SupportNoteItem,
  SettingsData,
  AuditLogItem
} from './types';

import {
  getMockMe,
  getMockOverview,
  getMockBusinesses,
  getMockBusinessDetail,
  mockAdjustCredits,
  mockSuspendBusiness,
  mockReactivateBusiness,
  mockUpdateBranding,
  mockRemoveLogo,
  mockDeleteBusiness,
  getMockJobs,
  getMockJobDetail,
  mockRetryJob,
  mockCancelJob,
  mockInvestigateJob,
  getMockPayments,
  getMockPaymentDetail,
  mockReconcilePayment,
  mockInvestigatePayment,
  getMockCredits,
  getMockSafety,
  mockAddSafetyNote,
  getMockDeletions,
  mockRetryDeletion,
  mockReviewDeletion,
  getMockSupportNotes,
  mockAddSupportNote,
  mockUpdateSupportNote,
  getMockSettings,
  getMockAuditLogs
} from './mockData';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// Mode control: Defaults to true (mock data mode active for rich preview and standalone operation)
let mockModeEnabled =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('growx_ops_live_mode') !== 'true'
    : true;

export function isMockModeActive(): boolean {
  return mockModeEnabled;
}

export function setMockModeActive(active: boolean) {
  mockModeEnabled = active;
  if (typeof window !== 'undefined') {
    if (active) {
      window.localStorage.removeItem('growx_ops_live_mode');
    } else {
      window.localStorage.setItem('growx_ops_live_mode', 'true');
    }
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (isLocalDev) {
    headers['X-Operator-Email'] = 'lead-admin@growxlabs.tech';
    headers['X-Operator-Role'] = 'admin';
    headers['Cf-Access-Authenticated-User-Email'] = 'lead-admin@growxlabs.tech';
  }

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, val] of options.headers) {
        headers[key] = val;
      }
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const res = await fetch(`/internal${path}`, {
    ...options,
    headers
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // not JSON
  }

  if (!res.ok) {
    const errorMsg = (data.message as string) || (data.error as string) || res.statusText || 'An error occurred';
    const errorCode = (data.error as string) || 'HTTP_' + res.status;
    throw new ApiError(errorMsg, errorCode, res.status);
  }

  return data as unknown as T;
}

export const api = {
  // Session & Identity
  getMe: async (): Promise<OperatorUser> => {
    if (mockModeEnabled) return Promise.resolve(getMockMe());
    try {
      return await request<OperatorUser>('/me');
    } catch {
      return getMockMe();
    }
  },

  // Overview
  getOverview: async (window: 'today' | '7d' | '30d' = 'today'): Promise<OverviewResponse> => {
    if (mockModeEnabled) return Promise.resolve(getMockOverview(window));
    try {
      return await request<OverviewResponse>(`/overview?window=${window}`);
    } catch {
      return getMockOverview(window);
    }
  },

  // Businesses
  getBusinesses: async (
    params: { page?: number; limit?: number; search?: string; filter?: string } = {}
  ): Promise<{ data: BusinessSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockBusinesses(params));
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.filter) query.set('filter', params.filter);
      return await request<{ data: BusinessSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/businesses?${query.toString()}`
      );
    } catch {
      return getMockBusinesses(params);
    }
  },

  getBusinessDetail: async (id: string): Promise<BusinessDetail> => {
    if (mockModeEnabled) return Promise.resolve(getMockBusinessDetail(id));
    try {
      return await request<BusinessDetail>(`/businesses/${encodeURIComponent(id)}`);
    } catch {
      return getMockBusinessDetail(id);
    }
  },

  adjustCredits: async (
    businessId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; amount: number; total_remaining: number; free_remaining: number; paid_remaining: number }> => {
    if (mockModeEnabled) return Promise.resolve(mockAdjustCredits(businessId, amount, reason));
    try {
      return await request<{ success: boolean; amount: number; total_remaining: number; free_remaining: number; paid_remaining: number }>(
        `/businesses/${encodeURIComponent(businessId)}/credits`,
        {
          method: 'POST',
          body: JSON.stringify({ amount, reason })
        }
      );
    } catch {
      return mockAdjustCredits(businessId, amount, reason);
    }
  },

  suspendBusiness: async (businessId: string, reason: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockSuspendBusiness(businessId, reason));
    try {
      return await request<{ success: boolean }>(`/businesses/${encodeURIComponent(businessId)}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch {
      return mockSuspendBusiness(businessId, reason);
    }
  },

  reactivateBusiness: async (businessId: string, reason?: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockReactivateBusiness(businessId, reason));
    try {
      return await request<{ success: boolean }>(`/businesses/${encodeURIComponent(businessId)}/reactivate`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch {
      return mockReactivateBusiness(businessId, reason);
    }
  },

  updateBranding: async (
    businessId: string,
    updates: {
      logo_enabled?: boolean;
      background_style?: string;
      primary_color?: string;
      secondary_color?: string;
      logo_position?: string;
      business_name?: string;
    }
  ): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockUpdateBranding(businessId, updates));
    try {
      return await request<{ success: boolean }>(`/businesses/${encodeURIComponent(businessId)}/branding`, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
    } catch {
      return mockUpdateBranding(businessId, updates);
    }
  },

  removeLogo: async (businessId: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockRemoveLogo(businessId));
    try {
      return await request<{ success: boolean }>(`/businesses/${encodeURIComponent(businessId)}/logo`, {
        method: 'DELETE'
      });
    } catch {
      return mockRemoveLogo(businessId);
    }
  },

  deleteBusiness: async (businessId: string, reason: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockDeleteBusiness(businessId, reason));
    try {
      return await request<{ success: boolean }>(`/businesses/${encodeURIComponent(businessId)}/delete`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch {
      return mockDeleteBusiness(businessId, reason);
    }
  },

  // Image Jobs
  getJobs: async (
    params: { page?: number; limit?: number; status?: string; business_id?: string; model?: string; filter?: string; search?: string } = {}
  ): Promise<{ data: JobSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockJobs(params));
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.business_id) query.set('business_id', params.business_id);
      if (params.model) query.set('model', params.model);
      if (params.filter) query.set('filter', params.filter);
      if (params.search) query.set('search', params.search);
      return await request<{ data: JobSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/jobs?${query.toString()}`
      );
    } catch {
      return getMockJobs(params);
    }
  },

  getJobDetail: async (id: string): Promise<JobDetail> => {
    if (mockModeEnabled) return Promise.resolve(getMockJobDetail(id));
    try {
      return await request<JobDetail>(`/jobs/${encodeURIComponent(id)}`);
    } catch {
      return getMockJobDetail(id);
    }
  },

  retryJob: async (id: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    if (mockModeEnabled) return Promise.resolve(mockRetryJob(id, reason));
    try {
      return await request<{ success: boolean; message: string }>(`/jobs/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch {
      return mockRetryJob(id, reason);
    }
  },

  cancelJob: async (id: string, reason?: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockCancelJob(id, reason));
    try {
      return await request<{ success: boolean }>(`/jobs/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch {
      return mockCancelJob(id, reason);
    }
  },

  investigateJob: async (id: string, note: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockInvestigateJob(id, note));
    try {
      return await request<{ success: boolean }>(`/jobs/${encodeURIComponent(id)}/investigate`, {
        method: 'POST',
        body: JSON.stringify({ note })
      });
    } catch {
      return mockInvestigateJob(id, note);
    }
  },

  // Payments
  getPayments: async (
    params: { page?: number; limit?: number; status?: string; plan?: string; search?: string } = {}
  ): Promise<{ data: PaymentSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockPayments(params));
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.plan) query.set('plan', params.plan);
      if (params.search) query.set('search', params.search);
      return await request<{ data: PaymentSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/payments?${query.toString()}`
      );
    } catch {
      return getMockPayments(params);
    }
  },

  getPaymentDetail: async (id: string): Promise<PaymentDetail> => {
    if (mockModeEnabled) return Promise.resolve(getMockPaymentDetail(id));
    try {
      return await request<PaymentDetail>(`/payments/${encodeURIComponent(id)}`);
    } catch {
      return getMockPaymentDetail(id);
    }
  },

  reconcilePayment: async (
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; credits_granted?: number; already_granted?: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockReconcilePayment(id, reason));
    try {
      return await request<{ success: boolean; message: string; credits_granted?: number; already_granted?: boolean }>(
        `/payments/${encodeURIComponent(id)}/reconcile`,
        {
          method: 'POST',
          body: JSON.stringify({ reason })
        }
      );
    } catch {
      return mockReconcilePayment(id, reason);
    }
  },

  investigatePayment: async (id: string, note: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockInvestigatePayment(id, note));
    try {
      return await request<{ success: boolean }>(`/payments/${encodeURIComponent(id)}/investigate`, {
        method: 'POST',
        body: JSON.stringify({ note })
      });
    } catch {
      return mockInvestigatePayment(id, note);
    }
  },

  // Credits
  getCredits: async (
    params: { page?: number; limit?: number; type?: string; business_id?: string } = {}
  ): Promise<{ data: CreditLedgerEntry[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockCredits(params));
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.type) query.set('type', params.type);
      if (params.business_id) query.set('business_id', params.business_id);
      return await request<{ data: CreditLedgerEntry[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/credits?${query.toString()}`
      );
    } catch {
      return getMockCredits(params);
    }
  },

  // Safety
  getSafety: async (page = 1, limit = 25): Promise<SafetyOverview> => {
    if (mockModeEnabled) return Promise.resolve(getMockSafety(page, limit));
    try {
      return await request<SafetyOverview>(`/safety?page=${page}&limit=${limit}`);
    } catch {
      return getMockSafety(page, limit);
    }
  },

  addSafetyNote: async (business_id: string, note: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockAddSafetyNote(business_id, note));
    try {
      return await request<{ success: boolean }>('/safety/notes', {
        method: 'POST',
        body: JSON.stringify({ business_id, note })
      });
    } catch {
      return mockAddSafetyNote(business_id, note);
    }
  },

  // Deletions
  getDeletions: async (): Promise<{ data: DeletionRequestItem[] }> => {
    if (mockModeEnabled) return Promise.resolve(getMockDeletions());
    try {
      return await request<{ data: DeletionRequestItem[] }>('/deletions');
    } catch {
      return getMockDeletions();
    }
  },

  retryDeletion: async (businessId: string): Promise<{ success: boolean; message: string }> => {
    if (mockModeEnabled) return Promise.resolve(mockRetryDeletion(businessId));
    try {
      return await request<{ success: boolean; message: string }>(`/deletions/${encodeURIComponent(businessId)}/retry`, {
        method: 'POST'
      });
    } catch {
      return mockRetryDeletion(businessId);
    }
  },

  reviewDeletion: async (businessId: string, note?: string): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockReviewDeletion(businessId, note));
    try {
      return await request<{ success: boolean }>(`/deletions/${encodeURIComponent(businessId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ note })
      });
    } catch {
      return mockReviewDeletion(businessId, note);
    }
  },

  // Support
  getSupportNotes: async (
    params: { page?: number; limit?: number; business_id?: string; resolved?: string } = {}
  ): Promise<{ data: SupportNoteItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockSupportNotes(params));
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.business_id) query.set('business_id', params.business_id);
      if (params.resolved) query.set('resolved', params.resolved);
      return await request<{ data: SupportNoteItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/support?${query.toString()}`
      );
    } catch {
      return getMockSupportNotes(params);
    }
  },

  addSupportNote: async (business_id: string, issue: string, note: string): Promise<{ success: boolean; id: string }> => {
    if (mockModeEnabled) return Promise.resolve(mockAddSupportNote(business_id, issue, note));
    try {
      return await request<{ success: boolean; id: string }>('/support', {
        method: 'POST',
        body: JSON.stringify({ business_id, issue, note })
      });
    } catch {
      return mockAddSupportNote(business_id, issue, note);
    }
  },

  updateSupportNote: async (id: string, resolved: boolean): Promise<{ success: boolean }> => {
    if (mockModeEnabled) return Promise.resolve(mockUpdateSupportNote(id, resolved));
    try {
      return await request<{ success: boolean }>(`/support/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved })
      });
    } catch {
      return mockUpdateSupportNote(id, resolved);
    }
  },

  // Settings
  getSettings: async (): Promise<SettingsData> => {
    if (mockModeEnabled) return Promise.resolve(getMockSettings());
    try {
      return await request<SettingsData>('/settings');
    } catch {
      return getMockSettings();
    }
  },

  // Audit Logs
  getAuditLogs: async (
    page = 1,
    limit = 25
  ): Promise<{ data: AuditLogItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    if (mockModeEnabled) return Promise.resolve(getMockAuditLogs(page, limit));
    try {
      return await request<{ data: AuditLogItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(
        `/audit-logs?page=${page}&limit=${limit}`
      );
    } catch {
      return getMockAuditLogs(page, limit);
    }
  }
};
