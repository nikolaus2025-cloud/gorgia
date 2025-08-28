import React, { useState } from 'react';
import { Schedule, Agent, Assignment } from '../types';
import { shifts } from '../data/shifts';
import { getShiftColor, formatDate } from '../utils/scheduleGenerator';
import { Calendar, ChevronLeft, ChevronRight, Edit, FileDown } from 'lucide-react';
import { ManualAssignmentModal } from './ManualAssignmentModal';
import { exportWeeklyScheduleToExcel } from '../utils/exportToExcel';

interface ScheduleCalendarProps {
  schedule: Schedule;
  agents: Agent[];
  weekStartDate: Date;
  onWeekChange: (direction: 'prev' | 'next') => void;
  onUpdateDayAssignments: (date: string, assignments: Assignment[]) => void;
}

export function ScheduleCalendar({ 
  schedule, 
  agents, 
  weekStartDate, 
  onWeekChange,
  onUpdateDayAssignments
}: ScheduleCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const getDatesForWeek = (startDate: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getDatesForWeek(weekStartDate);
  const weekRange = `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`;

  const handleExport = () => {
    exportWeeklyScheduleToExcel(schedule, agents, weekDates);
  };

  const getAgentName = (agentId: string) => {
    return agents.find(agent => agent.id === agentId)?.name || 'Unknown Agent';
  };

  const getShiftName = (shiftId: string) => {
    return shifts.find(shift => shift.id === shiftId)?.name || 'Unknown Shift';
  };

  const getShiftType = (shiftId: string) => {
    return shifts.find(shift => shift.id === shiftId)?.type || 'unknown';
  };

  const handleEditDay = (dateStr: string) => {
    setEditingDate(dateStr);
    setShowAssignmentModal(true);
  };

  const handleSaveAssignments = (assignments: Assignment[]) => {
    if (editingDate) {
      onUpdateDayAssignments(editingDate, assignments);
    }
  };

  const handleCloseModal = () => {
    setShowAssignmentModal(false);
    setEditingDate(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Schedule
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">{weekRange}</span>
            <div className="flex gap-2">
              <button
                onClick={() => onWeekChange('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => onWeekChange('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 border border-gray-200"
                title="Export weekly Excel"
                aria-label="Export weekly Excel"
              >
                <FileDown className="w-5 h-5" />
                <span className="text-sm font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((dateStr) => {
            const dayAssignments = schedule[dateStr] || [];
            const isSelected = selectedDate === dateStr;
            const availableAgentsCount = agents.filter(agent => 
              !agent.daysOff.includes(new Date(dateStr).getDay())
            ).length;
            
            return (
              <div
                key={dateStr}
                className={`border rounded-lg p-3 min-h-[200px] transition-all relative group ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 text-center flex-1">
                    {formatDate(dateStr)}
                  </div>
                  <button
                    onClick={() => handleEditDay(dateStr)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                    title="Edit assignments"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {dayAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`p-2 rounded-md border text-xs ${getShiftColor(assignment.shiftId)}`}
                    >
                      <div className="font-medium mb-1">
                        {getAgentName(assignment.agentId)}
                      </div>
                      <div className="text-xs opacity-75">
                        {getShiftName(assignment.shiftId)}
                      </div>
                    </div>
                  ))}
                  
                  {dayAssignments.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      No assignments
                    </div>
                  )}
                  
                  {availableAgentsCount > 0 && (
                    <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-200">
                      {availableAgentsCount} agents available
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
              <span className="text-gray-600">Call 9-18</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div>
              <span className="text-gray-600">Call 11-20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
              <span className="text-gray-600">Call 12-21</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
              <span className="text-gray-600">Messaging</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
              <span className="text-gray-600">Comments</span>
            </div>
          </div>
        </div>
      </div>

      <ManualAssignmentModal
        isOpen={showAssignmentModal}
        onClose={handleCloseModal}
        date={editingDate || ''}
        agents={agents}
        currentAssignments={editingDate ? schedule[editingDate] || [] : []}
        onSaveAssignments={handleSaveAssignments}
      />
    </>
  );
}