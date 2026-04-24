export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  hourly_rate: number;
  team_id?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  manager_id?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  budget: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string;
  assigned_to?: string;
  estimated_hours: number;
  actual_hours: number;
  cost_amount: number;
  created_at: string;
}

export interface TaskDependency {
  task_id: string;
  depends_on_id: string;
  type: 'SS' | 'FS';
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  cost_amount: number;
  note?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  project_id?: string;
  user_id: string;
  amount: number;
  category: 'SALARY' | 'SOFTWARE' | 'VENDORS' | 'OPERATIONS' | 'TRAVEL' | 'MISC';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  description: string;
  date: string;
  receipt_url?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  amount: number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'OVERDUE';
  due_date: string;
  paid_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'TASK' | 'PROJECT' | 'PAYMENT' | 'EXPENSE' | 'SYSTEM';
  related_id?: string;
  is_read: boolean;
  created_at: string;
}
