import { supabase } from '../supabaseClient';
import { isSupabaseConfigured } from '../lib/supabase';

export type CaseType =
  | 'General Dentistry'
  | 'Full Mouth Rehabilitation'
  | 'Smile Makeover'
  | 'Implants'
  | 'Orthodontics'
  | 'Endodontics'
  | 'Periodontics'
  | 'Pediatric'
  | 'Oral Surgery'
  | 'Prosthodontics'
  | 'Combination Cases';

export type CaseStage =
  | 'Consultation'
  | 'Diagnosis'
  | 'Records Collection'
  | 'Treatment Planning'
  | 'Estimate'
  | 'Acceptance'
  | 'Execution'
  | 'Review'
  | 'Maintenance'
  | 'Completed';

export interface MultiSpecialtyPlan {
  id: string;
  tooth: string;
  procedure: string;
  specialty: string;
  status: 'Completed' | 'Planned' | 'Pending' | 'Under Review' | 'Deferred' | 'Rejected';
  dependency_tooth?: string;
  cost?: number;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  type: 'Consent' | 'Photograph' | 'CBCT' | 'OPG' | 'IOPA' | 'Scan' | 'Lab File' | 'Referral' | 'Progress Notes';
  url: string;
  title: string;
  uploaded_at: string;
}

export interface CaseTimelineEvent {
  id: string;
  case_id: string;
  event_type: 'Diagnosis' | 'Estimate' | 'Payment' | 'Lab' | 'Treatment' | 'Review' | 'Recall' | 'Stage Change';
  text: string;
  amount?: number;
  date: string;
}

export interface CaseFinance {
  id: string;
  case_id: string;
  estimated_cost: number;
  approved_cost: number;
  collected: number;
  discount: number;
  lab_cost: number;
}

export interface CaseChecklist {
  consent_checked: boolean;
  images_checked: boolean;
  billing_checked: boolean;
  payments_checked: boolean;
  notes_checked: boolean;
  rx_checked: boolean;
  followups_checked: boolean;
  warranty_checked: boolean;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  patient_id: number;
  patient_name: string;
  title: string;
  case_type: CaseType;
  stage: CaseStage;
  coordinator_id: string;
  coordinator_name: string;
  doctor_id: string;
  doctor_name: string;
  assistant_name: string;
  lab_name: string;
  target_completion_date: string;
  delay_reasons: string;
  created_at: string;
  updated_at: string;
  plans: MultiSpecialtyPlan[];
  checklist: CaseChecklist;
  finances: CaseFinance;
}

const KEYS = {
  CASES: 'srichaitanya_cases',
  DOCUMENTS: 'srichaitanya_case_documents',
  TIMELINES: 'srichaitanya_case_timelines'
};

