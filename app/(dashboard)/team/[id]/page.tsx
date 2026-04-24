'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Task, TimeLog } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Mail, 
  Briefcase, 
  Clock, 
  IndianRupee, 
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import Link from 'next/link';

export default function TeamMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [member, setMember] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: memberData, error: memberError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (memberError || !memberData) {
        console.error('Member not found');
        setLoading(false);
        return;
      }

      setMember(memberData);

      const [tasksRes, logsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('assigned_to', id).order('created_at', { ascending: false }),
        supabase.from('timelogs').select('*').eq('user_id', id).order('created_at', { ascending: false })
      ]);

      setTasks(tasksRes.data || []);
      setLogs(logsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return null;
  if (!member) return <div className="p-8 text-center text-slate-500">Team member doesn&apos;t exist.</div>;

  const totalHours = logs.reduce((acc, log) => acc + (log.duration_seconds / 3600), 0);
  const totalEarnings = totalHours * member.hourly_rate;
  const activeTasks = tasks.filter(t => t.status !== 'DONE').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Link 
        href="/team" 
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Team
      </Link>

      {/* Profile Header */}
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-500/20">
            {member.full_name.charAt(0)}
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{member.full_name}</h1>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                {member.role.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">Joined {formatDate(member.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span className="text-sm font-medium">{formatCurrency(member.hourly_rate)} / hour</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Grid */}
        <div className="lg:col-span-1 space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <StatSmall label="Total Hours" value={`${Math.round(totalHours * 10) / 10}h`} icon={Clock} color="indigo" />
            <StatSmall label="Active Tasks" value={activeTasks.toString()} icon={FileText} color="amber" />
            <StatSmall label="Earnings Capacity" value={formatCurrency(totalEarnings)} icon={TrendingUp} color="emerald" />
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6">Expertise Level</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-lg">Senior Specialist</p>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Top Contributor</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 w-[85%]" />
              </div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Efficiency Rating: 85%</p>
            </div>
          </div>
        </div>

        {/* Assignments & Performance */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Task Assignments</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.slice(0, 8).map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    task.status === 'DONE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {task.status === 'DONE' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{task.status.replace('_', ' ')} • Due {formatDate(task.deadline)}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180" />
                </Link>
              ))}
              {tasks.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic text-sm">No tasks assigned to this member.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Recent Time Logs</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{log.note || 'Work session'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(log.created_at)}</span>
                      <span className="text-sm font-bold text-indigo-600">{Math.round(log.duration_seconds / 3600 * 10) / 10}h</span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center text-slate-400 italic text-sm py-8">No work logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatSmall({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border", colors[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
