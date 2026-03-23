import { z } from 'zod';

export const ApplicationStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  CONDITIONALLY_APPROVED: 'conditionally_approved',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
} as const;

export type ApplicationStatusType = typeof ApplicationStatus[keyof typeof ApplicationStatus];

export const LoanType = {
  FIXED: 'fixed',
  VARIABLE: 'variable',
  TRACKER: 'tracker',
  OFFSET: 'offset',
} as const;

export const PropertyType = {
  DETACHED: 'detached',
  SEMI_DETACHED: 'semi-detached',
  TERRACED: 'terraced',
  FLAT: 'flat',
  BUNGALOW: 'bungalow',
  NEW_BUILD: 'new-build',
} as const;

export const CreateApplicationSchema = z.object({
  applicant_first_name: z.string().min(1).max(100),
  applicant_last_name: z.string().min(1).max(100),
  applicant_email: z.string().email().max(255),
  applicant_phone: z.string().max(20).optional(),
  applicant_date_of_birth: z.string().optional(),
  applicant_annual_income: z.number().positive().optional(),
  applicant_employment_status: z.string().max(50).optional(),
  applicant_employer_name: z.string().max(200).optional(),
  property_address_line1: z.string().max(255).optional(),
  property_address_line2: z.string().max(255).optional(),
  property_city: z.string().max(100).optional(),
  property_postcode: z.string().max(20).optional(),
  property_country: z.string().max(100).optional(),
  property_type: z.string().max(50).optional(),
  property_value: z.number().positive().optional(),
  monthly_rent_or_mortgage: z.number().min(0).optional(),
  monthly_credit_commitments: z.number().min(0).optional(),
  monthly_living_costs: z.number().min(0).optional(),
  number_of_dependants: z.number().int().min(0).optional(),
  loan_amount: z.number().positive(),
  loan_term_months: z.number().int().min(12).max(480),
  loan_type: z.string().max(50).optional(),
});

export const UpdateApplicationSchema = CreateApplicationSchema.partial();

export const SubmitApplicationSchema = z.object({
  applicant_first_name: z.string().min(1).max(100),
  applicant_last_name: z.string().min(1).max(100),
  applicant_email: z.string().email().max(255),
  applicant_annual_income: z.coerce.number().positive(),
  property_value: z.coerce.number().positive(),
  property_address_line1: z.string().min(1).max(255),
  property_city: z.string().min(1).max(100),
  property_postcode: z.string().min(1).max(20),
  loan_amount: z.coerce.number().positive(),
  loan_term_months: z.coerce.number().int().min(12).max(480),
  monthly_rent_or_mortgage: z.coerce.number().min(0),
  monthly_credit_commitments: z.coerce.number().min(0),
  monthly_living_costs: z.coerce.number().min(0),
  number_of_dependants: z.coerce.number().int().min(0),
});

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
  monthly_rent_or_mortgage: number | null;
  monthly_credit_commitments: number | null;
  monthly_living_costs: number | null;
  number_of_dependants: number | null;
  loan_amount: number;
  loan_term_months: number;
  loan_type: string;
  interest_rate: number | null;
  ltv_ratio: number | null;
  monthly_payment: number | null;
  status: ApplicationStatusType;
  decision: string | null;
  decision_reason: string | null;
  assigned_underwriter: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
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

export interface Note {
  id: string;
  application_id: string;
  author: string;
  content: string;
  note_type: string;
  created_at: string;
}

export interface AffordabilityCheck {
  id: string;
  application_id: string;
  gross_monthly_income: number;
  declared_monthly_outgoings: number;
  mortgage_payment_current: number;
  mortgage_payment_stressed: number;
  dti_ratio_current: number;
  dti_ratio_stressed: number;
  verdict: string;
  verdict_reason: string | null;
  checked_at: string;
}

export interface AuditEvent {
  id: string;
  application_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
