import { Agent, Assignment, Shift, Schedule } from '../types';
import { shifts } from '../data/shifts';

interface AgentWeeklyStats {
  agentId: string;
  callDays: number;
  writtenDays: number; // messaging + comments
  lateDays: number;
  messagingDays: number;
  commentsDays: number;
  hasCommentsThisWeek: boolean; // Track if agent already did comments this week
}

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash | 0;
  }
  return Math.abs(hash);
}

export function generateWeeklySchedule(agents: Agent[], weekStartDate: Date): Schedule {
  const schedule: Schedule = {};
  const weekKey = new Date(weekStartDate);
  weekKey.setHours(0,0,0,0);
  const weekKeyStr = weekKey.toISOString().split('T')[0];
  const getRank = (agentId: string, contextKey: string): number => {
    return hashString(agentId + '|' + weekKeyStr + '|' + contextKey);
  };
  
  // Initialize weekly stats for each agent
  const weeklyStats: Record<string, AgentWeeklyStats> = {};
  agents.forEach(agent => {
    weeklyStats[agent.id] = {
      agentId: agent.id,
      callDays: 0,
      writtenDays: 0,
      lateDays: 0,
      messagingDays: 0,
      commentsDays: 0,
      hasCommentsThisWeek: false,
    };
  });

  // Generate schedule for 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(weekStartDate);
    currentDate.setDate(weekStartDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    
    // Get available agents for this day (excluding those with days off)
    const availableAgents = agents.filter(agent => !agent.disabled && !agent.daysOff.includes(dayOfWeek));
    
    if (availableAgents.length === 0) {
      schedule[dateStr] = [];
      continue;
    }
    
    const dayAssignments: Assignment[] = [];
    const remainingAgents = [...availableAgents];
    
    // Step 1: Assign Call 9:00-18:00 (exactly 3 agents)
    const call9to18 = shifts.find(s => s.id === 'call-9-18')!;
    const call9to18Agents = selectAgentsForCallShift(remainingAgents, weeklyStats, 3, (agentId) => getRank(agentId, `call-9-18:${dayOfWeek}`));
    call9to18Agents.forEach(agent => {
      dayAssignments.push(createAssignment(agent.id, call9to18.id, dateStr, dayOfWeek));
      weeklyStats[agent.id].callDays++;
      removeAgentFromPool(remainingAgents, agent.id);
    });

    // Step 2: Assign Comments 9:00-18:00 (exactly 1 agent, only if they haven't done comments this week)
    const comments9to18 = shifts.find(s => s.id === 'comments-9-18')!;
    const commentsAgents = selectAgentsForComments(remainingAgents, weeklyStats, 1, (agentId) => getRank(agentId, `comments-9-18:${dayOfWeek}`));
    commentsAgents.forEach(agent => {
      dayAssignments.push(createAssignment(agent.id, comments9to18.id, dateStr, dayOfWeek));
      weeklyStats[agent.id].writtenDays++;
      weeklyStats[agent.id].commentsDays++;
      weeklyStats[agent.id].hasCommentsThisWeek = true;
      removeAgentFromPool(remainingAgents, agent.id);
    });

    // Step 3: Assign late shifts (exactly 1 agent for 11-20, exactly 1 agent for 12-21)
    // Only assign to agents who haven't had a late shift this week
    const call11to20 = shifts.find(s => s.id === 'call-11-20')!;
    const call12to21 = shifts.find(s => s.id === 'call-12-21')!;
    
    // Assign Call 11:00-20:00 (exactly 1 agent)
    const call11to20Agents = selectAgentsForLateShift(remainingAgents, weeklyStats, 1, (agentId) => getRank(agentId, `call-11-20:${dayOfWeek}`));
    if (call11to20Agents.length >= 1) {
      dayAssignments.push(createAssignment(call11to20Agents[0].id, call11to20.id, dateStr, dayOfWeek));
      weeklyStats[call11to20Agents[0].id].callDays++;
      weeklyStats[call11to20Agents[0].id].lateDays++;
      removeAgentFromPool(remainingAgents, call11to20Agents[0].id);
    }
    
    // Assign Call 12:00-21:00 (exactly 1 agent)
    let call12to21Agents = selectAgentsForLateShift(remainingAgents, weeklyStats, 1, (agentId) => getRank(agentId, `call-12-21:${dayOfWeek}`));
    // If it's Sunday and no eligible agent without a prior late shift exists,
    // fall back to assigning the best available agent (to ensure Sunday coverage).
    if (call12to21Agents.length === 0 && dayOfWeek === 0 && remainingAgents.length > 0) {
      const sortedFallback = [...remainingAgents].sort((a, b) => {
        const statsA = weeklyStats[a.id];
        const statsB = weeklyStats[b.id];
        if (statsA.callDays !== statsB.callDays) {
          return statsA.callDays - statsB.callDays;
        }
        const callNeedA = Math.max(0, 3 - statsA.callDays);
        const callNeedB = Math.max(0, 3 - statsB.callDays);
        if (callNeedB !== callNeedA) {
          return callNeedB - callNeedA;
        }
        return getRank(a.id, `fallback-call-12-21:${dayOfWeek}`) - getRank(b.id, `fallback-call-12-21:${dayOfWeek}`);
      });
      call12to21Agents = sortedFallback.slice(0, 1);
    }
    if (call12to21Agents.length >= 1) {
      dayAssignments.push(createAssignment(call12to21Agents[0].id, call12to21.id, dateStr, dayOfWeek));
      weeklyStats[call12to21Agents[0].id].callDays++;
      weeklyStats[call12to21Agents[0].id].lateDays++;
      removeAgentFromPool(remainingAgents, call12to21Agents[0].id);
    }

    // Step 4: Assign ALL remaining agents to messaging
    const messaging9to18 = shifts.find(s => s.id === 'messaging-9-18')!;
    remainingAgents.forEach(agent => {
      dayAssignments.push(createAssignment(agent.id, messaging9to18.id, dateStr, dayOfWeek));
      weeklyStats[agent.id].writtenDays++;
      weeklyStats[agent.id].messagingDays++;
    });
    
    schedule[dateStr] = dayAssignments;
  }
  
  return schedule;
}

