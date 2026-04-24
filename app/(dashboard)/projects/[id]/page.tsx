'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Project, Task, Expense, Payment, UserProfile } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  LayoutDashboard, 
  ListTodo, 
  GanttChart, 
  Coins, 
  Users, 
  History,
  Clock,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  UserPlus,
  Trash2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logActivity } from '@/lib/utils/activity';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'overview' | 'tasks' | 'timeline' | 'finance' | 'team' | 'activity';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data as UserProfile);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: projectData, error: pError }, { data: tasksData, error: tError }, { data: expensesData, error: eError }, { data: membersData, error: mError }, { data: profilesData, error: prError }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('tasks').select('*').eq('project_id', id),
        supabase.from('expenses').select('*').eq('project_id', id),
        supabase.from('project_members').select('*, profiles(*)').eq('project_id', id),
        supabase.from('profiles').select('*')
      ]);
      
      if (pError) console.error('Project fetch error:', pError);
      if (tError) console.error('Tasks fetch error:', tError);
      if (eError) console.error('Expenses fetch error:', eError);
      if (mError) console.error('Members fetch error:', mError);
      if (prError) console.error('Profiles fetch error:', prError);

      if (projectData) setProject(projectData);
      if (tasksData) setTasks(tasksData);
      if (expensesData) setExpenses(expensesData);
      if (membersData) setMembers(membersData);
      if (profilesData) setAllProfiles(profilesData);
    } catch (err) {
      console.error('Unexpected error during data fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchData();
    };
    init();
  }, [fetchData, fetchProfile]);

  const updateProjectStatus = async (newStatus: string) => {
    if (!project) return;
    setUpdating(true);
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
    if (!error) {
       await logActivity({
          entity_type: 'PROJECT',
          entity_id: project.id,
          project_id: project.id,
          action: 'STATUS_CHANGE',
          message: `changed project status to ${newStatus}`
       });
       fetchData();
    }
    setUpdating(false);
  };

  const addMember = async (userId: string, role: string) => {
    if (!project) return;
    setIsAddingMember(true);
    console.log('Adding member:', { projectId: project.id, userId, role });
    const { error } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: userId,
      role: role
    });

    if (error) {
      console.error('Error adding member:', error);
      alert(`Failed to add member: ${error.message}`);
    } else {
      console.log('Member added successfully');
      const selectedUser = allProfiles.find(p => p.id === userId);
      await logActivity({
        entity_type: 'PROJECT',
        entity_id: project.id,
        project_id: project.id,
        action: 'MEMBER_ADD',
        message: `added ${selectedUser?.full_name} to the project team`
      });
      await fetchData();
      setIsAddMemberModalOpen(false);
    }
    setIsAddingMember(false);
  };

  const removeMember = async (userId: string) => {
    if (!project) return;
    console.log('Removing member:', { projectId: project.id, userId });
    const { error } = await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', userId);
    
    if (error) {
      console.error('Error removing member:', error);
      alert(`Failed to remove member: ${error.message}`);
    } else {
      console.log('Member removed successfully');
      const selectedUser = allProfiles.find(p => p.id === userId);
      await logActivity({
        entity_type: 'PROJECT',
        entity_id: project.id,
        project_id: project.id,
        action: 'MEMBER_REMOVE',
        message: `removed ${selectedUser?.full_name} from the project team`
      });
      await fetchData();
    }
  };

  if (loading) return null;
  if (!project) return <div>Project not found</div>;

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'timeline', label: 'Timeline', icon: GanttChart },
    { id: 'finance', label: 'Finance', icon: Coins },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-8">
          <button 
            onClick={() => router.push('/projects')}
            className="mt-1 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-4 mb-4">
               <div className="relative group/status">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-2",
                    project.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                    project.status === 'ACTIVE' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {project.status}
                    {(profile?.role === 'ADMIN' || profile?.role === 'PROJECT_MANAGER') && <ChevronDown className="w-3 h-3" />}
                  </span>
                  {(profile?.role === 'ADMIN' || profile?.role === 'PROJECT_MANAGER') && (
                    <div className="absolute left-0 top-full mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 invisible group-hover/status:visible opacity-0 group-hover/status:opacity-100 transition-all z-20 overflow-hidden">
                      {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((s) => (
                        <button
                          key={s}
                          disabled={updating}
                          onClick={() => updateProjectStatus(s)}
                          className={cn(
                            "w-full px-4 py-2 text-left text-[10px] font-bold tracking-widest transition-colors hover:bg-slate-50",
                            project.status === s ? "text-indigo-600 bg-indigo-50/50" : "text-slate-600"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">• Created {formatDate(project.created_at)}</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display">{project.name}</h1>
            <p className="text-slate-600 mt-4 max-w-3xl leading-relaxed text-lg font-medium">{project.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all group",
                activeTab === tab.id 
                  ? "bg-white border border-slate-200 shadow-sm text-slate-900" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === tab.id ? "text-slate-900" : "text-slate-400")} />
              <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="tab-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabContent 
                tab={activeTab} 
                project={project} 
                tasks={tasks} 
                expenses={expenses} 
                members={members} 
                onUpdate={fetchData}
                canManage={profile?.role === 'ADMIN' || profile?.role === 'PROJECT_MANAGER'}
                onAddMember={() => setIsAddMemberModalOpen(true)}
                onRemoveMember={removeMember}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMemberModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Add Team Member</h2>
                <p className="text-sm text-slate-500 mt-1">Assign a member to this project.</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {allProfiles
                    .filter(p => !members.some(m => m.user_id === p.id))
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden relative">
                            {u.avatar_url ? <Image src={u.avatar_url} alt={u.full_name} fill className="object-cover" /> : u.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{u.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => addMember(u.id, u.role)}
                          disabled={isAddingMember}
                          className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {allProfiles.filter(p => !members.some(m => m.user_id === p.id)).length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic">All users are already assigned.</div>
                  )}
                </div>
                <button 
                  onClick={() => setIsAddMemberModalOpen(false)} 
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabContent({ tab, project, tasks, expenses, members, onUpdate, canManage, onAddMember, onRemoveMember }: { 
  tab: Tab; 
  project: Project; 
  tasks: Task[]; 
  expenses: Expense[]; 
  members: any[]; 
  onUpdate: () => void;
  canManage?: boolean;
  onAddMember?: () => void;
  onRemoveMember?: (id: string) => void;
}) {
  switch (tab) {
    case 'overview': return <ProjectOverview project={project} tasks={tasks} expenses={expenses} />;
    case 'tasks': return <ProjectTasks project={project} tasks={tasks} onUpdate={onUpdate} />;
    case 'timeline': return <ProjectTimeline project={project} tasks={tasks} />;
    case 'finance': return <ProjectFinance project={project} expenses={expenses} tasks={tasks} members={members} onUpdate={onUpdate} />;
    case 'team': return (
      <ProjectTeam 
        members={members} 
        canManage={canManage}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
      />
    );
    default: return <div className="p-12 text-center text-slate-400 font-medium">Coming soon...</div>;
  }
}

function ProjectOverview({ project, tasks, expenses }: { project: Project, tasks: Task[], expenses: Expense[] }) {
  const internalCost = tasks.reduce((acc, t) => acc + t.cost_amount, 0);
  const expenseCost = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalCost = internalCost + expenseCost;
  const progress = tasks.length > 0 ? (tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <h3 className="text-xl font-bold text-slate-900">Health Indicators</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className={cn("p-6 rounded-2xl border", totalCost > project.budget ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100")}>
            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", totalCost > project.budget ? "text-rose-600" : "text-emerald-600")}>Budget</p>
            <p className={cn("text-2xl font-bold", totalCost > project.budget ? "text-rose-900" : "text-emerald-900")}>
              {totalCost > project.budget ? 'Over' : 'On Track'}
            </p>
          </div>
          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Progress</p>
            <p className="text-2xl font-bold text-indigo-900">{Math.round(progress)}% Done</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{tasks.filter(t => t.status === 'DONE').length} / {tasks.length}</p>
          </div>
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Type</p>
            <p className="text-2xl font-bold text-amber-900">Active</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
        <h3 className="text-xl font-bold mb-6">Financial Intelligence</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2 text-white/60">
              <span>Consumed Budget</span>
              <span className="text-white font-bold">{formatCurrency(totalCost)} / {formatCurrency(project.budget)}</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn("h-full", totalCost > project.budget ? "bg-rose-400" : "bg-emerald-400")} 
                style={{ width: `${Math.min(100, (totalCost / project.budget) * 100)}%` }} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Internal Cost</p>
              <p className="text-lg font-bold">{formatCurrency(internalCost)}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Expenses</p>
              <p className="text-lg font-bold">{formatCurrency(expenseCost)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectTasks({ project, tasks, onUpdate }: { project: Project, tasks: Task[], onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    deadline: '',
    estimated_hours: 0
  });

  useEffect(() => {
    const fetchTeam = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setTeamMembers(data);
    };
    fetchTeam();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('tasks')
      .insert([{
        ...formData,
        project_id: project.id,
        status: 'TODO',
        actual_hours: 0,
        cost_amount: 0
      }]);

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ title: '', description: '', assigned_to: '', priority: 'MEDIUM', deadline: '', estimated_hours: 0 });
      onUpdate();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-slate-900">Tasks</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
            {tasks.length} Total
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden" >
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900">New Project Task</h2>
                <p className="text-slate-500 mt-1">Create a deliverable for this project.</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Task Title</label>
                  <input required placeholder="e.g. Design Logo Concepts" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assignee</label>
                    <select required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} >
                      <option value="">Select member...</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Priority</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Est. Hours</label>
                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900" value={formData.estimated_hours} onChange={e => setFormData({...formData, estimated_hours: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Deadline</label>
                    <input required type="date" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">{isSubmitting ? 'Creating...' : 'Create Task'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['TODO', 'IN_PROGRESS', 'DONE'].map(status => (
          <div key={status} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 min-h-[500px]">
            <div className="flex items-center justify-between mb-6 px-2">
              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status === 'TODO' ? 'bg-slate-300' : status === 'IN_PROGRESS' ? 'bg-indigo-500' : 'bg-emerald-500'
                )} />
                {status.replace('_', ' ')}
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            <div className="space-y-4">
              {tasks.filter(t => t.status === status).map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">{t.priority}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 mb-2 leading-tight">{t.title}</h5>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">{t.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {t.actual_hours}h / {t.estimated_hours}h
                      </div>
                      <div className="text-xs font-bold text-slate-400">
                        {formatDate(t.deadline)}
                      </div>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === status).length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No tasks</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectTimeline({ project, tasks }: { project: Project, tasks: Task[] }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-2">Project Schedule</h3>
      <p className="text-sm text-slate-500 mb-8">Visualization of tasks over time.</p>
      
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-900">{task.title}</span>
              <span className="text-xs font-mono text-slate-400">{formatDate(task.deadline)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                className={cn("h-full", task.status === 'DONE' ? 'bg-emerald-500' : 'bg-indigo-500')} 
                style={{ width: `${(task.actual_hours / Math.max(task.estimated_hours, 1)) * 100}%` }}
               />
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
           <div className="py-20 text-center text-slate-400 italic">No tasks scheduled yet.</div>
        )}
      </div>
    </div>
  );
}

function ProjectFinance({ project, expenses, tasks, members, onUpdate }: { project: Project, expenses: Expense[], tasks: Task[], members: any[], onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'SOFTWARE',
    date: new Date().toISOString().split('T')[0]
  });

  const memberCosts = members.map(m => {
    const userTasks = tasks.filter(t => t.assigned_to === m.user_id);
    const totalCost = userTasks.reduce((acc, t) => acc + (t.cost_amount || 0), 0);
    const totalHours = userTasks.reduce((acc, t) => acc + (t.actual_hours || 0), 0);
    return {
      userId: m.user_id,
      name: m.profiles?.full_name,
      cost: totalCost,
      hours: totalHours,
      role: m.role
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('expenses')
      .insert([{
        ...formData,
        project_id: project.id,
        user_id: session.user.id,
        status: 'APPROVED' // Project internal expenses are often pre-approved or logged by PM
      }]);

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      setFormData({
        description: '',
        amount: 0,
        category: 'SOFTWARE',
        date: new Date().toISOString().split('T')[0]
      });
      onUpdate();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Budget Utilization</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {project.budget > 0 ? Math.round((expenses.reduce((acc, e) => acc + (e.amount || 0), 0) + tasks.reduce((acc, t) => acc + (t.cost_amount || 0), 0)) / project.budget * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Labor</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(tasks.reduce((acc, t) => acc + (t.cost_amount || 0), 0))}
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expenses</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(expenses.reduce((acc, e) => acc + (e.amount || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Project Expenses</h3>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
                  <p className="text-sm text-slate-500 mt-1">This will be deducted from the project budget.</p>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Description</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Stock Assets"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Amount</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-900"
                        value={formData.amount || ''}
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                      />
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
                        <option value="VENDORS">Vendors</option>
                        <option value="MISC">Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">{isSubmitting ? 'Saving...' : 'Save Expense'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5 font-bold text-slate-900">{item.description}</td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium">{item.category}</td>
                  <td className="px-8 py-5 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-slate-400 italic">No expenses recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Member Costs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Resource Costs (Labor)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Hours Logged</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {memberCosts.map((m) => (
                <tr key={m.userId} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900">{m.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.role}</p>
                  </td>
                  <td className="px-8 py-5 text-right font-medium text-slate-600">{Math.round(m.hours * 10) / 10} hrs</td>
                  <td className="px-8 py-5 text-right font-bold text-slate-900">{formatCurrency(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProjectTeam({ members, canManage, onAddMember, onRemoveMember }: { members: any[], canManage?: boolean, onAddMember?: () => void, onRemoveMember?: (id: string) => void }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-slate-900 font-display uppercase tracking-wider">Assigned Members</h3>
        {canManage && (
          <button 
            onClick={onAddMember}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.user_id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 relative overflow-hidden">
                  {member.profiles?.avatar_url ? (
                    <Image src={member.profiles.avatar_url} alt={member.profiles.full_name || ""} fill className="object-cover" />
                  ) : member.profiles?.full_name?.charAt(0)}
               </div>
               <div>
                  <p className="font-bold text-slate-900">{member.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{member.role}</p>
               </div>
             </div>
             {canManage && (
               <button 
                onClick={() => onRemoveMember?.(member.user_id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             )}
          </div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 italic">No team members assigned yet.</div>
        )}
      </div>
    </div>
  );
}
