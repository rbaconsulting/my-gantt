export interface PoolData {
  name: string;
  weeklyHours: number;
  standardWeekHours: number; // Standard work week hours (default: 40)
  supportHours: number; // Reserved hours for support activities
  meetingHours: number; // Reserved hours for weekly meetings
  description: string;
  color?: string;
  lastModified?: string; // ISO timestamp
}

export interface ProjectFormData {
  name: string;
  sponsor: string;
  pool: string;
  startDate: string;
  targetDate: string;
  estimatedHours: number;
  progress: number;
  status?: string;
  weeklyAllocation?: number; // percent of 40-hour week
  notes?: string;
  autoRecalculated?: boolean; // Flag to indicate if target date was auto-calculated
  lastModified?: string; // ISO timestamp
}
 