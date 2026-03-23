import { z } from 'zod';

export const RiskBand = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
} as const;

export type RiskBandType = typeof RiskBand[keyof typeof RiskBand];

export const CreditCheckSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  credit_score: z.number().int().min(300).max(850),
  risk_band: z.enum(['low', 'medium', 'high', 'very_high']),
  provider: z.string().max(50),
  request_payload: z.record(z.unknown()).nullable(),
  response_payload: z.record(z.unknown()).nullable(),
  checked_at: z.string(),
  created_at: z.string(),
});

export interface CreditCheck {
  id: string;
  application_id: string;
  credit_score: number;
  risk_band: RiskBandType;
  provider: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  checked_at: string;
  created_at: string;
}

/**
 * Determine risk band from credit score.
 * - 720+: low
 * - 660-719: medium
 * - 600-659: high
 * - <600: very_high
 */
export function getRiskBand(creditScore: number): RiskBandType {
  if (creditScore >= 720) return RiskBand.LOW;
  if (creditScore >= 660) return RiskBand.MEDIUM;
  if (creditScore >= 600) return RiskBand.HIGH;
  return RiskBand.VERY_HIGH;
}
