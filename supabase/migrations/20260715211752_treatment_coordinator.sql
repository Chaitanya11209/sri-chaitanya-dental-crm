-- Create Treatment Coordinator module tables

-- 1. Treatment Plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium', -- High, Medium, Low
    status TEXT NOT NULL DEFAULT 'Diagnosis Created', -- Diagnosis Created, Treatment Planned, Estimate Shared, Patient Thinking, Accepted, Scheduled, Treatment Started, Completed, Recall
    estimated_cost NUMERIC NOT NULL DEFAULT 0,
    estimated_duration TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    coordinator_id TEXT,
    coordinator_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Treatment Plan Items table
CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    treatment_name TEXT NOT NULL,
    tooth_no TEXT,
    cost NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Proposed', -- Proposed, Accepted, Rejected, Completed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Treatment Followups table
CREATE TABLE IF NOT EXISTS treatment_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL, -- Call Tomorrow, WhatsApp Reminder, Email Reminder, Review After 7 Days, Schedule Consultation
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Completed, Cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Treatment Estimates table
CREATE TABLE IF NOT EXISTS treatment_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    valid_until DATE,
    terms TEXT,
    share_status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Shared WhatsApp, Shared Email
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Case Acceptance History table
CREATE TABLE IF NOT EXISTS case_acceptance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    decision TEXT NOT NULL, -- Accepted, Rejected, Thinking, Postponed, Cancelled
    reason TEXT, -- Reason for rejection or postponement
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan ON treatment_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_followups_patient ON treatment_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_estimates_plan ON treatment_estimates(plan_id);
CREATE INDEX IF NOT EXISTS idx_case_acceptance_history_plan ON case_acceptance_history(plan_id);

-- Enable RLS
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_acceptance_history ENABLE ROW LEVEL SECURITY;

-- Setup basic policies
CREATE POLICY "Allow authenticated read plans" ON treatment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write plans" ON treatment_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read items" ON treatment_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write items" ON treatment_plan_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read followups" ON treatment_followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write followups" ON treatment_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read estimates" ON treatment_estimates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write estimates" ON treatment_estimates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read acceptance" ON case_acceptance_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write acceptance" ON case_acceptance_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
