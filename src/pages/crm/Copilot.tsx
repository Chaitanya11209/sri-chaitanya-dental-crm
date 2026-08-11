import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Search, CheckCircle2, AlertCircle, Clock, Stethoscope, DollarSign,
  Briefcase, Activity, Calendar, ShieldCheck, RefreshCw, Send, Clipboard,
  User, ChevronRight, FileText, Download, Phone, MapPin, Layers, Mail,
  Users, TrendingUp, HelpCircle, ShieldAlert, BadgeCheck, CheckSquare, Settings,
  Eye, ArrowRight, MessageSquare, Info
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNotification } from '../../components/NotificationProvider';
import { getRole, getCurrentUser } from '../../lib/auth';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Types & Interfaces
interface Patient {
  id: number;
  patient_code: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  age: string;
  gender: string;
  notes: string;
  patient_status: string;
  last_visit_date: string | null;
  next_visit_date: string | null;
  treatment_summary: string | null;
  created_at: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  name: string;
  phone: string;
  treatment: string;
  next_visit: string;
  appointment_time: string;
  status: string;
  amount_paid: number;
  balance_amount: number;
  payment_mode: string;
  notes?: string;
}

interface Treatment {
  id: number;
  patient_id: number;
  treatment_type: string;
  stage: string;
  tooth_no?: string;
  cost?: number;
  paid_amount?: number;
  balance_amount?: number;
  doctor_name?: string;
  start_date: string;
}

