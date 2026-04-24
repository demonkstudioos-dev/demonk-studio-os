import { supabase } from './supabase';

export async function seedSampleData() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const userId = session.user.id;

  // 1. Create a Project
  const { data: project, error: pError } = await supabase
    .from('projects')
    .insert({
      name: 'E-commerce Platform Refactor',
      description: 'Major overhaul of the legacy monolithic checkout system into localized microservices.',
      status: 'ACTIVE',
      budget: 1500000,
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_by: userId
    })
    .select()
    .single();

  if (pError) throw pError;

  // 2. Add sample members
  const { data: allProfiles } = await supabase.from('profiles').select('*');
  const otherProfiles = allProfiles?.filter(p => p.id !== userId).slice(0, 3) || [];
  
  if (otherProfiles.length > 0) {
    await supabase.from('project_members').insert(
      otherProfiles.map(p => ({
        project_id: project.id,
        user_id: p.id,
        role: p.role
      }))
    );
  }

  // 3. Add Tasks
  const tasks = [
    { 
      project_id: project.id, 
      title: 'API Gateway Setup', 
      description: 'Initialize Kong/Envoy gateway with OIDC integration.',
      status: 'DONE',
      priority: 'URGENT',
      assigned_to: userId,
      estimated_hours: 40,
      actual_hours: 38,
      cost_amount: 19000
    },
    { 
      project_id: project.id, 
      title: 'Database Schema Design', 
      description: 'Define relational model for the new order management service.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigned_to: userId,
      estimated_hours: 24,
      actual_hours: 10,
      cost_amount: 5000
    },
    { 
      project_id: project.id, 
      title: 'Frontend Component Library', 
      description: 'Build reusable UI system for the checkout flow.',
      status: 'TODO',
      priority: 'MEDIUM',
      assigned_to: otherProfiles[0]?.id || userId,
      estimated_hours: 80,
      actual_hours: 0,
      cost_amount: 0
    }
  ];

  await supabase.from('tasks').insert(tasks);

  // 4. Add Expenses
  await supabase.from('expenses').insert({
    project_id: project.id,
    user_id: userId,
    amount: 12500,
    category: 'SOFTWARE',
    status: 'PAID',
    description: 'AWS Production Infrastructure (Reserved Instances)',
    date: new Date().toISOString().split('T')[0]
  });

  // 5. Add Payments
  await supabase.from('payments').insert({
    project_id: project.id,
    amount: 500000,
    status: 'COMPLETED',
    due_date: new Date().toISOString().split('T')[0],
    paid_at: new Date().toISOString()
  });

  return { success: true };
}
