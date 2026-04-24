'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Project, UserProfile } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Users, 
  Clock,
  ArrowRight,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: 0,
    end_date: ''
  });
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    try {
      const { data: { session }, error: sError } = await supabase.auth.getSession();
      if (sError) throw sError;
      if (!session) return;

      const { data: profile, error: pError } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (pError) throw pError;
      setRole(profile?.role);

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members (user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error('Projects fetch error:', err);
      if (err.message === 'Failed to fetch') {
        alert('Connection Failed: Could not reach Supabase. Check your URL/Key and project status.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchProjects();
    };
    init();
  }, [fetchProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { 
          ...formData, 
          status: 'PLANNING',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', description: '', budget: 0, end_date: '' });
      fetchProjects();
    }
    setIsSubmitting(false);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Projects</h1>
          <p className="text-slate-500 mt-1">Manage and monitor all active operations.</p>
        </div>
        {(role === 'ADMIN' || role === 'PROJECT_MANAGER') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        )}
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
                <h2 className="text-2xl font-bold text-slate-900">Launch New Project</h2>
                <p className="text-slate-500 mt-1">Define the scope and resources for this operation.</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Project Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Website Redesign 2024"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Description</label>
                  <textarea 
                    required
                    placeholder="Briefly describe the project goals..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[100px]"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Target Budget</label>
                    <input 
                      required
                      type="number" 
                      placeholder="5000"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.budget}
                      onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Deadline</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
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
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
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
            placeholder="Search projects..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[280px] bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {viewMode === 'grid' ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={() => router.push(`/projects/${project.id}`)} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Members</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <ProjectRow key={project.id} project={project} onClick={() => router.push(`/projects/${project.id}`)} />
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No projects found</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            Try adjusting your search or create a new project to get started.
          </p>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project, onClick: () => void }) {
  const statusColors: any = {
    PLANNING: 'bg-blue-100 text-blue-700 border-blue-200',
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
    COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border", statusColors[project.status])}>
          {project.status.replace('_', ' ')}
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-900 transition-colors mb-2 line-clamp-1">{project.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] leading-relaxed">{project.description}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">Resources</span>
          <span className="text-slate-900 font-bold">12 / 18 Tasks</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 w-[65%]" />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold ring-1 ring-slate-100">
              U{i}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold ring-1 ring-slate-100">
            +5
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(project.budget)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectRow({ project, onClick }: { project: Project, onClick: () => void }) {
   const statusColors: any = {
    PLANNING: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    ON_HOLD: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-slate-100 text-slate-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
  };

  return (
    <tr 
      onClick={onClick}
      className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{project.name}</p>
            <p className="text-xs text-slate-500 truncate">Ends {formatDate(project.end_date)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusColors[project.status])}>
          {project.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
              U{i}
            </div>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-sm font-bold text-slate-900">{formatCurrency(project.budget)}</p>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex items-center gap-3">
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 w-[65%]" />
          </div>
          <span className="text-xs font-bold text-slate-500 w-8">65%</span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-all group-hover:translate-x-1" />
        </div>
      </td>
    </tr>
  );
}
