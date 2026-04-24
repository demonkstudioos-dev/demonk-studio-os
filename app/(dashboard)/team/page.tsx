'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { UserProfile, Team } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  TrendingUp, 
  Star,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Activity,
  MoreVertical,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TeamPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    email: '',
    role: 'TEAM_MEMBER',
    hourly_rate: 50
  });

  const fetchTeam = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: true });

    if (!error) setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchTeam();
    };
    init();
  }, [fetchTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // In a real app, you can't create Auth users from client side without a service key.
    // We assume the user already exists in auth.users (created via Supabase Dashboard)
    // and we're just creating the profile entry here using their ID.
    // If ID is not provided, we might have issues, so we'll allow entering an explicit ID.
    const { error } = await supabase
      .from('profiles')
      .upsert([formData]);

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ id: '', full_name: '', email: '', role: 'TEAM_MEMBER', hourly_rate: 50 });
      fetchTeam();
    }
    setIsSubmitting(false);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <ShieldCheck className="w-4 h-4 text-rose-500" />;
      case 'PROJECT_MANAGER': return <Shield className="w-4 h-4 text-indigo-500" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const stats = {
    totalMembers: users.length,
    activeCount: Math.ceil(users.length * 0.7),
    avgUtilization: '82%',
    monthlyCost: users.reduce((acc, u) => acc + (u.hourly_rate * 160), 0)
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Team Operations</h1>
          <p className="text-slate-500 mt-1">Monitor human capital, utilization, and cost contribution.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Invite Member
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
                <h2 className="text-2xl font-bold text-slate-900">Add Team Member</h2>
                <p className="text-slate-500 mt-1">Define professional credentials and operational role.</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Unique User ID (from Supabase Auth)</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter Supabase Auth UID..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    value={formData.id}
                    onChange={e => setFormData({...formData, id: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 px-1 italic">Note: User must be created in your Supabase Auth dashboard first.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Operating Role</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="TEAM_MEMBER">Team Member</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Hourly Rate (INR)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.hourly_rate}
                      onChange={e => setFormData({...formData, hourly_rate: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 font-display"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
          <div className="text-3xl font-bold text-slate-900">{stats.totalMembers}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Now</p>
          <div className="text-3xl font-bold text-emerald-600">{stats.activeCount}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Utilization</p>
          <div className="text-3xl font-bold text-indigo-600">{stats.avgUtilization}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Cost / Month</p>
          <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.monthlyCost)}</div>
        </div>
      </div>

      {/* Content Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white px-2 py-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search profiles, roles, skills..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           {['All', 'Admin', 'Manager', 'Team'].map(f => (
             <button key={f} className={cn(
               "px-4 py-2 rounded-lg text-xs font-bold transition-all",
               f === 'All' ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-500 hover:bg-slate-50"
             )}>{f}</button>
           ))}
        </div>
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-[320px] bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((user) => (
            <motion.div
              layout
              key={user.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col items-center text-center relative pointer-events-auto cursor-pointer"
            >
              <div className="absolute top-4 right-4">
                <button className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar Section */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-[32px] bg-slate-100 p-1 border-2 border-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-500 relative">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover rounded-[28px]" />
                  ) : (
                    <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-2xl font-bold text-white rounded-[28px]">
                      {user.full_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-emerald-500">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-1 mb-8">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.full_name}</h3>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400">
                  {getRoleIcon(user.role)}
                  <span className="uppercase tracking-widest">{user.role.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="w-full grid grid-cols-2 gap-4 py-4 border-t border-slate-50 mb-6">
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</p>
                   <p className="text-sm font-bold text-slate-900">{formatCurrency(user.hourly_rate)}/hr</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Util</p>
                   <p className="text-sm font-bold text-indigo-600">85%</p>
                </div>
              </div>

              {/* Actions */}
              <button className="w-full py-3 bg-slate-50 text-slate-900 rounded-2xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" />
                View Productivity
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
