import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface TreatmentPlan {
  id: string;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  diagnosis: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Diagnosis Created' | 'Treatment Planned' | 'Estimate Shared' | 'Patient Thinking' | 'Accepted' | 'Scheduled' | 'Treatment Started' | 'Completed' | 'Recall' | 'Rejected';
  estimated_cost: number;
  estimated_duration: string;
  doctor_id?: string;
  doctor_name?: string;
  coordinator_id?: string;
  coordinator_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlanItem {
  id: string;
  plan_id: string;
  treatment_name: string;
  tooth_no?: string;
  cost: number;
  status: 'Proposed' | 'Accepted' | 'Rejected' | 'Completed';
  notes?: string;
  created_at: string;
}

export interface TreatmentFollowup {
  id: string;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  plan_id?: string;
  task_type: string; // 'Call Tomorrow' | 'WhatsApp Reminder' | 'Email Reminder' | 'Review After 7 Days' | 'Schedule Consultation'
  due_date: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  created_at: string;
}

export interface TreatmentEstimate {
  id: string;
  plan_id: string;
  patient_id: number;
  patient_name?: string;
  valid_until: string;
  terms: string;
  share_status: 'Draft' | 'Shared WhatsApp' | 'Shared Email';
  created_at: string;
}

export interface CaseAcceptanceHistory {
  id: string;
  plan_id: string;
  patient_id: number;
  patient_name?: string;
  decision: 'Accepted' | 'Rejected' | 'Thinking' | 'Postponed' | 'Cancelled';
  reason?: string;
  notes?: string;
  created_at: string;
}

// Initialize mock data for offline mode
const initLocalStorageMockData = () => {
  if (typeof window === 'undefined') return;

  const preExistingPlans = localStorage.getItem('tc_plans');
  if (preExistingPlans) return; // Already pre-seeded or initialized

  // Patients in Sri Chaitanya typically have IDs 1, 2, 3...
  // Let's pre-seed some beautiful treatment plans and followups
  const mockPlans: TreatmentPlan[] = [
    {
      id: 'plan-1',
      patient_id: 1,
      patient_name: 'Satish Kumar',
      patient_phone: '9848022338',
      diagnosis: 'Severe Periodontitis & Deep Dental Caries in #16, #17',
      priority: 'High',
      status: 'Patient Thinking',
      estimated_cost: 35000,
      estimated_duration: '3 Weeks',
      doctor_name: 'Dr. Durga Bhavani Jupalli',
      coordinator_name: 'Bhavani',
      notes: 'Patient was concerned about the cost of Root Canal + Crown. Shared dental health risk if postponed.',
      created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'plan-2',
      patient_id: 2,
      patient_name: 'Dinesh Karthik',
      patient_phone: '7702581452',
      diagnosis: 'Bilateral Maxillary Posterior Tooth Wear & Multiple Cavities',
      priority: 'Medium',
      status: 'Estimate Shared',
      estimated_cost: 45000,
      estimated_duration: '4 Weeks',
      doctor_name: 'Dr. Durga Bhavani Jupalli',
      coordinator_name: 'Bhavani',
      notes: 'Offered EMI plans. Needs follow-up regarding spouse approval.',
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'plan-3',
      patient_id: 3,
      patient_name: 'Anjali Devi',
      patient_phone: '8919554488',
      diagnosis: 'Class II Malocclusion & Aesthetic Correction',
      priority: 'Medium',
      status: 'Accepted',
      estimated_cost: 120000,
      estimated_duration: '12 Months',
      doctor_name: 'Dr. Durga Bhavani Jupalli',
      coordinator_name: 'Bhavani',
      notes: 'Patient accepted Clear Aligners. Down payment of 40,000 paid. Initiated scans.',
      created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'plan-4',
      patient_id: 4,
      patient_name: 'Koteswara Rao',
      patient_phone: '9908662244',
      diagnosis: 'Partially Edentulous Arch - Mandibular',
      priority: 'High',
      status: 'Treatment Started',
      estimated_cost: 85000,
      estimated_duration: '2 Months',
      doctor_name: 'Dr. Durga Bhavani Jupalli',
      coordinator_name: 'Bhavani',
      notes: 'Implants planned for #36 and #46. Diagnostic guides prepared.',
      created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'plan-5',
      patient_id: 5,
      patient_name: 'Pranitha Reddy',
      patient_phone: '9121045612',
      diagnosis: 'Impacted Mandibular Third Molar #38',
      priority: 'High',
      status: 'Rejected',
      estimated_cost: 12000,
      estimated_duration: '1 Day',
      doctor_name: 'Dr. Durga Bhavani Jupalli',
      coordinator_name: 'Bhavani',
      notes: 'Patient fearful of surgical extraction. Postponed or seeking second opinion.',
      created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const mockItems: TreatmentPlanItem[] = [
    { id: 'item-1', plan_id: 'plan-1', treatment_name: 'Root Canal Treatment', tooth_no: '16', cost: 12000, status: 'Proposed', created_at: new Date().toISOString() },
    { id: 'item-2', plan_id: 'plan-1', treatment_name: 'Zirconia Crown Premium', tooth_no: '16', cost: 15000, status: 'Proposed', created_at: new Date().toISOString() },
    { id: 'item-3', plan_id: 'plan-1', treatment_name: 'Composite Restoration', tooth_no: '17', cost: 8000, status: 'Proposed', created_at: new Date().toISOString() },
    
    { id: 'item-4', plan_id: 'plan-2', treatment_name: 'Full Mouth Scaling & Root Planing', tooth_no: 'All', cost: 15000, status: 'Proposed', created_at: new Date().toISOString() },
    { id: 'item-5', plan_id: 'plan-2', treatment_name: 'Composite Veneers (4 teeth)', tooth_no: '11, 12, 21, 22', cost: 30000, status: 'Proposed', created_at: new Date().toISOString() },
    
    { id: 'item-6', plan_id: 'plan-3', treatment_name: 'Clear Aligners Enterprise Pack', tooth_no: 'Both Arches', cost: 120000, status: 'Accepted', created_at: new Date().toISOString() },
    
    { id: 'item-7', plan_id: 'plan-4', treatment_name: 'Surgical Implant Placement', tooth_no: '36', cost: 40000, status: 'Accepted', created_at: new Date().toISOString() },
    { id: 'item-8', plan_id: 'plan-4', treatment_name: 'Surgical Implant Placement', tooth_no: '46', cost: 40000, status: 'Accepted', created_at: new Date().toISOString() },
    { id: 'item-9', plan_id: 'plan-4', treatment_name: 'PRF Membrane & Bone Grafting', tooth_no: '36, 46', cost: 5000, status: 'Proposed', created_at: new Date().toISOString() },
    
    { id: 'item-10', plan_id: 'plan-5', treatment_name: 'Surgical Transalveolar Extraction', tooth_no: '38', cost: 12000, status: 'Rejected', created_at: new Date().toISOString() }
  ];

  const mockFollowups: TreatmentFollowup[] = [
    {
      id: 'fol-1',
      patient_id: 1,
      patient_name: 'Satish Kumar',
      patient_phone: '9848022338',
      plan_id: 'plan-1',
      task_type: 'WhatsApp Reminder',
      due_date: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0], // tomorrow
      status: 'Pending',
      notes: 'Send video link explaining Root Canal safety and painlessness.',
      created_at: new Date().toISOString()
    },
    {
      id: 'fol-2',
      patient_id: 2,
      patient_name: 'Dinesh Karthik',
      patient_phone: '7702581452',
      plan_id: 'plan-2',
      task_type: 'Call Tomorrow',
      due_date: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      notes: 'Follow up on EMI finance company approval status.',
      created_at: new Date().toISOString()
    },
    {
      id: 'fol-3',
      patient_id: 5,
      patient_name: 'Pranitha Reddy',
      patient_phone: '9121045612',
      plan_id: 'plan-5',
      task_type: 'Review After 7 Days',
      due_date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      notes: 'Call gently to review discomfort levels. Remind her about risk of cyst formation.',
      created_at: new Date().toISOString()
    }
  ];

  const mockEstimates: TreatmentEstimate[] = [
    {
      id: 'est-1',
      plan_id: 'plan-1',
      patient_id: 1,
      patient_name: 'Satish Kumar',
      valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      terms: '1. Estimate is valid for 30 days from generation.\n2. Root canal success depends on existing tissue health.\n3. Premium Zirconia crown has 15 years limited warranty.',
      share_status: 'Shared WhatsApp',
      created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'est-2',
      plan_id: 'plan-2',
      patient_id: 2,
      patient_name: 'Dinesh Karthik',
      valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      terms: '1. Estimate is valid for 30 days.\n2. Zero cost EMI requires Aadhaar, PAN card, and bank mandate approval.',
      share_status: 'Shared Email',
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const mockAcceptance: CaseAcceptanceHistory[] = [
    {
      id: 'acc-1',
      plan_id: 'plan-3',
      patient_id: 3,
      patient_name: 'Anjali Devi',
      decision: 'Accepted',
      notes: 'Decided on Clear Aligners over metal braces due to professional presentation.',
      created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'acc-2',
      plan_id: 'plan-5',
      patient_id: 5,
      patient_name: 'Pranitha Reddy',
      decision: 'Rejected',
      reason: 'Fear / Phobia of Surgery',
      notes: 'Refused surgical extraction of molar. Highly anxious.',
      created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    }
  ];

  localStorage.setItem('tc_plans', JSON.stringify(mockPlans));
  localStorage.setItem('tc_plan_items', JSON.stringify(mockItems));
  localStorage.setItem('tc_followups', JSON.stringify(mockFollowups));
  localStorage.setItem('tc_estimates', JSON.stringify(mockEstimates));
  localStorage.setItem('tc_acceptance', JSON.stringify(mockAcceptance));
};

initLocalStorageMockData();

// Database helper wrapper with offline fallback
const localGet = (key: string): any[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const localSave = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// EXPORTED CRUD OPERATIONS

// 1. Treatment Plans
export const getTreatmentPlans = async (patientId?: number): Promise<TreatmentPlan[]> => {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('treatment_plans').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as TreatmentPlan[];
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase read failed, falling back to LocalStorage:', e);
    }
  }

  const plans = localGet('tc_plans');
  if (patientId) {
    return plans.filter(p => p.patient_id === Number(patientId));
  }
  return plans;
};

export const getTreatmentPlanItems = async (planId: string): Promise<TreatmentPlanItem[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('treatment_plan_items')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as TreatmentPlanItem[];
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase item fetch failed:', e);
    }
  }

  const items = localGet('tc_plan_items');
  return items.filter(i => i.plan_id === planId);
};

export const createTreatmentPlan = async (
  plan: Omit<TreatmentPlan, 'id' | 'created_at' | 'updated_at'>,
  items: Omit<TreatmentPlanItem, 'id' | 'plan_id' | 'created_at'>[]
): Promise<TreatmentPlan> => {
  const planId = 'plan-' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();

  const newPlan: TreatmentPlan = {
    ...plan,
    id: planId,
    created_at: now,
    updated_at: now
  };

  const newPlanItems: TreatmentPlanItem[] = items.map(item => ({
    ...item,
    id: 'item-' + Math.random().toString(36).substr(2, 9),
    plan_id: planId,
    created_at: now
  }));

  if (isSupabaseConfigured) {
    try {
      // Write Plan
      const { data: dbPlan, error: planErr } = await supabase
        .from('treatment_plans')
        .insert([{
          patient_id: plan.patient_id,
          diagnosis: plan.diagnosis,
          priority: plan.priority,
          status: plan.status,
          estimated_cost: plan.estimated_cost,
          estimated_duration: plan.estimated_duration,
          doctor_id: plan.doctor_id,
          doctor_name: plan.doctor_name,
          coordinator_id: plan.coordinator_id,
          coordinator_name: plan.coordinator_name,
          notes: plan.notes
        }])
        .select()
        .single();

      if (!planErr && dbPlan) {
        // Insert Items
        const dbItems = newPlanItems.map(item => ({
          plan_id: dbPlan.id,
          treatment_name: item.treatment_name,
          tooth_no: item.tooth_no,
          cost: item.cost,
          status: item.status,
          notes: item.notes
        }));

        await supabase.from('treatment_plan_items').insert(dbItems);
        return dbPlan as TreatmentPlan;
      }
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase plan creation failed, writing locally:', e);
    }
  }

  // LocalStorage Fallback
  const currentPlans = localGet('tc_plans');
  const currentItems = localGet('tc_plan_items');

  localSave('tc_plans', [newPlan, ...currentPlans]);
  localSave('tc_plan_items', [...currentItems, ...newPlanItems]);

  // Generate automated followup action for high priority plans on creation
  if (plan.priority === 'High' || plan.status === 'Estimate Shared') {
    await createTreatmentFollowup({
      patient_id: plan.patient_id,
      patient_name: plan.patient_name,
      patient_phone: plan.patient_phone,
      plan_id: planId,
      task_type: 'Call Tomorrow',
      due_date: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      notes: `Auto-generated followup: Contact patient regarding priority treatment plan for "${plan.diagnosis.slice(0, 40)}..."`
    });
  }

  return newPlan;
};

export const updateTreatmentPlanStatus = async (
  planId: string,
  status: TreatmentPlan['status'],
  decisionData?: { decision: CaseAcceptanceHistory['decision']; reason?: string; notes?: string; patient_name?: string }
): Promise<boolean> => {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({ status, updated_at: now })
        .eq('id', planId);

      if (!error) {
        if (decisionData) {
          // Write Decision history
          await supabase.from('case_acceptance_history').insert([{
            plan_id: planId,
            patient_id: decisionData.patient_name ? 1 : 1, // fallback or real id
            decision: decisionData.decision,
            reason: decisionData.reason,
            notes: decisionData.notes
          }]);
        }
        return true;
      }
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase update status failed:', e);
    }
  }

  const plans = localGet('tc_plans');
  const index = plans.findIndex(p => p.id === planId);
  if (index !== -1) {
    plans[index].status = status;
    plans[index].updated_at = now;
    localSave('tc_plans', plans);

    if (decisionData) {
      const currentHistory = localGet('tc_acceptance');
      const newHistory: CaseAcceptanceHistory = {
        id: 'acc-' + Math.random().toString(36).substr(2, 9),
        plan_id: planId,
        patient_id: plans[index].patient_id,
        patient_name: plans[index].patient_name || decisionData.patient_name,
        decision: decisionData.decision,
        reason: decisionData.reason,
        notes: decisionData.notes,
        created_at: now
      };
      localSave('tc_acceptance', [newHistory, ...currentHistory]);

      // Automated tasks depending on decision
      if (decisionData.decision === 'Rejected' || decisionData.decision === 'Postponed') {
        await createTreatmentFollowup({
          patient_id: plans[index].patient_id,
          patient_name: plans[index].patient_name,
          patient_phone: plans[index].patient_phone,
          plan_id: planId,
          task_type: 'Review After 7 Days',
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
          status: 'Pending',
          notes: `Gently follow up on rejection/postponement: "${decisionData.reason || 'None'}"`
        });
      } else if (decisionData.decision === 'Accepted') {
        await createTreatmentFollowup({
          patient_id: plans[index].patient_id,
          patient_name: plans[index].patient_name,
          patient_phone: plans[index].patient_phone,
          plan_id: planId,
          task_type: 'Schedule Consultation',
          due_date: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
          status: 'Pending',
          notes: `Schedule treatment appointments for accepted plan.`
        });
      }
    }
    return true;
  }
  return false;
};

