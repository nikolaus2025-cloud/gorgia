import React from 'react';
import { Schedule, Agent } from '../types';
import { shifts } from '../data/shifts';
import { BarChart3, Users, Clock, TrendingUp } from 'lucide-react';

interface ScheduleSummaryProps {
  schedule: Schedule;
  agents: Agent[];
}

export function ScheduleSummary({ schedule, agents }: ScheduleSummaryProps) {
  const calculateSummary = () => {
    const summary = {
      totalAssignments: 0,
      shiftDistribution: {} as Record<string, number>,
      agentWorkload: {} as Record<string, number>,
      agentShiftTypes: {} as Record<string, { call: number; written: number; late: number }>,
    };

    Object.values(schedule).forEach(dayAssignments => {
      dayAssignments.forEach(assignment => {
        summary.totalAssignments++;
        
        const shiftName = shifts.find(s => s.id === assignment.shiftId)?.name || 'Unknown';
        summary.shiftDistribution[shiftName] = (summary.shiftDistribution[shiftName] || 0) + 1;
        
        const agentName = agents.find(a => a.id === assignment.agentId)?.name || 'Unknown';
        summary.agentWorkload[agentName] = (summary.agentWorkload[agentName] || 0) + 1;
        
        // Track shift types per agent
        if (!summary.agentShiftTypes[agentName]) {
          summary.agentShiftTypes[agentName] = { call: 0, written: 0, late: 0 };
        }
        
        const shift = shifts.find(s => s.id === assignment.shiftId);
        if (shift) {
          if (shift.type === 'call') {
            summary.agentShiftTypes[agentName].call++;
            if (shift.id === 'call-11-20' || shift.id === 'call-12-21') {
              summary.agentShiftTypes[agentName].late++;
            }
          } else {
            summary.agentShiftTypes[agentName].written++;
          }
        }
      });
    });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5" />
        Schedule Summary
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shift Distribution */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Shift Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(summary.shiftDistribution).map(([shift, count]) => (
              <div key={shift} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{shift}</span>
                <span className="text-sm font-medium text-gray-900">{count} assignments</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Workload */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent Workload
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(summary.agentWorkload)
              .sort(([,a], [,b]) => b - a)
              .map(([agent, count]) => (
                <div key={agent} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{agent}</span>
                  <span className="text-sm font-medium text-gray-900">{count} days</span>
                </div>
              ))}
          </div>
        </div>

        {/* Workload Balance */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Weekly Balance (Call vs Written Communication)
          </h3>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {Object.entries(summary.agentShiftTypes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([agent, types]) => (
                <div key={agent} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{agent}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Calls: {types.call}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Written: {types.written}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Late: {types.late}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total Assignments: <strong>{summary.totalAssignments}</strong></span>
          <span>Active Agents: <strong>{Object.keys(summary.agentWorkload).length}</strong></span>
        </div>
      </div>
    </div>
  );
}