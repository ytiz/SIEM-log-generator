export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ISiemEvent {
  timestamp?: string;
  source?: string;
  eventType: string;
  assetId?: string;
  actor?: string;
  ip?: string;
  severity?: Severity;
  message: string;
  tags?: string[];
  payload?: Record<string, unknown>;
}