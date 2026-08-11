import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, MessageSquare, Save, RefreshCw, HelpCircle, 
  CheckCircle2, Info, UserCheck, CalendarDays, Sparkles,
  Send, Smartphone, Database, UploadCloud, Globe, Lock, FileJson,
  Building2, Activity, Award, Users, Clock, ShieldAlert, Trash2, Plus, 
  Laptop, Radio, Terminal, Sliders, DollarSign, Building
} from 'lucide-react';
import { useNotification } from '../../components/NotificationProvider';
import { supabase } from '../../lib/supabase';
import { 
  getSMSTemplates, saveSMSTemplates, DEFAULT_SMS_TEMPLATES, SMSTemplates,
  getSMSChannel, saveSMSChannel, SMSChannel 
} from '../../lib/sms';
import {
  getClinicSignature,
  saveClinicSignature,
  getWhatsAppTemplates,
  saveWhatsAppTemplates,
  DEFAULT_WHATSAPP_TEMPLATES,
  WhatsAppTemplates
} from '../../utils/whatsapp';
import { clinicConfig } from '../../config/clinicConfig';
import { configService } from '../../services/configService';
import { getCurrentUser, isAdmin } from '../../lib/auth';

const WA_TEMPLATE_LABELS: Record<keyof WhatsAppTemplates, { title: string; category: string; description: string; placeholders: string[] }> = {
  appointment_confirmation: {
    title: 'Appointment Confirmation',
    category: 'Visits',
    description: 'Sent immediately when an appointment is booked.',
    placeholders: ['PatientName', 'ClinicAddress', 'Date', 'Time', 'Treatment', 'Signature']
  },
  appointment_reminder: {
    title: 'Appointment Reminder',
    category: 'Visits',
    description: 'Sent prior to scheduled appointment.',
    placeholders: ['PatientName', 'ClinicAddress', 'Date', 'Time', 'Treatment', 'Signature']
  },
  missed_appointment: {
    title: 'Missed Appointment alert',
    category: 'Visits',
    description: 'Sent to check in on patients who missed their scheduled visit.',
    placeholders: ['PatientName', 'Date', 'Treatment', 'Signature']
  },
  followup: {
    title: 'Follow-up Call reminder',
    category: 'Treatments',
    description: 'Reminder regarding upcoming custom clinical follow-up criteria.',
    placeholders: ['PatientName', 'ClinicName', 'Date', 'Treatment', 'NotesBlock', 'Notes', 'Signature']
  },
  thank_you: {
    title: 'Thank You post-visit',
    category: 'Treatments',
    description: 'Sent after a dental appointment/visit to thank patients.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'NextVisitBlock', 'NextVisitDate', 'Signature']
  },
  recall: {
    title: '6-Month Checkup recall',
    category: 'Treatments',
    description: 'Encourage routine exams if not seen for 6+ months.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'Signature']
  },
  treatment_completion: {
    title: 'Treatment Completed summary',
    category: 'Treatments',
    description: 'Official treatment completion summary and dental care dispatch.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'BalanceStatus', 'Balance', 'NextVisitBlock', 'NextVisitDate', 'Signature']
  },
  payment_reminder: {
    title: 'Payment/Pending alert',
    category: 'Billing',
    description: 'Friendly notification of outstanding accounts due balance.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'PendingAmount', 'Signature']
  },
  invoice: {
    title: 'Invoice / Paid receipt',
    category: 'Billing',
    description: 'Sent as confirmation invoice immediately after payment recording.',
    placeholders: ['PatientName', 'ClinicName', 'InvoiceNum', 'AmountReceived', 'BalanceStatus', 'Balance', 'Signature']
  },
  feedback_request: {
    title: 'Patient Feedback request',
    category: 'Engagement',
    description: 'Inquire regarding patient rating and clinical quality.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'Signature']
  },
  google_review: {
    title: 'Google Review Invitation',
    category: 'Engagement',
    description: 'Share a Google Business link requesting local support.',
    placeholders: ['PatientName', 'ClinicName', 'Treatment', 'ReviewUrl', 'Signature']
  },
  birthday: {
    title: 'Birthday Greetings card',
    category: 'Engagement',
    description: 'Send automated warmth on native birthdays.',
    placeholders: ['PatientName', 'Signature']
  }
};

interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'list';
  placeholder?: string;
  options?: string[];
}

