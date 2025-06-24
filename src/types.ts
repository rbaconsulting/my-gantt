export interface PoolData {
  name: string;
  weeklyHours: number;
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
  lastModified?: string; // ISO timestamp
}
 