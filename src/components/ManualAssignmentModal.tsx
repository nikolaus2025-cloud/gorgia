import React, { useState, useEffect } from 'react';
import { Agent, Assignment, Shift } from '../types';
import { shifts } from '../data/shifts';
import { X, Save, User, Clock } from 'lucide-react';
import { getShiftColor } from '../utils/scheduleGenerator';

interface ManualAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  agents: Agent[];
  currentAssignments: Assignment[];
  onSaveAssignments: (assignments: Assignment[]) => void;
}

export function ManualAssignmentModal({
  isOpen,
  onClose,
  date,
  agents,
  currentAssignments,
  onSaveAssignments,
}: ManualAssignmentModalProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAssignments([...currentAssignments]);
      
      // Filter agents who are available on this day (not on their days off)
      const dayOfWeek = new Date(date).getDay();
      const available = agents.filter(agent => !agent.daysOff.includes(dayOfWeek));
      setAvailableAgents(available);
    }
  }, [isOpen, currentAssignments, agents, date]);

  const handleAssignShift = (agentId: string, shiftId: string) => {
    // Remove any existing assignment for this agent
    const filteredAssignments = assignments.filter(a => a.agentId !== agentId);
    
    // Add new assignment
    const newAssignment: Assignment = {
      id: `${date}-${agentId}-${shiftId}`,
      agentId,
      shiftId,
      date,
      dayOfWeek: new Date(date).getDay(),
    };
    
    setAssignments([...filteredAssignments, newAssignment]);
  };

  const handleRemoveAssignment = (agentId: string) => {
    setAssignments(prev => prev.filter(a => a.agentId !== agentId));
  };

  const getAgentAssignment = (agentId: string) => {
    return assignments.find(a => a.agentId === agentId);
  };

  const getShiftName = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId)?.name || 'Unknown Shift';
  };

  const getShiftType = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId)?.type || 'unknown';
  };

  const handleSave = () => {
    onSaveAssignments(assignments);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manual Assignment - {formatDate(date)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Available Agents */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Available Agents ({availableAgents.length})
              </h3>
              <div className="space-y-3">
                {availableAgents.map((agent) => {
                  const assignment = getAgentAssignment(agent.id);
                  return (
                    <div
                      key={agent.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        {assignment && (
                          <button
                            onClick={() => handleRemoveAssignment(agent.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {assignment ? (
                        <div className={`p-2 rounded-md text-sm ${getShiftColor(getShiftType(assignment.shiftId))}`}>
                          <div className="font-medium">
                            {getShiftName(assignment.shiftId)}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {shifts.map((shift) => (
                            <button
                              key={shift.id}
                              onClick={() => handleAssignShift(agent.id, shift.id)}
                              className={`p-2 rounded-md text-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors text-gray-600 hover:text-gray-800`}
                            >
                              Assign to {shift.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {availableAgents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No agents available on this day (all agents have this day off)
                  </div>
                )}
              </div>
            </div>

            {/* Shift Overview */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Shift Overview
              </h3>
              <div className="space-y-4">
                {shifts.map((shift) => {
                  const assignedAgents = assignments.filter(a => a.shiftId === shift.id);
                  const requiredCount = shift.requiredAgents > 0 ? shift.requiredAgents : 'Remaining';
                  
                  return (
                    <div
                      key={shift.id}
                      className={`border rounded-lg p-4 ${getShiftColor(shift.type)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{shift.name}</h4>
                        <span className="text-sm">
                          {assignedAgents.length} / {requiredCount}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {assignedAgents.map((assignment) => {
                          const agent = agents.find(a => a.id === assignment.agentId);
                          return (
                            <div
                              key={assignment.id}
                              className="text-sm bg-white bg-opacity-50 rounded px-2 py-1"
                            >
                              {agent?.name}
                            </div>
                          );
                        })}
                        
                        {assignedAgents.length === 0 && (
                          <div className="text-sm opacity-75">No agents assigned</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Assignments
          </button>
        </div>
      </div>
    </div>
  );
}