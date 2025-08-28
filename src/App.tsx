import React, { useState, useEffect } from 'react';
import { Agent, Schedule, Assignment } from './types';
import { AgentManager } from './components/AgentManager';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ScheduleSummary } from './components/ScheduleSummary';
import { generateWeeklySchedule } from './utils/scheduleGenerator';
import { Calendar, Users, BarChart3, RefreshCw, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import { Login } from './components/Login';
import { fetchAgents, fetchAssignmentsForWeek, replaceWeekAssignments, upsertAgent, updateAgent as updateAgentDb, deleteAgent as deleteAgentDb } from './utils/db';

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  
  const [schedule, setSchedule] = useState<Schedule>({});
  const [session, setSession] = useState<any>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday;
  });
  const [activeTab, setActiveTab] = useState<'agents' | 'schedule' | 'summary'>('agents');
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      // Load agents and assignments when session or week changes
      loadData();
    }
  }, [session, currentWeekStart]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('getSession error', error);
      }
      setSession(data?.session ?? null);
    });
    const { data: sub, error: subError } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    if (subError) {
      // eslint-disable-next-line no-console
      console.error('onAuthStateChange error', subError);
    }
    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('unsubscribe error', e);
      }
    };
  }, []);

  const loadData = async () => {
    if (!session?.user?.id) return;
    setAppError(null);
    try {
      const userId = session.user.id as string;
      const [dbAgents, dbSchedule] = await Promise.all([
        fetchAgents(userId),
        fetchAssignmentsForWeek(userId, currentWeekStart),
      ]);
      setAgents(dbAgents);
      setSchedule(dbSchedule);
    } catch (e: any) {
      setAppError(e?.message || 'Failed to load data');
    }
  };

  const generateSchedule = async () => {
    setAppError(null);
    const newSchedule = generateWeeklySchedule(agents, currentWeekStart);
    setSchedule(newSchedule);
    if (session?.user?.id) {
      try {
        await replaceWeekAssignments(session.user.id, newSchedule, currentWeekStart);
      } catch (e: any) {
        setAppError(e?.message || 'Failed to save schedule');
      }
    }
  };

  const handleAddAgent = async (agent: Agent) => {
    if (session?.user?.id) {
      await upsertAgent(session.user.id, agent);
      await loadData();
    } else {
      setAgents(prev => [...prev, agent]);
    }
  };

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    if (session?.user?.id) {
      await updateAgentDb(session.user.id, updatedAgent);
      await loadData();
      // Regenerate the visible week's schedule so disabled agents are immediately excluded
      await generateSchedule();
    } else {
      setAgents(prev => prev.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ));
      await generateSchedule();
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (session?.user?.id) {
      await deleteAgentDb(session.user.id, agentId);
      await loadData();
    } else {
      setAgents(prev => prev.filter(agent => agent.id !== agentId));
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const handleUpdateDayAssignments = (date: string, assignments: Assignment[]) => {
    setSchedule(prev => ({
      ...prev,
      [date]: assignments,
    }));
  };

  const tabs = [
    { id: 'agents' as const, name: 'Agents', icon: Users },
    { id: 'schedule' as const, name: 'Schedule', icon: Calendar },
    { id: 'summary' as const, name: 'Summary', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {!isSupabaseConfigured && (
        <div className="max-w-2xl mx-auto mt-8 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
          Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and restart the dev server.
        </div>
      )}
      {!session ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Login onSignedIn={() => {}} />
        </main>
      ) : (
      <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Contact Center Scheduler</h1>
            </div>
            
            <button
              onClick={generateSchedule}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate Schedule
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              className="ml-3 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'agents' && (
          <AgentManager
            agents={agents}
            onAddAgent={handleAddAgent}
            onUpdateAgent={handleUpdateAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleCalendar
            schedule={schedule}
            agents={agents}
            weekStartDate={currentWeekStart}
            onWeekChange={handleWeekChange}
            onUpdateDayAssignments={handleUpdateDayAssignments}
          />
        )}

        {activeTab === 'summary' && (
          <ScheduleSummary schedule={schedule} agents={agents} />
        )}
      </main>
      </>
      )}
    </div>
  );
}

export default App;