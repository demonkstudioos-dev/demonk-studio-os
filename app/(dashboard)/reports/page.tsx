'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/format';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Briefcase, 
  IndianRupee, 
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  Target,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROFIT_DATA = [
  { month: 'Jan', revenue: 45000, costs: 32000, profit: 13000 },
  { month: 'Feb', revenue: 52000, costs: 34000, profit: 18000 },
  { month: 'Mar', revenue: 48000, costs: 31000, profit: 17000 },
  { month: 'Apr', revenue: 61000, costs: 38000, profit: 23000 },
  { month: 'May', revenue: 55000, costs: 35000, profit: 20000 },
  { month: 'Jun', revenue: 67000, costs: 41000, profit: 26000 },
];

const RESOURCE_DATA = [
  { name: 'UI Design', value: 45 },
  { name: 'Development', value: 30 },
  { name: 'Management', value: 15 },
  { name: 'Operations', value: 10 },
];

const COLORS = ['#0f172a', '#6366f1', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    costs: 0,
    profit: 0,
    margin: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: payments }, { data: expenses }, { data: tasks }, { data: timelogs }] = await Promise.all([
        supabase.from('payments').select('*').eq('status', 'COMPLETED'),
        supabase.from('expenses').select('*').in('status', ['APPROVED', 'PAID']),
        supabase.from('tasks').select('*'),
        supabase.from('timelogs').select('*')
      ]);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonthIndex = new Date().getMonth();
      
      const monthlyData = months.map((month, index) => {
        const monthRevenue = payments?.filter(p => new Date(p.paid_at || p.due_date).getMonth() === index)
          .reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
        
        const monthExpenses = expenses?.filter(e => new Date(e.date).getMonth() === index)
          .reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
        
        const monthLabor = timelogs?.filter(l => new Date(l.created_at).getMonth() === index)
          .reduce((acc, l) => acc + (l.cost_amount || 0), 0) || 0;
        
        const costs = monthExpenses + monthLabor;
        
        return {
          month,
          revenue: monthRevenue,
          costs,
          profit: monthRevenue - costs
        };
      }).slice(0, currentMonthIndex + 1);

      setProfitData(monthlyData);

      // Task Distribution by status
      const totalTasks = tasks?.length || 0;
      const statusCounts = tasks?.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const taskDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' '),
        value: count as number
      }));
      
      setResourceData(taskDistribution.length > 0 ? taskDistribution : [{ name: 'No Tasks', value: 0 }]);

      const totalRevenue = monthlyData.reduce((acc, d) => acc + d.revenue, 0);
      const totalCosts = monthlyData.reduce((acc, d) => acc + d.costs, 0);
      
      setMetrics({
        revenue: totalRevenue,
        costs: totalCosts,
        profit: totalRevenue - totalCosts,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Intelligence & Analytics</h1>
          <p className="text-slate-500 mt-1">Deep insights into profitability, productivity, and scaling.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold transition-all hover:bg-slate-50 shadow-sm">
            <Download className="w-5 h-5" />
            Download PDF
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95">
            <Calendar className="w-5 h-5" />
            Schedule Report
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportMetric label="Total Revenue" value={formatCurrency(metrics.revenue)} change="+12.5%" positive icon={TrendingUp} />
        <ReportMetric label="Operating costs" value={formatCurrency(metrics.costs)} change="+4.2%" positive={false} icon={Clock} />
        <ReportMetric label="Net Profit" value={formatCurrency(metrics.profit)} change="+18.3%" positive icon={IndianRupee} />
        <ReportMetric label="Profit Margin" value={`${Math.round(metrics.margin)}%`} change="+2.1%" positive icon={PieChartIcon} />
      </div>

      {/* Main Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profitability Trend */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Profitability Evolution</h3>
              <p className="text-sm text-slate-500 mt-1">Comparison between total revenue and operational costs.</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-slate-900" />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-indigo-500" />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Profit</span>
               </div>
            </div>
          </div>
          <div className="h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                    itemStyle={{ fontWeight: 700, fontSize: '14px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Resource Allocation */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Task Distribution</h3>
          <p className="text-sm text-slate-500 mb-8">Workspace items by current status.</p>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {resourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-8">
             {resourceData.map((item, idx) => (
               <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{item.value} tasks</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
            <Target className="w-8 h-8 text-indigo-400 mb-6" />
            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Efficiency Delta</h4>
            <div className="text-4xl font-bold mb-4">+{Math.round(metrics.margin)}%</div>
            <p className="text-xs text-white/40 leading-relaxed font-bold uppercase tracking-widest">Net margin performance against target.</p>
         </div>
         
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <TrendingUp className="w-8 h-8 text-emerald-500 mb-6" />
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Burn Rate Safety</h4>
            <div className="text-4xl font-bold text-slate-900 mb-4">90d</div>
            <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest">Est. Operational runway safety factor.</p>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="text-slate-900 text-xl font-bold mb-1 font-display">Performance Index</h4>
              <p className="text-sm text-slate-500 mb-8">Yield trend vs labor utilization.</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitData}>
                    <Bar dataKey="costs" fill="#f1f5f9" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8">
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold shadow-sm ring-1 ring-emerald-100">
                 <ArrowUpRight className="w-3 h-3" />
                 REAL-TIME
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, change, positive, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
          positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {change}
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tracking-tight font-display">{value}</p>
    </div>
  );
}
