import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface EndodonticCase {
  id: string;
  case_number: string;
  patient_id: number;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  tooth_number: string;
  diagnosis: string;
  pulp_status: string;
  periapical_status: string;
  treatment_plan: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'In Progress' | 'Completed' | 'Reopened' | 'Abandoned';
  estimated_cost: number;
  clinical_notes: string;
  current_stage: RCTWorkflowStage;
  crown_status: 'None' | 'Post & Core' | 'Crown Prep' | 'Sent to Lab' | 'Crown Delivered';
  created_at: string;
  updated_at: string;
}

export type RCTWorkflowStage =
  | 'Consultation'
  | 'Diagnosis'
  | 'IOPA/RVG'
  | 'Access Opening'
  | 'Working Length'
  | 'Canal Negotiation'
  | 'Cleaning & Shaping'
  | 'Irrigation'
  | 'Intracanal Medicament'
  | 'Temporary Restoration'
  | 'Obturation'
  | 'Post Space Preparation'
  | 'Post Placement'
  | 'Core Build-up'
  | 'Crown Preparation'
  | 'Final Crown Cementation'
  | 'Review';

export const RCT_STAGES_ORDER: RCTWorkflowStage[] = [
  'Consultation',
  'Diagnosis',
  'IOPA/RVG',
  'Access Opening',
  'Working Length',
  'Canal Negotiation',
  'Cleaning & Shaping',
  'Irrigation',
  'Intracanal Medicament',
  'Temporary Restoration',
  'Obturation',
  'Post Space Preparation',
  'Post Placement',
  'Core Build-up',
  'Crown Preparation',
  'Final Crown Cementation',
  'Review'
];

export interface EndodonticVisit {
  id: string;
  case_id: string;
  visit_number: number;
  date: string;
  procedures_completed: string[];
  time_taken: number; // in minutes
  next_appointment?: string;
  doctor_notes: string;
}

export interface WorkingLengthRecord {
  id: string;
  case_id: string;
  canal_name: string; // e.g. MB, DB, P, L, ML
  working_length: number; // in mm
  apex_locator_value: number; // e.g., 0.0 or 0.5
  file_system_used: string;
  irrigants: string[];
  medicaments: string[];
  obturation_material: string;
  sealer: string;
  post_type: string;
  core_material: string;
}

export interface EndodonticRadiograph {
  id: string;
  case_id: string;
  tooth_number: string;
  type: 'Pre-op IOPA' | 'Working Length IOPA' | 'Master Cone IOPA' | 'Obturation IOPA' | 'Post-op IOPA' | 'CBCT';
  url: string; // Base64 or standard asset/placeholder URL
  uploaded_at: string;
  notes?: string;
}

export interface EndodonticComplication {
  id: string;
  case_id: string;
  type: 'Broken Instrument' | 'Ledge Formation' | 'Perforation' | 'Missed Canal' | 'Persistent Infection' | 'Flare-up' | 'Retreatment Required';
  logged_at: string;
  resolution_status: 'Active' | 'Resolved';
  resolution_notes?: string;
  notes: string;
}

export interface EndodonticReview {
  id: string;
  case_id: string;
  scheduled_at: string;
  completed_at?: string;
  status: 'Scheduled' | 'Completed' | 'Missed';
  recall_type: '1 Week' | '1 Month' | '3 Months' | '6 Months' | '12 Months' | 'Yearly';
  clinical_findings?: string;
}

export interface EndodonticMaterial {
  id: string;
  name: string;
  category: 'File' | 'Gutta Percha' | 'Sealer' | 'Post' | 'Core Material' | 'Medicament' | 'Irrigant';
  brand: string;
  stock: number;
  unit: string;
}

// Memory Storage Fallback keys
const KEYS = {
  CASES: 'srichaitanya_rct_cases',
  VISITS: 'srichaitanya_rct_visits',
  WL_RECORDS: 'srichaitanya_rct_wl_records',
  RADIOGRAPHS: 'srichaitanya_rct_radiographs',
  COMPLICATIONS: 'srichaitanya_rct_complications',
  REVIEWS: 'srichaitanya_rct_reviews',
  MATERIALS: 'srichaitanya_rct_materials'
};

