import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  MasterConfiguration, LookupValue, NumberingRule, 
  FeatureToggle, ConfigurationHistory, ClinicSettings, 
  AppointmentSettings, PatientSettings, TreatmentSettings, 
  BillingSettings, DocumentSettings, NotificationSettings 
} from '../types/config';

// ------------------------------------------------------------
// ENTERPRISE MASTER DEFAULTS
// ------------------------------------------------------------
const DEFAULT_CLINIC: ClinicSettings = {
  clinicName: "Sri Chaitanya Multispeciality Dental Care",
  logoUrl: "",
  address: "G4, Lakeview Apartments, Bandam Kommu, Ameenpur, Hyderabad, 502032",
  phoneNumbers: ["+91 83175 75165", "+91 99182 77312"],
  emails: ["srichaitanyadentalcare9@gmail.com", "info@srichaitanyadental.com"],
  gstNumber: "37AABCS1234F1Z5",
  workingHoursStart: "09:00 AM",
  workingHoursEnd: "09:00 PM",
  weeklyHolidays: ["Sunday"],
  timeZone: "IST (UTC+05:30)",
  currency: "INR (₹)",
  language: "English (US)"
};

const DEFAULT_APPOINTMENTS: AppointmentSettings = {
  statuses: ["Scheduled", "Confirmed", "Checked In", "In Treatment", "Completed", "Cancelled", "No-Show"],
  statusColors: {
    "Scheduled": "#3b82f6",
    "Confirmed": "#10b981",
    "Checked In": "#f59e0b",
    "In Treatment": "#8b5cf6",
    "Completed": "#10b981",
    "Cancelled": "#ef4444",
    "No-Show": "#6b7280"
  },
  slotDuration: 15,
  workingHoursStart: "09:00 AM",
  workingHoursEnd: "09:00 PM",
  bufferTime: 5,
  maxAdvanceBookingDays: 180,
  cancellationPolicy: "24-hour advance notice is required to cancel or reschedule appointments.",
  noShowRules: "Appointments are automatically marked No-Show after 20 minutes of slot delay."
};

const DEFAULT_PATIENTS: PatientSettings = {
  idPrefix: "SCDC-",
  autoNumbering: true,
  familyGroupRules: "Primary patient profile owns the joint account ledger, billing claims and consolidated review records.",
  requiredFields: ["Name", "Phone", "Age", "Gender"],
  medicalHistoryRequired: true,
  duplicateDetectionRules: ["Match Name + Phone exactly", "Match Email exactly"]
};

const DEFAULT_TREATMENTS: TreatmentSettings = {
  categories: ["General Dentistry", "Orthodontics", "Endodontics", "Prosthodontics", "Oral Surgery", "Implantology", "Pediatric Dentistry"],
  codes: {
    "RCT": "Root Canal Therapy",
    "IMP": "Dental Implant Placement",
    "EXT": "Simple Tooth Extraction",
    "CLN": "Prophylaxis Scaling & Polishing",
    "CRN": "Porcelain-Fused Metal Crown",
    "FIL": "Composite Tooth-Colored Filling"
  },
  colors: {
    "General Dentistry": "#3b82f6",
    "Orthodontics": "#ec4899",
    "Endodontics": "#f59e0b",
    "Oral Surgery": "#ef4444",
    "Implantology": "#8b5cf6"
  },
  defaultFollowUpDays: 14,
  displayOrder: ["CLN", "FIL", "RCT", "EXT", "CRN", "IMP"],
  frequentlyUsed: ["CLN", "RCT", "EXT"]
};

const DEFAULT_BILLING: BillingSettings = {
  invoicePrefix: "INV-",
  receiptPrefix: "REC-",
  cgstPercent: 9,
  sgstPercent: 9,
  discountLimitPercent: 20,
  allowAdvancePayment: true,
  paymentMethods: ["UPI / QR Scan", "Cash", "Credit/Debit Card", "Net Banking", "Insurance Claim"],
  roundingRule: 'nearest-1'
};

