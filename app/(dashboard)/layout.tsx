'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { MissingConfig } from '@/components/missing-config';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  CreditCard, 
  Wallet, 
  Users, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  User as UserIcon,
  Timer
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
  { label: 'Projects', href: '/projects', icon: Briefcase, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
  { label: 'Time Logs', href: '/time-logs', icon: Timer, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
  { label: 'Expenses', href: '/expenses', icon: Wallet, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { label: 'Payments', href: '/payments', icon: CreditCard, roles: ['ADMIN'] },
  { label: 'Team', href: '/team', icon: Users, roles: ['ADMIN'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
  { label: 'Profile', href: '/profile', icon: UserIcon, roles: ['TEAM_MEMBER'] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        console.log('Profile missing, creating one...');
        // Auto-create profile if missing
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown User',
            role: 'TEAM_MEMBER', // Default role
            hourly_rate: 50 // Default rate
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }
        setUser(newProfile as UserProfile);
      } else {
        setUser(profile as UserProfile);
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  if (!isSupabaseConfigured) {
    return <MissingConfig />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <LayoutDashboard className="w-8 h-8 text-slate-900" />
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 shadow-sm",
          isSidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <AnimatePresence mode="wait">
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-bold text-slate-900 text-lg whitespace-nowrap"
                  >
                    demonk OS
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                  {isSidebarOpen && (
                    <span className="font-medium whitespace-nowrap transition-opacity duration-300">
                      {item.label}
                    </span>
                  )}
                  {isActive && !isSidebarOpen && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className={cn("flex items-center gap-3", isSidebarOpen ? "px-2" : "justify-center")}>
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 overflow-hidden border-2 border-white relative">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold">
                    {user.full_name.charAt(0)}
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize truncate">{user.role.toLowerCase().replace('_', ' ')}</p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={cn(
                "w-full mt-4 flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group",
                !isSidebarOpen && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 ml-[-8px] text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X className="lg:hidden" /> : <Menu />}
            <span className="hidden lg:block">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </span>
          </button>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 border border-slate-100 hidden sm:flex">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                {user.full_name.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-slate-700">{user.full_name}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={pathname}
            className="max-w-[1400px] mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
