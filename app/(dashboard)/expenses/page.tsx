'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense, Project } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  IndianRupee, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  MoreVertical,
  Download,
  Paperclip,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logActivity } from '@/lib/utils/activity';
import { UserProfile } from '@/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'SOFTWARE',
    project_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        projects (name),
        profiles (full_name)
      `)
      .order('date', { ascending: false });

    if (!error) setExpenses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData as UserProfile);
      }
      
      await fetchExpenses();
      const { data: projData } = await supabase.from('projects').select('*');
      if (projData) setProjects(projData);
    };
    init();
  }, [fetchExpenses]);

  const handleUpdateStatus = async (expenseId: string, newStatus: string) => {
    setUpdatingId(expenseId);
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const { error } = await supabase
      .from('expenses')
      .update({ status: newStatus })
      .eq('id', expenseId);

    if (!error) {
      await logActivity({
        entity_type: 'EXPENSE',
        entity_id: expenseId,
        project_id: expense.project_id,
        action: 'STATUS_CHANGE',
        message: `changed status of expense "${expense.description}" to ${newStatus}`
      });
      fetchExpenses();
    }
    setUpdatingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...formData,
        user_id: session.user.id,
        status: 'PENDING'
      }])
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else {
      if (data) {
        await logActivity({
          entity_type: 'EXPENSE',
          entity_id: data.id,
          project_id: data.project_id,
          action: 'CREATE',
          message: `logged a new expense: "${data.description}" for ${formatCurrency(data.amount)}`
        });
      }

      setIsModalOpen(false);
      setFormData({
        description: '',
        amount: 0,
        category: 'SOFTWARE',
        project_id: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
    }
    setIsSubmitting(false);
  };

  const statusColors: any = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const stats = {
    totalSpend: expenses.reduce((acc, e) => acc + e.amount, 0),
    pendingSpend: expenses.filter(e => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0),
    approvedSpend: expenses.filter(e => e.status === 'APPROVED' || e.status === 'PAID').reduce((acc, e) => acc + e.amount, 0),
    pendingCount: expenses.filter(e => e.status === 'PENDING').length
  };

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Expenses</h1>
            <p className="text-slate-500 mt-1">Track and manage project costs and internal spend.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Log Expense
          </button>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-900">Log New Expense</h2>
                  <p className="text-slate-500 mt-1">Record costs for software, travel, or project supplies.</p>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Description</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Adobe Creative Cloud License"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Amount</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                          value={formData.amount || ''}
                          onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Category</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="SOFTWARE">Software</option>
                        <option value="TRAVEL">Travel</option>
                        <option value="OPERATIONS">Operations</option>
                        <option value="VENDORS">Vendors</option>
                        <option value="MISC">Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Project (Optional)</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                        value={formData.project_id}
                        onChange={e => setFormData({...formData, project_id: e.target.value})}
                      >
                        <option value="">No Project (Internal)</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Date</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-100 shadow-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Recording...' : 'Log Expense'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Project Spend</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.totalSpend)}</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pending Approval</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.pendingSpend)}</span>
            <span className="text-amber-600 font-bold text-sm">{stats.pendingCount} items</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Approved & Paid</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(stats.approvedSpend)}</span>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search expenses, vendors, projects..." 
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expense & Project</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Claimant</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <tr key={i} className="h-20 animate-pulse bg-slate-50/30" />)
              ) : expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-900 border border-slate-100 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{expense.description}</p>
                          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{expense.projects?.name || 'Operational Spend'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-semibold text-slate-600">{expense.category}</p>
                      <p className="text-[10px] font-medium text-slate-400 tabular-nums">{formatDate(expense.date)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {expense.profiles?.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{expense.profiles?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        statusColors[expense.status]
                      )}>{expense.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-lg font-bold text-slate-900 tracking-tight">{formatCurrency(expense.amount)}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {profile?.role === 'ADMIN' && expense.status === 'PENDING' && (
                          <div className="relative group/status">
                            <button className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-900 transition-all hover:bg-slate-50 shadow-sm active:scale-95">
                              Decision
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 invisible group-hover/status:visible opacity-0 group-hover/status:opacity-100 transition-all z-20">
                              <button
                                disabled={updatingId === expense.id}
                                onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                                className="w-full px-4 py-2 text-left text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                disabled={updatingId === expense.id}
                                onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                                className="w-full px-4 py-2 text-left text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {profile?.role === 'ADMIN' && expense.status === 'APPROVED' && (
                          <button
                            disabled={updatingId === expense.id}
                            onClick={() => handleUpdateStatus(expense.id, 'PAID')}
                            className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
                          >
                            Mark Paid
                          </button>
                        )}
                        {expense.receipt_url && (
                          <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="View Receipt">
                            <Paperclip className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IndianRupee className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No expenses recorded</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                      All your financial records and claims will appear here once you log your first expense.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
           <p className="text-sm text-slate-500 font-medium">Showing <span className="text-slate-900 font-bold">{expenses.length}</span> results</p>
           <div className="flex gap-2">
             <button className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-400 cursor-not-allowed">Previous</button>
             <button className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-all shadow-sm">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}
