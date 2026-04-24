'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { motion } from 'motion/react';
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Camera,
  Mail,
  Briefcase,
  IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('PROFILE');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        console.error('Settings fetch error:', err);
        if (err.message === 'Failed to fetch') {
          // Soft failure for settings background load
          console.warn('Network issue: Could not load settings.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        hourly_rate: profile.hourly_rate
      })
      .eq('id', profile.id);

    if (!error) {
      alert('Settings saved successfully!');
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">System Settings</h1>
        <p className="text-slate-500 mt-1">Manage your professional identity and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {[
            { id: 'PROFILE', label: 'My Profile', icon: User },
            { id: 'SECURITY', label: 'Security', icon: Lock },
            { id: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
            { id: 'PERMISSION', label: 'Roles & Access', icon: Shield },
            profile?.role === 'ADMIN' && { id: 'DATA', label: 'Maintenance', icon: Database },
          ].filter(Boolean).map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === item.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-500 mt-1">Update your profile details and professional rate.</p>
              </div>

              <div className="p-8 space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                      {profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                      ) : (
                        <div className="text-3xl font-bold text-slate-300">{profile?.full_name.charAt(0)}</div>
                      )}
                    </div>
                    <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-400 hover:text-slate-900 transition-all">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Profile Photo</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">PNG or JPG, Max 5MB</p>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Identity</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile?.full_name || ''}
                        onChange={(e) => setProfile(p => p ? { ...p, full_name: e.target.value } : null)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={profile?.email || ''} 
                        disabled
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm outline-none cursor-not-allowed opacity-60 font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Current Role</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile?.role.replace('_', ' ') || ''} 
                        disabled
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm outline-none cursor-not-allowed opacity-60 font-medium uppercase tracking-widest"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Hourly Rate (INR)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={profile?.hourly_rate || 0}
                        onChange={(e) => setProfile(p => p ? { ...p, hourly_rate: Number(e.target.value) } : null)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Save className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'DATA' && profile?.role === 'ADMIN' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Maintenance & Data</h2>
                <p className="text-sm text-slate-500 mt-1">Tools for managing your demo environment.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Seed Sample Data</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Populate the app with a demo project, tasks, and finances.</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const { seedSampleData } = await import('@/lib/seed');
                    try {
                      await seedSampleData();
                      alert('Data seeded successfully! Refreshing dashboard...');
                      window.location.href = '/dashboard';
                    } catch (err: any) {
                      alert(`Seed failed: ${err.message}`);
                    }
                  }}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800"
                >
                  Seed Now
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'PROFILE' && activeTab !== 'DATA' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
              Coming soon...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
