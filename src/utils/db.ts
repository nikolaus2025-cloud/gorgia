import { supabase } from './supabaseClient';
import { Agent, Assignment, Schedule } from '../types';

export async function fetchAgents(userId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, days_off, disabled')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    daysOff: (row.days_off || []) as number[],
    disabled: !!row.disabled,
  }));
}

export async function upsertAgent(userId: string, agent: Agent): Promise<void> {
  const payload = {
    id: agent.id && agent.id.length > 20 ? agent.id : undefined, // let DB generate when not uuid
    user_id: userId,
    name: agent.name,
    days_off: agent.daysOff,
    disabled: !!agent.disabled,
  } as any;
  const { error } = await supabase.from('agents').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateAgent(userId: string, agent: Agent): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .update({ name: agent.name, days_off: agent.daysOff, disabled: !!agent.disabled })
    .eq('id', agent.id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteAgent(userId: string, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('user_id', userId);
  if (error) throw error;
}

export function getWeekDates(weekStartDate: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(weekStartDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export async function fetchAssignmentsForWeek(userId: string, weekStartDate: Date): Promise<Schedule> {
  const dates = getWeekDates(weekStartDate);
  const start = dates[0];
  const end = dates[6];
  const { data, error } = await supabase
    .from('assignments')
    .select('id, agent_id, shift_id, date, day_of_week')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });
  if (error) throw error;
  const schedule: Schedule = {};
  (data || []).forEach(row => {
    const dateStr = row.date as string;
    if (!schedule[dateStr]) schedule[dateStr] = [];
    schedule[dateStr].push({
      id: row.id,
      agentId: row.agent_id,
      shiftId: row.shift_id,
      date: dateStr,
      dayOfWeek: row.day_of_week,
    });
  });
  return schedule;
}

export async function replaceWeekAssignments(userId: string, schedule: Schedule, weekStartDate: Date): Promise<void> {
  const dates = getWeekDates(weekStartDate);
  const start = dates[0];
  const end = dates[6];
  // Delete existing week assignments
  const { error: delError } = await supabase
    .from('assignments')
    .delete()
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);
  if (delError) throw delError;

  // Insert new
  const rows: any[] = [];
  dates.forEach(dateStr => {
    const assignments = schedule[dateStr] || [];
    assignments.forEach(a => {
      rows.push({
        user_id: userId,
        agent_id: a.agentId,
        shift_id: a.shiftId,
        date: dateStr,
        day_of_week: a.dayOfWeek,
      });
    });
  });
  if (rows.length === 0) return;
  const { error } = await supabase.from('assignments').insert(rows);
  if (error) throw error;
}