const DEFAULT_DOCUMENTS: DocumentSettings = {
  prescriptionTemplate: `Rx\n[ClinicName]\nDoctor: [DoctorName]\nPatient: [PatientName] | Date: [Date]\n------------------------------------------------------------\n1. Tab. Amoxicillin 500mg ----- 1-0-1 ----- 5 Days (After Food)\n2. Tab. Paracetamol 650mg ----- 1-0-1 ----- 3 Days (S.O.S)\n3. Tab. Pantoprazole 400mg ----- 1-0-0 ----- 5 Days (Before Food)\n------------------------------------------------------------\nSignature:`,
  invoiceTemplate: `TAX INVOICE\n[ClinicName]\nGSTIN: [GSTNumber]\nInvoice No: [InvoiceNumber] | Date: [Date]\n------------------------------------------------------------\nDescription                  Qty       Rate      Total\n[TreatmentList]\n------------------------------------------------------------\nSGST ([SGSTRate]%): [SGSTAmount]\nCGST ([CGSTRate]%): [CGSTAmount]\n------------------------------------------------------------\nTotal Received: [AmountReceived]\nBalance Due: [BalanceAmount]\n------------------------------------------------------------\nThank You!`,
  consentTemplate: `INFORMED TREATMENT CONSENT\n\nI, [PatientName], hereby consent to undergo dental procedures including [TreatmentName] at [ClinicName]. I have been fully informed of the procedure details, potential discomfort, risks, and post-operative hygiene protocols.\n\nDate: [Date] | Patient Signature: _______________`,
  estimateTemplate: `CLINICAL TREATMENT ESTIMATE\n\nEstimated Plan for [PatientName]:\n[TreatmentProcedures]\nTotal Estimate Amount: [TotalEstimate]\n\nNote: Estimates are valid for 30 days from the date of issue. Actual treatment costs may vary based on physiological observations.`,
  certificateTemplate: `MEDICAL FITNESS CERTIFICATE\n\nThis is to certify that [PatientName] was under my dental care for [TreatmentName] from [StartDate] to [EndDate] at [ClinicName]. They have recovered satisfactorily and are fit to resume duty/classes.\n\nDr. [DoctorName] | Registration No: [RegNum]`,
  footerText: "Sri Chaitanya Multispeciality Dental Care – Vijayawada | Guntur | Hyderabad HQ",
  watermark: "SCDC APPROVED"
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  whatsappEnabled: true,
  emailEnabled: true,
  smsEnabled: true,
  whatsappTemplates: {
    appointment_confirmation: "Dear [PatientName], your dental appointment with Sri Chaitanya Dental Care is confirmed on [Date] at [Time] for [Treatment]. Clinic Signature: [Signature]",
    appointment_reminder: "Reminder: Dear [PatientName], your dental consultation is scheduled tomorrow [Date] at [Time]. Please reach 10 minutes prior."
  },
  emailTemplates: {
    welcome: "Dear [PatientName], Welcome to Sri Chaitanya Multispeciality Dental Care! Your clinical account has been successfully provisioned."
  },
  smsTemplates: {
    otp: "Your Sri Chaitanya Dental CRM verification code is [OTP]. Valid for 5 minutes. Do not share."
  },
  reminderTimingHours: 24,
  birthdayMessageEnabled: true,
  recallMessageEnabled: true
};

