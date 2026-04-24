'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  IndianRupee, 
  MessageSquare,
  Search,
  MoreVertical,
  Check
} from 'lucide-react';

import { supabase } from '@/lib/supabase'; 
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Setup real-time subscription
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'ALL' ? true : !n.is_read
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TASK': return <CheckCircle2 className="w-5 h-5 text-indigo-500" />;
      case 'EXPENSE': return <IndianRupee className="w-5 h-5 text-emerald-500" />;
      case 'PROJECT': return <Briefcase className="w-5 h-5 text-amber-500" />;
      case 'PAYMENT': return <IndianRupee className="w-5 h-5 text-indigo-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (error) {
       console.error('Error marking all as read:', error);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Notifications</h1>
          <p className="text-slate-500 mt-1">Stay updated with your workspace activity.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="text-sm font-bold text-slate-900 hover:text-slate-600 transition-colors flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {['ALL', 'UNREAD'].map((tab: any) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all relative",
              activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
           >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
              />
            )}
            {tab === 'UNREAD' && notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute top-3 right-1 w-4 h-4 bg-rose-50 text-white text-[10px] flex items-center justify-center rounded-full">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={cn(
                "p-6 rounded-2xl border transition-all cursor-pointer group flex items-start gap-5",
                notification.is_read 
                  ? "bg-white border-slate-200" 
                  : "bg-slate-50 border-slate-200 shadow-sm ring-1 ring-slate-900/5"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                notification.is_read ? "bg-slate-50 text-slate-400" : "bg-white text-slate-900 shadow-sm"
              )}>
                {getTypeIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{notification.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(notification.created_at)}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{notification.message}</p>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">
              You don&apos;t have any new notifications at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