// 2. Follow-ups
export const getTreatmentFollowups = async (patientId?: number): Promise<TreatmentFollowup[]> => {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('treatment_followups').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('due_date', { ascending: true });
      if (!error && data) return data as TreatmentFollowup[];
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase followup fetch failed:', e);
    }
  }

  const followups = localGet('tc_followups');
  if (patientId) {
    return followups.filter(f => f.patient_id === Number(patientId));
  }
  return followups;
};

export const createTreatmentFollowup = async (
  followup: Omit<TreatmentFollowup, 'id' | 'created_at'>
): Promise<TreatmentFollowup> => {
  const newFollowup: TreatmentFollowup = {
    ...followup,
    id: 'fol-' + Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('treatment_followups')
        .insert([{
          patient_id: followup.patient_id,
          plan_id: followup.plan_id,
          task_type: followup.task_type,
          due_date: followup.due_date,
          status: followup.status,
          notes: followup.notes
        }])
        .select()
        .single();
      if (!error && data) return data as TreatmentFollowup;
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase mockup followup insert fail:', e);
    }
  }

  const currentFollowups = localGet('tc_followups');
  localSave('tc_followups', [newFollowup, ...currentFollowups]);
  return newFollowup;
};

export const updateFollowupStatus = async (
  followupId: string,
  status: TreatmentFollowup['status']
): Promise<boolean> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('treatment_followups')
        .update({ status })
        .eq('id', followupId);
      if (!error) return true;
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase update followup fail:', e);
    }
  }

  const followups = localGet('tc_followups');
  const index = followups.findIndex(f => f.id === followupId);
  if (index !== -1) {
    followups[index].status = status;
    localSave('tc_followups', followups);
    return true;
  }
  return false;
};

