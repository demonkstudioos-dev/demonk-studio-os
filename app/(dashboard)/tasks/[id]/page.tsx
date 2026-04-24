'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, Project, UserProfile, TimeLog } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  Flag, 
  Activity, 
  IndianRupee,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { logActivity } from '@/lib/utils/activity';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [assignee, setAssignee] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !taskData) {
      console.error('Task not found');
      setLoading(false);
      return;
    }

    setTask(taskData);

    const [projectRes, assigneeRes, logsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', taskData.project_id).single(),
      taskData.assigned_to ? supabase.from('profiles').select('*').eq('id', taskData.assigned_to).single() : Promise.resolve({ data: null }),
      supabase.from('timelogs').select('*').eq('task_id', id).order('created_at', { ascending: false })
    ]);

    setProject(projectRes.data);
    setAssignee(assigneeRes.data);
    setLogs(logsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

  const updateTask = async (updates: Partial<Task>) => {
    if (!task) return;
    setUpdating(true);
    
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (!error) {
      if (updates.status) {
        await logActivity({
          entity_type: 'TASK',
          entity_id: task.id,
          project_id: task.project_id,
          action: 'STATUS_CHANGE',
          message: `changed status of task "${task.title}" to ${updates.status.replace('_', ' ')}`
        });
      }
      if (updates.priority) {
        await logActivity({
          entity_type: 'TASK',
          entity_id: task.id,
          project_id: task.project_id,
          action: 'UPDATE',
          message: `updated priority of task "${task.title}" to ${updates.priority}`
        });
      }
      fetchData();
    }
    setUpdating(false);
  };

  if (loading) return null;
  if (!task) return <div className="p-8 text-center text-slate-500">Task doesn&apos;t exist.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/tasks" 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Tasks
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative group/status">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 transition-all hover:bg-slate-50 shadow-sm active:scale-95">
              Status: {task.status.replace('_', ' ')}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 invisible group-hover/status:visible opacity-0 group-hover/status:opacity-100 transition-all z-20">
              {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((s) => (
                <button
                  key={s}
                  disabled={updating}
                  onClick={() => updateTask({ status: s as any })}
                  className={cn(
                    "w-full px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-slate-50",
                    task.status === s ? "text-indigo-600 bg-indigo-50/50" : "text-slate-600"
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group/priority">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 transition-all hover:bg-slate-50 shadow-sm active:scale-95">
              Priority: {task.priority}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 invisible group-hover/priority:visible opacity-0 group-hover/priority:opacity-100 transition-all z-20">
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <button
                  key={p}
                  disabled={updating}
                  onClick={() => updateTask({ priority: p as any })}
                  className={cn(
                    "w-full px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-slate-50",
                    task.priority === p ? "text-indigo-600 bg-indigo-50/50" : "text-slate-600"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                task.priority === 'URGENT' ? 'bg-rose-50 text-rose-600' :
                task.priority === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                {task.priority} Priority
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                task.status === 'DONE' ? 'bg-emerald-50 text-emerald-600' :
                task.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">{task.title}</h1>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Time Logs</h3>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                {logs.length} Entries
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.note || 'Work session'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{Math.round(log.duration_seconds / 3600 * 10) / 10}h</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{formatCurrency(log.cost_amount)}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic text-sm">No time logged yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Context */}
        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Task Metrics</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Cost</p>
                  <p className="text-2xl font-bold">{formatCurrency(task.cost_amount)}</p>
                </div>
                <IndianRupee className="w-6 h-6 text-emerald-400 opacity-50" />
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  <span>Hours Progress</span>
                  <span>{Math.round((task.actual_hours / Math.max(1, task.estimated_hours)) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (task.actual_hours / Math.max(1, task.estimated_hours)) * 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] text-white/40 font-bold mt-2 uppercase tracking-widest">
                  {task.actual_hours}h recorded / {task.estimated_hours}h estimated
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</p>
                <Link href={`/projects/${task.project_id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block">
                  {project?.name || 'Loading...'}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</p>
                <Link href={`/team/${task.assigned_to}`}  className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block">
                  {assignee?.full_name || 'Unassigned'}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deadline</p>
                <p className="text-sm font-bold text-slate-900">{formatDate(task.deadline)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
