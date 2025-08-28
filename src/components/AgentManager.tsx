import React, { useState } from 'react';
import { Agent } from '../types';
import { Plus, Edit3, Trash2, User } from 'lucide-react';

interface AgentManagerProps {
  agents: Agent[];
  onAddAgent: (agent: Agent) => void;
  onUpdateAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AgentManager({ agents, onAddAgent, onUpdateAgent, onDeleteAgent }: AgentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    daysOff: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const agent: Agent = {
      id: editingAgent?.id || Date.now().toString(),
      name: formData.name,
      daysOff: formData.daysOff,
      disabled: editingAgent?.disabled || false,
    };

    if (editingAgent) {
      onUpdateAgent(agent);
    } else {
      onAddAgent(agent);
    }

    setFormData({ name: '', daysOff: [] });
    setShowForm(false);
    setEditingAgent(null);
  };

  const startEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      daysOff: [...agent.daysOff],
    });
    setShowForm(true);
  };

  const toggleDayOff = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOff: prev.daysOff.includes(day)
        ? prev.daysOff.filter(d => d !== day)
        : [...prev.daysOff, day],
    }));
  };

  const cancelForm = () => {
    setFormData({ name: '', daysOff: [] });
    setShowForm(false);
    setEditingAgent(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5" />
          Agent Management
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">
            {editingAgent ? 'Edit Agent' : 'Add New Agent'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter agent name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Off (select 2 days)
              </label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDayOff(index)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.daysOff.includes(index)
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {formData.daysOff.length !== 2 && (
                <p className="text-sm text-orange-600 mt-1">
                  Please select exactly 2 days off
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formData.daysOff.length !== 2}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingAgent ? 'Update' : 'Add'} Agent
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{agent.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(agent)}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteAgent(agent.id)}
                  className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mb-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!agent.disabled}
                  onChange={(e) => onUpdateAgent({ ...agent, disabled: e.target.checked })}
                />
                Disabled (vacation)
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Days Off:</p>
              <div className="flex gap-1">
                {agent.daysOff.map(dayIndex => (
                  <span
                    key={dayIndex}
                    className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded"
                  >
                    {DAYS_OF_WEEK[dayIndex]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {agents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No agents added yet. Click "Add Agent" to get started.
        </div>
      )}
    </div>
  );
}