function selectAgentsForCallShift(
  availableAgents: Agent[], 
  weeklyStats: Record<string, AgentWeeklyStats>, 
  count: number,
  getRank: (agentId: string) => number
): Agent[] {
  // Prioritize agents who need more call days to reach their target of 3
  const sortedAgents = [...availableAgents].sort((a, b) => {
    const statsA = weeklyStats[a.id];
    const statsB = weeklyStats[b.id];
    
    // Primary: prefer agents with fewer call days
    if (statsA.callDays !== statsB.callDays) {
      return statsA.callDays - statsB.callDays;
    }
    
    // Secondary: prefer agents who need more call days to reach 3
    const callNeedA = Math.max(0, 3 - statsA.callDays);
    const callNeedB = Math.max(0, 3 - statsB.callDays);
    if (callNeedB !== callNeedA) {
      return callNeedB - callNeedA;
    }
    return getRank(a.id) - getRank(b.id);
  });
  
  return sortedAgents.slice(0, count);
}

function selectAgentsForComments(
  availableAgents: Agent[], 
  weeklyStats: Record<string, AgentWeeklyStats>, 
  count: number,
  getRank: (agentId: string) => number
): Agent[] {
  // Only select agents who haven't done comments this week
  const eligibleAgents = availableAgents.filter(agent => 
    !weeklyStats[agent.id].hasCommentsThisWeek
  );
  
  // Prioritize agents who need more written communication days to reach their target of 2
  const sortedAgents = [...eligibleAgents].sort((a, b) => {
    const statsA = weeklyStats[a.id];
    const statsB = weeklyStats[b.id];
    
    // Primary: prefer agents with fewer written days
    if (statsA.writtenDays !== statsB.writtenDays) {
      return statsA.writtenDays - statsB.writtenDays;
    }
    
    // Secondary: prefer agents who need more written days to reach 2
    const writtenNeedA = Math.max(0, 2 - statsA.writtenDays);
    const writtenNeedB = Math.max(0, 2 - statsB.writtenDays);
    if (writtenNeedB !== writtenNeedA) {
      return writtenNeedB - writtenNeedA;
    }
    return getRank(a.id) - getRank(b.id);
  });
  
  return sortedAgents.slice(0, count);
}

function selectAgentsForLateShift(
  availableAgents: Agent[], 
  weeklyStats: Record<string, AgentWeeklyStats>, 
  count: number,
  getRank: (agentId: string) => number
): Agent[] {
  // Only select agents who haven't had a late shift this week
  const eligibleAgents = availableAgents.filter(agent => 
    weeklyStats[agent.id].lateDays === 0
  );
  
  // Prefer agents who need more call days and haven't had late shifts
  const sortedAgents = [...eligibleAgents].sort((a, b) => {
    const statsA = weeklyStats[a.id];
    const statsB = weeklyStats[b.id];
    
    // Primary: prefer agents with fewer call days
    if (statsA.callDays !== statsB.callDays) {
      return statsA.callDays - statsB.callDays;
    }
    
    // Secondary: prefer agents who need more call days to reach 3
    const callNeedA = Math.max(0, 3 - statsA.callDays);
    const callNeedB = Math.max(0, 3 - statsB.callDays);
    if (callNeedB !== callNeedA) {
      return callNeedB - callNeedA;
    }
    return getRank(a.id) - getRank(b.id);
  });
  
  return sortedAgents.slice(0, count);
}

function createAssignment(agentId: string, shiftId: string, date: string, dayOfWeek: number): Assignment {
  return {
    id: `${date}-${agentId}-${shiftId}`,
    agentId,
    shiftId,
    date,
    dayOfWeek,
  };
}

function removeAgentFromPool(agentPool: Agent[], agentId: string): void {
  const index = agentPool.findIndex(agent => agent.id === agentId);
  if (index > -1) {
    agentPool.splice(index, 1);
  }
}

export function getShiftColor(shiftId: string): string {
  switch (shiftId) {
    case 'call-9-18':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'call-11-20':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'call-12-21':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'messaging-9-18':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'comments-9-18':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}