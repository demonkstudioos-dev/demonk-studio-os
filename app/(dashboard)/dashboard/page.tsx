'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile, Project, Task, Expense, Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  IndianRupee, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          setDbError(`Auth connection failed: ${sessionError.message}. Check your Supabase URL/Key.`);
          setLoading(false);
          return;
        }
        
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError || !profile) {
          console.error('Profile not found on dashboard:', profileError);
          setDbError('Profile not found. Please log out and log in again or check your Supabase tables.');
          setLoading(false);
          return;
        }

        setProfile(profile);

        // Fetch common data
        const { data: recentActivities, error: activitiesError } = await supabase
          .from('activity_logs')
          .select(`
            *,
            profiles:user_id (full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (activitiesError) {
          console.error('Activities fetch error:', activitiesError);
          // Don't block whole dashboard for activities
        }
        setActivities(recentActivities || []);

        // Fetch role-specific data with error handling
        const fetchStatsData = async () => {
          if (profile.role === 'ADMIN') {
            const [
              { data: projects, error: pErr }, 
              { data: expenses, error: eErr }, 
              { data: payments, error: payErr }, 
              { data: tasks, error: tErr }
            ] = await Promise.all([
              supabase.from('projects').select('*'),
              supabase.from('expenses').select('*'),
              supabase.from('payments').select('*'),
              supabase.from('tasks').select('*')
            ]);
            
            if (pErr || eErr || payErr || tErr) {
              setDbError('Error fetching some of your data. Check if your Supabase tables exist and RLS is configured.');
              return null;
            }

            // Calculate financial data by month for the chart
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const chartData = months.map(month => ({
              name: month,
              revenue: payments?.filter(p => {
                 const d = new Date(p.paid_at || p.due_date);
                 return months[d.getUTCMonth()] === month && p.status === 'COMPLETED';
              }).reduce((acc, p) => acc + p.amount, 0) || 0,
              costs: expenses?.filter(e => {
                 const d = new Date(e.created_at);
                 return months[d.getUTCMonth()] === month && (e.status === 'APPROVED' || e.status === 'PAID');
              }).reduce((acc, e) => acc + e.amount, 0) || 0
            })).slice(0, new Date().getUTCMonth() + 1);

            return {
              projects: projects || [],
              expenses: expenses || [],
              payments: payments || [],
              tasks: tasks || [],
              chartData: chartData.length > 0 ? chartData : [{ name: 'N/A', revenue: 0, costs: 0 }],
              totalRevenue: payments?.filter(p => p.status === 'COMPLETED').reduce((acc: number, p: any) => acc + p.amount, 0) || 0,
              totalExpenses: expenses?.filter(e => e.status === 'APPROVED' || e.status === 'PAID').reduce((acc: number, e: any) => acc + e.amount, 0) || 0,
              pendingPayments: payments?.filter((p: any) => p.status === 'PENDING').length || 0,
              activeProjects: projects?.filter((p: any) => p.status === 'ACTIVE').length || 0
            };
          } else if (profile.role === 'PROJECT_MANAGER') {
            const { data: projects, error: pErr } = await supabase.from('projects').select('*');
            const { data: tasks, error: tErr } = await supabase.from('tasks').select('*');
            if (pErr || tErr) {
               setDbError('Error fetching PM data.');
               return null;
            }
            return { projects: projects || [], tasks: tasks || [] };
          } else {
            const { data: tasks, error: tErr } = await supabase.from('tasks').select('*').eq('assigned_to', profile.id);
            const { data: timeLogs, error: tlErr } = await supabase.from('timelogs').select('*').eq('user_id', profile.id);
             if (tErr || tlErr) {
               setDbError('Error fetching team member data.');
               return null;
            }
            return { tasks: tasks || [], timeLogs: timeLogs || [] };
          }
        };

        const result = await fetchStatsData();
        if (result) setStats(result);

      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        if (err.message === 'Failed to fetch') {
          setDbError('Could not reach Supabase. This usually happens if the project is paused, the URL is wrong, or your internet is blocked. Check the browser console (F12) for more details.');
        } else {
          setDbError(`An unexpected error occurred: ${err.message || 'Check terminal logs'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time listener for new signals in a separate channel
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        () => {
          // Refresh activities on new signals
          supabase
            .from('activity_logs')
            .select('*, profiles:user_id (full_name)')
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
              if (data) setActivities(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (loading) return null;

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Database Connection Issue</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">{dbError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">
          Welcome back, {profile?.full_name.split(' ')[0]}
        </h1>
        <p className="text-slate-500 mt-1 font-medium tracking-tight">System intelligence report for your workspace.</p>
      </div>

      {profile?.role === 'ADMIN' && stats && <AdminDashboard stats={stats} activities={activities} />}
      {profile?.role === 'PROJECT_MANAGER' && stats && <PMDashboard stats={stats} activities={activities} />}
      {profile?.role === 'TEAM_MEMBER' && stats && <TeamDashboard stats={stats} user={profile} activities={activities} />}

      {/* Debug Info Overlay (Temporary for troubleshooting) */}
      <div className="fixed bottom-4 right-4 z-50 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl text-[10px] font-mono text-slate-500 max-w-xs transition-opacity hover:opacity-100 opacity-30">
        <p className="font-bold text-slate-900 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">System Diagnostics</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Supabase Config:</span>
            <span className={isSupabaseConfigured ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
              {isSupabaseConfigured ? "VALID" : "INVALID"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Auth Session:</span>
            <span className={profile ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
              {profile ? "ACTIVE" : "NONE"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>DB Records:</span>
            <span>{stats?.projects?.length || 0} Projects</span>
          </div>
          <div className="mt-2 text-[8px] leading-tight">
            If records are 0 but you expect data, ensure you ran the <code>supabase_setup.sql</code> in your Supabase SQL Editor.
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ stats, activities }: { stats: any, activities: any[] }) {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)} 
          change={`${stats.payments?.filter((p: any) => p.status === 'COMPLETED').length || 0} completed`} 
          positive 
          icon={IndianRupee} 
          color="blue"
        />
        <StatCard 
          label="Total Expenses" 
          value={formatCurrency(stats.totalExpenses)} 
          change={`${stats.expenses?.filter((e: any) => e.status === 'APPROVED' || e.status === 'PAID').length || 0} approved`} 
          positive={false} 
          icon={TrendingDown} 
          color="red"
        />
        <StatCard 
          label="Active Projects" 
          value={stats.activeProjects} 
          change={`${stats.projects?.length || 0} total`} 
          positive 
          icon={Briefcase} 
          color="indigo"
        />
        <StatCard 
          label="Pending Items" 
          value={stats.pendingPayments} 
          change="Payments awaiting" 
          positive={false} 
          icon={Clock} 
          color="amber"
        />
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Financial Liquidity</h3>
                <p className="text-sm text-slate-500 mt-1">Global revenue vs operational overheads</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expenses</span>
                </div>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                    tickFormatter={(val) => `₹${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                    itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="costs" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 font-display">Recent Projects</h3>
              <button className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">View All</button>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.projects?.slice(0, 5).map((p: any) => (
                <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.status.replace('_', ' ')} • {formatDate(p.end_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(p.budget)}</p>
                    <div className="h-1 w-20 bg-slate-100 rounded-full mt-2 overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        p.status === 'ACTIVE' ? "bg-indigo-500 w-[60%]" : 
                        p.status === 'COMPLETED' ? "bg-emerald-500 w-full" : "bg-amber-400 w-[20%]"
                      )} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Activity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 font-display">Activity Feed</h3>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {activities.length > 0 ? activities.map((item, idx) => (
              <div key={item.id} className="relative pl-6 space-y-1">
                {idx !== activities.length - 1 && (
                  <div className="absolute left-1 top-4 bottom-[-32px] w-px bg-slate-100" />
                )}
                <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-slate-900" />
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {item.profiles?.full_name} <span className="font-medium text-slate-500">{item.message}</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{formatDate(item.created_at)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
            <button className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Clear Audit Log</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PMDashboard({ stats, activities }: { stats: any, activities: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* PM Cards */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-slate-900 font-display">Resource Overview</h3>
            <Briefcase className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-6">
            {stats.projects?.slice(0, 4).map((p: any) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{p.status}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[45%]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-slate-900 font-display">Critical Path</h3>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-4">
            {stats.tasks?.filter((t: any) => t.status !== 'DONE').slice(0, 5).map((t: any) => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    t.priority === 'HIGH' ? "bg-rose-500" : "bg-amber-500"
                  )} />
                  <p className="text-sm font-bold text-slate-900 leading-none">{t.title}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deadlines Sidebar */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-xl font-bold text-slate-900 font-display">Timeline</h3>
          <Calendar className="w-5 h-5 text-rose-500" />
        </div>
        <div className="space-y-8 flex-1">
          {stats.tasks?.filter((t: any) => {
            const d = new Date(t.deadline);
            return d >= new Date() && t.status !== 'DONE';
          }).sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 5).map((t: any) => (
            <div key={t.id} className="relative pl-6">
              <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-50" />
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{formatDate(t.deadline)}</p>
              <p className="text-sm font-bold text-slate-900 mt-1 leading-tight">{t.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Sidebar for PM */}
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
        <h3 className="font-bold text-white mb-8 flex items-center justify-between">
          <span>Activity</span>
          <Activity className="w-4 h-4 text-white/30" />
        </h3>
        <div className="space-y-6">
          {activities.slice(0, 6).map((item) => (
            <div key={item.id} className="space-y-1">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{formatDate(item.created_at)}</p>
              <p className="text-xs font-bold leading-relaxed">
                {item.profiles?.full_name.split(' ')[0]} {item.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamDashboard({ stats, user, activities }: { stats: any, user: UserProfile, activities: any[] }) {
  const weeklyHours = stats.timeLogs?.reduce((acc: number, log: any) => {
    const logDate = new Date(log.created_at);
    const now = new Date();
    const diff = now.getTime() - logDate.getTime();
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return acc + (log.duration_seconds / 3600);
    }
    return acc;
  }, 0) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* High Performance Cards */}
      <div className="lg:col-span-3 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PersonalMetric label="Pending Tasks" value={stats.tasks?.filter((t: any) => t.status !== 'DONE').length || 0} icon={CheckCircle2} />
          <PersonalMetric label="Weekly Logs" value={`${Math.round(weeklyHours * 10) / 10}h`} icon={Clock} />
          <PersonalMetric label="Yield Value" value={formatCurrency(weeklyHours * user.hourly_rate)} icon={IndianRupee} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 font-display">My Priority Stack</h3>
            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.tasks?.filter((t: any) => t.status !== 'DONE').length > 0 ? (
              stats.tasks.filter((t: any) => t.status !== 'DONE').map((t: any) => (
                <div key={t.id} className="p-8 flex items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110",
                    t.status === 'IN_PROGRESS' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{t.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.priority} • Due {formatDate(t.deadline)}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block shrink-0",
                      t.status === 'IN_PROGRESS' ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {t.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center">
                <CheckCircle2 className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-900">Level Cleared!</h3>
                <p className="text-slate-500 mt-2">You don&apos;t have any pending assignments.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/40">
           <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
             <TrendingUp className="w-8 h-8 text-indigo-400" />
           </div>
           <h3 className="text-2xl font-bold mb-4 font-display">Performance Velocity</h3>
           <p className="text-white/50 text-sm leading-relaxed mb-10 font-medium">Tracking workspace throughput and efficiency rating since last session.</p>
           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-[75%] shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
           </div>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-4">75% Efficacy target reached</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 font-display">Activity</h3>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-8">
            {activities.slice(0, 5).map((item) => (
              <div key={item.id} className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(item.created_at)}</p>
                <p className="text-xs font-bold leading-relaxed text-slate-900">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalMetric({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm group hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-bold text-slate-900 tracking-tight font-display">{value}</p>
    </div>
  );
}

function StatCard({ label, value, change, positive, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1",
          positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        )}>
          {change}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
