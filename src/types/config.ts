export interface ClinicSettings {
  clinicName: string;
  logoUrl: string;
  address: string;
  phoneNumbers: string[];
  emails: string[];
  gstNumber: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  weeklyHolidays: string[];
  timeZone: string;
  currency: string;
  language: string;
}

export interface AppointmentSettings {
  statuses: string[];
  statusColors: Record<string, string>;
  slotDuration: number; // in minutes
  workingHoursStart: string;
  workingHoursEnd: string;
  bufferTime: number; // in minutes
  maxAdvanceBookingDays: number;
  cancellationPolicy: string;
  noShowRules: string;
}

export interface PatientSettings {
  idPrefix: string;
  autoNumbering: boolean;
  familyGroupRules: string;
  requiredFields: string[];
  medicalHistoryRequired: boolean;
  duplicateDetectionRules: string[];
}

export interface TreatmentSettings {
  categories: string[];
  codes: Record<string, string>; // e.g. "RCT": "Root Canal Therapy"
  colors: Record<string, string>;
  defaultFollowUpDays: number;
  displayOrder: string[];
  frequentlyUsed: string[];
}

export interface BillingSettings {
  invoicePrefix: string;
  receiptPrefix: string;
  cgstPercent: number;
  sgstPercent: number;
  discountLimitPercent: number;
  allowAdvancePayment: boolean;
  paymentMethods: string[];
  roundingRule: 'none' | 'nearest-1' | 'nearest-5' | 'nearest-10';
}

export interface DocumentSettings {
  prescriptionTemplate: string;
  invoiceTemplate: string;
  consentTemplate: string;
  estimateTemplate: string;
  certificateTemplate: string;
  footerText: string;
  watermark: string;
}

export interface NotificationSettings {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappTemplates: Record<string, string>;
  emailTemplates: Record<string, string>;
  smsTemplates: Record<string, string>;
  reminderTimingHours: number; // e.g., 24
  birthdayMessageEnabled: boolean;
  recallMessageEnabled: boolean;
}

export interface LookupValue {
  id: string;
  category: string; // e.g., 'chief_complaints', 'diagnosis', 'referral_sources', 'occupations', 'blood_groups', 'cities', 'states'
  value: string;
  is_active: boolean;
}

export interface NumberingRule {
  id: string;
  entityType: 'patient' | 'invoice' | 'receipt' | 'treatment_plan' | 'estimate' | 'task' | 'case';
  prefix: string;
  suffix: string;
  resetFrequency: 'never' | 'daily' | 'monthly' | 'yearly';
  paddingLength: number;
  currentNumber: number;
}

export interface FeatureToggle {
  id: string;
  key: string; // e.g., 'inventory', 'lab', 'orthodontics', 'implants', 'analytics', 'portal', 'automation', 'copilot', 'dynamic_forms'
  label: string;
  description: string;
  enabled: boolean;
}

export interface ConfigurationHistory {
  id: string;
  category: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedById: string;
  changedOn: string;
}

export interface MasterConfiguration {
  clinic: ClinicSettings;
  appointments: AppointmentSettings;
  patients: PatientSettings;
  treatments: TreatmentSettings;
  billing: BillingSettings;
  documents: DocumentSettings;
  notifications: NotificationSettings;
}