const DEFAULT_LOOKUPS: LookupValue[] = [
  // Chief Complaints
  { id: 'cc1', category: 'chief_complaints', value: 'Severe toothache in lower right jaw', is_active: true },
  { id: 'cc2', category: 'chief_complaints', value: 'Bleeding gums while brushing', is_active: true },
  { id: 'cc3', category: 'chief_complaints', value: 'Sensitivity to cold and hot food', is_active: true },
  { id: 'cc4', category: 'chief_complaints', value: 'Loose teeth & difficulty chewing', is_active: true },
  { id: 'cc5', category: 'chief_complaints', value: 'Alignment correction requested (Ortho)', is_active: true },
  { id: 'cc6', category: 'chief_complaints', value: 'Routine dental scaling and cleaning', is_active: true },
  
  // Diagnosis
  { id: 'dg1', category: 'diagnosis', value: 'Chronic Irreversible Pulpitis', is_active: true },
  { id: 'dg2', category: 'diagnosis', value: 'Localized Marginal Gingivitis', is_active: true },
  { id: 'dg3', category: 'diagnosis', value: 'Generalized Severe Periodontitis', is_active: true },
  { id: 'dg4', category: 'diagnosis', value: 'Impacted Mandibular Third Molar (Class I)', is_active: true },
  { id: 'dg5', category: 'diagnosis', value: 'Deep Dentinal Caries', is_active: true },
  { id: 'dg6', category: 'diagnosis', value: 'Class II Division I Malocclusion', is_active: true },

  // Referral Sources
  { id: 'rf1', category: 'referral_sources', value: 'Google Maps Search', is_active: true },
  { id: 'rf2', category: 'referral_sources', value: 'Family / Friend Referral', is_active: true },
  { id: 'rf3', category: 'referral_sources', value: 'Instagram Profile Page', is_active: true },
  { id: 'rf4', category: 'referral_sources', value: 'Newspaper Flyer / Banner', is_active: true },
  { id: 'rf5', category: 'referral_sources', value: 'Walk-in Board Signage', is_active: true },

  // Occupations
  { id: 'oc1', category: 'occupations', value: 'Software Engineer', is_active: true },
  { id: 'oc2', category: 'occupations', value: 'Student', is_active: true },
  { id: 'oc3', category: 'occupations', value: 'Homemaker', is_active: true },
  { id: 'oc4', category: 'occupations', value: 'Business Owner', is_active: true },
  { id: 'oc5', category: 'occupations', value: 'Government Employee', is_active: true },

  // Blood Groups
  { id: 'bg1', category: 'blood_groups', value: 'A+ (Positive)', is_active: true },
  { id: 'bg2', category: 'blood_groups', value: 'B+ (Positive)', is_active: true },
  { id: 'bg3', category: 'blood_groups', value: 'O+ (Positive)', is_active: true },
  { id: 'bg4', category: 'blood_groups', value: 'AB+ (Positive)', is_active: true },
  { id: 'bg5', category: 'blood_groups', value: 'O- (Negative)', is_active: true },

  // Cities
  { id: 'ct1', category: 'cities', value: 'Vijayawada', is_active: true },
  { id: 'ct2', category: 'cities', value: 'Guntur', is_active: true },
  { id: 'ct3', category: 'cities', value: 'Hyderabad', is_active: true },
  { id: 'ct4', category: 'cities', value: 'Ameenpur', is_active: true },

  // States
  { id: 'st1', category: 'states', value: 'Andhra Pradesh', is_active: true },
  { id: 'st2', category: 'states', value: 'Telangana', is_active: true },
  { id: 'st3', category: 'states', value: 'Karnataka', is_active: true }
];

const DEFAULT_NUMBERING: NumberingRule[] = [
  { id: 'num1', entityType: 'patient', prefix: 'SCDC-', suffix: '', paddingLength: 5, resetFrequency: 'never', currentNumber: 1240 },
  { id: 'num2', entityType: 'invoice', prefix: 'INV-', suffix: '-26', paddingLength: 4, resetFrequency: 'yearly', currentNumber: 345 },
  { id: 'num3', entityType: 'receipt', prefix: 'REC-', suffix: '', paddingLength: 4, resetFrequency: 'yearly', currentNumber: 342 },
  { id: 'num4', entityType: 'treatment_plan', prefix: 'TXP-', suffix: '', paddingLength: 4, resetFrequency: 'never', currentNumber: 189 },
  { id: 'num5', entityType: 'estimate', prefix: 'EST-', suffix: '', paddingLength: 4, resetFrequency: 'never', currentNumber: 215 },
  { id: 'num6', entityType: 'task', prefix: 'TSK-', suffix: '', paddingLength: 3, resetFrequency: 'never', currentNumber: 89 },
  { id: 'num7', entityType: 'case', prefix: 'CSE-', suffix: '', paddingLength: 4, resetFrequency: 'never', currentNumber: 102 }
];

