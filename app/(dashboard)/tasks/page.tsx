'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, Project, UserProfile } from '@/types';
import { formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  Layout,
  List as ListIcon,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

import Link from 'next/link';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
    priority: 'MEDIUM',
    deadline: ''
  });

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects (name),
        profiles:assigned_to (full_name)
      `)
      .order('deadline', { ascending: true });

    if (!error) setTasks(data || []);
    setLoading(false);
  }, []);

  const fetchMetadata = useCallback(async () => {
    const [{ data: projectsData }, { data: profilesData }] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('profiles').select('*')
    ]);
    if (projectsData) setProjects(projectsData);
    if (profilesData) setTeamMembers(profilesData);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchTasks();
      await fetchMetadata();
    };
    init();
  }, [fetchTasks, fetchMetadata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('tasks')
      .insert([{
        ...formData,
        status: 'TODO'
      }]);

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ title: '', description: '', project_id: '', assigned_to: '', priority: 'MEDIUM', deadline: '' });
      fetchTasks();
    }
    setIsSubmitting(false);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Tasks</h1>
          <p className="text-slate-500 mt-1">Manage and track your operational deliverables.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create Task
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
                <h2 className="text-2xl font-bold text-slate-900">Create New Task</h2>
                <p className="text-slate-500 mt-1">Assign deliverables to team members and projects.</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Task Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Design Homepage Wireframes"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Project Assignment</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.project_id}
                      onChange={e => setFormData({...formData, project_id: e.target.value})}
                    >
                      <option value="">Select project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assigned To</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                      value={formData.assigned_to}
                      onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                    >
                      <option value="">Select member...</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id} className="text-slate-900">{m.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Severity / Priority</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Deadline Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.deadline}
                      onChange={e => setFormData({...formData, deadline: e.target.value})}
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
                    {isSubmitting ? 'Creating...' : 'Launch Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
                statusFilter === status 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Details</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deadline</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <tr key={i} className="h-20 animate-pulse bg-slate-50/30" />)
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="group hover:bg-slate-50/50 transition-all cursor-pointer relative"
                  >
                    <td className="px-8 py-5">
                      <Link href={`/tasks/${task.id}`} className="absolute inset-0 z-0" />
                      <div className="flex items-center gap-4 relative z-10 pointer-events-none">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          task.status === 'DONE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400 group-hover:text-slate-900"
                        )}>
                          <Layout className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{task.title}</p>
                          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{task.projects?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 relative z-10">
                      <Link href={`/team/${task.assigned_to}`}  className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {task.profiles?.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{task.profiles?.full_name || 'Unassigned'}</span>
                      </Link>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        task.priority === 'HIGH' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                        task.priority === 'MEDIUM' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-slate-50 text-slate-600 border-slate-100"
                      )}>
                        {task.priority || 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        {formatDate(task.deadline)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        {getStatusIcon(task.status)}
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{task.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No tasks found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                      All your operational items and deliverables will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
