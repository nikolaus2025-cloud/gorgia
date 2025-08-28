import * as XLSX from 'xlsx';
import { Agent, Assignment, Schedule } from '../types';
import { shifts } from '../data/shifts';

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function exportWeeklyScheduleToExcel(
  schedule: Schedule,
  agents: Agent[],
  weekDates: string[],
  filename: string = 'weekly-schedule.xlsx'
): void {
  const shiftById = new Map(shifts.map(s => [s.id, s]));
  const agentById = new Map(agents.map(a => [a.id, a]));

  const rows: Array<Record<string, string | number>> = [];

  weekDates.forEach(dateStr => {
    const assignments: Assignment[] = schedule[dateStr] || [];
    if (assignments.length === 0) {
      rows.push({
        Date: dateStr,
        Day: formatDay(dateStr),
        Shift: '',
        Type: '',
        Start: '',
        End: '',
        Agent: '',
      });
      return;
    }

    assignments.forEach(a => {
      const shift = shiftById.get(a.shiftId);
      const agent = agentById.get(a.agentId);
      rows.push({
        Date: dateStr,
        Day: formatDay(dateStr),
        Shift: shift?.name || a.shiftId,
        Type: shift?.type || '',
        Start: shift?.startTime || '',
        End: shift?.endTime || '',
        Agent: agent?.name || a.agentId,
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Week');
  XLSX.writeFile(workbook, filename);
}