const DEFAULT_TOGGLES: FeatureToggle[] = [
  { id: 'ft1', key: 'inventory', label: 'Dental SKU Inventory Module', description: 'Enable batch stock tracking, automatic consumption loggers, and safety reorder alerts.', enabled: true },
  { id: 'ft2', key: 'lab', label: 'Dental Lab Work & Crown Orders', description: 'Track prosthetic castings, crown schedules, dental technician order chains and dispatch dates.', enabled: true },
  { id: 'ft3', key: 'orthodontics', label: 'Specialized Orthodontic Tracker', description: 'Active wire checks, dental model steps tracking, and photographic progression galleries.', enabled: true },
  { id: 'ft4', key: 'implants', label: 'Implantology surgical checklists', description: 'Verify surgical sinus lifts, implant placement torque ratings, and osteointegration delays.', enabled: true },
  { id: 'ft5', key: 'analytics', label: 'Executive Financial Analytics', description: 'Display real-time visual charts, dental service revenues, expense classifications and GST ledgers.', enabled: true },
  { id: 'ft6', key: 'portal', label: 'Patient Self-Service Web Portal', description: 'Allow patients to book appointments, download PDF prescriptions and verify financial receipts.', enabled: true },
  { id: 'ft7', key: 'automation', label: 'SMS & WhatsApp Automation Triggers', description: 'Run automated dispatch cron jobs for booking checks, feedback requests, and holiday reminders.', enabled: true },
  { id: 'ft8', key: 'copilot', label: 'SCDC AI Dental Copilot Agent', description: 'Leverage Gemini LLM models server-side to analyze dental records, extract symptoms, and summarize follow-ups.', enabled: true },
  { id: 'ft9', key: 'dynamic_forms', label: 'Dynamic Clinic Intake Forms', description: 'Establish customized patient checklists, COVID/treatment consents, and medical symptom trees.', enabled: true }
];

