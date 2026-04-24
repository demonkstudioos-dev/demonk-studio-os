import { supabase } from '@/lib/supabase';

export type EntityType = 'TASK' | 'PROJECT' | 'EXPENSE' | 'PAYMENT' | 'TEAM';
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'MEMBER_ADD' | 'MEMBER_REMOVE';

export async function logActivity(params: {
  entity_type: EntityType;
  entity_id: string;
  action: ActionType;
  message: string;
  project_id?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase
    .from('activity_logs')
    .insert([{
      user_id: session.user.id,
      ...params
    }]);

  if (error) {
    console.error('Error logging activity:', error);
  }
}
