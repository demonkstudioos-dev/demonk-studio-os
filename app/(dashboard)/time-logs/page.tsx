'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TimeLog, Task, Project, UserProfile } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '@/lib/utils/activity';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar, 
  Plus, 
  ChevronRight,
  Timer as TimerIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TimeLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualHours, setManualHours] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTask, setActiveTask] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch Profile for hourly rate
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    setProfile(profileData as UserProfile);

    const { data: logsData } = await supabase
      .from('timelogs')
      .select(`
        *,
        tasks (title, project_id, projects (name))
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['TODO', 'IN_PROGRESS'])
      .eq('assigned_to', session.user.id);

    setLogs(logsData || []);
    setTasks(tasksData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(manualHours);
    if (!activeTask || isNaN(hours) || hours <= 0) {
      alert("Please select a task and enter valid hours.");
      return;
    }

    setIsSubmitting(true);
    const durationSeconds = Math.round(hours * 3600);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const hourlyRate = profile?.hourly_rate || 0;
      const costAmount = hours * hourlyRate;

      const { error: logError } = await supabase.from('timelogs').insert({
        task_id: activeTask,
        user_id: session.user.id,
        duration_seconds: durationSeconds,
        cost_amount: costAmount,
        start_time: new Date(manualDate).toISOString(),
        end_time: new Date(manualDate).toISOString(),
        note: manualNote || 'Manual log entry',
        created_at: new Date(manualDate).toISOString()
      });

      if (logError) throw logError;

      // Update Task actuals
      const { data: task } = await supabase.from('tasks').select('title, actual_hours, cost_amount, project_id').eq('id', activeTask).single();
      if (task) {
        await supabase.from('tasks').update({
          actual_hours: (task.actual_hours || 0) + hours,
          cost_amount: (task.cost_amount || 0) + costAmount
        }).eq('id', activeTask);

        await logActivity({
          entity_type: 'TASK',
          entity_id: activeTask,
          project_id: task.project_id,
          action: 'UPDATE',
          message: `logged ${hours}h for task "${task.title}"`
        });
      }
      
      setManualHours('');
      setManualNote('');
      setActiveTask('');
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weeklyHours = logs.reduce((acc, log) => {
    const logDate = new Date(log.created_at);
    const now = new Date();
    const diff = now.getTime() - logDate.getTime();
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return acc + (log.duration_seconds / 3600);
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Time Tracking</h1>
          <p className="text-slate-500 mt-1">Log your working hours and monitor productivity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Manual Log Entry Card */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-900/20 lg:sticky lg:top-24 h-fit">
          <div className="flex items-center gap-3 mb-8 text-white/60">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Manual Time Entry</span>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Assign Task</label>
              <select 
                required
                value={activeTask}
                onChange={(e) => setActiveTask(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/40 text-white"
              >
                <option value="" className="text-slate-900">Select a task...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id} className="text-slate-900">{t.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Hours Logged</label>
                <input 
                  required
                  type="number" 
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/40 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Work Date</label>
                <input 
                  required
                  type="date" 
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/40 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Session Note</label>
              <textarea 
                placeholder="Briefly describe the work completed..."
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/40 text-white resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !activeTask || !manualHours}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              {isSubmitting ? 'Recording...' : 'Log Time Entry'}
            </button>
          </form>

          <div className="pt-8 mt-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Current Billing Rate: {formatCurrency(profile?.hourly_rate || 0)}/hr
            </p>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Recent Logs</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-slate-50/50" />)
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="p-6 flex items-center gap-6 hover:bg-slate-50/50 transition-all group">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{log.tasks?.projects?.name || 'Internal'}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{log.tasks?.title}</span>
                      </div>
                      <p className="font-bold text-slate-900 truncate">{log.note || 'Work session'}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(log.created_at)} • {Math.round(log.duration_seconds / 3600 * 10) / 10} hrs logged</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(log.cost_amount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-slate-200" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">No logs yet</h4>
                  <p className="text-slate-500 mt-2">Start a timer to begin tracking your work.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">This Week</h4>
                <div className="flex items-end justify-between">
                   <div className="text-4xl font-bold text-slate-900 tracking-tight">{Math.round(weeklyHours * 10) / 10} <span className="text-lg text-slate-400">hrs</span></div>
                   <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-900 flex items-center justify-center text-[10px] font-bold">
                    {Math.min(100, Math.round(weeklyHours / 40 * 100))}%
                   </div>
                </div>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Earnings Reflected</h4>
                <div className="text-4xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(weeklyHours * (profile?.hourly_rate || 0))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