// Initialize Storage if necessary
function initializeLocalStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('scdc_master_clinic')) {
    localStorage.setItem('scdc_master_clinic', JSON.stringify(DEFAULT_CLINIC));
  }
  if (!localStorage.getItem('scdc_master_appointments')) {
    localStorage.setItem('scdc_master_appointments', JSON.stringify(DEFAULT_APPOINTMENTS));
  }
  if (!localStorage.getItem('scdc_master_patients')) {
    localStorage.setItem('scdc_master_patients', JSON.stringify(DEFAULT_PATIENTS));
  }
  if (!localStorage.getItem('scdc_master_treatments')) {
    localStorage.setItem('scdc_master_treatments', JSON.stringify(DEFAULT_TREATMENTS));
  }
  if (!localStorage.getItem('scdc_master_billing')) {
    localStorage.setItem('scdc_master_billing', JSON.stringify(DEFAULT_BILLING));
  }
  if (!localStorage.getItem('scdc_master_documents')) {
    localStorage.setItem('scdc_master_documents', JSON.stringify(DEFAULT_DOCUMENTS));
  }
  if (!localStorage.getItem('scdc_master_notifications')) {
    localStorage.setItem('scdc_master_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
  if (!localStorage.getItem('scdc_master_lookups')) {
    localStorage.setItem('scdc_master_lookups', JSON.stringify(DEFAULT_LOOKUPS));
  }
  if (!localStorage.getItem('scdc_master_numbering')) {
    localStorage.setItem('scdc_master_numbering', JSON.stringify(DEFAULT_NUMBERING));
  }
  if (!localStorage.getItem('scdc_master_toggles')) {
    localStorage.setItem('scdc_master_toggles', JSON.stringify(DEFAULT_TOGGLES));
  }
  if (!localStorage.getItem('scdc_master_history')) {
    localStorage.setItem('scdc_master_history', JSON.stringify([]));
  }
}

// ------------------------------------------------------------
// CONFIGURATION SERVICE CONTROLLER
// ------------------------------------------------------------
export const configService = {
  
  initialize: () => {
    initializeLocalStorage();
  },

  // Get full configuration sets (cached & merged)
  getConfig: async (): Promise<MasterConfiguration> => {
    initializeLocalStorage();
    
    // Attempt load from database if connected
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*');
        
        if (!error && data && data.length > 0) {
          // Parse rows into categories
          const clinic = data.find(r => r.category === 'clinic')?.settings || DEFAULT_CLINIC;
          const appointments = data.find(r => r.category === 'appointments')?.settings || DEFAULT_APPOINTMENTS;
          const patients = data.find(r => r.category === 'patients')?.settings || DEFAULT_PATIENTS;
          const treatments = data.find(r => r.category === 'treatments')?.settings || DEFAULT_TREATMENTS;
          const billing = data.find(r => r.category === 'billing')?.settings || DEFAULT_BILLING;
          const documents = data.find(r => r.category === 'documents')?.settings || DEFAULT_DOCUMENTS;
          const notifications = data.find(r => r.category === 'notifications')?.settings || DEFAULT_NOTIFICATIONS;

          return { clinic, appointments, patients, treatments, billing, documents, notifications };
        }
      } catch (e) {
        console.warn('[ConfigService] Supabase config fetch error, falling back to local storage:', e);
      }
    }

    // Local fallback
    return {
      clinic: JSON.parse(localStorage.getItem('scdc_master_clinic') || '{}'),
      appointments: JSON.parse(localStorage.getItem('scdc_master_appointments') || '{}'),
      patients: JSON.parse(localStorage.getItem('scdc_master_patients') || '{}'),
      treatments: JSON.parse(localStorage.getItem('scdc_master_treatments') || '{}'),
      billing: JSON.parse(localStorage.getItem('scdc_master_billing') || '{}'),
      documents: JSON.parse(localStorage.getItem('scdc_master_documents') || '{}'),
      notifications: JSON.parse(localStorage.getItem('scdc_master_notifications') || '{}')
    };
  },

  // Save specific category configurations and log the audit change
  saveConfig: async (
    category: keyof MasterConfiguration, 
    data: any, 
    changedBy: string, 
    changedById: string
  ): Promise<boolean> => {
    initializeLocalStorage();

    const oldData = JSON.parse(localStorage.getItem(`scdc_master_${category}`) || '{}');
    
    // Save locally
    localStorage.setItem(`scdc_master_${category}`, JSON.stringify(data));

    // Save to remote Supabase if connected
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({ category, settings: data, updated_at: new Date().toISOString() });
        
        if (error) throw error;
      } catch (e) {
        console.warn('[ConfigService] Supabase save failed:', e);
      }
    }

    // Generate detailed audits for modified fields
    const historyEntries: ConfigurationHistory[] = [];
    const keys = Object.keys({ ...oldData, ...data });
    
    for (const key of keys) {
      const oldVal = oldData[key];
      const newVal = data[key];
      
      // Compare values
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        historyEntries.push({
          id: Math.floor(Math.random() * 100000000).toString(),
          category,
          fieldName: key,
          oldValue: typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? ''),
          newValue: typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? ''),
          changedBy,
          changedById,
          changedOn: new Date().toISOString()
        });
      }
    }

    // Record audits
    if (historyEntries.length > 0) {
      const existingHistory = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
      const updatedHistory = [...historyEntries, ...existingHistory].slice(0, 500); // Max 500 records
      localStorage.setItem('scdc_master_history', JSON.stringify(updatedHistory));

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('configuration_history')
            .insert(historyEntries.map(e => ({
              category: e.category,
              field_name: e.fieldName,
              old_value: e.oldValue,
              new_value: e.newValue,
              changed_by_name: e.changedBy,
              changed_by_id: e.changedById,
              created_at: e.changedOn
            })));
        } catch (e) {
          console.warn('[ConfigService] Supabase audit write failed:', e);
        }
      }
    }

    return true;
  },

  // Lookup dropdown values manager
  getLookups: async (): Promise<LookupValue[]> => {
    initializeLocalStorage();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('lookup_values')
          .select('*')
          .order('category', { ascending: true });
        if (!error && data) {
          return data.map(item => ({
            id: item.id.toString(),
            category: item.category,
            value: item.value,
            is_active: item.is_active ?? true
          }));
        }
      } catch (e) {
        console.warn('[ConfigService] Supabase lookups fetch error:', e);
      }
    }

    return JSON.parse(localStorage.getItem('scdc_master_lookups') || '[]');
  },

  saveLookup: async (lookup: LookupValue, changedBy: string, changedById: string): Promise<boolean> => {
    initializeLocalStorage();
    const lookups: LookupValue[] = JSON.parse(localStorage.getItem('scdc_master_lookups') || '[]');
    
    let isNew = false;
    let oldVal = '';
    const index = lookups.findIndex(l => l.id === lookup.id);
    if (index >= 0) {
      oldVal = lookups[index].value;
      lookups[index] = lookup;
    } else {
      isNew = true;
      lookups.push(lookup);
    }

    localStorage.setItem('scdc_master_lookups', JSON.stringify(lookups));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('lookup_values')
          .upsert({
            id: lookup.id.match(/^\d+$/) ? Number(lookup.id) : undefined,
            category: lookup.category,
            value: lookup.value,
            is_active: lookup.is_active
          });
      } catch (e) {
        console.warn('[ConfigService] Supabase lookup save failed:', e);
      }
    }

    // Log to Audit History
    const historyEntry: ConfigurationHistory = {
      id: Math.floor(Math.random() * 100000000).toString(),
      category: 'Lookups List',
      fieldName: lookup.category,
      oldValue: isNew ? '(None - New Lookup)' : oldVal,
      newValue: lookup.value,
      changedBy,
      changedById,
      changedOn: new Date().toISOString()
    };

    const existingHistory = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
    localStorage.setItem('scdc_master_history', JSON.stringify([historyEntry, ...existingHistory]));

    return true;
  },

  deleteLookup: async (id: string, changedBy: string, changedById: string): Promise<boolean> => {
    initializeLocalStorage();
    const lookups: LookupValue[] = JSON.parse(localStorage.getItem('scdc_master_lookups') || '[]');
    const deletedLookup = lookups.find(l => l.id === id);
    if (!deletedLookup) return false;

    const filtered = lookups.filter(l => l.id !== id);
    localStorage.setItem('scdc_master_lookups', JSON.stringify(filtered));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('lookup_values')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.warn('[ConfigService] Supabase lookup delete failed:', e);
      }
    }

    // Log to Audit History
    const historyEntry: ConfigurationHistory = {
      id: Math.floor(Math.random() * 100000000).toString(),
      category: 'Lookups List',
      fieldName: deletedLookup.category,
      oldValue: deletedLookup.value,
      newValue: '(Purged / Deleted)',
      changedBy,
      changedById,
      changedOn: new Date().toISOString()
    };

    const existingHistory = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
    localStorage.setItem('scdc_master_history', JSON.stringify([historyEntry, ...existingHistory]));

    return true;
  },

  // Numbering rules configuration
  getNumberingRules: async (): Promise<NumberingRule[]> => {
    initializeLocalStorage();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('numbering_rules')
          .select('*');
        if (!error && data) {
          return data.map(item => ({
            id: item.id.toString(),
            entityType: item.entity_type,
            prefix: item.prefix || '',
            suffix: item.suffix || '',
            resetFrequency: item.reset_frequency || 'never',
            paddingLength: item.padding_length || 4,
            currentNumber: item.current_number || 0
          }));
        }
      } catch (e) {
        console.warn('[ConfigService] Supabase numbering rules fetch failed:', e);
      }
    }

    return JSON.parse(localStorage.getItem('scdc_master_numbering') || '[]');
  },

  saveNumberingRule: async (rule: NumberingRule, changedBy: string, changedById: string): Promise<boolean> => {
    initializeLocalStorage();
    const rules: NumberingRule[] = JSON.parse(localStorage.getItem('scdc_master_numbering') || '[]');
    
    let oldVal = '';
    const index = rules.findIndex(r => r.id === rule.id || r.entityType === rule.entityType);
    if (index >= 0) {
      oldVal = JSON.stringify(rules[index]);
      rules[index] = rule;
    } else {
      rules.push(rule);
    }

    localStorage.setItem('scdc_master_numbering', JSON.stringify(rules));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('numbering_rules')
          .upsert({
            entity_type: rule.entityType,
            prefix: rule.prefix,
            suffix: rule.suffix,
            reset_frequency: rule.resetFrequency,
            padding_length: rule.paddingLength,
            current_number: rule.currentNumber
          });
      } catch (e) {
        console.warn('[ConfigService] Supabase numbering rules save failed:', e);
      }
    }

    // Log audit
    const historyEntry: ConfigurationHistory = {
      id: Math.floor(Math.random() * 100000000).toString(),
      category: 'Numbering Rule',
      fieldName: rule.entityType,
      oldValue: oldVal ? oldVal : '(None - New Entity Rule)',
      newValue: JSON.stringify(rule),
      changedBy,
      changedById,
      changedOn: new Date().toISOString()
    };

    const existingHistory = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
    localStorage.setItem('scdc_master_history', JSON.stringify([historyEntry, ...existingHistory]));

    return true;
  },

  // Feature Toggles Matrix
  getFeatureToggles: async (): Promise<FeatureToggle[]> => {
    initializeLocalStorage();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('*');
        if (!error && data) {
          return data.map(item => ({
            id: item.id.toString(),
            key: item.flag_key,
            label: item.label,
            description: item.description,
            enabled: item.enabled
          }));
        }
      } catch (e) {
        console.warn('[ConfigService] Supabase feature flags fetch failed:', e);
      }
    }

    return JSON.parse(localStorage.getItem('scdc_master_toggles') || '[]');
  },

  saveFeatureToggle: async (toggle: FeatureToggle, changedBy: string, changedById: string): Promise<boolean> => {
    initializeLocalStorage();
    const toggles: FeatureToggle[] = JSON.parse(localStorage.getItem('scdc_master_toggles') || '[]');
    
    let oldVal = '';
    const index = toggles.findIndex(t => t.id === toggle.id || t.key === toggle.key);
    if (index >= 0) {
      oldVal = toggles[index].enabled ? 'Enabled' : 'Disabled';
      toggles[index] = toggle;
    } else {
      toggles.push(toggle);
    }

    localStorage.setItem('scdc_master_toggles', JSON.stringify(toggles));

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('feature_flags')
          .upsert({
            flag_key: toggle.key,
            label: toggle.label,
            description: toggle.description,
            enabled: toggle.enabled
          });
      } catch (e) {
        console.warn('[ConfigService] Supabase feature flags save failed:', e);
      }
    }

    // Log audit
    const historyEntry: ConfigurationHistory = {
      id: Math.floor(Math.random() * 100000000).toString(),
      category: 'Feature Toggles',
      fieldName: toggle.key,
      oldValue: oldVal,
      newValue: toggle.enabled ? 'Enabled' : 'Disabled',
      changedBy,
      changedById,
      changedOn: new Date().toISOString()
    };

    const existingHistory = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
    localStorage.setItem('scdc_master_history', JSON.stringify([historyEntry, ...existingHistory]));

    // Dispatch global event for live changes in other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scdc-feature-toggle-changed', { detail: { key: toggle.key, enabled: toggle.enabled } }));
    }

    return true;
  },

  // Audit Logs
  getAuditHistory: async (): Promise<ConfigurationHistory[]> => {
    initializeLocalStorage();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('configuration_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!error && data) {
          return data.map(item => ({
            id: item.id.toString(),
            category: item.category,
            fieldName: item.field_name,
            oldValue: item.old_value,
            newValue: item.new_value,
            changedBy: item.changed_by_name,
            changedById: item.changed_by_id,
            changedOn: item.created_at
          }));
        }
      } catch (e) {
        console.warn('[ConfigService] Supabase config history fetch failed:', e);
      }
    }

    return JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
  },

  // Perform surgical audit rollback
  rollbackConfig: async (
    historyId: string, 
    changedBy: string, 
    changedById: string
  ): Promise<boolean> => {
    initializeLocalStorage();
    
    const history: ConfigurationHistory[] = JSON.parse(localStorage.getItem('scdc_master_history') || '[]');
    const entry = history.find(h => h.id === historyId);
    if (!entry) return false;

    // Rollback is only supported for direct master configuration categories
    const directCategories: Array<keyof MasterConfiguration> = [
      'clinic', 'appointments', 'patients', 'treatments', 'billing', 'documents', 'notifications'
    ];

    if (directCategories.includes(entry.category as any)) {
      const category = entry.category as keyof MasterConfiguration;
      const currentConfig = JSON.parse(localStorage.getItem(`scdc_master_${category}`) || '{}');
      
      let restoredValue: any;
      try {
        restoredValue = JSON.parse(entry.oldValue);
      } catch (e) {
        restoredValue = entry.oldValue;
        if (restoredValue === 'true') restoredValue = true;
        if (restoredValue === 'false') restoredValue = false;
        if (!isNaN(Number(restoredValue))) restoredValue = Number(restoredValue);
      }

      currentConfig[entry.fieldName] = restoredValue;
      
      // Save configuration
      await configService.saveConfig(category, currentConfig, `${changedBy} (Rollback ID: ${historyId})`, changedById);
      return true;
    } else if (entry.category === 'Feature Toggles') {
      const toggles: FeatureToggle[] = JSON.parse(localStorage.getItem('scdc_master_toggles') || '[]');
      const index = toggles.findIndex(t => t.key === entry.fieldName);
      if (index >= 0) {
        toggles[index].enabled = entry.oldValue === 'Enabled';
        await configService.saveFeatureToggle(toggles[index], `${changedBy} (Rollback ID: ${historyId})`, changedById);
        return true;
      }
    } else if (entry.category === 'Lookups List') {
      const lookups: LookupValue[] = JSON.parse(localStorage.getItem('scdc_master_lookups') || '[]');
      const index = lookups.findIndex(l => l.category === entry.fieldName && l.value === entry.newValue);
      if (index >= 0) {
        if (entry.oldValue === '(Purged / Deleted)') {
          // Re-insert deleted lookup
          const restoredLookup: LookupValue = {
            id: Math.floor(Math.random() * 100000000).toString(),
            category: entry.fieldName,
            value: entry.newValue,
            is_active: true
          };
          await configService.saveLookup(restoredLookup, `${changedBy} (Rollback ID: ${historyId})`, changedById);
          return true;
        } else {
          // Update lookup back to old value
          lookups[index].value = entry.oldValue;
          await configService.saveLookup(lookups[index], `${changedBy} (Rollback ID: ${historyId})`, changedById);
          return true;
        }
      }
    }

    return false;
  }
};
