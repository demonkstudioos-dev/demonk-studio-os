'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          projects (name, budget)
        `)
        .order('due_date', { ascending: true });

      if (!error) setPayments(data || []);
      setLoading(false);
    };

    fetchPayments();
  }, []);

  const statusColors: any = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    PARTIAL: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    OVERDUE: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const stats = {
    totalExpected: payments.reduce((acc, p) => acc + p.amount, 0),
    received: payments.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0),
    pending: payments.filter(p => p.status === 'PENDING' || p.status === 'PARTIAL').reduce((acc, p) => acc + p.amount, 0),
    overdue: payments.filter(p => p.status === 'OVERDUE').reduce((acc, p) => acc + p.amount, 0),
    overdueCount: payments.filter(p => p.status === 'OVERDUE').length
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payments & Invoicing</h1>
          <p className="text-slate-500 mt-1">Monitor accounts receivable and project cash flow.</p>
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 md:col-span-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Total Expected Revenue</p>
          <div className="flex items-center justify-between">
            <div className="text-5xl font-bold tracking-tighter">{formatCurrency(stats.totalExpected)}</div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <IndianRupee className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-6">
             <div>
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Received</p>
               <p className="text-lg font-bold">{formatCurrency(stats.received)}</p>
             </div>
             <div className="w-px h-10 bg-white/10" />
             <div>
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pending</p>
               <p className="text-lg font-bold">{formatCurrency(stats.pending)}</p>
             </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Overdue Amount</p>
           <div className="text-3xl font-bold text-rose-600 mb-4">{formatCurrency(stats.overdue)}</div>
           <p className="text-xs text-slate-500 font-medium">{stats.overdueCount} invoices require immediate attention.</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Record</p>
           <div className="text-3xl font-bold text-slate-900 mb-4">{payments.length > 0 ? formatDate(payments[0].due_date) : 'N/A'}</div>
           <p className="text-xs text-slate-500 font-medium">Tracking all financial cycles.</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <h3 className="text-xl font-bold text-slate-900">Payment History</h3>
           <div className="flex gap-3">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Project name..." className="pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5" />
             </div>
             <button className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <Filter className="w-5 h-5" />
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4].map(i => <tr key={i} className="h-20 animate-pulse" />)
              ) : payments.map((payment) => (
                 <tr key={payment.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{payment.projects?.name}</p>
                          <p className="text-xs text-slate-400 font-medium">Inv #PAY-{payment.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                         <Calendar className="w-4 h-4 text-slate-300" />
                         {formatDate(payment.due_date)}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        statusColors[payment.status]
                       )}>
                         {payment.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-lg font-bold text-slate-900 tracking-tight">{formatCurrency(payment.amount)}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Budget: {formatCurrency(payment.projects?.budget || 0)}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                         <button className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">View Details</button>
                         <button className="p-2 text-slate-400 hover:text-slate-900 rounded-xl">
                           <MoreVertical className="w-5 h-5" />
                         </button>
                       </div>
                    </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