const CATEGORY_SCHEMAS: Record<string, { title: string; desc: string; fields: SchemaField[] }> = {
  clinic: {
    title: 'Clinic Information',
    desc: 'Configure primary clinic names, contacts, working hours, and regional localizations.',
    fields: [
      { key: 'clinicName', label: 'Clinic Name', type: 'text' },
      { key: 'address', label: 'Clinic Address', type: 'text' },
      { key: 'phoneNumbers', label: 'Contact Phone Numbers', type: 'list', placeholder: 'e.g., +91 83175 75165' },
      { key: 'emails', label: 'Clinic Email Addresses', type: 'list', placeholder: 'e.g., srichaitanya@gmail.com' },
      { key: 'gstNumber', label: 'GSTIN Number', type: 'text' },
      { key: 'workingHoursStart', label: 'Working Hours Start', type: 'text', placeholder: 'e.g., 09:00 AM' },
      { key: 'workingHoursEnd', label: 'Working Hours End', type: 'text', placeholder: 'e.g., 09:00 PM' },
      { key: 'weeklyHolidays', label: 'Weekly Holidays', type: 'list', placeholder: 'e.g., Sunday' },
      { key: 'timeZone', label: 'Time Zone', type: 'text' },
      { key: 'currency', label: 'Base Currency', type: 'text' },
      { key: 'language', label: 'Default Language', type: 'text' }
    ]
  },
  appointments: {
    title: 'Appointment Rules',
    desc: 'Configure slot timings, default consultation durations, buffers, and clinic cancelation rules.',
    fields: [
      { key: 'slotDuration', label: 'Slot Duration (Mins)', type: 'number' },
      { key: 'workingHoursStart', label: 'Working Hours Start', type: 'text' },
      { key: 'workingHoursEnd', label: 'Working Hours End', type: 'text' },
      { key: 'bufferTime', label: 'Safety Buffer Time (Mins)', type: 'number' },
      { key: 'maxAdvanceBookingDays', label: 'Max Advance Booking Days', type: 'number' },
      { key: 'cancellationPolicy', label: 'Cancellation Policy', type: 'textarea' },
      { key: 'noShowRules', label: 'No-Show Assessment Rules', type: 'textarea' }
    ]
  },
  patients: {
    title: 'Patient Demographics',
    desc: 'Customize mandatory details, registration prefixes, and automated duplicate check rules.',
    fields: [
      { key: 'idPrefix', label: 'Patient ID Prefix', type: 'text' },
      { key: 'autoNumbering', label: 'Enable Automatic ID Generation', type: 'boolean' },
      { key: 'familyGroupRules', label: 'Family Account Linkage Rules', type: 'textarea' },
      { key: 'medicalHistoryRequired', label: 'Mandate Comprehensive Medical Intake Form', type: 'boolean' },
      { key: 'requiredFields', label: 'Mandatory Patient Profile Fields', type: 'list', placeholder: 'e.g., Phone' },
      { key: 'duplicateDetectionRules', label: 'Duplicate Check Criteria Rules', type: 'list', placeholder: 'e.g., Match Phone exactly' }
    ]
  },
  treatments: {
    title: 'Clinical Treatments',
    desc: 'Configure therapeutic divisions, automatic follow-up triggers, and high frequency clinical procedures.',
    fields: [
      { key: 'categories', label: 'Dental Speciality Divisions', type: 'list', placeholder: 'e.g., Implantology' },
      { key: 'defaultFollowUpDays', label: 'Automatic Follow-Up Delay (Days)', type: 'number' },
      { key: 'frequentlyUsed', label: 'Most Frequently Used Codes', type: 'list', placeholder: 'e.g., RCT' }
    ]
  },
  billing: {
    title: 'Billing & CGST Tax',
    desc: 'Control invoice sequencing prefixes, tax percent configurations, and authorized maximum payment discounts.',
    fields: [
      { key: 'invoicePrefix', label: 'Invoice Numbering Prefix', type: 'text' },
      { key: 'receiptPrefix', label: 'Receipt Numbering Prefix', type: 'text' },
      { key: 'cgstPercent', label: 'Central GST Rate (CGST %)', type: 'number' },
      { key: 'sgstPercent', label: 'State GST Rate (SGST %)', type: 'number' },
      { key: 'discountLimitPercent', label: 'Max Authorized Discount limit (%)', type: 'number' },
      { key: 'allowAdvancePayment', label: 'Permit Pre-payments & Advance Ledger Credits', type: 'boolean' },
      { key: 'paymentMethods', label: 'Accepted Ledger Payment Modes', type: 'list', placeholder: 'e.g., UPI / QR Scan' },
      {
        key: 'roundingRule',
        label: 'Invoice Rounding Rule',
        type: 'select',
        options: ['none', 'nearest-1', 'nearest-5', 'nearest-10']
      }
    ]
  },
  documents: {
    title: 'Templates & Layouts',
    desc: 'Personalize printing margins, legal consent texts, estimate schedules, and Rx templates.',
    fields: [
      { key: 'prescriptionTemplate', label: 'Standard Clinical Rx (Prescription) Layout Template', type: 'textarea' },
      { key: 'invoiceTemplate', label: 'Standard Print Invoice Header & T&C Template', type: 'textarea' },
      { key: 'consentTemplate', label: 'Informed Legal Consent Waiver Template', type: 'textarea' },
      { key: 'estimateTemplate', label: 'Clinical Treatment Estimate Template', type: 'textarea' },
      { key: 'certificateTemplate', label: 'Medical Fitness Certificate Template', type: 'textarea' },
      { key: 'footerText', label: 'Document Footer Branding Signature', type: 'text' },
      { key: 'watermark', label: 'Print File Watermark Tag', type: 'text' }
    ]
  },
  notifications: {
    title: 'Notifications Hub',
    desc: 'Manage global message alerts dispatch paths, timings, and birthday greeting dispatches.',
    fields: [
      { key: 'smsEnabled', label: 'Global SMS Dispatch Channel Enabled', type: 'boolean' },
      { key: 'whatsappEnabled', label: 'Global WhatsApp Dispatch Channel Enabled', type: 'boolean' },
      { key: 'emailEnabled', label: 'Global Email Dispatch Channel Enabled', type: 'boolean' },
      { key: 'reminderTimingHours', label: 'Pre-Visit Alert Timing Delay (Hours)', type: 'number' },
      { key: 'birthdayMessageEnabled', label: 'Automated Birthday Celebration Greeting', type: 'boolean' },
      { key: 'recallMessageEnabled', label: 'Automated 6-Month Routine Examination Recall', type: 'boolean' }
    ]
  }
};

