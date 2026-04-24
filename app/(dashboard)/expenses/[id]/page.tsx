'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense, Project, UserProfile } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  IndianRupee, 
  Calendar, 
  Tag, 
  Briefcase, 
  User,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (expenseError || !expenseData) {
        console.error('Expense not found');
        setLoading(false);
        return;
      }

      setExpense(expenseData);

      const [projectRes, creatorRes] = await Promise.all([
        expenseData.project_id ? supabase.from('projects').select('*').eq('id', expenseData.project_id).single() : Promise.resolve({ data: null }),
        supabase.from('profiles').select('*').eq('id', expenseData.user_id).single()
      ]);

      setProject(projectRes.data);
      setCreator(creatorRes.data);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return null;
  if (!expense) return <div className="p-8 text-center text-slate-500">Expense doesn&apos;t exist.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link 
        href="/expenses" 
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Expenses
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  expense.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                  expense.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-600' :
                  expense.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {expense.status}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {expense.category}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{expense.description}</h1>
              <p className="text-slate-500 mt-2">ID: {expense.id.slice(0, 8)}... • Logged on {formatDate(expense.created_at)}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
              <p className="text-5xl font-bold text-slate-900 tracking-tighter">{formatCurrency(expense.amount)}</p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Transaction Date</span>
            </div>
            <p className="font-bold text-slate-900">{formatDate(expense.date)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Briefcase className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Project Reference</span>
            </div>
            {project ? (
              <Link href={`/projects/${project.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                {project.name}
              </Link>
            ) : (
              <p className="font-bold text-slate-400 italic">None</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Submitted By</span>
            </div>
            <Link href={`/team/${creator?.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
              {creator?.full_name || 'Loading...'}
            </Link>
          </div>

          {expense.receipt_url && (
            <div className="lg:col-span-3 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Receipt Verified</p>
                  <p className="text-xs text-slate-500">Document attached to this transaction</p>
                </div>
              </div>
              <a 
                href={expense.receipt_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
              >
                View Attachment
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Payment Status Timeline</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Expense Logged</p>
                <p className="text-xs text-slate-500">{formatDate(expense.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                ['APPROVED', 'PAID'].includes(expense.status) ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
              )}>
                {['APPROVED', 'PAID'].includes(expense.status) ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Manager Approval</p>
                <p className="text-xs text-slate-500">{['APPROVED', 'PAID'].includes(expense.status) ? 'Verified' : 'Pending Review'}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                expense.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
              )}>
                {expense.status === 'PAID' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Funds Dispatched</p>
                <p className="text-xs text-slate-500">{expense.status === 'PAID' ? 'Transaction Completed' : 'Pending Payment'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-600/20">
          <AlertCircle className="w-8 h-8 text-indigo-200 mb-6" />
          <h3 className="text-xl font-bold mb-2">Budget Compliance</h3>
          <p className="text-indigo-100 text-sm leading-relaxed mb-6">
            This expense is associated with the {project?.name || 'General Operations'} budget. 
            All corporate expenses must adhere to the internal reimbursement policy and include a valid proof of purchase.
          </p>
          <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all backdrop-blur-sm border border-white/10 text-sm">
            Download Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}