const seedDefaultCases = () => {
  if (!localStorage.getItem(KEYS.CASES)) {
    const mockCases: CaseRecord[] = [
      {
        id: 'case-fmr-01',
        case_number: 'CASE-2026-001',
        patient_id: 1,
        patient_name: 'Chaitu Bolla',
        title: 'Full Mouth Rehabilitation (FMR)',
        case_type: 'Full Mouth Rehabilitation',
        stage: 'Execution',
        coordinator_id: 'coord-1',
        coordinator_name: 'Suneetha Reddy',
        doctor_id: 'doc-1',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        assistant_name: 'Ramesh K.',
        lab_name: 'Apex Digital Labs',
        target_completion_date: '2026-09-15',
        delay_reasons: '',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-16T15:00:00Z',
        plans: [
          { id: 'p-1', tooth: '11', procedure: 'Zirconia Crown', specialty: 'Prosthodontics', status: 'Completed', cost: 12000 },
          { id: 'p-2', tooth: '21', procedure: 'Straumann Implant', specialty: 'Implants', status: 'Planned', cost: 45000, dependency_tooth: '11' },
          { id: 'p-3', tooth: '46', procedure: 'Endodontic RCT', specialty: 'Endodontics', status: 'Completed', cost: 8500 },
          { id: 'p-4', tooth: '36', procedure: 'PFM Crown', specialty: 'Prosthodontics', status: 'Pending', cost: 7500, dependency_tooth: '46' }
        ],
        checklist: {
          consent_checked: true,
          images_checked: true,
          billing_checked: true,
          payments_checked: false,
          notes_checked: true,
          rx_checked: true,
          followups_checked: false,
          warranty_checked: false
        },
        finances: {
          id: 'fin-1',
          case_id: 'case-fmr-01',
          estimated_cost: 73000,
          approved_cost: 70000,
          collected: 35000,
          discount: 3000,
          lab_cost: 12000
        }
      },
      {
        id: 'case-sm-02',
        case_number: 'CASE-2026-002',
        patient_id: 2,
        patient_name: 'Anusha Sharma',
        title: 'Digital Smile Design (DSD)',
        case_type: 'Smile Makeover',
        stage: 'Treatment Planning',
        coordinator_id: 'coord-1',
        coordinator_name: 'Suneetha Reddy',
        doctor_id: 'doc-2',
        doctor_name: 'Dr. Durga Bhavani',
        assistant_name: 'Priya M.',
        lab_name: 'Premium Dental Dental Lab',
        target_completion_date: '2026-08-30',
        delay_reasons: 'Patient waiting for business trip completion.',
        created_at: '2026-07-10T11:00:00Z',
        updated_at: '2026-07-16T18:00:00Z',
        plans: [
          { id: 'p-5', tooth: '12', procedure: 'E.Max Ceramic Veneer', specialty: 'Cosmetic Dentistry', status: 'Under Review', cost: 15000 },
          { id: 'p-6', tooth: '11', procedure: 'E.Max Ceramic Veneer', specialty: 'Cosmetic Dentistry', status: 'Planned', cost: 15000 },
          { id: 'p-7', tooth: '21', procedure: 'E.Max Ceramic Veneer', specialty: 'Cosmetic Dentistry', status: 'Planned', cost: 15000 },
          { id: 'p-8', tooth: '22', procedure: 'E.Max Ceramic Veneer', specialty: 'Cosmetic Dentistry', status: 'Under Review', cost: 15000 }
        ],
        checklist: {
          consent_checked: false,
          images_checked: true,
          billing_checked: false,
          payments_checked: false,
          notes_checked: false,
          rx_checked: false,
          followups_checked: false,
          warranty_checked: false
        },
        finances: {
          id: 'fin-2',
          case_id: 'case-sm-02',
          estimated_cost: 60000,
          approved_cost: 0,
          collected: 0,
          discount: 0,
          lab_cost: 15000
        }
      }
    ];

    const mockDocs: CaseDocument[] = [
      {
        id: 'doc-101',
        case_id: 'case-fmr-01',
        type: 'OPG',
        title: 'Initial Panoramic Screening OPG',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-07-01'
      },
      {
        id: 'doc-102',
        case_id: 'case-fmr-01',
        type: 'Consent',
        title: 'Full Mouth Surgical Consent Form',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-07-02'
      }
    ];

    const mockTimelines: CaseTimelineEvent[] = [
      {
        id: 't-1',
        case_id: 'case-fmr-01',
        event_type: 'Diagnosis',
        text: 'Initial full-mouth diagnostics completed. Identified multiple decayed teeth and bone atrophy in 21 region.',
        date: '2026-07-01'
      },
      {
        id: 't-2',
        case_id: 'case-fmr-01',
        event_type: 'Estimate',
        text: 'Financial planner estimated ₹73,000. Coordinator approved treatment framework at ₹70,000.',
        amount: 70000,
        date: '2026-07-02'
      },
      {
        id: 't-3',
        case_id: 'case-fmr-01',
        event_type: 'Payment',
        text: 'Advance deposit of ₹35,000 recorded via Credit Card.',
        amount: 35000,
        date: '2026-07-02'
      }
    ];

    localStorage.setItem(KEYS.CASES, JSON.stringify(mockCases));
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(mockDocs));
    localStorage.setItem(KEYS.TIMELINES, JSON.stringify(mockTimelines));
  }
};

seedDefaultCases();

const getLocal = <T>(key: string): T[] => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
};

const setLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const triggerCaseAutomations = async (caseRecord: CaseRecord, action: string) => {
  try {
    // 1. Update Patient Timeline / Notes (Module 15)
    const { data: patientData, error: patientErr } = await supabase
      .from('patients')
      .select('notes')
      .eq('id', caseRecord.patient_id)
      .single();

    let currentMeta: any = {};
    if (!patientErr && patientData) {
      try {
        if (patientData.notes && patientData.notes.startsWith('{') && patientData.notes.endsWith('}')) {
          currentMeta = JSON.parse(patientData.notes);
        }
      } catch (e) {
        currentMeta = {};
      }
    } else {
      const localPatientsStr = localStorage.getItem('srichaitanya_patients');
      if (localPatientsStr) {
        const localPatients = JSON.parse(localPatientsStr);
        const pIdx = localPatients.findIndex((p: any) => p.id === caseRecord.patient_id);
        if (pIdx !== -1) {
          try {
            if (localPatients[pIdx].notes && localPatients[pIdx].notes.startsWith('{') && localPatients[pIdx].notes.endsWith('}')) {
              currentMeta = JSON.parse(localPatients[pIdx].notes);
            }
          } catch (e) {
            currentMeta = {};
          }
        }
      }
    }

    currentMeta.timeline = currentMeta.timeline || [];
    currentMeta.timeline.unshift({
      id: `case-evt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      text: `Case Management: [${caseRecord.case_number}] ${caseRecord.title} - ${action}`,
      type: 'clinical',
      doctor: caseRecord.doctor_name,
      category: 'Case Management'
    });

    // 2. Add Dental Chart status for multi-specialty plans
    currentMeta.dental_chart = currentMeta.dental_chart || {};
    caseRecord.plans.forEach(plan => {
      let toothStatus = 'UNDER_TREATMENT';
      if (plan.status === 'Completed') {
        toothStatus = plan.procedure.toLowerCase().includes('crown') || plan.procedure.toLowerCase().includes('veneer') ? 'CROWN' : 'RCT';
      } else if (plan.status === 'Pending') {
        toothStatus = 'UNDER_TREATMENT';
      }
      currentMeta.dental_chart[plan.tooth] = toothStatus;
    });

    // Write back to DB or local storage
    if (isSupabaseConfigured) {
      await supabase
        .from('patients')
        .update({ notes: JSON.stringify(currentMeta) })
        .eq('id', caseRecord.patient_id);
    } else {
      const localPatientsStr = localStorage.getItem('srichaitanya_patients');
      if (localPatientsStr) {
        const localPatients = JSON.parse(localPatientsStr);
        const pIdx = localPatients.findIndex((p: any) => p.id === caseRecord.patient_id);
        if (pIdx !== -1) {
          localPatients[pIdx].notes = JSON.stringify(currentMeta);
          localStorage.setItem('srichaitanya_patients', JSON.stringify(localPatients));
        }
      }
    }

    // 3. Update Treatment Coordinator (Module 15)
    const tcKey = 'srichaitanya_treatment_coordinator';
    const tcItems = getLocal<any>(tcKey);
    const existingIdx = tcItems.findIndex((item: any) => item.patient_id === caseRecord.patient_id && item.procedure.includes(caseRecord.case_number));
    
    const tcPayload = {
      id: existingIdx !== -1 ? tcItems[existingIdx].id : `tc-case-${Date.now()}`,
      patient_id: caseRecord.patient_id,
      patient_name: caseRecord.patient_name,
      doctor_id: caseRecord.doctor_id,
      doctor_name: caseRecord.doctor_name,
      procedure: `Multi-Specialty Case: ${caseRecord.case_number} - ${caseRecord.title}`,
      current_stage: caseRecord.stage,
      priority: 'High',
      status: caseRecord.stage === 'Acceptance' || caseRecord.stage === 'Completed' ? 'Approved' : 'In Discussion',
      financial_summary: `Estimated: ₹${caseRecord.finances.estimated_cost} / Collected: ₹${caseRecord.finances.collected}`,
      action_required: `Review Case milestones. Active Stage: ${caseRecord.stage}`,
      last_updated: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      tcItems[existingIdx] = tcPayload;
    } else {
      tcItems.unshift(tcPayload);
    }
    setLocal(tcKey, tcItems);

    // 4. Update Billing Entry (Module 15)
    if (action === 'Case Planning Complete' || action === 'Estimate Accepted') {
      const billingKey = 'srichaitanya_billing_transactions';
      const bills = getLocal<any>(billingKey);
      const billId = `bill-case-${caseRecord.case_number}-${Date.now()}`;
      
      const newBill = {
        id: billId,
        patient_id: caseRecord.patient_id,
        patient_name: caseRecord.patient_name,
        date: new Date().toISOString().split('T')[0],
        procedure_name: `Comprehensive Rehab (${caseRecord.case_number}: ${caseRecord.title})`,
        amount: caseRecord.finances.approved_cost || caseRecord.finances.estimated_cost,
        discount: caseRecord.finances.discount,
        tax: 0,
        total: (caseRecord.finances.approved_cost || caseRecord.finances.estimated_cost) - caseRecord.finances.discount,
        paid: caseRecord.finances.collected,
        balance: ((caseRecord.finances.approved_cost || caseRecord.finances.estimated_cost) - caseRecord.finances.discount) - caseRecord.finances.collected,
        status: caseRecord.finances.collected >= ((caseRecord.finances.approved_cost || caseRecord.finances.estimated_cost) - caseRecord.finances.discount) ? 'Paid' : 'Unpaid',
        payment_method: 'Multiple',
        doctor_id: caseRecord.doctor_id,
        doctor_name: caseRecord.doctor_name,
        notes: `Automated Case Financial Statement created for case files ${caseRecord.case_number}`
      };
      
      bills.unshift(newBill);
      setLocal(billingKey, bills);
    }

  } catch (e) {
    console.error('Case Automations trigger failure:', e);
  }
};

// SERVICE CRUDS

export const getCases = async (): Promise<CaseRecord[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase cases fallbacked:', e);
    }
  }
  return getLocal<CaseRecord>(KEYS.CASES);
};

export const getCasesByPatientId = async (patientId: number): Promise<CaseRecord[]> => {
  const all = await getCases();
  return all.filter(c => c.patient_id === patientId);
};

export const getCaseById = async (id: string): Promise<CaseRecord | null> => {
  const all = await getCases();
  return all.find(c => c.id === id) || null;
};

export const createCase = async (record: Omit<CaseRecord, 'id' | 'case_number' | 'created_at' | 'updated_at'>): Promise<CaseRecord> => {
  const all = getLocal<CaseRecord>(KEYS.CASES);
  const now = new Date().toISOString();
  const caseNo = `CASE-2026-${String(all.length + 1).padStart(3, '0')}`;

  const fresh: CaseRecord = {
    ...record,
    id: `case-${Date.now()}`,
    case_number: caseNo,
    created_at: now,
    updated_at: now
  };

  all.unshift(fresh);
  setLocal(KEYS.CASES, all);

  await triggerCaseAutomations(fresh, 'Case Record Created');

  // Add initial Case Timeline Event
  const timelineKey = KEYS.TIMELINES;
  const tEvents = getLocal<CaseTimelineEvent>(timelineKey);
  tEvents.unshift({
    id: `t-${Date.now()}`,
    case_id: fresh.id,
    event_type: 'Diagnosis',
    text: `Case rehabilitation files initialized under Case Number ${caseNo}. Initial Stage: ${fresh.stage}.`,
    date: now.split('T')[0]
  });
  setLocal(timelineKey, tEvents);

  return fresh;
};

export const updateCase = async (id: string, updates: Partial<CaseRecord>): Promise<CaseRecord> => {
  const all = getLocal<CaseRecord>(KEYS.CASES);
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Case not found');

  const oldStage = all[idx].stage;
  const updated = {
    ...all[idx],
    ...updates,
    updated_at: new Date().toISOString()
  };

  all[idx] = updated;
  setLocal(KEYS.CASES, all);

  let action = 'Case Updated';
  if (updates.stage && updates.stage !== oldStage) {
    action = `Stage Transition: ${oldStage} ➔ ${updates.stage}`;

    // Record Stage Timeline Event automatically (Module 7)
    const tEvents = getLocal<CaseTimelineEvent>(KEYS.TIMELINES);
    tEvents.unshift({
      id: `t-stage-${Date.now()}`,
      case_id: id,
      event_type: 'Stage Change',
      text: `Clinical stage progressed from ${oldStage} to ${updates.stage}.`,
      date: new Date().toISOString().split('T')[0]
    });
    setLocal(KEYS.TIMELINES, tEvents);
  }

  await triggerCaseAutomations(updated, action);

  return updated;
};

// DOCUMENTS (Module 6)

export const getCaseDocuments = async (caseId: string): Promise<CaseDocument[]> => {
  const all = getLocal<CaseDocument>(KEYS.DOCUMENTS);
  return all.filter(d => d.case_id === caseId);
};

export const uploadCaseDocument = async (doc: Omit<CaseDocument, 'id' | 'uploaded_at'>): Promise<CaseDocument> => {
  const all = getLocal<CaseDocument>(KEYS.DOCUMENTS);
  const fresh: CaseDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    uploaded_at: new Date().toISOString().split('T')[0]
  };

  all.unshift(fresh);
  setLocal(KEYS.DOCUMENTS, all);

  // Trigger automation log
  const tEvents = getLocal<CaseTimelineEvent>(KEYS.TIMELINES);
  tEvents.unshift({
    id: `t-doc-${Date.now()}`,
    case_id: doc.case_id,
    event_type: 'Review',
    text: `New PACS diagnostic document uploaded: ${doc.title} (${doc.type})`,
    date: new Date().toISOString().split('T')[0]
  });
  setLocal(KEYS.TIMELINES, tEvents);

  return fresh;
};

// TIMELINE (Module 7)

export const getCaseTimeline = async (caseId: string): Promise<CaseTimelineEvent[]> => {
  const all = getLocal<CaseTimelineEvent>(KEYS.TIMELINES);
  return all.filter(t => t.case_id === caseId).sort((a, b) => b.date.localeCompare(a.date));
};

export const addCaseTimelineEvent = async (event: Omit<CaseTimelineEvent, 'id'>): Promise<CaseTimelineEvent> => {
  const all = getLocal<CaseTimelineEvent>(KEYS.TIMELINES);
  const fresh = {
    ...event,
    id: `t-${Date.now()}`
  };
  all.unshift(fresh);
  setLocal(KEYS.TIMELINES, all);
  return fresh;
};
