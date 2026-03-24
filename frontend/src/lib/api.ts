const API_BASE = '/api/v1';

export interface Application {
  id: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_date_of_birth: string | null;
  applicant_annual_income: number | null;
  applicant_employment_status: string | null;
  applicant_employer_name: string | null;
  property_address_line1: string | null;
  property_address_line2: string | null;
  property_city: string | null;
  property_postcode: string | null;
  property_country: string | null;
  property_type: string | null;
  property_value: number | null;
  loan_amount: number;
  loan_term_months: number;
  loan_type: string;
  interest_rate: number | null;
  ltv_ratio: number | null;
  monthly_payment: number | null;
  status: string;
  decision: string | null;
  decision_reason: string | null;
  assigned_underwriter: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  by_status: Record<string, number>;
  avg_loan_amount: number;
  avg_ltv: number;
}

export interface AuditEvent {
  id: string;
  application_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Note {
  id: string;
  application_id: string;
  author: string;
  content: string;
  note_type: string;
  created_at: string;
}

export interface CreditCheck {
  id: string;
  application_id: string;
  credit_score: number;
  risk_band: string;
  provider: string;
  request_payload: string | null;
  response_payload: string | null;
  checked_at: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  uploaded_by: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  applications: {
    list: (params?: { status?: string; search?: string; sort_by?: string; sort_order?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      if (params?.sort_by) query.set('sort_by', params.sort_by);
      if (params?.sort_order) query.set('sort_order', params.sort_order);
      if (params?.page) query.set('page', String(params.page));
      return fetchApi<{ data: Application[]; total: number; page: number; limit: number }>(
        `/applications?${query}`
      );
    },
    get: (id: string) => fetchApi<Application>(`/applications/${id}`),
    create: (data: Partial<Application>) =>
      fetchApi<Application>('/applications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Application>) =>
      fetchApi<Application>(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    submit: (id: string) =>
      fetchApi<Application>(`/applications/${id}/submit`, { method: 'POST' }),
    decide: (id: string, decision: string, reason: string, underwriter: string) =>
      fetchApi<Application>(`/applications/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason, underwriter }),
      }),
    withdraw: (id: string) =>
      fetchApi<Application>(`/applications/${id}/withdraw`, { method: 'POST' }),
    startReview: (id: string, underwriter: string) =>
      fetchApi<Application>(`/applications/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ underwriter }),
      }),
    audit: (id: string) => fetchApi<{ data: AuditEvent[] }>(`/applications/${id}/audit`),
    stats: () => fetchApi<DashboardStats>('/applications/stats'),
  },
  notes: {
    list: (applicationId: string) =>
      fetchApi<{ data: Note[] }>(`/applications/${applicationId}/notes`),
    create: (applicationId: string, data: { author: string; content: string; note_type?: string }) =>
      fetchApi<Note>(`/applications/${applicationId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  creditCheck: {
    get: (applicationId: string) =>
      fetchApi<CreditCheck>(`/applications/${applicationId}/credit-check`),
    trigger: (applicationId: string) =>
      fetchApi<CreditCheck>(`/applications/${applicationId}/credit-check`, { method: 'POST' }),
  },
  documents: {
    list: (applicationId: string) =>
      fetchApi<{ data: DocumentRecord[] }>(`/applications/${applicationId}/documents`),
  },
};