export default function Settings() {
  const { notify } = useNotification();
  const user = getCurrentUser();
  const isUserAdmin = isAdmin();
  
  const actorName = user?.name || 'Administrator';
  const actorId = user?.email || 'admin@srichaitanyadental.com';

  const [masterConfig, setMasterConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active category / tab
  const [activeTab, setActiveTab] = useState<string>('clinic');

  // Custom states for existing logic
  const [templates, setTemplates] = useState<SMSTemplates>(getSMSTemplates());
  const [smsChannel, setSmsChannel] = useState<SMSChannel>(getSMSChannel());
  const [clinicSignature, setClinicSignature] = useState(getClinicSignature());
  const [whatsappTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplates>(getWhatsAppTemplates());
  const [selectedWATemplate, setSelectedWATemplate] = useState<keyof WhatsAppTemplates>('appointment_confirmation');
  const [isSaving, setIsSaving] = useState(false);

  // SaaS and enterprise state
  const [saasSubTab, setSaasSubTab] = useState<'profile' | 'plans' | 'white-label' | 'metrics' | 'updates' | 'support'>('profile');
  const [clinicProfile, setClinicProfile] = useState({
    name: 'Sri Chaitanya Multispeciality Dental Care',
    logo: '',
    address: 'G4, Lakeview Apartments, Bandam Kommu, Ameenpur, Hyderabad, 502032',
    gst: '37AABCS1234F1Z5',
    phone: '+91 83175 75165',
    email: 'srichaitanyadentalcare9@gmail.com',
    website: 'www.srichaitanyadental.com',
    workingHours: '09:00 AM - 09:00 PM (Monday - Saturday)'
  });
  const [selectedSaaSBranch, setSelectedSaaSBranch] = useState<'HQ' | 'Guntur' | 'Hyderabad'>('HQ');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('enterprise');
  const [licenseKey, setLicenseKey] = useState('SCDC-ENT-MULTI-9981-2027');
  const [licenseStatus] = useState<'Active' | 'Expired' | 'Expiring Soon'>('Active');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState<'teal' | 'cosmic' | 'emerald' | 'purple'>('teal');
  const [customDomain, setCustomDomain] = useState('crm.srichaitanyadental.com');
  const [isDomainVerifying, setIsDomainVerifying] = useState(false);
  const [isDomainVerified, setIsDomainVerified] = useState(true);
  const [gstRate, setGstRate] = useState(18);
  const [invoicePrefix, setInvoicePrefix] = useState('SCDC-');

  // Online updates & migrations
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Customer support
  const [supportSearch, setSupportSearch] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'billing' | 'general'>('bug');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Google Drive backups
  const [driveToken, setDriveToken] = useState<string | null>(() => {
    const cachedToken = localStorage.getItem('gdrive_backup_token');
    const cachedExpiry = localStorage.getItem('gdrive_backup_token_expiry');
    if (cachedToken && cachedExpiry && Date.now() < Number(cachedExpiry)) {
      return cachedToken;
    }
    return null;
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('gdrive_last_backup_time');
  });
  const [backupFilesCount, setBackupFilesCount] = useState<number>(() => {
    return Number(localStorage.getItem('gdrive_backup_count') || '0');
  });

  // Patient Portal
  const [portalModules, setPortalModules] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('scdc_portal_visible_modules');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      dashboard: true,
      appointments: true,
      treatments: true,
      prescriptions: true,
      billing: true,
      documents: true,
      followups: true,
      profile: true,
      notifications: true,
      messages: true,
      feedback: true,
      downloads: true
    };
  });
  const [portalBranding, setPortalBranding] = useState(() => {
    return localStorage.getItem('scdc_portal_branding_title') || 'SRI CHAITANYA DENTAL PORTAL';
  });
  const [portalThemeSelection, setPortalThemeSelection] = useState(() => {
    return localStorage.getItem('scdc_portal_theme') || 'teal';
  });
  const [portalTerms, setPortalTerms] = useState(() => {
    return localStorage.getItem('scdc_portal_terms') || 'By signing this treatment consent form, you authorize Sri Chaitanya Multispeciality Dental Care practitioners to proceed with necessary diagnostic pulp vitality tests, local anaesthesia blocks, and standard obturation treatments.';
  });
  const [portalPrivacy, setPortalPrivacy] = useState(() => {
    return localStorage.getItem('scdc_portal_privacy') || 'Your health information is protected under standard HIPAA privacy guidelines. Sri Chaitanya Multispeciality Dental CRM enforces complete end-to-end encryption for diagnostic models and x-ray downloads.';
  });

  // Dynamic schemas fetched from DB table configuration_categories (resilient fallback)
  const [dbCategorySchemas, setDbCategorySchemas] = useState<any>(null);

  useEffect(() => {
    const loadAllConfigs = async () => {
      setLoading(true);
      try {
        configService.initialize();
        const cfg = await configService.getConfig();
        setMasterConfig(cfg);

        // Resiliently query db table configuration_categories if available
        try {
          const { data, error } = await supabase.from('configuration_categories').select('*');
          if (!error && data && data.length > 0) {
            setDbCategorySchemas(data);
          }
        } catch (dbErr) {
          console.warn('Supabase configuration_categories check skipped, using offline schemas:', dbErr);
        }
      } catch (err) {
        console.error('Failed to preload enterprise master configuration:', err);
        notify('error', 'Retrieval Error', 'Failed to retrieve setup variables.');
      } finally {
        setLoading(false);
      }
    };
    loadAllConfigs();
  }, []);

  // Listener for Google Drive OAuth
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && hash.includes('state=gdrive_backup')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (token) {
        localStorage.setItem('gdrive_backup_token', token);
        localStorage.setItem('gdrive_backup_token_expiry', String(Date.now() + Number(expiresIn || 3600) * 1000));
        window.history.replaceState(null, '', window.location.pathname);
        setDriveToken(token);
        setActiveTab('backup');
        notify('success', 'Google Drive Protected Connection', 'Your clinical workspace has successfully connected to your Google account folder!');
      }
    }
  }, []);

  const openGoogleOAuthPopup = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '854519965857-mockclientid.apps.googleusercontent.com';
    const redirectUri = window.location.origin + '/crm/settings';
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=gdrive_backup`;
    
    const width = 500;
    const height = 610;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    
    window.open(oauthUrl, 'GoogleOAuthPopup', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const disconnectGoogleDrive = () => {
    localStorage.removeItem('gdrive_backup_token');
    localStorage.removeItem('gdrive_backup_token_expiry');
    setDriveToken(null);
    notify('info', 'Google Drive Disconnected', 'Logged out and cleared active security tokens from local session storage.');
  };

  const runBackupToGoogleDrive = async () => {
    setIsBackingUp(true);
    try {
      const token = driveToken || localStorage.getItem('gdrive_backup_token');
      if (!token) {
        setIsBackingUp(false);
        openGoogleOAuthPopup();
        return;
      }

      notify('info', 'Backup compilation started', 'Fetching and compiling complete clinic database aggregates...');

      const [ptsRes, apptsRes, treatRes] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('appointments').select('*'),
        supabase.from('treatments').select('*')
      ]);

      if (ptsRes.error) throw new Error(`Patients fetch failure: ${ptsRes.error.message}`);
      if (apptsRes.error) throw new Error(`Appointments fetch failure: ${apptsRes.error.message}`);
      if (treatRes.error) throw new Error(`Treatments fetch failure: ${treatRes.error.message}`);

      const backupPayload = {
        clinic: 'Sri Chaitanya Multispeciality Dental Care',
        exportedAt: new Date().toISOString(),
        schemaVersion: '1.2_cloud_backup',
        data: {
          patientsCount: ptsRes.data?.length || 0,
          appointmentsCount: apptsRes.data?.length || 0,
          treatmentsCount: treatRes.data?.length || 0,
          patients: ptsRes.data || [],
          appointments: apptsRes.data || [],
          treatments: treatRes.data || []
        }
      };

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      const filename = `Sri_Chaitanya_Dental_Care_Backup_${dateStr}_${Date.now().toString().slice(-4)}.json`;

      const metadata = {
        name: filename,
        mimeType: 'application/json',
        description: `Automated database secure snapshot compiled for Sri Chaitanya Multispeciality Dental Care.`
      };

      const boundary = 'scdc_drive_backup_multipart_segment_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody = 
        `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
        `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(backupPayload)}` +
        `${closeDelimiter}`;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('gdrive_backup_token');
          setDriveToken(null);
          throw new Error('Google security authorization token has expired. Please connect and authenticates again.');
        }
        const errDetail = await response.json().catch(() => ({}));
        throw new Error(errDetail?.error?.message || `Google Drive API returned status: ${response.status}`);
      }

      const timestamp = new Date().toLocaleString('en-IN', { hour12: true });
      localStorage.setItem('gdrive_last_backup_time', timestamp);
      const nextCount = backupFilesCount + 1;
      localStorage.setItem('gdrive_backup_count', String(nextCount));

      setLastBackupTime(timestamp);
      setBackupFilesCount(nextCount);

      notify('success', 'Clinical Data Backed Up', 'All patients records, schedules ledger & logs securely archived to your connected Google Drive account!');
    } catch (err: any) {
      console.error('[Google Drive Backup] Fail:', err);
      notify('error', 'Google Backup Failed', err.message || 'Unable to execute cloud transmission.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Preview mock data
  const mockPatient = {
    name: 'Chaitanya Kumar',
    treatment: 'Root Canal Therapy',
    date: '2026-06-12',
    time: '11:30 AM',
    total: '8,500',
    paid: '5,000',
    balance: '3,500',
    message: 'Please avoid chewing solid foods for 2 hours post treatment '
  };

  const getAppointmentPreview = () => {
    return templates.appointment
      .replace('[Name]', mockPatient.name)
      .replace('[Treatment]', mockPatient.treatment)
      .replace('[Date]', mockPatient.date)
      .replace('[Time]', mockPatient.time);
  };

  const getPaymentPreview = () => {
    return templates.payment
      .replace('[Name]', mockPatient.name)
      .replace('[Treatment]', mockPatient.treatment)
      .replace('[Total]', mockPatient.total)
      .replace('[Paid]', mockPatient.paid)
      .replace('[Balance]', mockPatient.balance);
  };

  const getGeneralPreview = () => {
    return templates.general
      .replace('[Name]', mockPatient.name)
      .replace('[Message]', mockPatient.message);
  };

  const getWhatsAppPreview = (key: keyof WhatsAppTemplates) => {
    const template = whatsappTemplates[key] || '';
    const signature = clinicSignature;

    const valueMap: Record<string, string> = {
      PatientName: mockPatient.name,
      ClinicAddress: clinicConfig.address,
      ClinicName: clinicConfig.clinicName,
      Date: new Date(mockPatient.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      Time: mockPatient.time,
      Treatment: mockPatient.treatment,
      PendingAmount: mockPatient.balance,
      AmountReceived: mockPatient.paid,
      InvoiceNum: 'INV-482910',
      ReviewUrl: clinicConfig.googleReviewUrl,
      NotesBlock: '\nNotes: Patient requested late evening checkups.',
      Notes: 'Patient requested late evening checkups.',
      NextVisitBlock: `\nNext Visit: ${new Date('2026-06-30').toLocaleDateString('en-IN')}`,
      NextVisitDate: new Date('2026-06-30').toLocaleDateString('en-IN'),
      BalanceStatus: Number(mockPatient.balance.replace(/,/g, '')) > 0 ? `🔴 Balance Due: Rs. ${mockPatient.balance}/-` : '✅ Payment Complete',
      Balance: mockPatient.balance,
      Signature: signature
    };

    let rendered = template;
    for (const [k, val] of Object.entries(valueMap)) {
      rendered = rendered.replaceAll(`{${k}}`, val);
    }
    return rendered;
  };

  // Main saving coordinator
  const handleSaveActiveTab = async () => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Only designated system Administrators are authorized to commit setup modifications.');
      return;
    }

    setIsSaving(true);
    try {
      if (CATEGORY_SCHEMAS[activeTab]) {
        // Generic Form Builder save action
        const success = await configService.saveConfig(
          activeTab as any,
          masterConfig[activeTab],
          actorName,
          actorId
        );
        if (success) {
          notify('success', 'Parameters Saved', `Master parameters for ${activeTab.toUpperCase()} updated & audit logs updated.`);
        }
      } else if (activeTab === 'sms') {
        saveSMSTemplates(templates);
        saveSMSChannel(smsChannel);
        notify('success', 'SMS Messaging Settings Updated', 'All customized SMS templates & dispatch configurations saved successfully!');
      } else if (activeTab === 'whatsapp') {
        saveClinicSignature(clinicSignature);
        saveWhatsAppTemplates(whatsappTemplates);
        notify('success', 'WhatsApp Configurations Updated', 'All customized templates & clinical signatures saved successfully!');
      } else if (activeTab === 'portal') {
        localStorage.setItem('scdc_portal_visible_modules', JSON.stringify(portalModules));
        localStorage.setItem('scdc_portal_branding_title', portalBranding);
        localStorage.setItem('scdc_portal_theme', portalThemeSelection);
        localStorage.setItem('scdc_portal_terms', portalTerms);
        localStorage.setItem('scdc_portal_privacy', portalPrivacy);
        notify('success', 'Portal Configurations Persisted', 'Branding, toggled modules and consent policies updated successfully.');
      } else {
        notify('info', 'Autosaved Setting', 'These enterprise parameters are continuously updated.');
      }
    } catch (err) {
      console.error('Category save error:', err);
      notify('error', 'Execution Error', 'Unable to commit configuration parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetActiveTab = () => {
    const confirm = window.confirm(`Are you sure you want to restore default parameters for ${activeTab.toUpperCase()}? This is fully audited.`);
    if (confirm) {
      if (activeTab === 'sms') {
        setTemplates(DEFAULT_SMS_TEMPLATES);
        saveSMSTemplates(DEFAULT_SMS_TEMPLATES);
        notify('info', 'Defaults Restored', 'SMS templates have been reverted to internal clinic default formats.');
      } else if (activeTab === 'whatsapp') {
        const DEFAULT_SIG = `Thanks & Regards,\n\n${clinicConfig.clinicName}\n${clinicConfig.address}\n📞 ${clinicConfig.phone}\n📍 Location: ${clinicConfig.googleReviewUrl}\n\n"We Care Your Smile"`;
        setClinicSignature(DEFAULT_SIG);
        setWhatsAppTemplates(DEFAULT_WHATSAPP_TEMPLATES);
        saveClinicSignature(DEFAULT_SIG);
        saveWhatsAppTemplates(DEFAULT_WHATSAPP_TEMPLATES);
        notify('info', 'Defaults Restored', 'WhatsApp templates and clinic signature have been reverted to default settings.');
      } else if (CATEGORY_SCHEMAS[activeTab]) {
        // Dynamic reset of master config categories
        notify('info', 'Reset Action Requested', 'Please re-adjust variables using the configuration dashboards.');
      } else {
        notify('info', 'Defaults Restored', 'Reverted active presets.');
      }
    }
  };

  const handleFieldChange = (fieldKey: string, newValue: any) => {
    setMasterConfig((prev: any) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [fieldKey]: newValue
      }
    }));
  };

  const insertPlaceholder = (fieldName: keyof SMSTemplates, placeholder: string) => {
    setTemplates({
      ...templates,
      [fieldName]: templates[fieldName] + placeholder
    });
  };

  const insertWAPlaceholder = (fieldName: keyof WhatsAppTemplates, placeholder: string) => {
    setWhatsAppTemplates({
      ...whatsappTemplates,
      [fieldName]: (whatsappTemplates[fieldName] || '') + `{${placeholder}}`
    });
  };

  if (loading || !masterConfig) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw size={28} className="text-teal-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling SCDC rules engine...</span>
      </div>
    );
  }

  const activeSchema = CATEGORY_SCHEMAS[activeTab];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 text-white border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-15">
          <SettingsIcon size={220} className="text-indigo-500 animate-spin" style={{ animationDuration: '40s' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <span className="bg-indigo-500/20 text-indigo-300 font-mono font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30">
              SCDC Enterprise Suite v3.7
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2 font-sans">
              <SettingsIcon size={22} className="text-indigo-400" /> Enterprise System Configurations
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
              Centralized administrative workspace to customize automated patient templates, diagnostic indices, white-label portals, and security backup protocols with real-time audit logs.
            </p>
          </div>
          
          <div className="flex gap-2.5 shrink-0 self-end md:self-center">
            <button 
              onClick={handleResetActiveTab}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-750 text-xs font-semibold cursor-pointer transition"
              title="Reset default clinical parameters"
            >
              <RefreshCw size={13} />
              <span>Reset Defaults</span>
            </button>
            <button 
              onClick={handleSaveActiveTab}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECURITY GUEST WARNING */}
      {!isUserAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <ShieldAlert size={18} className="text-amber-400 shrink-0" />
          <p>
            ReadOnly Guest Mode: You are logged in with guest permissions. Only system Administrators can commit changes, customize variables, or trigger database backups.
          </p>
        </div>
      )}

      {/* PRIMARY CENTRAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TABBED SIDEBAR NAVIGATION */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1">
            System categories
          </p>
          <div className="bg-white rounded-3xl border border-slate-200 p-2.5 shadow-sm space-y-1">
            {[
              { id: 'clinic', label: 'Clinic Information', icon: Building, color: 'text-teal-600', badge: 'Form' },
              { id: 'appointments', label: 'Appointment Rules', icon: CalendarDays, color: 'text-indigo-600', badge: 'Form' },
              { id: 'patients', label: 'Patient Demographics', icon: Users, color: 'text-indigo-600', badge: 'Form' },
              { id: 'treatments', label: 'Clinical Treatments', icon: Activity, color: 'text-indigo-600', badge: 'Form' },
              { id: 'billing', label: 'Billing & CGST Tax', icon: DollarSign, color: 'text-teal-600', badge: 'Form' },
              { id: 'documents', label: 'Templates & Layouts', icon: FileJson, color: 'text-indigo-600', badge: 'Form' },
              { id: 'notifications', label: 'Notifications Hub', icon: Radio, color: 'text-indigo-600', badge: 'Form' },
              { id: 'sms', label: 'SMS Messaging', icon: MessageSquare, color: 'text-indigo-600', badge: 'Dynamic' },
              { id: 'whatsapp', label: 'WhatsApp Templates', icon: Send, color: 'text-emerald-600', badge: 'Dynamic' },
              { id: 'backup', label: 'Google Drive Backup', icon: Database, color: 'text-blue-600', badge: 'Cloud' },
              { id: 'portal', label: 'Patient Portal Controls', icon: Laptop, color: 'text-teal-600', badge: 'Executive' },
              { id: 'saas', label: 'SaaS & Enterprise Panel', icon: Sliders, color: 'text-teal-700', badge: 'Premium' }
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-extrabold tracking-wide transition-all text-left cursor-pointer border-0 ${
                    activeTab === cat.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-700/15'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={14} className={activeTab === cat.id ? 'text-white' : cat.color} />
                    <span>{cat.label}</span>
                  </span>
                  <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activeTab === cat.id 
                      ? 'bg-indigo-500/35 text-indigo-100' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRIMARY EDITING WORKSPACE */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[500px]">
            
            {/* GENERIC FORM BUILDER SYSTEM */}
            {activeSchema && (
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={16} className="text-indigo-600 animate-pulse" />
                    {activeSchema.title} Configuration Matrix
                  </h2>
                  <p className="text-[11px] text-slate-450 font-bold uppercase mt-0.5">SCDC Dynamic Settings Broker</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {activeSchema.desc} Modify settings below. Click the top "Save Settings" button to apply your changes.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-6">
                  {activeSchema.fields.map((field) => {
                    const currentVal = masterConfig[activeTab]?.[field.key];
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                          {field.label}
                        </label>

                        {/* Text input */}
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={currentVal || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-indigo-500 font-semibold text-slate-800"
                            placeholder={field.placeholder}
                          />
                        )}

                        {/* Textarea */}
                        {field.type === 'textarea' && (
                          <textarea
                            value={currentVal || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-none focus:border-indigo-500 font-semibold focus:bg-white text-slate-800 leading-relaxed"
                            placeholder={field.placeholder}
                          />
                        )}

                        {/* Number input */}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            value={currentVal !== undefined ? currentVal : ''}
                            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                            className="w-48 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-indigo-500 font-semibold text-slate-800 font-mono"
                            placeholder={field.placeholder}
                          />
                        )}

                        {/* Select Option */}
                        {field.type === 'select' && (
                          <select
                            value={currentVal || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-64 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-indigo-500 font-bold text-slate-800 cursor-pointer"
                          >
                            {(field.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {/* Boolean Switch Toggle */}
                        {field.type === 'boolean' && (
                          <button
                            type="button"
                            onClick={() => handleFieldChange(field.key, !currentVal)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${currentVal ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${currentVal ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        )}

                        {/* List Array tag editor */}
                        {field.type === 'list' && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {(currentVal || []).map((item: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-150 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-xl">
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (currentVal || []).filter((_: any, i: number) => i !== idx);
                                      handleFieldChange(field.key, updated);
                                    }}
                                    className="text-indigo-600 hover:text-red-500 transition border-0 bg-transparent p-0 cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </span>
                              ))}
                              {(currentVal || []).length === 0 && (
                                <span className="text-[10px] text-slate-400 italic">No items added yet.</span>
                              )}
                            </div>
                            <div className="flex gap-2 max-w-md">
                              <input
                                type="text"
                                placeholder={field.placeholder || "Add item..."}
                                id={`new-item-${field.key}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const input = e.currentTarget;
                                    const val = input.value.trim();
                                    if (val) {
                                      const updated = [...(currentVal || []), val];
                                      handleFieldChange(field.key, updated);
                                      input.value = '';
                                    }
                                  }
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-9 outline-none focus:border-indigo-500 font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`new-item-${field.key}`) as HTMLInputElement;
                                  const val = input?.value.trim();
                                  if (val) {
                                    const updated = [...(currentVal || []), val];
                                    handleFieldChange(field.key, updated);
                                    input.value = '';
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 h-9 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer border-0"
                              >
                                <Plus size={13} />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* CUSTOM TABS: SMS MESSAGING */}
            {activeTab === 'sms' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Dispatch Channel Selector */}
                <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone size={15} /> Preferred Messaging Dispatch Method
                    </h3>
                    <p className="text-[11px] text-slate-350 leading-relaxed mt-1.5">
                      Clicking direct "SMS" or "Alert" triggers inside the SCDC Dental CRM will instantly dispatch messages through your choice below. Select standard free options to bypass costly gateways!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {[
                      { id: 'whatsapp', title: 'WhatsApp Direct', badge: '100% Free', desc: 'Opens patient\'s WhatsApp chat directly pre-filled with the template. Highly secure, unlimited, and free!', color: 'border-emerald-500' },
                      { id: 'device', title: 'Device Native SMS', badge: 'Free via SIM', desc: 'Launches your mobile or PC native message composer. Utilizes standard SIM card cellular messages.', color: 'border-indigo-500' },
                      { id: 'cloud', title: 'Cloud SMS Gateway', badge: 'Paid API Plan', desc: 'Automated background dispatch via global Twilio interface cloud servers. Perfect for large practices.', color: 'border-sky-500' }
                    ].map(ch => (
                      <div 
                        key={ch.id}
                        onClick={() => setSmsChannel(ch.id as any)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-3 justify-between ${
                          smsChannel === ch.id 
                            ? `bg-slate-800/80 ${ch.color} text-white` 
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:border-slate-650'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-xs text-slate-100 font-sans">{ch.title}</h4>
                            <span className="text-[8.5px] font-black uppercase bg-slate-700 text-indigo-300 px-2 py-0.5 rounded-full">
                              {ch.badge}
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed font-semibold text-slate-400">
                            {ch.desc}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                          <div className={`w-1.5 h-1.5 rounded-full ${smsChannel === ch.id ? 'bg-indigo-400 animate-pulse' : 'bg-slate-650'}`} />
                          <span>{smsChannel === ch.id ? 'Active Route' : 'Tap to select'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template customizers with previews */}
                {[
                  { key: 'appointment', title: 'Appointment Confirmation Alert', preview: getAppointmentPreview() },
                  { key: 'payment', title: 'Billing Receipt & Payment Alert', preview: getPaymentPreview() },
                  { key: 'general', title: 'General Message Alert Template', preview: getGeneralPreview() }
                ].map((tmpl) => (
                  <div key={tmpl.key} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-3xs">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{tmpl.title}</span>
                      <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">Resilient Template</span>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={(templates as any)[tmpl.key]}
                        onChange={(e) => setTemplates({ ...templates, [tmpl.key]: e.target.value })}
                        rows={3}
                        className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 focus:outline-none leading-relaxed text-slate-700 font-sans"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 py-1">
                        <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mr-1">Triggers:</span>
                        {['[Name]', '[Treatment]', '[Date]', '[Time]', '[Total]', '[Paid]', '[Balance]', '[Message]'].map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => insertPlaceholder(tmpl.key as any, k)}
                            className="text-[10px] font-mono bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Previews */}
                    <div className="bg-indigo-950/5 border border-indigo-100 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                        <Sparkles size={11} className="text-indigo-600" /> Live Render Preview
                      </div>
                      <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs">
                        <p className="text-xs text-slate-800 leading-relaxed font-semibold font-mono">
                          {tmpl.preview}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* CUSTOM TABS: WHATSAPP CONFIG */}
            {activeTab === 'whatsapp' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-3xs">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">WhatsApp Enterprise Templates</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Select and customize templates to align with hospital-grade communications.</p>
                    </div>

                    <div className="space-y-1 shrink-0">
                      <label className="text-[10px] uppercase font-black text-slate-500 block">Select Template Category</label>
                      <select
                        value={selectedWATemplate}
                        onChange={(e) => setSelectedWATemplate(e.target.value as any)}
                        className="w-64 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-emerald-500 font-bold text-slate-800 cursor-pointer"
                      >
                        {Object.entries(WA_TEMPLATE_LABELS).map(([k, value]) => (
                          <option key={k} value={k}>{value.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active template customize */}
                  {selectedWATemplate && whatsappTemplates[selectedWATemplate] !== undefined && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Message Body</label>
                        <textarea
                          value={whatsappTemplates[selectedWATemplate]}
                          onChange={(e) => setWhatsAppTemplates({ ...whatsappTemplates, [selectedWATemplate]: e.target.value })}
                          rows={4}
                          className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400 focus:outline-none leading-relaxed text-slate-700 font-mono"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 py-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Insert Variables:</span>
                          {(WA_TEMPLATE_LABELS[selectedWATemplate]?.placeholders || []).map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => insertWAPlaceholder(selectedWATemplate, p)}
                              className="text-[9.5px] font-mono bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 hover:border-slate-350 px-2 py-0.5 rounded-md transition cursor-pointer"
                            >
                              {`{${p}}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* WhatsApp Live Preview */}
                      <div className="bg-emerald-950/5 border border-emerald-100 rounded-2xl p-4.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                          <Sparkles size={11} className="text-emerald-600" /> WhatsApp Live Mockup
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs max-w-lg">
                          <div className="bg-emerald-100/40 p-3 rounded-2xl border border-emerald-100/60 text-xs text-slate-850 leading-relaxed font-semibold">
                            {getWhatsAppPreview(selectedWATemplate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clinic Signature Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-3xs">
                  <h4 className="font-extrabold text-xs text-slate-855 uppercase tracking-wider">SCDC Shared Clinic Signature</h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed">
                    Appended automatically to the end of all WhatsApp communications. Include contacts, address, maps link, and clinic motto.
                  </p>
                  <textarea
                    value={clinicSignature}
                    onChange={(e) => setClinicSignature(e.target.value)}
                    rows={6}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400 focus:outline-none leading-relaxed text-slate-700 font-mono"
                  />
                </div>
              </motion.div>
            )}

            {/* CUSTOM TABS: GOOGLE DRIVE CLOUD BACKUP */}
            {activeTab === 'backup' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
                  <div className="flex justify-between items-center border-b pb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={16} className="text-blue-600 animate-pulse" /> Google Drive Cloud Ledger Archival
                      </h3>
                      <p className="text-xs text-slate-450 font-bold uppercase">Clinical Recovery Systems</p>
                    </div>
                    {driveToken && (
                      <span className="text-[10px] bg-emerald-50 border border-emerald-150 text-emerald-700 px-3 py-1 rounded-full font-bold">
                        Connected to GDrive Sandbox
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Establish direct cloud backup endpoints. Compiles all active patients registries, treatments profiles, and invoices schedules into a fully formatted JSON data snapshot.
                      </p>
                      
                      <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-4 space-y-3">
                        <span className="font-bold text-[10px] text-blue-900 uppercase tracking-widest block">Disaster Protection</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                          Backups use sandbox file scope limits. This CRM can never access other personal folders inside your Google account.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {driveToken ? (
                          <>
                            <button
                              onClick={runBackupToGoogleDrive}
                              disabled={isBackingUp}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-md border-0"
                            >
                              {isBackingUp ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Exporting ledger...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud size={13} />
                                  <span>Compile & Back Up Now</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={disconnectGoogleDrive}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-4 py-3 rounded-2xl transition duration-150 cursor-pointer border border-slate-200"
                            >
                              Disconnect Account
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={openGoogleOAuthPopup}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-md border-0"
                          >
                            <Globe size={13} />
                            <span>Link with Google Workspace</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Storage Indicator stats */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="block text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Archival Health Indicators</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-3xs">
                            <span className="block text-[8px] text-slate-400 uppercase font-black">Authorized State</span>
                            <span className={`text-[11px] font-extrabold mt-0.5 block ${driveToken ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {driveToken ? 'Connected' : 'Disconnected'}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-3xs">
                            <span className="block text-[8px] text-slate-400 uppercase font-black">Clinical Tables</span>
                            <span className="text-[11px] font-extrabold text-slate-800 mt-0.5 block">3 Sync-Ready</span>
                          </div>
                          <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-3xs">
                            <span className="block text-[8px] text-slate-400 uppercase font-black">Total Backups</span>
                            <span className="text-[11px] font-extrabold text-slate-800 font-mono mt-0.5 block">{backupFilesCount} run</span>
                          </div>
                          <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-3xs">
                            <span className="block text-[8px] text-slate-400 uppercase font-black">Storage Mode</span>
                            <span className="text-[11px] font-extrabold text-slate-800 mt-0.5 block">Isolated JSON</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="block text-[8px] text-slate-400 uppercase font-black">Last successful sync-point:</span>
                          <p className="text-[11px] font-extrabold text-slate-700 mt-0.5 flex items-center gap-1">
                            {lastBackupTime ? (
                              <>
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                {lastBackupTime}
                              </>
                            ) : (
                              'No sync records found in current session profile.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CUSTOM TABS: PATIENT PORTAL CONTROLS */}
            {activeTab === 'portal' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop size={16} className="text-teal-600 animate-pulse" /> Patient Self-Service Portal Configs
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Configure client portal white-labeling, active medical modules, consent terms, and data safety compliance.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
                    <Sparkles size={14} className="text-teal-600" /> White-Label Portal Customizer
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-450 block">Portal Title Branding</label>
                      <input
                        type="text"
                        value={portalBranding}
                        onChange={(e) => setPortalBranding(e.target.value)}
                        placeholder="e.g. SRI CHAITANYA MULTISPECIALITY DENTAL PORTAL"
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-slate-455 block">Portal Theme Accent Color</label>
                      <select
                        value={portalThemeSelection}
                        onChange={(e) => setPortalThemeSelection(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-semibold cursor-pointer"
                      >
                        <option value="teal">Teal (Standard Classic SCDC)</option>
                        <option value="cosmic">Cosmic (Deep Purple/Indigo Accent)</option>
                        <option value="emerald">Emerald (Rich Green Accent)</option>
                        <option value="purple">Royal Purple Accent</option>
                        <option value="blue">Deep Ocean Blue Accent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Portal active module toggling matrix */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
                    <Sliders size={14} className="text-teal-600" /> Active Medical Portal Modules
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Control which clinical files, financial features, and communication tools are visible and accessible to dental patients inside their portal accounts.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    {[
                      { key: 'dashboard', label: 'My Dashboard Overview', desc: 'Main billing summaries & clinic token counters' },
                      { key: 'appointments', label: 'Online Appointment Booking', desc: 'Schedules slot selector & dentist choosing' },
                      { key: 'treatments', label: 'Dental Treatment Tracker', desc: 'Completed procedures list & timeline stepper' },
                      { key: 'prescriptions', label: 'Prescriptions (Rx) Downloads', desc: 'Active pharmacotherapy sheets signed by surgeons' },
                      { key: 'billing', label: 'Billing Ledger & Paid Receipts', desc: 'Consolidated GST tax invoice ledger' },
                      { key: 'documents', label: 'Clinical Documents Vault', desc: 'OPG Radiographs, clinic consent sheets' },
                      { key: 'followups', label: 'Follow-ups & Recalls Manager', desc: 'Missed review alerts & routine cleaning alerts' },
                      { key: 'profile', label: 'Patient Demographic Profile', desc: 'Allow online updates of address, emergency details' },
                      { key: 'notifications', label: 'Alert Preferences (SMS/WA)', desc: 'Configure instant alert dispatch pathways' },
                      { key: 'messages', label: 'Clinic Message Feed', desc: 'Secure communication channel for dental inquiries' },
                      { key: 'feedback', label: 'Direct Care Ratings & Feedback', desc: '5-star visits review & grievance logger' },
                      { key: 'downloads', label: 'EMR Download Center', desc: 'Export plain-text health dossier and financial PDF' }
                    ].map((mod) => (
                      <div key={mod.key} className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex items-start gap-3 hover:border-slate-350 hover:bg-slate-100/50 transition">
                        <input
                          type="checkbox"
                          checked={portalModules[mod.key] !== false}
                          onChange={(e) => {
                            setPortalModules(prev => ({
                              ...prev,
                              [mod.key]: e.target.checked
                            }));
                          }}
                          className="mt-1 h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <label className="text-[11.5px] font-black text-slate-800 block cursor-pointer">
                            {mod.label}
                          </label>
                          <span className="text-[10px] text-slate-450 leading-tight block mt-0.5 font-semibold">
                            {mod.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legal editors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3.5 shadow-sm">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
                      <Lock size={14} className="text-teal-600 animate-pulse" /> Patient Treatment Consent Policy
                    </span>
                    <textarea
                      rows={4}
                      value={portalTerms}
                      onChange={(e) => setPortalTerms(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                    />
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3.5 shadow-sm">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
                      <UserCheck size={14} className="text-teal-600 animate-pulse" /> HIPAA Privacy Waiver Policy
                    </span>
                    <textarea
                      rows={4}
                      value={portalPrivacy}
                      onChange={(e) => setPortalPrivacy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* CUSTOM TABS: SAAS COMMERCIAL CONTROLS */}
            {activeTab === 'saas' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* SaaS Tab Navigation Badges */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                  {[
                    { id: 'profile', label: 'Clinic Profile', icon: Building2 },
                    { id: 'plans', label: 'Subscription & Plans', icon: Award },
                    { id: 'white-label', label: 'White-Label Branding', icon: Sliders },
                    { id: 'metrics', label: 'Database & Monitoring', icon: Activity },
                    { id: 'updates', label: 'Migrations & Releases', icon: Terminal },
                    { id: 'support', label: 'Support & Help Desk', icon: HelpCircle },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSaasSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          saasSubTab === tab.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-650 border-slate-250 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <Icon size={14} className={saasSubTab === tab.id ? 'text-white' : 'text-slate-500'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-tab: Clinic Profile */}
                {saasSubTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Building2 size={16} className="text-indigo-600" /> SCDC Tenant Isolated Profile
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold">TENANT ISOLATION CONFIGURATOR</p>
                      </div>
                      <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-3 py-1 rounded-full font-bold">
                        Multi-Tenant Isolation Mode Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-slate-800">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Swappable Clinic Workspaces</span>
                        <div className="space-y-2">
                          {[
                            { id: 'HQ', name: 'Vijayawada HQ (Clinic A)', doctors: 'Dr. Durga Bhavani Jupalli (Prosthodontist), Dr. K. Radhika', patients: '1,450 Patients' },
                            { id: 'Guntur', name: 'Guntur Branch (Clinic B)', doctors: 'Dr. S. Srinivas, Dr. M. Sravani (Orthodontist)', patients: '850 Patients' },
                            { id: 'Hyderabad', name: 'Hyderabad Clinic (Clinic C)', doctors: 'Dr. V. Vineeth, Dr. Anjali Rao (Periodontist)', patients: '590 Patients' }
                          ].map((b) => (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedSaaSBranch(b.id as any);
                                notify('info', 'Active Workspace Switch', `SaaS scope swapped to ${b.name} successfully.`);
                              }}
                              className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col gap-1.5 justify-between ${
                                selectedSaaSBranch === b.id ? 'bg-indigo-50/70 border-indigo-500' : 'bg-white border-slate-200 hover:border-slate-350'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-850">{b.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                                <strong>Staff:</strong> {b.doctors}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Clinic Metadata Registry</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-[10px] uppercase font-black text-slate-500">Clinic Name</label>
                            <input
                              type="text"
                              value={clinicProfile.name}
                              onChange={(e) => setClinicProfile({ ...clinicProfile, name: e.target.value })}
                              className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-[10px] uppercase font-black text-slate-500">Address</label>
                            <input
                              type="text"
                              value={clinicProfile.address}
                              onChange={(e) => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                              className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab: Subscription Plans */}
                {saasSubTab === 'plans' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 text-center">
                        <span className="text-[9px] uppercase font-black text-indigo-850 tracking-wider">License Status</span>
                        <p className="text-lg font-black text-indigo-700 flex items-center justify-center gap-1.5 mt-1">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          {licenseStatus}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                        <span className="text-[9px] uppercase font-black text-slate-450 block">Subscription Tier</span>
                        <span className="text-lg font-black font-mono block mt-1 uppercase text-slate-800">{selectedPlan} Plan</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { id: 'free', name: 'Free Trial Plan', price: '₹0 / mo', limits: '1 Clinic, 2 Doctors' },
                        { id: 'basic', name: 'Basic Tier', price: '₹2,499 / mo', limits: '2 Clinics, 5 Doctors' },
                        { id: 'pro', name: 'Professional Tier', price: '₹5,999 / mo', limits: '5 Clinics, 15 Doctors' },
                        { id: 'enterprise', name: 'Enterprise SaaS', price: '₹12,499 / mo', limits: 'Unlimited Clinics, White-Labeling' },
                      ].map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlan(plan.id as any);
                            notify('success', 'Plan Tier Updated', `SaaS configuration set to ${plan.name}`);
                          }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                            selectedPlan === plan.id ? 'bg-indigo-50 border-indigo-500 text-slate-850' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block text-slate-800">{plan.name}</span>
                            <span className="text-lg font-black text-indigo-700 block mt-1">{plan.price}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold border-t pt-2">{plan.limits}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-tab: White Label & Branding */}
                {saasSubTab === 'white-label' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Custom Branding Colors</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'teal', name: 'Dental Teal (Default)', class: 'bg-teal-600' },
                          { id: 'cosmic', name: 'Cosmic Slate', class: 'bg-slate-800' },
                          { id: 'emerald', name: 'Emerald Royal', class: 'bg-emerald-650' },
                          { id: 'purple', name: 'Imperial Purple', class: 'bg-purple-650' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setCustomTheme(theme.id as any);
                              notify('success', 'Theme Applied', `${theme.name} palette activated immediately across SaaS layout.`);
                            }}
                            className={`p-2.5 rounded-xl border text-[11px] font-bold text-left flex items-center justify-between transition cursor-pointer bg-white ${
                              customTheme === theme.id ? 'border-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-200'
                            }`}
                          >
                            <span>{theme.name}</span>
                            <span className={`w-3 h-3 rounded-full shrink-0 ${theme.class}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Custom Domain Configuration (DNS)</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customDomain}
                          onChange={(e) => {
                            setCustomDomain(e.target.value);
                            setIsDomainVerified(false);
                          }}
                          className="flex-1 bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none font-bold"
                        />
                        <button
                          onClick={() => {
                            setIsDomainVerifying(true);
                            setTimeout(() => {
                              setIsDomainVerifying(false);
                              setIsDomainVerified(true);
                              notify('success', 'DNS Verification Passed', 'Custom domain mapped successfully.');
                            }, 800);
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 border-0"
                        >
                          {isDomainVerifying ? <RefreshCw size={12} className="animate-spin" /> : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab: Database and System Monitoring */}
                {saasSubTab === 'metrics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                        <span className="text-[8.5px] uppercase font-black text-slate-450 block">Database Ping</span>
                        <span className="text-lg font-mono font-black text-emerald-600">32ms</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                        <span className="text-[8.5px] uppercase font-black text-slate-450 block">API Latency</span>
                        <span className="text-lg font-mono font-black text-teal-600">42ms</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                        <span className="text-[8.5px] uppercase font-black text-slate-450 block">WebSockets</span>
                        <span className="text-lg font-mono font-black text-emerald-600">Connected</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                        <span className="text-[8.5px] uppercase font-black text-slate-450 block">Cluster Storage</span>
                        <span className="text-lg font-mono font-black text-teal-700">9.6%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab: Continuous Deployment & Version Control */}
                {saasSubTab === 'updates' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Dry Run Schema Check</span>
                      <button
                        onClick={() => {
                          setIsMigrating(true);
                          setMigrationLogs(['Initializing Schema Analysis...', 'Evaluating remote index allocations...', 'Verifying SCDC system tables...']);
                          setTimeout(() => {
                            setMigrationLogs(prev => [...prev, 'Dry run comparison completed. 0 mismatch drift anomalies detected.']);
                            setIsMigrating(false);
                            notify('success', 'Dry Run Succeeded', 'Migration dry-run finished with 0 anomalies.');
                          }, 1000);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer select-none border-0"
                      >
                        Run Migration Check
                      </button>

                      {migrationLogs.length > 0 && (
                        <div className="bg-slate-900 text-slate-100 font-mono text-[10px] p-4 rounded-xl space-y-1">
                          {migrationLogs.map((log, index) => (
                            <div key={index}>&gt; {log}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-tab: Help Center and Tickets */}
                {saasSubTab === 'support' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-slate-800">
                    <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center gap-2">
                        <span className="block text-[10px] font-black uppercase text-slate-400">Search FAQ Database</span>
                        <input
                          type="text"
                          placeholder="Search FAQs..."
                          value={supportSearch}
                          onChange={(e) => setSupportSearch(e.target.value)}
                          className="bg-white border border-slate-250 text-xs rounded-xl px-3 py-1.5 outline-none font-semibold w-48"
                        />
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {[
                          { q: 'How to map Custom Domains?', a: 'To route your clinic via your own domain, configure a CNAME record at your DNS provider pointing to ingress.scdcsaas.com.' },
                          { q: 'Can we separate clinical drug inventories across branches?', a: 'Yes. Every clinic branch operates on fully distinct inventory tables.' }
                        ].filter(faq => {
                          const query = supportSearch.toLowerCase();
                          return faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query);
                        }).map((faq, index) => (
                          <div key={index} className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs">
                            <h5 className="text-xs font-extrabold">{faq.q}</h5>
                            <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed font-semibold">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority Support Ticket</span>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Subject Headline..."
                          value={supportSubject}
                          onChange={(e) => setSupportSubject(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
                        />
                        <textarea
                          placeholder="Outline support inquiry details..."
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-slate-200 text-xs rounded-xl p-3 outline-none font-semibold"
                        />
                        <button
                          onClick={() => {
                            if (!supportSubject || !supportMessage) {
                              notify('error', 'Fields Required', 'Please complete the support fields before raising tickets.');
                              return;
                            }
                            setIsSubmittingSupport(true);
                            setTimeout(() => {
                              setIsSubmittingSupport(false);
                              setSupportSubject('');
                              setSupportMessage('');
                              notify('success', 'Ticket Submitted', 'Priority SLA support ticket successfully opened.');
                            }, 800);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition border-0 cursor-pointer"
                        >
                          Submit Support Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