// Seed Data helper
const seedDefaultData = () => {
  if (!localStorage.getItem(KEYS.CASES)) {
    const mockCases: EndodonticCase[] = [
      {
        id: 'case-1',
        case_number: 'RCT-2026-001',
        patient_id: 1,
        patient_name: 'Chaitu Bolla',
        doctor_id: 'doc-1',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        tooth_number: '46',
        diagnosis: 'Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis',
        pulp_status: 'Irreversible Pulpitis',
        periapical_status: 'Symptomatic Apical Periodontitis',
        treatment_plan: 'Standard Root Canal Treatment with Fiber Post & Composite Core Build-up',
        priority: 'High',
        status: 'In Progress',
        estimated_cost: 8500,
        clinical_notes: 'Patient presented with severe lingering pain to cold stimuli in lower right back region. Tooth 46 has deep disto-occlusal caries.',
        current_stage: 'Canal Negotiation',
        crown_status: 'None',
        created_at: '2026-07-10T10:00:00Z',
        updated_at: '2026-07-15T11:30:00Z'
      },
      {
        id: 'case-2',
        case_number: 'RCT-2026-002',
        patient_id: 2,
        patient_name: 'Anusha Sharma',
        doctor_id: 'doc-2',
        doctor_name: 'Dr. Durga Bhavani',
        tooth_number: '11',
        diagnosis: 'Pulpal Necrosis with Chronic Apical Abscess',
        pulp_status: 'Necrotic',
        periapical_status: 'Chronic Apical Abscess',
        treatment_plan: 'Standard Root Canal Treatment and Zirconia Crown Restoration',
        priority: 'Medium',
        status: 'Completed',
        estimated_cost: 12000,
        clinical_notes: 'History of trauma 5 years ago. Tooth is discolored, asymptomatic but radiographic periapical radiolucency present.',
        current_stage: 'Review',
        crown_status: 'Crown Delivered',
        created_at: '2026-06-15T09:00:00Z',
        updated_at: '2026-07-14T14:00:00Z'
      }
    ];

    const mockVisits: EndodonticVisit[] = [
      {
        id: 'visit-1-1',
        case_id: 'case-1',
        visit_number: 1,
        date: '2026-07-10',
        procedures_completed: ['Consultation', 'Diagnosis', 'IOPA/RVG', 'Access Opening'],
        time_taken: 45,
        next_appointment: '2026-07-15T11:00:00',
        doctor_notes: 'Pulp chamber opened under dental dam. Profuse bleeding from mesial canals. Ca(OH)2 medicament placed and cavit temporary seal.'
      },
      {
        id: 'visit-1-2',
        case_id: 'case-1',
        visit_number: 2,
        date: '2026-07-15',
        procedures_completed: ['Working Length', 'Canal Negotiation'],
        time_taken: 50,
        next_appointment: '2026-07-20T10:00:00',
        doctor_notes: 'Negotiable mesio-buccal, mesio-lingual, and distal canals. Working length checked with apex locator and confirmed via WL IOPA.'
      },
      {
        id: 'visit-2-1',
        case_id: 'case-2',
        visit_number: 1,
        date: '2026-06-15',
        procedures_completed: ['Access Opening', 'Working Length', 'Cleaning & Shaping'],
        time_taken: 60,
        next_appointment: '2026-06-22T09:00:00',
        doctor_notes: 'Traumatic pulp exposure history. Canal necrotic, purulent discharge noticed upon access. Cleaned and shaped to #40/04. Saline and NaOCl irrigation.'
      },
      {
        id: 'visit-2-2',
        case_id: 'case-2',
        visit_number: 2,
        date: '2026-06-22',
        procedures_completed: ['Obturation', 'Core Build-up'],
        time_taken: 45,
        next_appointment: '2026-07-01T15:00:00',
        doctor_notes: 'Obturated with Gutta Percha #40 and AH Plus sealer. Composite core build-up completed.'
      },
      {
        id: 'visit-2-3',
        case_id: 'case-2',
        visit_number: 3,
        date: '2026-07-01',
        procedures_completed: ['Crown Preparation'],
        time_taken: 40,
        next_appointment: '2026-07-14T14:00:00',
        doctor_notes: 'Anterior zirconia crown prep completed. Impression sent to laboratory. Temp crown cemented.'
      },
      {
        id: 'visit-2-4',
        case_id: 'case-2',
        visit_number: 4,
        date: '2026-07-14',
        procedures_completed: ['Final Crown Cementation'],
        time_taken: 30,
        doctor_notes: 'Zirconia crown tried-in, occlusion verified, and cemented with resin luting cement.'
      }
    ];

    const mockWlRecords: WorkingLengthRecord[] = [
      {
        id: 'wl-1-mb',
        case_id: 'case-1',
        canal_name: 'Mesio-Buccal (MB)',
        working_length: 20.5,
        apex_locator_value: 0.0,
        file_system_used: 'Protaper Gold F1',
        irrigants: ['5.25% NaOCl', '17% EDTA'],
        medicaments: ['Calcium Hydroxide'],
        obturation_material: 'Gutta Percha F1',
        sealer: 'AH Plus',
        post_type: 'Fiber Post',
        core_material: 'Composite resin'
      },
      {
        id: 'wl-1-ml',
        case_id: 'case-1',
        canal_name: 'Mesio-Lingual (ML)',
        working_length: 20.0,
        apex_locator_value: 0.0,
        file_system_used: 'Protaper Gold F1',
        irrigants: ['5.25% NaOCl', '17% EDTA'],
        medicaments: ['Calcium Hydroxide'],
        obturation_material: 'Gutta Percha F1',
        sealer: 'AH Plus',
        post_type: 'Fiber Post',
        core_material: 'Composite resin'
      },
      {
        id: 'wl-1-d',
        case_id: 'case-1',
        canal_name: 'Distal (D)',
        working_length: 21.0,
        apex_locator_value: 0.0,
        file_system_used: 'Protaper Gold F2',
        irrigants: ['5.25% NaOCl', '17% EDTA'],
        medicaments: ['Calcium Hydroxide'],
        obturation_material: 'Gutta Percha F2',
        sealer: 'AH Plus',
        post_type: 'Fiber Post',
        core_material: 'Composite resin'
      },
      {
        id: 'wl-2-single',
        case_id: 'case-2',
        canal_name: 'Main (M)',
        working_length: 22.5,
        apex_locator_value: 0.0,
        file_system_used: 'WaveOne Gold Large',
        irrigants: ['5.25% NaOCl', '17% EDTA', '2% Chlorhexidine'],
        medicaments: ['Calcium Hydroxide'],
        obturation_material: 'WaveOne GP Large',
        sealer: 'Bioceramic Sealer',
        post_type: 'None',
        core_material: 'Composite'
      }
    ];

    const mockRadiographs: EndodonticRadiograph[] = [
      {
        id: 'rad-1-pre',
        case_id: 'case-1',
        tooth_number: '46',
        type: 'Pre-op IOPA',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-07-10T10:05:00Z',
        notes: 'Disto-occlusal radiolucency approaching pulp horn. PDL widening in distal root.'
      },
      {
        id: 'rad-1-wl',
        case_id: 'case-1',
        tooth_number: '46',
        type: 'Working Length IOPA',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-07-15T11:15:00Z',
        notes: 'K-files in situ MB, ML, D. Checking working length compatibility.'
      },
      {
        id: 'rad-2-pre',
        case_id: 'case-2',
        tooth_number: '11',
        type: 'Pre-op IOPA',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-06-15T09:05:00Z',
        notes: 'Large periapical radiolucency around root apex of 11. Bone loss visible.'
      },
      {
        id: 'rad-2-post',
        case_id: 'case-2',
        tooth_number: '11',
        type: 'Post-op IOPA',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        uploaded_at: '2026-06-22T09:50:00Z',
        notes: 'Dense hermetic obturation up to anatomical apex. Good sealer puff.'
      }
    ];

    const mockComplications: EndodonticComplication[] = [
      {
        id: 'comp-1',
        case_id: 'case-1',
        type: 'Ledge Formation',
        logged_at: '2026-07-15T11:20:00Z',
        resolution_status: 'Resolved',
        resolution_notes: 'Ledge bypassed successfully using pre-curved #10 K-file under magnification. Canal recapitulated.',
        notes: 'Encountered obstruction at 15mm level during hand filing of MB canal.'
      }
    ];

    const mockReviews: EndodonticReview[] = [
      {
        id: 'rev-2-1',
        case_id: 'case-2',
        scheduled_at: '2026-07-21',
        completed_at: '2026-07-21',
        status: 'Completed',
        recall_type: '1 Week',
        clinical_findings: 'Crown cementation review. Soft tissues healthy. No tenderness to percussion or palpation.'
      },
      {
        id: 'rev-2-2',
        case_id: 'case-2',
        scheduled_at: '2026-08-14',
        status: 'Scheduled',
        recall_type: '1 Month'
      }
    ];

    const mockMaterials: EndodonticMaterial[] = [
      { id: 'm-1', name: 'Protaper Gold Rotary Files', category: 'File', brand: 'Dentsply Sirona', stock: 24, unit: 'packs' },
      { id: 'm-2', name: 'Gutta Percha Points (04 Taper)', category: 'Gutta Percha', brand: 'Meta Biomed', stock: 15, unit: 'boxes' },
      { id: 'm-3', name: 'AH Plus Resin Sealer', category: 'Sealer', brand: 'Dentsply', stock: 8, unit: 'tubes' },
      { id: 'm-4', name: 'Glass Fiber Posts (1.2mm)', category: 'Post', brand: 'Angelus', stock: 30, unit: 'pieces' },
      { id: 'm-5', name: 'Calcium Hydroxide Paste', category: 'Medicament', brand: 'ApexCal', stock: 12, unit: 'syringes' },
      { id: 'm-6', name: 'Sodium Hypochlorite 5.25%', category: 'Irrigant', brand: 'Parcan', stock: 10, unit: 'bottles' },
      { id: 'm-7', name: 'LuxaCore Dual Core Build-up', category: 'Core Material', brand: 'DMG', stock: 6, unit: 'syringes' }
    ];

    localStorage.setItem(KEYS.CASES, JSON.stringify(mockCases));
    localStorage.setItem(KEYS.VISITS, JSON.stringify(mockVisits));
    localStorage.setItem(KEYS.WL_RECORDS, JSON.stringify(mockWlRecords));
    localStorage.setItem(KEYS.RADIOGRAPHS, JSON.stringify(mockRadiographs));
    localStorage.setItem(KEYS.COMPLICATIONS, JSON.stringify(mockComplications));
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(mockReviews));
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify(mockMaterials));
  }
};