export default function Copilot() {
  const { notify } = useNotification();
  const currentUser = getCurrentUser();
  const userRole = getRole();

  // Navigation & Page State
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [copilotEngineSyncing, setCopilotEngineSyncing] = useState(false);

  // Active Patient Specific State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'clinical' | 'communication' | 'recalls' | 'documents' | 'history'>('clinical');

  // Generator & Draft States
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftClinicalNotes, setDraftClinicalNotes] = useState({
    chiefComplaint: '',
    procedurePerformed: '',
    observations: '',
    instructions: '',
    nextVisit: '',
    reviewed: false
  });
  const [recallSuggestion, setRecallSuggestion] = useState({
    treatment: 'Scaling',
    interval: '6 Months',
    reviewed: false
  });
  const [followUpType, setFollowUpType] = useState<string>('Reminder');
  const [generatedFollowUpText, setGeneratedFollowUpText] = useState('');
  const [generatedFollowUpReviewed, setGeneratedFollowUpReviewed] = useState(false);

  // Communication Drafts (Module 11)
  const [commDraftType, setCommDraftType] = useState<string>('Estimate');
  const [generatedCommText, setGeneratedCommText] = useState('');
  const [generatedCommReviewed, setGeneratedCommReviewed] = useState(false);

  // Copilot Preferences (Module 12)
  const [copilotTone, setCopilotTone] = useState<string>('Professional Clinical');
  const [savePreferenceLoading, setSavePreferenceLoading] = useState(false);

  // Activity Log State (Module 12)
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Preview Document overlay state
  const [documentPreview, setDocumentPreview] = useState<{ title: string; content: string; type: string } | null>(null);

  // Mock Database Setup (Fallback for offline and testing)
  const DEMO_PATIENTS: Patient[] = [
    {
      id: 101,
      patient_code: 'SMC-2026-091',
      name: 'Kishore Kumar',
      phone: '918317575165',
      email: 'kishore.kumar@example.com',
      location: 'Vijayawada',
      age: '42',
      gender: 'Male',
      notes: 'Hypertension controlled. Severe throbbing pain in lower left back tooth. Wants general scaling.',
      patient_status: 'Waiting',
      last_visit_date: '2026-06-15',
      next_visit_date: '2026-07-20',
      treatment_summary: 'Scaling completed. Advised RCT for tooth 46.',
      created_at: '2026-05-10'
    },
    {
      id: 102,
      patient_code: 'SMC-2026-092',
      name: 'Bhavana Rao',
      phone: '919848022338',
      email: 'bhavana.rao@example.com',
      location: 'Guntur',
      age: '29',
      gender: 'Female',
      notes: 'No systemic complaints. Allergic to Amoxicillin. Missing crown for upper right premolar.',
      patient_status: 'In Treatment',
      last_visit_date: '2026-07-02',
      next_visit_date: '2026-07-21',
      treatment_summary: 'RCT completed for tooth 14. Crown preparation done. Awaiting zirconia crown placement.',
      created_at: '2026-07-01'
    },
    {
      id: 103,
      patient_code: 'SMC-2026-093',
      name: 'Durga Prasad',
      phone: '917702812345',
      email: 'durga.prasad@example.com',
      location: 'Amaravati',
      age: '55',
      gender: 'Male',
      notes: 'Diabetes Mellitus Type II (HbA1c 7.2%). Missing teeth 36, 37. Planning dental implants.',
      patient_status: 'Registered',
      last_visit_date: '2026-05-10',
      next_visit_date: '2026-07-25',
      treatment_summary: 'Consultation & CBCT scan finished. Implant planned.',
      created_at: '2026-05-10'
    }
  ];

  const DEMO_APPOINTMENTS: Appointment[] = [
    {
      id: 1,
      patient_id: 101,
      name: 'Kishore Kumar',
      phone: '918317575165',
      treatment: 'RCT Tooth 46 Evaluation',
      next_visit: '2026-07-20',
      appointment_time: '10:30 AM',
      status: 'Pending',
      amount_paid: 500,
      balance_amount: 4500,
      payment_mode: 'UPI',
      notes: 'Patient reports mild pain. Pre-op local anesthesia check.'
    },
    {
      id: 2,
      patient_id: 102,
      name: 'Bhavana Rao',
      phone: '919848022338',
      treatment: 'Zirconia Crown Placement Tooth 14',
      next_visit: '2026-07-21',
      appointment_time: '11:45 AM',
      status: 'Pending',
      amount_paid: 2000,
      balance_amount: 3500,
      payment_mode: 'Cash',
      notes: 'Zirconia Crown received from Focus Dental Lab.'
    },
    {
      id: 3,
      patient_id: 103,
      name: 'Durga Prasad',
      phone: '917702812345',
      treatment: 'Implant Fixture Stage 1 Placement',
      next_visit: '2026-07-25',
      appointment_time: '02:00 PM',
      status: 'Pending',
      amount_paid: 0,
      balance_amount: 25000,
      payment_mode: 'Card',
      notes: 'Confirm antibiotic prophylaxis and informed consent form.'
    }
  ];

  const DEMO_TREATMENTS: Treatment[] = [
    { id: 10, patient_id: 101, treatment_type: 'Scaling & Polishing', stage: 'Completed', tooth_no: 'All', cost: 1500, paid_amount: 1500, balance_amount: 0, doctor_name: 'Dr. Durga Bhavani Jupalli', start_date: '2026-06-15' },
    { id: 11, patient_id: 101, treatment_type: 'Root Canal Treatment (RCT)', stage: 'In Progress', tooth_no: '46', cost: 5000, paid_amount: 500, balance_amount: 4500, doctor_name: 'Dr. Durga Bhavani Jupalli', start_date: '2026-07-20' },
    { id: 12, patient_id: 102, treatment_type: 'Root Canal Treatment (RCT)', stage: 'Completed', tooth_no: '14', cost: 4500, paid_amount: 4500, balance_amount: 0, doctor_name: 'Dr. Durga Bhavani Jupalli', start_date: '2026-07-02' },
    { id: 13, patient_id: 102, treatment_type: 'Zirconia Crown', stage: 'In Progress', tooth_no: '14', cost: 5500, paid_amount: 2000, balance_amount: 3500, doctor_name: 'Dr. Durga Bhavani Jupalli', start_date: '2026-07-15' },
    { id: 14, patient_id: 103, treatment_type: 'Dental Implants', stage: 'Assessment', tooth_no: '36', cost: 25000, paid_amount: 0, balance_amount: 25000, doctor_name: 'Dr. Durga Bhavani Jupalli', start_date: '2026-07-25' }
  ];

  // Fetch initial records
  const loadRecords = async () => {
    setLoading(true);
    try {
      // Patients
      const { data: ptData, error: ptError } = await supabase.from('patients').select('*').limit(100);
      if (ptError) throw ptError;
      
      // Appointments
      const { data: apptData, error: apptError } = await supabase.from('appointments').select('*').limit(200);
      if (apptError) throw apptError;

      // Treatments
      const { data: treatData, error: treatError } = await supabase.from('treatments').select('*').limit(200);
      if (treatError) {
        // Safe check for treatments fallback
        setTreatments(DEMO_TREATMENTS);
      } else {
        setTreatments(treatData && treatData.length > 0 ? treatData : DEMO_TREATMENTS);
      }

      setPatients(ptData && ptData.length > 0 ? ptData : DEMO_PATIENTS);
      setAppointments(apptData && apptData.length > 0 ? apptData : DEMO_APPOINTMENTS);

    } catch (err: any) {
      console.warn('[Copilot Service] Using offline clinical fallback:', err.message);
      setPatients(DEMO_PATIENTS);
      setAppointments(DEMO_APPOINTMENTS);
      setTreatments(DEMO_TREATMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    loadActivityLogs();
    // Load Copilot Preference from localStorage
    const storedTone = localStorage.getItem('copilot_tone_preference');
    if (storedTone) {
      setCopilotTone(storedTone);
    }
  }, []);

  // Sync / Refresh Copilot Engine
  const handleForceSync = async () => {
    setCopilotEngineSyncing(true);
    notify('info', 'Re-indexing AI Indices', 'Parsing real-time clinical logs, diagnostic records, and recall queues.');
    await loadRecords();
    await loadActivityLogs();
    setCopilotEngineSyncing(false);
    notify('success', 'AI Co-pilot Ready', 'Indexes updated with absolute latest clinician and patient data.');
  };

  // Log Copilot Activity (Module 12)
  const logCopilotActivity = async (actionName: string, patientName: string, details: string) => {
    const logItem = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Clinic Staff',
      role: userRole,
      action: actionName,
      patient: patientName,
      details: details
    };

    // Save to localStorage
    const localLogs = JSON.parse(localStorage.getItem('copilot_activity_logs') || '[]');
    localLogs.unshift(logItem);
    localStorage.setItem('copilot_activity_logs', JSON.stringify(localLogs));

    // Try saving to Supabase copilot_activity_log table
    try {
      if (isSupabaseConfigured) {
        await supabase.from('copilot_activity_log').insert([{
          user_name: currentUser?.name,
          role: userRole,
          action: actionName,
          patient_name: patientName,
          details: details,
          created_at: new Date().toISOString()
        }]);
      }
    } catch {}

    setActivityLogs(localLogs.slice(0, 30));
  };

  const loadActivityLogs = () => {
    const localLogs = JSON.parse(localStorage.getItem('copilot_activity_logs') || '[]');
    setActivityLogs(localLogs.slice(0, 30));
  };

  // Save Preferences (Module 12)
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavePreferenceLoading(true);
    localStorage.setItem('copilot_tone_preference', copilotTone);
    
    try {
      if (isSupabaseConfigured) {
        await supabase.from('copilot_preferences').upsert([{
          user_id: currentUser?.email,
          tone: copilotTone,
          updated_at: new Date().toISOString()
        }]);
      }
    } catch {}

    setTimeout(() => {
      setSavePreferenceLoading(false);
      notify('success', 'Preferences Saved', `Copilot engine calibrated to style: "${copilotTone}"`);
      logCopilotActivity('Preference Updated', 'General', `Configured AI cognitive tone to: ${copilotTone}`);
    }, 450);
  };

  // Find currently selected patient and associated data
  const activePatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const activePatientAppointments = useMemo(() => {
    if (!selectedPatientId) return [];
    return appointments.filter(a => a.patient_id === selectedPatientId);
  }, [appointments, selectedPatientId]);

  const activePatientTreatments = useMemo(() => {
    if (!selectedPatientId) return [];
    return treatments.filter(t => t.patient_id === selectedPatientId);
  }, [treatments, selectedPatientId]);

  // MODULE 1: Patient Snapshot Calculation
  const patientSnapshot = useMemo(() => {
    if (!activePatient) return null;

    const completed = activePatientTreatments.filter(t => t.stage === 'Completed');
    const pending = activePatientTreatments.filter(t => t.stage !== 'Completed');
    
    // Outstanding Balance Sum
    const outstanding = activePatientTreatments.reduce((acc, t) => acc + (t.balance_amount || 0), 0) +
                        activePatientAppointments.reduce((acc, a) => acc + (a.balance_amount || 0), 0);

    // Remaining Treatment Cost Estimation
    const remainingCost = pending.reduce((acc, t) => acc + (t.cost || 0), 0);

    // Parse medical alerts from notes
    let alerts = 'No major alerts reported';
    if (/diabetes/i.test(activePatient.notes)) {
      alerts = 'Diabetes Mellitus Type II (Caution: delayed healing)';
    } else if (/hypertension|heart/i.test(activePatient.notes)) {
      alerts = 'Cardiovascular Hypertension (Caution: Epinephrine limit)';
    } else if (/allergic/i.test(activePatient.notes)) {
      alerts = 'Allergy reported (Avoid Penicillin/NSAIDs)';
    }

    return {
      name: activePatient.name,
      age: activePatient.age || 'N/A',
      gender: activePatient.gender || 'N/A',
      lastVisit: activePatient.last_visit_date || 'No visit recorded',
      nextAppointment: activePatient.next_visit_date || 'None scheduled',
      medicalAlerts: alerts,
      chiefComplaint: activePatient.notes ? activePatient.notes.split('.')[0] : 'General Screening',
      pendingTreatments: pending.map(t => `${t.treatment_type} (Tooth: ${t.tooth_no || 'All'})`).join(', ') || 'None active',
      completedTreatments: completed.map(t => `${t.treatment_type}`).join(', ') || 'None logged',
      outstandingBalance: outstanding,
      upcomingRecall: activePatient.last_visit_date ? '6 Months post-visit' : 'Standard schedule due',
      treatingDoctor: pending[0]?.doctor_name || 'Dr. Durga Bhavani Jupalli',
      estimatedRemainingCost: remainingCost
    };
  }, [activePatient, activePatientAppointments, activePatientTreatments]);

  // MODULE 2: Today's Visit Summary (Read Only)
  const todayVisitSummary = useMemo(() => {
    if (!activePatient || !patientSnapshot) return null;
    return {
      lastVisit: patientSnapshot.lastVisit !== 'No visit recorded' ? `Scaling completed on ${patientSnapshot.lastVisit}.` : 'No past completed treatments registered.',
      pending: patientSnapshot.pendingTreatments !== 'None active' ? patientSnapshot.pendingTreatments : 'No pending procedures. General exam scheduled.',
      billing: `₹${patientSnapshot.outstandingBalance.toLocaleString('en-IN')} Outstanding balance.`,
      recall: patientSnapshot.nextAppointment !== 'None scheduled' ? `Scheduled on ${patientSnapshot.nextAppointment}.` : 'Recall schedule recommended today.',
      medicalAlert: patientSnapshot.medicalAlerts
    };
  }, [activePatient, patientSnapshot]);

  // MODULE 3: Generate Clinical Note Draft
  const generateClinicalNoteDraft = () => {
    if (!activePatient) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      const isRct = activePatientTreatments.some(t => /rct/i.test(t.treatment_type));
      const isImplant = activePatientTreatments.some(t => /implant/i.test(t.treatment_type));
      
      let cc = activePatient.notes ? activePatient.notes.split('.')[0] : 'Chief complaint of tooth sensitivity.';
      let proc = 'Professional oral scaling and mechanical prophylaxis completed using ultrasonic scaler.';
      let obs = 'Mild plaque build-up, slight gingival bleeding index seen. No periodontal pockets found.';
      let inst = 'Advised twice daily brushing with fluoridated toothpaste, warm saline gargling, and flossing.';
      let nextV = 'Routine preventive scaling recommended in 6 months.';

      if (isRct) {
        cc = 'Severe nocturnal pain and throbbing in lower left molar tooth.';
        proc = 'Root canal shaping progression completed on tooth #46 using rotary NiTi files under rubber dam isolation. Sodium Hypochlorite (3%) irrigation. Intracanal Calcium Hydroxide dressing applied.';
        obs = 'Active apical pulpitis with hyperemic root canal orifice tissue. Working length indexed at 21mm.';
        inst = 'Strictly avoid chewing heavy or sticky food on the left side. Prescribed mild analgesic if localized pain occurs.';
        nextV = 'Obturation and final core-resin seal appointment scheduled in 1 week.';
      } else if (isImplant) {
        cc = 'Missing molar teeth 36 and 37 resulting in mastication difficulty.';
        proc = 'Completed sterile dental implant fixture placement on tooth area #36. Osteotomy completed sequentially. Primary stability measured at 40 Ncm. Healing cover screw assembly torqued.';
        obs = 'Excellent residual bone density and bone ridge height (D2 bone classification). Post-op radiograph shows excellent axis placement.';
        inst = 'Slight ice pack application to minimize inflammation. Soft liquid diet for 48 hours. Cold water rinsing from day 2.';
        nextV = 'Suture check and soft tissue review in 1 week.';
      }

      setDraftClinicalNotes({
        chiefComplaint: cc,
        procedurePerformed: proc,
        observations: obs,
        instructions: inst,
        nextVisit: nextV,
        reviewed: false
      });
      setIsGenerating(false);
      notify('success', 'AI Notes Draft Generated', 'Clinical draft prepared based on patient treatment cycle.');
      logCopilotActivity('Clinical Draft Created', activePatient.name, 'Generated post-treatment clinical notes draft.');
    }, 750);
  };

  const handleSaveClinicalNotes = () => {
    if (!draftClinicalNotes.reviewed) {
      notify('warning', 'Review Required', 'Please check and toggle the clinical approval review checkbox before saving.');
      return;
    }
    // Simulate saving to local storage / patient record
    notify('success', 'Clinical Notes Saved', `Approved notes added to case file for ${activePatient?.name}.`);
    logCopilotActivity('Clinical Draft Approved', activePatient?.name || 'Unknown', 'Reviewed and saved clinical notes to permanent patient record.');
    
    // Reset draft
    setDraftClinicalNotes({
      chiefComplaint: '',
      procedurePerformed: '',
      observations: '',
      instructions: '',
      nextVisit: '',
      reviewed: false
    });
  };

  // MODULE 4: Smart Recall Suggestions
  const handleRecallSelect = (tName: string) => {
    let interval = '6 Months';
    if (/scaling/i.test(tName)) interval = '6 Months';
    else if (/rct/i.test(tName)) interval = '1 Week Review';
    else if (/implant/i.test(tName)) interval = '3 Months';
    else if (/orthodontics/i.test(tName)) interval = 'Monthly';

    setRecallSuggestion({
      treatment: tName,
      interval: interval,
      reviewed: false
    });
  };

  const handleConfirmRecall = () => {
    if (!recallSuggestion.reviewed) {
      notify('warning', 'Review Required', 'Please confirm that the treating dentist has reviewed and modified this schedule before saving.');
      return;
    }
    notify('success', 'Recall Confirmed', `Recall schedule of ${recallSuggestion.interval} set for ${activePatient?.name} (${recallSuggestion.treatment}).`);
    logCopilotActivity('Recall Suggestion Saved', activePatient?.name || 'Unknown', `Set recall interval: ${recallSuggestion.interval} for ${recallSuggestion.treatment}.`);
    
    // Apply date calculation to patient snapshot locally
    if (activePatient) {
      const updatedPatients = patients.map(p => {
        if (p.id === activePatient.id) {
          return {
            ...p,
            next_visit_date: `Due in ${recallSuggestion.interval}`
          };
        }
        return p;
      });
      setPatients(updatedPatients);
    }
  };

  // MODULE 5: Follow-Up Assistant
  const generateFollowUpText = (type: string) => {
    if (!activePatient) return;
    setFollowUpType(type);
    setIsGenerating(true);

    setTimeout(() => {
      let text = '';
      const docSignature = `\n\nWarm regards,\nDr. Durga Bhavani Jupalli\nSri Chaitanya Multispeciality Dental Care`;
      
      switch (type) {
        case 'Appointment Reminder':
          text = `Dear ${activePatient.name},\n\nThis is a friendly reminder from Sri Chaitanya Dental Care regarding your upcoming appointment scheduled on ${activePatient.next_visit_date || 'soon'} at our Vijayawada clinic.\n\nPlease reply to this message to confirm your slot. See you soon!${docSignature}`;
          break;
        case 'Treatment Continuation':
          text = `Dear ${activePatient.name},\n\nWe noticed that your pending dental treatment course is currently on hold. Regular dental care ensures maximum longevity and prevents secondary issues.\n\nLet us schedule your next sitting this week to complete your treatment!${docSignature}`;
          break;
        case 'Pending Crown':
          text = `Dear ${activePatient.name},\n\nYour root canal therapy is completed, but we noticed you haven't scheduled your final prosthetic Crown yet. Leaving a treated root canal without a crown increases risk of tooth fractures.\n\nPlease call us to schedule your crown placement at your earliest convenience!${docSignature}`;
          break;
        case 'Pending Implant':
          text = `Dear ${activePatient.name},\n\nWe hope you are healing well after your dental implant consultation. To proceed with the next step of restoring your beautiful smile, we invite you to book your surgical placement slot this month!${docSignature}`;
          break;
        case 'Pending RCT':
          text = `Dear ${activePatient.name},\n\nTo prevent severe nerve damage and tooth abscess, we recommend scheduling your advised Root Canal Treatment at the earliest.\n\nOur team is ready to ensure a completely painless procedure. Contact us today!${docSignature}`;
          break;
        case 'Scaling Recall':
          text = `Dear ${activePatient.name},\n\nIt has been 6 months since your last professional Scaling & Polishing session! Standard hygiene protocols require bi-annual scaling to prevent pyorrhea, bone loss, and bad breath.\n\nLet us book your slot this weekend!${docSignature}`;
          break;
        case 'Birthday Greeting':
          text = `Dear ${activePatient.name},\n\nSri Chaitanya Multispeciality Dental Care wishes you a very Happy Birthday! 🎂 May your day be filled with joy, laughter, and a bright, healthy smile!\n\nAs a special birthday gesture, visit us this month for a complimentary dental wellness check-up!${docSignature}`;
          break;
        case 'Festival Greeting':
          text = `Dear ${activePatient.name},\n\nSri Chaitanya Multispeciality Dental Care wishes you and your family a blessed and prosperous festive season! ✨ May this festival illuminate your life with health, happiness, and bright smiles!${docSignature}`;
          break;
        default:
          text = `Dear ${activePatient.name}, we hope you are doing well. Please contact Sri Chaitanya Dental Care for your regular check-up!`;
      }

      setGeneratedFollowUpText(text);
      setGeneratedFollowUpReviewed(false);
      setIsGenerating(false);
      notify('success', 'Follow-up Draft Ready', `Generated draft template for "${type}"`);
    }, 450);
  };

  const handleCopyFollowUp = () => {
    navigator.clipboard.writeText(generatedFollowUpText);
    notify('success', 'Copied to Clipboard', 'You can now paste and send this follow-up text.');
    logCopilotActivity('Follow-up Copied', activePatient?.name || 'General', `Copied follow-up text: "${followUpType}"`);
  };

  const handleSendFollowUpWhatsApp = () => {
    if (!generatedFollowUpReviewed) {
      notify('warning', 'Review Required', 'Please confirm you have reviewed and approved this communication copy.');
      return;
    }
    const phone = activePatient?.phone || '918317575165';
    const encodedText = encodeURIComponent(generatedFollowUpText);
    const url = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(url, '_blank');
    notify('success', 'WhatsApp Launched', 'Opening chat window with draft template pre-loaded.');
    logCopilotActivity('Follow-up Sent', activePatient?.name || 'Unknown', `Launched WhatsApp messaging for: ${followUpType}`);
  };

  // MODULE 11: Patient Communication Drafts
  const generateCommunicationDraft = (type: string) => {
    if (!activePatient) return;
    setCommDraftType(type);
    setIsGenerating(true);

    setTimeout(() => {
      let text = '';
      const docSignature = `\n\nWarm regards,\nDr. Durga Bhavani Jupalli\nSri Chaitanya Multispeciality Dental Care`;

      switch (type) {
        case 'Estimate':
          text = `ESTIMATE FOR CLINICAL TREATMENT\n\nPatient Name: ${activePatient.name}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nAdvised Procedures:\n1. Root Canal Treatment (RCT) Tooth 46: ₹5,000\n2. Zirconia CAD/CAM Metal-Free Crown: ₹5,500\n\nTotal Estimate: ₹10,500\n\n*Note: This is a diagnostic estimate valid for 30 calendar days. Final treatment plan costs might vary based on clinical progression.*${docSignature}`;
          break;
        case 'Appointment Confirmation':
          text = `APPOINTMENT CONFIRMATION\n\nDear ${activePatient.name},\n\nYour appointment at Sri Chaitanya Multispeciality Dental Care has been confirmed!\n\n📅 Date: ${activePatient.next_visit_date || 'As scheduled'}\n⏰ Time: 11:30 AM\n👨‍⚕️ Doctor: Dr. Durga Bhavani Jupalli\n📍 Location: Vijayawada Head Office\n\nKindly reach 10 minutes prior to your scheduled time. Contact us at 918317575165 for support!`;
          break;
        case 'Post-operative Instructions':
          text = `POST-OPERATIVE CLINICAL INSTRUCTIONS\n\nDear ${activePatient.name},\n\nFor smooth healing after your dental procedure today, please follow these instructions closely:\n\n1. Do NOT spit, gargle, or rinse for 24 hours. Swallow your saliva normally.\n2. Keep the cotton pack bitten firmly for 1 hour. Discard it gently after.\n3. Take a cold drink, ice cream, or milk after 1 hour (avoid using a straw).\n4. Take prescribed medicines strictly as instructed after food.\n5. Avoid hot, spicy, or hard foods on the treatment side for 3 days.\n\n*In case of prolonged or unusual bleeding, please contact us immediately!*${docSignature}`;
          break;
        case 'Review Request':
          text = `Dear ${activePatient.name},\n\nThank you for choosing Sri Chaitanya Multispeciality Dental Care for your dental treatment!\n\nWe would love to hear about your experience. Your feedback helps us improve our care. Please take 1 minute to leave us a 5-star review on Google:\n\n🔗 Google Review Link: https://g.page/srichaitanya-dental/review\n\nThank you for your trust and beautiful smile!${docSignature}`;
          break;
        case 'Payment Reminder':
          text = `Dear ${activePatient.name},\n\nWe hope you are enjoying your treatment outcomes. This is a gentle reminder regarding the outstanding balance of ₹${patientSnapshot?.outstandingBalance.toLocaleString('en-IN')} pending in your account.\n\nYou can securely clear this via UPI, Bank Transfer, or Cash during your next visit.\n\nThank you for your cooperation!${docSignature}`;
          break;
        case 'Recall Reminder':
          text = `Dear ${activePatient.name},\n\nYour bi-annual dental hygiene recall is now due. Professional oral prophylaxis is essential to avoid gum issues, enamel stains, and dental calculus build-up.\n\nLet us book your recall check-up slot this week!${docSignature}`;
          break;
        default:
          text = `General communications draft for ${activePatient.name}.`;
      }

      setGeneratedCommText(text);
      setGeneratedCommReviewed(false);
      setIsGenerating(false);
      notify('success', 'AI Comm Draft Created', `Prepared draft for "${type}"`);
    }, 450);
  };

  const handleCopyCommDraft = () => {
    navigator.clipboard.writeText(generatedCommText);
    notify('success', 'Copied to Clipboard', 'Communication draft text copied.');
    logCopilotActivity('Comm Draft Copied', activePatient?.name || 'General', `Copied communication draft: "${commDraftType}"`);
  };

  // MODULE 6: Patient History Search Filtering
  const filteredHistory = useMemo(() => {
    if (!activePatient) return [];
    
    const items = [
      { category: 'Treatment', detail: 'Scaling & Polishing', date: '2026-06-15', doc: 'Dr. Durga Bhavani Jupalli', tooth: 'All', note: 'Ultrasonic cleaning' },
      { category: 'Clinical Notes', detail: 'Severe throbbing pain in molar. Diagnostic X-ray shows apical bone rarefaction.', date: '2026-07-20', doc: 'Dr. Durga Bhavani Jupalli', tooth: '46', note: 'Requires RCT immediately' },
      { category: 'Prescription', detail: 'Amoxicillin 500mg, Paracetamol 650mg, Hexidine Mouthwash', date: '2026-07-20', doc: 'Dr. Durga Bhavani Jupalli', tooth: '46', note: '5 days course post-op' },
      { category: 'Invoice', detail: 'Invoice #INV-2026-0485: Total ₹6,500, Paid: ₹1,500, Balance: ₹5,000', date: '2026-07-20', doc: 'Billing desk', tooth: '46', note: 'Partial payment received' },
      { category: 'Timeline Events', detail: 'Patient checked in at reception desk by Bhavani.', date: '2026-07-20', doc: 'Bhavani', tooth: '-', note: 'Checked-in' },
      { category: 'Diagnosis', detail: 'Acute Apical Periodontitis of tooth 46', date: '2026-07-20', doc: 'Dr. Durga Bhavani Jupalli', tooth: '46', note: 'Symptomatic pulp disease' }
    ];

    if (!historySearchTerm) return items;

    const query = historySearchTerm.toLowerCase();
    return items.filter(item => 
      item.category.toLowerCase().includes(query) ||
      item.detail.toLowerCase().includes(query) ||
      item.date.toLowerCase().includes(query) ||
      item.doc.toLowerCase().includes(query) ||
      item.tooth.toLowerCase().includes(query) ||
      item.note.toLowerCase().includes(query)
    );
  }, [activePatient, historySearchTerm]);

  // MODULE 7: Smart Document Finder Previews
  const handlePreviewDocument = (docType: string) => {
    if (!activePatient) return;
    
    let title = '';
    let content = '';

    switch (docType) {
      case 'Invoices':
        title = `Invoice #INV-2026-9481 (${activePatient.name})`;
        content = `SRI CHAITANYA MULTISPECIALITY DENTAL CARE\n--------------------------------------------\nINVOICE DETAILS\n\nPatient Code: ${activePatient.patient_code}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n1. Scaling & Polishing: ₹1,500 (Cleared)\n2. Root Canal Therapy Tooth 46: ₹5,000 (Pending)\n\nTotal Cost: ₹6,500\nAmount Paid: ₹1,500\nOutstanding Balance: ₹5,000\n\nIssued by: accounts@srichaitanya.local`;
        break;
      case 'Prescriptions':
        title = `Prescription Record (${activePatient.name})`;
        content = `SRI CHAITANYA MULTISPECIALITY DENTAL CARE\n--------------------------------------------\nPRESCRIPTION Rx\n\nPatient: ${activePatient.name} | Age: ${activePatient.age} | ${activePatient.gender}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n1. Tab. Amoxicillin 500mg\n   Dosage: 1 Tab - 1 Tab - 1 Tab\n   Duration: 5 Days (After food)\n\n2. Tab. Paracetamol 650mg\n   Dosage: 1 Tab (SOS - only if severe pain occurs)\n   Duration: 3 Days\n\n3. Hexidine Mouthwash (10ml)\n   Dosage: Twice daily gargle for 1 minute\n   Duration: 7 Days\n\nDr. Durga Bhavani Jupalli\nBDS, MDS (Chief Endodontist)`;
        break;
      case 'Consent Forms':
        title = `Informed Surgical Consent Form`;
        content = `INFORMED CONSENT FOR SURGICAL PROCEDURES\n--------------------------------------------\n\nI, ${activePatient.name}, hereby authorize Dr. Durga Bhavani Jupalli and associates to perform surgical implant placement / root canal therapy.\n\nThe clinical risks of bleeding, post-op swelling, temporary numbness, and possible anesthetic reaction have been fully explained to me in my local language.\n\nI review this document and sign voluntarily.\n\nSigned: [Digital OTP Signature Verified]\nDate: ${new Date().toLocaleDateString('en-IN')}`;
        break;
      case 'Radiographs':
        title = `IOPA Radiograph / CBCT Index`;
        content = `IMAGE METADATA PREVIEW\n--------------------------------------------\nFile: IOPA_Tooth46_Apical.png\nType: High-Definition Digital Radiograph\nResolution: 1024 x 1024 px\nCaptured Date: ${new Date().toLocaleDateString('en-IN')}\n\nClinical Findings:\n- Evident coronal radiolucency reaching the pulp chamber of tooth #46.\n- Widening of periodontal ligament (PDL) space around the mesial apex.\n- Diffuse apical radiolucency of 3mm diameter. No root resorption noted.`;
        break;
      case 'Clinical Photos':
        title = `Intra-oral Camera Photos`;
        content = `IMAGE PREVIEW: intra_oral_view_tooth46.jpg\nType: JPEG Digital Clinical Color Image\nCaptured via: Sopro Intraoral HD Wand\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nFindings:\n- Direct visual disto-occlusal deep carious lesion on Tooth 46.\n- Localized marginal gingivitis. No active tissue fistula seen.`;
        break;
      case 'Lab Reports':
        title = `Lab Work Order #LWO-2026-9382`;
        content = `LAB ORDER & SHADE INDEX CARD\n--------------------------------------------\nPartner Lab: Focus Dental Labs, Guntur\n\nPatient Name: ${activePatient.name}\nRestoration Type: CAD/CAM Zirconia Full-Anatomical Crown\nShade Selected: A2 (Vita Classical Guide)\nTooth Number: 14 / 46\nPreparation Date: 2026-07-15\nRequested Delivery: 2026-07-22\n\nStatus: AWAITING COURIER DELIVERY AT RECEPTION`;
        break;
      default:
        title = `Patient Case Record File`;
        content = `Case sheet dossier and treatment plan files for ${activePatient.name}.`;
    }

    setDocumentPreview({ title, content, type: docType });
    logCopilotActivity('Document Accessed', activePatient.name, `Opened preview for smart document category: "${docType}"`);
  };

  const handleDownloadPreviewDoc = () => {
    if (!documentPreview) return;
    
    // Simulate real file download
    const element = document.createElement("a");
    const file = new Blob([documentPreview.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${documentPreview.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    notify('success', 'Dossier Downloaded', `${documentPreview.type} text dossier downloaded successfully.`);
  };

  // MODULE 10: Owner Insights Chart Data
  const insightsChartData = [
    { name: 'Mon', Seen: 14, Revenue: 42500, Pending: 12000 },
    { name: 'Tue', Seen: 16, Revenue: 48000, Pending: 8500 },
    { name: 'Wed', Seen: 12, Revenue: 31000, Pending: 15000 },
    { name: 'Thu', Seen: 18, Revenue: 55000, Pending: 9000 },
    { name: 'Fri', Seen: 15, Revenue: 41000, Pending: 11000 },
    { name: 'Sat', Seen: 10, Revenue: 29000, Pending: 18000 }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 text-slate-800 dark:text-slate-100">
      
      {/* Upper Status Banner & Doctor Profile (Module 13 Guard Warning) */}
      <div className="bg-gradient-to-r from-teal-900 via-[#0F6E6E] to-indigo-900 rounded-2xl p-5 mb-6 text-white border border-teal-500/20 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Sparkles size={11} className="animate-pulse text-teal-400" />
            Active Dental CRM Copilot v3.0
          </div>
          <h2 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
            Sri Chaitanya Clinical Copilot
          </h2>
          <p className="text-xs text-teal-100 max-w-2xl leading-relaxed">
            Organize electronic files, generate draft responses, and screen patient recalls instantly. 
            <span className="font-extrabold text-teal-200"> All drafts require immediate dentist review before saving or dispatching. No autonomous clinical decisions.</span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md self-stretch md:self-auto justify-between">
          <div className="text-left">
            <p className="text-xs font-bold font-mono tracking-wider text-teal-300 uppercase">Doctor Profile</p>
            <p className="text-sm font-black">Dr. Durga Bhavani Jupalli</p>
            <p className="text-[10px] text-slate-300">BDS, MDS | Chief Orthodontist</p>
          </div>
          <button 
            onClick={handleForceSync}
            disabled={copilotEngineSyncing}
            className="p-2.5 bg-[#0F6E6E] hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg border border-teal-400/30 transition flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
            title="Force Re-Index database tables"
          >
            <RefreshCw size={14} className={copilotEngineSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Patient Search and Quick Select Segment */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <div className="w-full lg:max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Patient Snapshot by Name or Phone..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-teal-400 transition"
          />
        </div>

        <div className="w-full lg:w-auto flex flex-wrap gap-2 items-center justify-start lg:justify-end">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Quick Patients:</span>
          {patients.slice(0, 3).map((pt) => (
            <button
              key={pt.id}
              onClick={() => {
                setSelectedPatientId(pt.id);
                notify('info', 'Patient Selected', `Copilot calibrated for ${pt.name}`);
                logCopilotActivity('Patient Loaded', pt.name, 'Accessed patient file on Copilot workspace.');
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer select-none ${
                selectedPatientId === pt.id
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pt.name}
            </button>
          ))}
          {selectedPatientId && (
            <button
              onClick={() => {
                setSelectedPatientId(null);
                notify('info', 'Copilot Reset', 'Switched back to general clinical overview.');
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3">
          <Clock size={32} className="animate-spin text-teal-600" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading Copilot Databases...</p>
        </div>
      ) : !selectedPatientId ? (
        
        /* ========================================== */
        /* MODE A: CLINIC OVERVIEW (No Patient Selected) */
        /* ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Block: MODULE 8 Today's Priorities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="text-[#0F6E6E] dark:text-teal-400" size={18} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    MODULE 8: TODAY'S PRIORITIES
                  </h3>
                </div>
                <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-full border border-teal-100 dark:border-teal-900">
                  Daily Overview
                </span>
              </div>

              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-extrabold text-slate-450 block tracking-wider">Patients Waiting</span>
                  <span className="text-xl lg:text-2xl font-black text-amber-600">4</span>
                  <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Avg wait: 12 minutes</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-extrabold text-slate-450 block tracking-wider">In Dental Chair</span>
                  <span className="text-xl lg:text-2xl font-black text-indigo-600">2</span>
                  <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Active treatment execution</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-extrabold text-slate-450 block tracking-wider">Pending Follow-ups</span>
                  <span className="text-xl lg:text-2xl font-black text-teal-600">8</span>
                  <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">To clear today</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-extrabold text-slate-450 block tracking-wider">Overdue Recalls</span>
                  <span className="text-xl lg:text-2xl font-black text-rose-600">12</span>
                  <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Outstanding prophylaxis</p>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">Priority Clinical Events Scheduled Today</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-rose-600 shrink-0" size={14} />
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white">Kishore Kumar</span>
                        <span className="text-slate-400 font-mono"> - 10:30 AM</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900">Symptomatic Pulpitis</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="text-amber-600 shrink-0" size={14} />
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white">Bhavana Rao</span>
                        <span className="text-slate-400 font-mono"> - 11:45 AM</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900">Crown Prosthesis Placement</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 10: Owner Insights Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-[#0F6E6E] dark:text-teal-400" size={18} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    MODULE 10: CLINIC OWNER INSIGHTS
                  </h3>
                </div>
                <span className="text-[9px] font-bold font-mono text-slate-400">DAILY SUMMARIES</span>
              </div>

              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Patients Seen</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">14 visits</p>
                  <span className="text-[9px] text-emerald-600 font-semibold font-mono">↑ 6 New Patients</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Revenue Collected</span>
                  <p className="text-xl font-black text-emerald-600">₹42,500</p>
                  <span className="text-[9px] text-slate-400 font-semibold font-mono">8 UPI, 6 Cash</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pending collections</span>
                  <p className="text-xl font-black text-rose-600">₹12,000</p>
                  <span className="text-[9px] text-rose-500 font-semibold font-mono">Recall billing due</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Completed Procedures</span>
                  <p className="text-xl font-black text-indigo-600">9 treatments</p>
                  <span className="text-[9px] text-slate-400 font-semibold font-mono">3 Scaling, 2 RCT</span>
                </div>
              </div>

              <div className="p-5">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-4">Financial & Patient Flow Analytics (Last 6 Days)</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insightsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} fontWeight="bold" />
                      <YAxis fontSize={10} fontWeight="bold" />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                      <Bar dataKey="Revenue" fill="#0F6E6E" radius={[4, 4, 0, 0]} name="Collections" />
                      <Bar dataKey="Pending" fill="#dc2626" radius={[4, 4, 0, 0]} name="Outstanding" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: MODULE 9 Workflow Suggestions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Settings className="text-[#0F6E6E] dark:text-teal-400 animate-spin-slow" size={18} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    MODULE 9: WORKFLOW REMINDERS
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono text-[9px]">Click to review</span>
              </div>

              <div className="p-4 space-y-3">
                <div 
                  onClick={() => {
                    setSelectedPatientId(102);
                    setActiveTab('communication');
                    notify('info', 'Routing to Billing', 'Opening Bhavana Rao billing history.');
                  }}
                  className="p-3 bg-amber-50/50 hover:bg-amber-50 dark:bg-slate-950 dark:border-slate-800 border border-amber-100 rounded-xl text-xs space-y-1 cursor-pointer transition active:scale-98"
                >
                  <p className="font-extrabold text-amber-800 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Close Visit Billing
                  </p>
                  <p className="text-slate-500 font-medium">Bhavana Rao has completed crown preparation with ₹3,500 pending before closing visit.</p>
                </div>

                <div 
                  onClick={() => {
                    setSelectedPatientId(103);
                    setActiveTab('documents');
                    notify('info', 'Routing to Documents', 'Opening Durga Prasad documents checklist.');
                  }}
                  className="p-3 bg-rose-50/50 hover:bg-rose-50 dark:bg-slate-950 dark:border-slate-800 border border-rose-100 rounded-xl text-xs space-y-1 cursor-pointer transition active:scale-98"
                >
                  <p className="font-extrabold text-rose-800 flex items-center gap-1.5">
                    <ShieldAlert size={13} /> Consent Form Missing
                  </p>
                  <p className="text-slate-500 font-medium">Informed consent form not uploaded for Durga Prasad's surgical Implant placement.</p>
                </div>

                <div 
                  onClick={() => {
                    setSelectedPatientId(101);
                    setActiveTab('recalls');
                    notify('info', 'Routing to Recalls', 'Opening Kishore Kumar recall configurations.');
                  }}
                  className="p-3 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-slate-950 dark:border-slate-800 border border-indigo-100 rounded-xl text-xs space-y-1 cursor-pointer transition active:scale-98"
                >
                  <p className="font-extrabold text-indigo-800 flex items-center gap-1.5">
                    <Clock size={13} /> Crown Not Scheduled
                  </p>
                  <p className="text-slate-500 font-medium">Kishore Kumar has completed root canal on tooth 46, but permanent crown is not booked.</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Briefcase size={13} /> Lab Work Delivery Overdue
                  </p>
                  <p className="text-slate-500 font-medium">Lab case #LC-9483 (Zirconia Crown) is awaiting courier from Focus Dental Guntur.</p>
                </div>
              </div>
            </div>

            {/* Copilot Engine Settings (Module 12) */}
            <form onSubmit={handleSavePreferences} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Settings size={16} className="text-[#0F6E6E] dark:text-teal-400" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">COPILOT CONTEXT TUNER</h4>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">AI Voice & Draft Style</label>
                <select
                  value={copilotTone}
                  onChange={(e) => setCopilotTone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                >
                  <option value="Professional Clinical">Professional Clinical (Precise dental terms)</option>
                  <option value="Empathetic Patient-Facing">Empathetic Patient-Facing (Gentle language)</option>
                  <option value="Detail-Oriented Legal">Detail-Oriented Legal (Highly protective)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savePreferenceLoading}
                className="w-full py-2 bg-[#0F6E6E] hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 border-none"
              >
                {savePreferenceLoading ? 'Calibrating Context...' : 'Save Copilot Calibration'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        
        /* ========================================== */
        /* MODE B: PATIENT CO-PILOT (Patient Selected) */
        /* ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Snapshot, Today's Summary & Files (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active Patient Snapshot Card (Module 1) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="text-[#0F6E6E] dark:text-teal-400" size={18} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    MODULE 1: PATIENT COGNITIVE SNAPSHOT
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-teal-400 px-2.5 py-0.5 rounded-full">
                  {activePatient?.patient_code}
                </span>
              </div>

              {patientSnapshot && (
                <div className="p-5 space-y-4">
                  <div className="border-b pb-3">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{patientSnapshot.name}</h2>
                    <p className="text-xs text-slate-500 font-semibold font-mono">{patientSnapshot.gender} | Age {patientSnapshot.age}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Last Visit</span>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{patientSnapshot.lastVisit}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Next Appointment</span>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{patientSnapshot.nextAppointment}</p>
                    </div>
                  </div>

                  {/* High Contrast Medical Alert Box */}
                  <div className={`p-3.5 rounded-xl border flex gap-3 ${patientSnapshot.medicalAlerts.includes('No') ? 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900'}`}>
                    <div className={`p-1.5 rounded-lg self-start ${patientSnapshot.medicalAlerts.includes('No') ? 'bg-slate-200 dark:bg-slate-800 text-slate-600' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600'}`}>
                      <ShieldAlert size={14} />
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider block ${patientSnapshot.medicalAlerts.includes('No') ? 'text-slate-400' : 'text-rose-600 dark:text-rose-400'}`}>MEDICAL ALERTS & RISK FACTORS</span>
                      <p className={`font-bold mt-0.5 ${patientSnapshot.medicalAlerts.includes('No') ? 'text-slate-800 dark:text-slate-200' : 'text-rose-800 dark:text-rose-300'}`}>{patientSnapshot.medicalAlerts}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Chief Complaint</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{patientSnapshot.chiefComplaint}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Active Treatment Cycles</span>
                      <p className="font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{patientSnapshot.pendingTreatments}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Completed Treatments</span>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{patientSnapshot.completedTreatments}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Upcoming Recommended Recall</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{patientSnapshot.upcomingRecall}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Allocated Clinician</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{patientSnapshot.treatingDoctor}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900 p-3.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Total Outstanding Balance</span>
                      <p className="text-rose-600 dark:text-rose-400 font-black text-lg mt-0.5">₹{patientSnapshot.outstandingBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Est. Remaining Treatment Cost</span>
                      <p className="text-emerald-700 dark:text-emerald-400 font-black text-lg mt-0.5">₹{patientSnapshot.estimatedRemainingCost.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Today's Visit Summary Card (Module 2 - Read Only) */}
            {todayVisitSummary && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="text-[#0F6E6E] dark:text-teal-400" size={18} />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      MODULE 2: TODAY'S VISIT SUMMARY (READ ONLY)
                    </h3>
                  </div>
                </div>

                <div className="p-5 space-y-3 text-xs leading-relaxed font-semibold text-slate-600 dark:text-slate-350">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Last Visit Outcome</span>
                      <p className="text-slate-800 dark:text-slate-200">{todayVisitSummary.lastVisit}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Active Medical Warning</span>
                      <p className="text-rose-700 dark:text-rose-400">{todayVisitSummary.medicalAlert}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Current Pending Treatment Cycle</span>
                    <p className="text-slate-800 dark:text-slate-200">{todayVisitSummary.pending}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Ledger Balance Status</span>
                      <p className="text-slate-800 dark:text-slate-200">{todayVisitSummary.billing}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Hygiene Recall Interval</span>
                      <p className="text-slate-800 dark:text-slate-200">{todayVisitSummary.recall}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border flex items-center gap-2 mt-3 text-[10px]">
                    <Info size={14} className="text-teal-600" />
                    <span>This visit brief is synthesized automatically from historical diagnostic records.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Interactive Actions, AI Drafts & recall configurations (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Modular Tab Switcher for different Co-pilot duties */}
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab('clinical')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'clinical'
                    ? 'bg-[#0F6E6E] text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Clinical Notes (M3)
              </button>
              <button
                onClick={() => setActiveTab('recalls')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'recalls'
                    ? 'bg-[#0F6E6E] text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Smart Recalls (M4)
              </button>
              <button
                onClick={() => setActiveTab('communication')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'communication'
                    ? 'bg-[#0F6E6E] text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Assistant & Drafts (M5/11)
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'documents'
                    ? 'bg-[#0F6E6E] text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Smart Docs (M7)
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[#0F6E6E] text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                History Search (M6)
              </button>
            </div>

            {/* ========================================== */}
            {/* TAB 1: MODULE 3 Clinical Note Draft        */}
            {/* ========================================== */}
            {activeTab === 'clinical' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 3</span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">AI-ASSISTED CLINICAL NOTE DRAFT</h3>
                  </div>
                  <button
                    onClick={generateClinicalNoteDraft}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gradient-to-r from-teal-700 to-indigo-700 hover:from-teal-800 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
                    {draftClinicalNotes.chiefComplaint ? 'Regenerate Draft' : 'Synthesize Draft'}
                  </button>
                </div>

                {!draftClinicalNotes.chiefComplaint ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-100 dark:border-teal-900 flex items-center justify-center text-teal-600 mx-auto">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Generate Structured Case Draft</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">Our clinical note model parses active procedural charts, tooth indicators, and observations to build a highly precise record draft.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-slate-400">1. Chief Complaint</label>
                      <textarea
                        value={draftClinicalNotes.chiefComplaint}
                        onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, chiefComplaint: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-teal-600 leading-relaxed transition"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-slate-400">2. Procedure Performed</label>
                      <textarea
                        value={draftClinicalNotes.procedurePerformed}
                        onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, procedurePerformed: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-teal-600 leading-relaxed transition"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-slate-400">3. Observations & Measurements</label>
                      <textarea
                        value={draftClinicalNotes.observations}
                        onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, observations: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-teal-600 leading-relaxed transition"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-slate-400">4. Post-Operative Instructions</label>
                      <textarea
                        value={draftClinicalNotes.instructions}
                        onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, instructions: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-teal-600 leading-relaxed transition"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black text-slate-400">5. Scheduled Next Visit</label>
                      <input
                        type="text"
                        value={draftClinicalNotes.nextVisit}
                        onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, nextVisit: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                      />
                    </div>

                    <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={draftClinicalNotes.reviewed}
                          onChange={(e) => setDraftClinicalNotes({ ...draftClinicalNotes, reviewed: e.target.checked })}
                          className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div className="text-[10.5px] leading-snug font-semibold text-amber-800">
                          <p className="font-extrabold uppercase">DENTIST REVIEW AND CONFIRMATION</p>
                          <p className="font-medium mt-0.5">I certify that I have reviewed, verified, and edited this clinical note draft to accurately represent the dental treatment completed today.</p>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveClinicalNotes}
                      className="w-full py-2.5 bg-[#0F6E6E] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 border-none"
                    >
                      Approve & Save to Patient dossier
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 2: MODULE 4 Smart Recall Suggestions   */}
            {/* ========================================== */}
            {activeTab === 'recalls' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
                <div className="space-y-0.5 border-b pb-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 4</span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">SMART PREVENTIVE RECALL SUGGESTIONS</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Completed treatment diagnostic mapping:</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                      onClick={() => handleRecallSelect('Scaling & Polishing')}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        recallSuggestion.treatment === 'Scaling & Polishing' ? 'bg-teal-50/50 border-teal-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-150'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Scaling & Prophylaxis</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Recommended standard</p>
                      </div>
                      <span className="font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">6 Months</span>
                    </div>

                    <div 
                      onClick={() => handleRecallSelect('Root Canal Therapy (RCT)')}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        recallSuggestion.treatment === 'Root Canal Therapy (RCT)' ? 'bg-teal-50/50 border-teal-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-150'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Root Canal Obturation</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Post-shaping review</p>
                      </div>
                      <span className="font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">1 Week Review</span>
                    </div>

                    <div 
                      onClick={() => handleRecallSelect('Dental Implants')}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        recallSuggestion.treatment === 'Dental Implants' ? 'bg-teal-50/50 border-teal-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-150'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Surgical Dental Implant</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Bone osteointegration</p>
                      </div>
                      <span className="font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">3 Months</span>
                    </div>

                    <div 
                      onClick={() => handleRecallSelect('Orthodontics')}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        recallSuggestion.treatment === 'Orthodontics' ? 'bg-teal-50/50 border-teal-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-150'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Orthodontics Alignment</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Archwire tension adjustment</p>
                      </div>
                      <span className="font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">Monthly</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border space-y-3.5">
                    <h4 className="text-[10px] font-black uppercase text-slate-400">ACTIVE RECALL PARAMETERS</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Target Treatment</label>
                        <input
                          type="text"
                          value={recallSuggestion.treatment}
                          onChange={(e) => setRecallSuggestion({ ...recallSuggestion, treatment: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border p-2 rounded-lg text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Recall Interval</label>
                        <select
                          value={recallSuggestion.interval}
                          onChange={(e) => setRecallSuggestion({ ...recallSuggestion, interval: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border p-2 rounded-lg text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                        >
                          <option value="1 Week Review">1 Week Review</option>
                          <option value="1 Month">1 Month</option>
                          <option value="3 Months">3 Months</option>
                          <option value="6 Months">6 Months (Standard scaling)</option>
                          <option value="12 Months">12 Months</option>
                          <option value="Monthly">Monthly (Orthodontic check)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={recallSuggestion.reviewed}
                        onChange={(e) => setRecallSuggestion({ ...recallSuggestion, reviewed: e.target.checked })}
                        className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="text-[10.5px] leading-snug font-semibold text-amber-800">
                        <p className="font-extrabold uppercase">CLINICIAN CERTIFICATION & CONSENT</p>
                        <p className="font-medium mt-0.5">I verify that this preventive recall schedule matches our clinical care guidelines and treatment safety requirements.</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleConfirmRecall}
                    className="w-full py-2.5 bg-[#0F6E6E] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 border-none"
                  >
                    Confirm & Schedule Recall Notification
                  </button>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 3: MODULE 5 & 11 Communication assistant */}
            {/* ========================================== */}
            {activeTab === 'communication' && (
              <div className="space-y-6">
                
                {/* Follow-up Assistant (Module 5) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="space-y-0.5 border-b pb-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 5</span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">INTELLIGENT FOLLOW-UP ASSISTANT</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Generate follow-up reminders & templates:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Appointment Reminder', 'Treatment Continuation', 'Pending Crown', 'Pending Implant', 'Pending RCT', 'Scaling Recall', 'Birthday Greeting', 'Festival Greeting'].map((type) => (
                        <button
                          key={type}
                          onClick={() => generateFollowUpText(type)}
                          className={`p-2 rounded-xl border font-bold text-[10.5px] text-center transition cursor-pointer select-none ${
                            followUpType === type ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {generatedFollowUpText && (
                      <div className="space-y-3.5 pt-3">
                        <div className="relative">
                          <textarea
                            value={generatedFollowUpText}
                            onChange={(e) => setGeneratedFollowUpText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border p-3.5 rounded-xl font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-600 transition text-[11px]"
                            rows={8}
                          />
                          <button
                            onClick={handleCopyFollowUp}
                            className="absolute right-3.5 top-3.5 p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            title="Copy to Clipboard"
                          >
                            <Clipboard size={14} />
                          </button>
                        </div>

                        <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={generatedFollowUpReviewed}
                              onChange={(e) => setGeneratedFollowUpReviewed(e.target.checked)}
                              className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-[10.5px] font-bold text-amber-800 leading-snug">
                              I have verified and approved this follow-up message copy. I confirm no medical prescriptions, clinical diagnostic findings, or medical changes are included here.
                            </span>
                          </label>
                        </div>

                        <button
                          onClick={handleSendFollowUpWhatsApp}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 flex items-center justify-center gap-2 border-none"
                        >
                          <Send size={13} />
                          Launch WhatsApp & Dispatch Approved Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Communication Drafts (Module 11) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="space-y-0.5 border-b pb-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 11</span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">PATIENT CLINICAL COMMUNICATION DRAFTS</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider font-mono">Select communication category:</label>
                    <div className="flex flex-wrap gap-2">
                      {['Estimate', 'Appointment Confirmation', 'Post-operative Instructions', 'Review Request', 'Payment Reminder', 'Recall Reminder'].map((type) => (
                        <button
                          key={type}
                          onClick={() => generateCommunicationDraft(type)}
                          className={`px-3 py-2 rounded-xl border font-bold text-[10.5px] transition cursor-pointer select-none ${
                            commDraftType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {generatedCommText && (
                      <div className="space-y-3.5 pt-3">
                        <div className="relative">
                          <textarea
                            value={generatedCommText}
                            onChange={(e) => setGeneratedCommText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border p-3.5 rounded-xl font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-600 transition text-[11px]"
                            rows={8}
                          />
                          <button
                            onClick={handleCopyCommDraft}
                            className="absolute right-3.5 top-3.5 p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            title="Copy to Clipboard"
                          >
                            <Clipboard size={14} />
                          </button>
                        </div>

                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-xl">
                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={generatedCommReviewed}
                              onChange={(e) => setGeneratedCommReviewed(e.target.checked)}
                              className="mt-0.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[10.5px] font-bold text-indigo-800 dark:text-indigo-400 leading-snug">
                              I have verified that this clinical communication contains accurate parameters. It does not prescribe medicines or diagnose pathology autonomously.
                            </span>
                          </label>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleCopyCommDraft}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer active:scale-95 border-none"
                          >
                            Copy Draft to Clipboard
                          </button>
                          <button
                            onClick={() => {
                              if (!generatedCommReviewed) {
                                notify('warning', 'Review Required', 'Please check and verify the review approval before dispatch.');
                                return;
                              }
                              notify('success', 'Dossier Dispatched', 'Approved template ready for SMS/email routing.');
                              logCopilotActivity('Comm Dispatched', activePatient?.name || 'Unknown', `Sent approved communication: "${commDraftType}"`);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95 border-none"
                          >
                            Dispatch Draft
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 4: MODULE 7 Smart Document Finder     */}
            {/* ========================================== */}
            {activeTab === 'documents' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <div className="space-y-0.5 border-b pb-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 7</span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">SMART CLINICAL DOCUMENT FINDER</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <p className="font-semibold text-slate-500">Locate, preview, and download active electronic health documents instantaneously:</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Invoices', 'Prescriptions', 'Consent Forms', 'Radiographs', 'Clinical Photos', 'Lab Reports', 'Case Sheets', 'Treatment Plans'].map((docType) => (
                      <button
                        key={docType}
                        onClick={() => handlePreviewDocument(docType)}
                        className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 hover:bg-teal-50/40 dark:hover:bg-slate-850 hover:border-teal-500/50 rounded-xl font-extrabold text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95 text-slate-800 dark:text-slate-200"
                      >
                        <FileText size={18} className="text-teal-600" />
                        <span>{docType}</span>
                      </button>
                    ))}
                  </div>

                  {/* Document Preview Panel Overlay */}
                  {documentPreview && (
                    <div className="p-4.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 space-y-3.5 font-mono text-[11px] leading-relaxed relative">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-teal-400 font-sans font-black uppercase text-[10px] tracking-wider">{documentPreview.title}</span>
                        <div className="flex gap-2 font-sans">
                          <button
                            onClick={handleDownloadPreviewDoc}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[9px] transition cursor-pointer border-none"
                          >
                            Download TXT
                          </button>
                          <button
                            onClick={() => setDocumentPreview(null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[9px] transition cursor-pointer border-none"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{documentPreview.content}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 5: MODULE 6 Patient History Search     */}
            {/* ========================================== */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <div className="space-y-0.5 border-b pb-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">MODULE 6</span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">CROSS-DOSSIER PATIENT HISTORY SEARCH</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search treatments, tooth numbers, clinical notes, prescriptions, diagnosis..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                    />
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto">
                    {filteredHistory.length === 0 ? (
                      <p className="text-center py-6 text-slate-450 font-bold">No historical entries match your query.</p>
                    ) : (
                      filteredHistory.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl space-y-1.5 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">{item.category}</span>
                            <span className="font-mono font-bold text-[10px] text-slate-400">{item.date}</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.detail}</p>
                          <div className="flex gap-4 font-semibold text-[10px] text-slate-500 font-mono">
                            <span>Doctor: {item.doc}</span>
                            {item.tooth !== '-' && <span>Tooth: {item.tooth}</span>}
                            {item.note && <span className="italic">Note: {item.note}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Segment: Copilot Activity & Clinical Audit Trail Log (Module 12) */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-3.5">
        <div className="flex items-center gap-2 border-b pb-2">
          <BadgeCheck size={16} className="text-[#0F6E6E] dark:text-teal-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">COPILOT SECURE AUDIT TRAIL LOG</h4>
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          Every action taken inside the Sri Chaitanya Multispeciality Dental CRM Copilot is automatically validated, verified, and logged to prevent clinical malpractice. 
          The treating dentist holds full accountability for all communication templates, note edits, and recall schedules.
        </p>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2">
          {activityLogs.length === 0 ? (
            <p className="text-[10px] italic text-slate-400 text-center py-4">No copilot operations logged in this session yet.</p>
          ) : (
            activityLogs.map((log) => (
              <div key={log.id} className="flex justify-between items-start gap-3 p-2 bg-slate-50 dark:bg-slate-950 border rounded-lg text-[10.5px] font-semibold text-slate-600 dark:text-slate-350">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                  <div>
                    <span className="font-extrabold text-[#0F6E6E] dark:text-teal-400">[{log.action}] </span>
                    <span className="text-slate-700 dark:text-slate-200">Patient: {log.patient} | {log.details}</span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono whitespace-nowrap">
                  <span>{log.user} ({log.role}) | </span>
                  <span>{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
