-- ==========================================
-- DEMONK OS - SUPABASE DATABASE SETUP
-- ==========================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER');
CREATE TYPE project_status AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE task_dep_type AS ENUM ('SS', 'FS');
CREATE TYPE expense_category AS ENUM ('SALARY', 'SOFTWARE', 'VENDORS', 'OPERATIONS', 'TRAVEL', 'MISC');
CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE');
CREATE TYPE notification_type AS ENUM ('TASK', 'PROJECT', 'PAYMENT', 'EXPENSE', 'SYSTEM');

-- 2. TABLES

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'TEAM_MEMBER' NOT NULL,
  hourly_rate NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Teams
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add team_id foreign key to profiles after teams creation
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'PLANNING' NOT NULL,
  budget NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project Members
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'TODO' NOT NULL,
  priority task_priority DEFAULT 'MEDIUM' NOT NULL,
  deadline TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estimated_hours NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  actual_hours NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  cost_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Task Dependencies
CREATE TABLE task_dependencies (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type task_dep_type DEFAULT 'FS' NOT NULL,
  PRIMARY KEY (task_id, depends_on_id)
);

-- Time Logs
CREATE TABLE timelogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds BIGINT DEFAULT 0 NOT NULL,
  cost_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Expenses
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category expense_category DEFAULT 'MISC' NOT NULL,
  status expense_status DEFAULT 'PENDING' NOT NULL,
  description TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status payment_status DEFAULT 'PENDING' NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Activity Logs (Audit Trail)
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'TASK', 'PROJECT', 'EXPENSE', 'PAYMENT', 'TEAM'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. FUNCTIONS & TRIGGERS (ENHANCED)
-- ==========================================

-- Function: Automatic Profile Creation for new Auth Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'TEAM_MEMBER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run handle_new_user() on every new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: Roll up Task and Expense costs to Project
CREATE OR REPLACE FUNCTION update_project_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine project_id based on the source table
  IF TG_TABLE_NAME = 'tasks' THEN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  -- Logic here could update a 'current_cost' column on projects if we add one,
  -- but for intelligence apps, we often use views or aggregate on the fly.
  -- However, to keep it snappy, let's assume we want a materialized summary or just trigger a refresh.
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Automatic Notifications
CREATE OR REPLACE FUNCTION create_notification_on_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.assigned_to,
      'New Task Assigned',
      'You have been assigned to: ' || NEW.title,
      'TASK',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_task_assignment_notification
  AFTER UPDATE OF assigned_to OR INSERT ON tasks
  FOR EACH ROW EXECUTE PROCEDURE create_notification_on_task_assignment();

-- Function: Notify Admin on Large Expenses
CREATE OR REPLACE FUNCTION notify_admin_on_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount > 1000 THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    SELECT id, 'Large Expense Pending', 'An expense of ' || NEW.amount || ' requires review.', 'EXPENSE', NEW.id
    FROM profiles WHERE role = 'ADMIN';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_expense_notification
  AFTER INSERT ON expenses
  FOR EACH ROW EXECUTE PROCEDURE notify_admin_on_expense();

-- ==========================================
-- 4. VIEWS FOR OPERATIONAL INTELLIGENCE
-- ==========================================

-- View: Project Profitability
CREATE OR REPLACE VIEW project_profitability AS
SELECT 
  p.id as project_id,
  p.name,
  p.budget,
  COALESCE(SUM(t.cost_amount), 0) as internal_labor_cost,
  COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'APPROVED'), 0) as external_expenses,
  (p.budget - (COALESCE(SUM(t.cost_amount), 0) + COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'APPROVED'), 0))) as projected_margin
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id;

-- ==========================================
-- 5. BOOTSTRAP INITIAL ADMIN
-- ==========================================
-- Replace 'USER_EMAIL_HERE' with your email when running this in Supabase
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'USER_EMAIL_HERE';

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Shared helper: Check if user is Admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile." ON profiles FOR UPDATE USING (is_admin());

-- Projects Policies
CREATE POLICY "Admins have full access to projects." ON projects FOR ALL USING (is_admin());
CREATE POLICY "Members can view assigned projects." ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid())
);
CREATE POLICY "PMs can update assigned projects." ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER'))
);

-- Tasks Policies
CREATE POLICY "Admins have full access to tasks." ON tasks FOR ALL USING (is_admin());
CREATE POLICY "Members can view tasks for assigned projects." ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update assigned tasks." ON tasks FOR UPDATE USING (
  assigned_to = auth.uid() OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER'))
);

-- TimeLogs Policies
CREATE POLICY "Users can manage own timelogs." ON timelogs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Managers can view project timelogs." ON timelogs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON t.project_id = pm.project_id
    WHERE t.id = timelogs.task_id AND pm.user_id = auth.uid() AND pm.role IN ('ADMIN', 'PROJECT_MANAGER')
  )
);

-- Expenses Policies
CREATE POLICY "Admins have full access to expenses." ON expenses FOR ALL USING (is_admin());
CREATE POLICY "Users can manage own expenses." ON expenses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "PMs can view project expenses." ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = expenses.project_id AND user_id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER'))
);

-- Payments Policies
CREATE POLICY "Admins have full access to payments." ON payments FOR ALL USING (is_admin());
CREATE POLICY "PMs can view project payments." ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = payments.project_id AND user_id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER'))
);

-- Notifications Policies
CREATE POLICY "Users can only see their own notifications." ON notifications FOR ALL USING (user_id = auth.uid());

-- Activity Logs Policies
CREATE POLICY "Activity logs are viewable by project members." ON activity_logs FOR SELECT USING (
  is_admin() OR 
  (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = activity_logs.project_id AND pm.user_id = auth.uid())) OR
  (user_id = auth.uid())
);
CREATE POLICY "Users can insert activity logs." ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Project Members Policies
CREATE POLICY "Project members are viewable by everyone." ON project_members FOR SELECT USING (true);
CREATE POLICY "Admins have full access to project members." ON project_members FOR ALL USING (is_admin());

-- Helper to check PM status without recursion
CREATE OR REPLACE FUNCTION is_member_pm(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_id
    AND user_id = auth.uid()
    AND role IN ('ADMIN', 'PROJECT_MANAGER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "PMs can manage project members of their own projects." ON project_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR 
  is_member_pm(project_id)
);