// Auto run seeding
seedDefaultData();

// GET LOCAL HELPER
const getLocal = <T>(key: string): T[] => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
};

// SET LOCAL HELPER
const setLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// AUTOMATION WORKFLOWS TRIGGER
export const triggerEndodonticAutomations = async (
  caseRecord: EndodonticCase,
  actionType: 'create' | 'update_stage' | 'complete' | 'add_visit'
) => {
  try {
    // 1. Update Dental Chart (Module 13)
    let toothStatus: 'RCT' | 'CROWN' | 'HEALED' | 'POST_AND_CORE' | 'UNDER_TREATMENT' = 'UNDER_TREATMENT';
    if (caseRecord.status === 'Completed' || caseRecord.current_stage === 'Review') {
      if (caseRecord.crown_status === 'Crown Delivered') {
        toothStatus = 'CROWN';
      } else {
        toothStatus = 'RCT';
      }
    }

    // Attempt to update the patient notes metadata with updated dental chart
    const { data: patientData, error: patientErr } = await supabase
      .from('patients')
      .select('notes, name')
      .eq('id', caseRecord.patient_id)
      .single();

    if (!patientErr && patientData) {
      let currentMeta: any = {};
      try {
        if (patientData.notes && patientData.notes.startsWith('{') && patientData.notes.endsWith('}')) {
          currentMeta = JSON.parse(patientData.notes);
        }
      } catch (e) {
        currentMeta = {};
      }

      // Update dental chart
      currentMeta.dental_chart = currentMeta.dental_chart || {};
      currentMeta.dental_chart[caseRecord.tooth_number] = toothStatus;

      // Update treatment timeline (Module 13)
      currentMeta.timeline = currentMeta.timeline || [];
      const stageText = `Endodontics: Tooth ${caseRecord.tooth_number} - Stage: ${caseRecord.current_stage} (${actionType})`;
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Prevent duplicate timeline logs for the same stage
      const exists = currentMeta.timeline.some((item: any) => item.text === stageText && item.date === timestamp);
      if (!exists) {
        currentMeta.timeline.unshift({
          id: `endo-${Date.now()}`,
          date: timestamp,
          text: stageText,
          type: 'clinical',
          doctor: caseRecord.doctor_name,
          category: 'Endodontics'
        });
      }

      // Save updated metadata back to patient notes
      await supabase
        .from('patients')
        .update({ notes: JSON.stringify(currentMeta) })
        .eq('id', caseRecord.patient_id);
    } else {
      // Fallback for local patients array in storage
      const localPatientsStr = localStorage.getItem('srichaitanya_patients');
      if (localPatientsStr) {
        const localPatients = JSON.parse(localPatientsStr);
        const idx = localPatients.findIndex((p: any) => p.id === caseRecord.patient_id);
        if (idx !== -1) {
          let currentMeta: any = {};
          try {
            if (localPatients[idx].notes && localPatients[idx].notes.startsWith('{') && localPatients[idx].notes.endsWith('}')) {
              currentMeta = JSON.parse(localPatients[idx].notes);
            }
          } catch (e) {
            currentMeta = {};
          }
          currentMeta.dental_chart = currentMeta.dental_chart || {};
          currentMeta.dental_chart[caseRecord.tooth_number] = toothStatus;

          currentMeta.timeline = currentMeta.timeline || [];
          currentMeta.timeline.unshift({
            id: `endo-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            text: `Endodontics: Tooth ${caseRecord.tooth_number} - Stage: ${caseRecord.current_stage}`,
            type: 'clinical',
            doctor: caseRecord.doctor_name,
            category: 'Endodontics'
          });

          localPatients[idx].notes = JSON.stringify(currentMeta);
          localStorage.setItem('srichaitanya_patients', JSON.stringify(localPatients));
        }
      }
    }

    // 2. Create Billing Entries (Module 13)
    if (actionType === 'create') {
      const billingKey = 'srichaitanya_billing_transactions';
      const billingItems = getLocal<any>(billingKey);
      
      const billingId = `bill-rct-${Date.now()}`;
      const newBill = {
        id: billingId,
        patient_id: caseRecord.patient_id,
        patient_name: caseRecord.patient_name,
        date: new Date().toISOString().split('T')[0],
        procedure_name: `Root Canal Treatment (Tooth ${caseRecord.tooth_number})`,
        amount: caseRecord.estimated_cost,
        discount: 0,
        tax: 0,
        total: caseRecord.estimated_cost,
        paid: 0,
        balance: caseRecord.estimated_cost,
        status: 'Unpaid',
        payment_method: '-',
        doctor_id: caseRecord.doctor_id,
        doctor_name: caseRecord.doctor_name,
        notes: `Automated endodontics case billing generated for ${caseRecord.case_number}`
      };

      billingItems.unshift(newBill);
      setLocal(billingKey, billingItems);
    } else if (actionType === 'complete') {
      // Update billing status to Paid or partially updated if required
    }

    // 3. Create Follow-ups & Recalls (Module 10, 13)
    if (actionType === 'complete') {
      const followupsKey = 'srichaitanya_followups';
      const followups = getLocal<any>(followupsKey);

      // Add a follow-up record for crown prep
      const crownFollowup = {
        id: `fup-crown-${Date.now()}`,
        patient_id: caseRecord.patient_id,
        patient_name: caseRecord.patient_name,
        doctor_id: caseRecord.doctor_id,
        doctor_name: caseRecord.doctor_name,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
        reason: `Crown Preparation following RCT on Tooth ${caseRecord.tooth_number}`,
        type: 'Treatment',
        status: 'Scheduled',
        notes: 'Mandatory clinical follow-up to check obturation integrity and execute crown prep.'
      };
      followups.unshift(crownFollowup);
      setLocal(followupsKey, followups);

      // 4. Generate Automated Recalls (Module 10)
      const reviewsKey = KEYS.REVIEWS;
      const reviews = getLocal<EndodonticReview>(reviewsKey);
      
      const intervalDates = [
        { type: '1 Week', days: 7 },
        { type: '1 Month', days: 30 },
        { type: '3 Months', days: 90 },
        { type: '6 Months', days: 180 },
        { type: '12 Months', days: 365 },
        { type: 'Yearly', days: 730 }
      ];

      intervalDates.forEach((interval, i) => {
        reviews.push({
          id: `rev-${caseRecord.id}-${interval.type.replace(' ', '')}-${Date.now()}`,
          case_id: caseRecord.id,
          scheduled_at: new Date(Date.now() + interval.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Scheduled',
          recall_type: interval.type as any
        });
      });
      setLocal(reviewsKey, reviews);
    }

    // 5. Notify Treatment Coordinator (Module 13)
    const tcKey = 'srichaitanya_treatment_coordinator';
    const tcItems = getLocal<any>(tcKey);
    const tcItem = {
      id: `tc-endo-${Date.now()}`,
      patient_id: caseRecord.patient_id,
      patient_name: caseRecord.patient_name,
      doctor_id: caseRecord.doctor_id,
      doctor_name: caseRecord.doctor_name,
      procedure: `Endodontic Care: Tooth ${caseRecord.tooth_number}`,
      current_stage: caseRecord.current_stage,
      priority: caseRecord.priority,
      rct_status: caseRecord.status,
      crown_status: caseRecord.crown_status,
      status: caseRecord.status === 'Completed' ? 'Approved' : 'In Discussion',
      financial_summary: `Estimated Cost: ₹${caseRecord.estimated_cost}`,
      action_required: caseRecord.status === 'Completed' ? 'Coordinate Final Prosthetics delivery' : 'Verify clinical financial approvals',
      last_updated: new Date().toISOString()
    };
    tcItems.unshift(tcItem);
    setLocal(tcKey, tcItems);

  } catch (error) {
    console.error('Failed to execute automatic endodontic workflows:', error);
  }
};

// SERVICE INTERFACE METHODS

export const getEndodonticCases = async (): Promise<EndodonticCase[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('endodontic_cases').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase endodontic_cases read failed, using local fallback:', e);
    }
  }
  return getLocal<EndodonticCase>(KEYS.CASES);
};

export const getEndodonticCaseById = async (id: string): Promise<EndodonticCase | null> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('endodontic_cases').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase case fetch by id failed:', e);
    }
  }
  const items = getLocal<EndodonticCase>(KEYS.CASES);
  return items.find(item => item.id === id) || null;
};

export const getEndodonticCasesByPatientId = async (patientId: number): Promise<EndodonticCase[]> => {
  const items = await getEndodonticCases();
  return items.filter(item => item.patient_id === patientId);
};

export const saveEndodonticCase = async (caseData: Omit<EndodonticCase, 'id' | 'case_number' | 'created_at' | 'updated_at'>): Promise<EndodonticCase> => {
  const cases = getLocal<EndodonticCase>(KEYS.CASES);
  const nowStr = new Date().toISOString();
  
  const newCase: EndodonticCase = {
    ...caseData,
    id: `case-${Date.now()}`,
    case_number: `RCT-2026-${String(cases.length + 1).padStart(3, '0')}`,
    created_at: nowStr,
    updated_at: nowStr
  };

  // Save Local
  cases.unshift(newCase);
  setLocal(KEYS.CASES, cases);

  // Sync Supabase if available
  if (isSupabaseConfigured) {
    try {
      await supabase.from('endodontic_cases').insert([newCase]);
    } catch (e) {
      console.warn('Supabase save failed, cached in LocalStorage.', e);
    }
  }

  // Trigger automations
  await triggerEndodonticAutomations(newCase, 'create');

  return newCase;
};

export const updateEndodonticCase = async (caseId: string, updates: Partial<EndodonticCase>): Promise<EndodonticCase> => {
  const cases = getLocal<EndodonticCase>(KEYS.CASES);
  const index = cases.findIndex(c => c.id === caseId);
  if (index === -1) throw new Error('Endodontic case not found');

  const oldStage = cases[index].current_stage;
  const oldStatus = cases[index].status;

  const updated: EndodonticCase = {
    ...cases[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  cases[index] = updated;
  setLocal(KEYS.CASES, cases);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('endodontic_cases').update(updates).eq('id', caseId);
    } catch (e) {
      console.warn('Supabase update failed:', e);
    }
  }

  // Determine automation trigger type
  let triggerType: 'update_stage' | 'complete' | 'add_visit' = 'update_stage';
  if (updates.status === 'Completed' && oldStatus !== 'Completed') {
    triggerType = 'complete';
  }

  await triggerEndodonticAutomations(updated, triggerType);

  return updated;
};

// VISITS

export const getEndodonticVisitsByCaseId = async (caseId: string): Promise<EndodonticVisit[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('endodontic_visits').select('*').eq('case_id', caseId).order('visit_number', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase visits fetch failed:', e);
    }
  }
  const visits = getLocal<EndodonticVisit>(KEYS.VISITS);
  return visits.filter(v => v.case_id === caseId).sort((a, b) => a.visit_number - b.visit_number);
};

export const saveEndodonticVisit = async (visitData: Omit<EndodonticVisit, 'id'>): Promise<EndodonticVisit> => {
  const visits = getLocal<EndodonticVisit>(KEYS.VISITS);
  const newVisit: EndodonticVisit = {
    ...visitData,
    id: `visit-${Date.now()}`
  };

  visits.push(newVisit);
  setLocal(KEYS.VISITS, visits);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('endodontic_visits').insert([newVisit]);
    } catch (e) {
      console.warn('Supabase save visit failed:', e);
    }
  }

  // Fetch the case to run automation
  const caseRecord = await getEndodonticCaseById(visitData.case_id);
  if (caseRecord) {
    // Automatically transition stages based on completed procedures
    const completedProcs = visitData.procedures_completed;
    let nextStage: RCTWorkflowStage = caseRecord.current_stage;
    
    // Find the latest stage in completed procedures that matches RCT stages
    for (const stage of RCT_STAGES_ORDER) {
      if (completedProcs.includes(stage)) {
        nextStage = stage;
      }
    }

    const updates: Partial<EndodonticCase> = {
      current_stage: nextStage
    };

    // Auto update crown transitions (Module 8)
    if (completedProcs.includes('Post Space Preparation') || completedProcs.includes('Post Placement')) {
      updates.crown_status = 'Post & Core';
    } else if (completedProcs.includes('Crown Preparation')) {
      updates.crown_status = 'Crown Prep';
    } else if (completedProcs.includes('Final Crown Cementation')) {
      updates.crown_status = 'Crown Delivered';
      updates.status = 'Completed';
    }

    await updateEndodonticCase(visitData.case_id, updates);
  }

  return newVisit;
};

// WORKING LENGTH / CANAL RECORDS (Module 3)

export const getWorkingLengthRecordsByCaseId = async (caseId: string): Promise<WorkingLengthRecord[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('working_length_records').select('*').eq('case_id', caseId);
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase WL records failed:', e);
    }
  }
  return getLocal<WorkingLengthRecord>(KEYS.WL_RECORDS).filter(r => r.case_id === caseId);
};

export const saveWorkingLengthRecord = async (record: Omit<WorkingLengthRecord, 'id'>): Promise<WorkingLengthRecord> => {
  const records = getLocal<WorkingLengthRecord>(KEYS.WL_RECORDS);
  const newRecord: WorkingLengthRecord = {
    ...record,
    id: `wl-${Date.now()}`
  };

  records.push(newRecord);
  setLocal(KEYS.WL_RECORDS, records);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('working_length_records').insert([newRecord]);
    } catch (e) {
      console.warn('Supabase WL save failed:', e);
    }
  }

  return newRecord;
};

export const updateWorkingLengthRecord = async (id: string, updates: Partial<WorkingLengthRecord>): Promise<WorkingLengthRecord> => {
  const records = getLocal<WorkingLengthRecord>(KEYS.WL_RECORDS);
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Working length record not found');

  const updated = { ...records[idx], ...updates };
  records[idx] = updated;
  setLocal(KEYS.WL_RECORDS, records);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('working_length_records').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase WL update failed:', e);
    }
  }

  return updated;
};

// RADIOGRAPHS (Module 4)

export const getRadiographsByCaseId = async (caseId: string): Promise<EndodonticRadiograph[]> => {
  const radiographs = getLocal<EndodonticRadiograph>(KEYS.RADIOGRAPHS);
  return radiographs.filter(r => r.case_id === caseId);
};

export const saveRadiograph = async (record: Omit<EndodonticRadiograph, 'id' | 'uploaded_at'>): Promise<EndodonticRadiograph> => {
  const radiographs = getLocal<EndodonticRadiograph>(KEYS.RADIOGRAPHS);
  const newRad: EndodonticRadiograph = {
    ...record,
    id: `rad-${Date.now()}`,
    uploaded_at: new Date().toISOString()
  };

  radiographs.push(newRad);
  setLocal(KEYS.RADIOGRAPHS, radiographs);

  return newRad;
};

// COMPLICATIONS (Module 6)

export const getComplicationsByCaseId = async (caseId: string): Promise<EndodonticComplication[]> => {
  const complications = getLocal<EndodonticComplication>(KEYS.COMPLICATIONS);
  return complications.filter(c => c.case_id === caseId);
};

export const saveComplication = async (record: Omit<EndodonticComplication, 'id' | 'logged_at'>): Promise<EndodonticComplication> => {
  const complications = getLocal<EndodonticComplication>(KEYS.COMPLICATIONS);
  const newComp: EndodonticComplication = {
    ...record,
    id: `comp-${Date.now()}`,
    logged_at: new Date().toISOString()
  };

  complications.push(newComp);
  setLocal(KEYS.COMPLICATIONS, complications);

  return newComp;
};

export const resolveComplication = async (id: string, notes: string): Promise<EndodonticComplication> => {
  const complications = getLocal<EndodonticComplication>(KEYS.COMPLICATIONS);
  const idx = complications.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Complication record not found');

  complications[idx].resolution_status = 'Resolved';
  complications[idx].resolution_notes = notes;
  setLocal(KEYS.COMPLICATIONS, complications);

  return complications[idx];
};

// REVIEWS / RECALLS (Module 10)

export const getReviewsByCaseId = async (caseId: string): Promise<EndodonticReview[]> => {
  const reviews = getLocal<EndodonticReview>(KEYS.REVIEWS);
  return reviews.filter(r => r.case_id === caseId);
};

export const getAllReviews = async (): Promise<EndodonticReview[]> => {
  return getLocal<EndodonticReview>(KEYS.REVIEWS);
};

export const completeReview = async (id: string, findings: string): Promise<EndodonticReview> => {
  const reviews = getLocal<EndodonticReview>(KEYS.REVIEWS);
  const idx = reviews.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Review record not found');

  reviews[idx].status = 'Completed';
  reviews[idx].completed_at = new Date().toISOString().split('T')[0];
  reviews[idx].clinical_findings = findings;
  setLocal(KEYS.REVIEWS, reviews);

  return reviews[idx];
};

// MATERIALS (Module 7)

export const getEndodonticMaterials = async (): Promise<EndodonticMaterial[]> => {
  return getLocal<EndodonticMaterial>(KEYS.MATERIALS);
};

export const useEndodonticMaterialStock = async (name: string, quantity: number) => {
  const materials = getLocal<EndodonticMaterial>(KEYS.MATERIALS);
  const idx = materials.findIndex(m => m.name === name);
  if (idx !== -1) {
    materials[idx].stock = Math.max(0, materials[idx].stock - quantity);
    setLocal(KEYS.MATERIALS, materials);
  }
};
