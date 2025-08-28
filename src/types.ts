export interface Agent {
  id: string;
  name: string;
  daysOff: number[]; // 0 = Sunday, 1 = Monday, etc.
  disabled?: boolean; // when true, exclude from scheduling
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'call' | 'messaging' | 'comments';
  requiredAgents: number;
}

export interface Assignment {
  id: string;
  agentId: string;
  shiftId: string;
  date: string;
  dayOfWeek: number;
}

export interface Schedule {
  [date: string]: Assignment[];
}