'use client';

import { motion } from 'motion/react';
import { ShieldAlert, ExternalLink, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Check if configuration is present
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/[ \n,;]/)[0].split('.eyJ')[0].trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').split(/[ \n,;]/)[0].trim();

const checkMismatch = () => {
  try {
    const urlRef = supabaseUrl.split('.')[0].replace('https://', '');
    const keyParts = supabaseAnonKey.split('.');
    if (keyParts.length === 3) {
      const payload = JSON.parse(atob(keyParts[1]));
      return payload.ref !== urlRef ? payload.ref : null;
    }
  } catch (e) { return null; }
  return null;
};

const mismatchRef = checkMismatch();

export function MissingConfig() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 border border-slate-100 text-center"
      >
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Configuration Required</h2>
        <p className="text-slate-500 leading-relaxed mb-8">
          To use **demonk OS**, you need to connect your Supabase project. 
          Please set the following environment variables in the **AI Studio Secrets** panel.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono text-slate-400">URL</code>
              <span className={`text-[10px] font-bold ${supabaseUrl ? 'text-emerald-500' : 'text-rose-500'} uppercase tracking-widest`}>
                {supabaseUrl ? 'Set' : 'Missing'}
              </span>
            </div>
            {supabaseUrl && <p className="text-[10px] font-mono text-slate-900 break-all">{supabaseUrl}</p>}
          </div>
          <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono text-slate-400">Anon Key</code>
              <span className={`text-[10px] font-bold ${supabaseAnonKey ? 'text-emerald-500' : 'text-rose-500'} uppercase tracking-widest`}>
                {supabaseAnonKey ? 'Set' : 'Missing'}
              </span>
            </div>
            {supabaseAnonKey && <p className="text-[10px] font-mono text-slate-500">{supabaseAnonKey.length} characters</p>}
          </div>
        </div>

        {supabaseUrl && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left mb-8">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Connection Issues?</h4>
            <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4">
              {mismatchRef && (
                <li className="text-rose-600 font-bold">
                  Credential Mismatch: Your Key is for project &quot;{mismatchRef}&quot; but your URL is for project &quot;{supabaseUrl.split('.')[0].replace('https://', '')}&quot;.
                </li>
              )}
              <li>Check if your Supabase project is <strong>Paused</strong> in the Supabase Dashboard.</li>
              <li>Verify the URL doesn&apos;t have extra characters at the end.</li>
              <li>Check browser console (F12) for blocked request details.</li>
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            Create Supabase Project
            <ExternalLink className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2 justify-center text-xs text-slate-400 mt-4">
            <Settings className="w-3 h-3" />
            Set secrets in AI Studio sidebar
          </div>
        </div>
      </motion.div>
    </div>
  );
}