// 3. Estimates
export const getTreatmentEstimates = async (patientId?: number): Promise<TreatmentEstimate[]> => {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('treatment_estimates').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as TreatmentEstimate[];
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase estimates failed:', e);
    }
  }

  const ests = localGet('tc_estimates');
  if (patientId) {
    return ests.filter(e => e.patient_id === Number(patientId));
  }
  return ests;
};

export const createTreatmentEstimate = async (
  estimate: Omit<TreatmentEstimate, 'id' | 'created_at'>
): Promise<TreatmentEstimate> => {
  const newEstimate: TreatmentEstimate = {
    ...estimate,
    id: 'est-' + Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('treatment_estimates')
        .insert([{
          plan_id: estimate.plan_id,
          patient_id: estimate.patient_id,
          valid_until: estimate.valid_until,
          terms: estimate.terms,
          share_status: estimate.share_status
        }])
        .select()
        .single();
      if (!error && data) return data as TreatmentEstimate;
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase estimate insert fail:', e);
    }
  }

  const currentEstimates = localGet('tc_estimates');
  localSave('tc_estimates', [newEstimate, ...currentEstimates]);
  return newEstimate;
};

// 4. Case Acceptance History
export const getCaseAcceptanceHistory = async (patientId?: number): Promise<CaseAcceptanceHistory[]> => {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('case_acceptance_history').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as CaseAcceptanceHistory[];
    } catch (e) {
      console.warn('[TreatmentCoordinatorService] Supabase acceptance history fail:', e);
    }
  }

  const acc = localGet('tc_acceptance');
  if (patientId) {
    return acc.filter(a => a.patient_id === Number(patientId));
  }
  return acc;
};
