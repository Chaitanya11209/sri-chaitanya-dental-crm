import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Phone, MapPin, X, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, UserCheck, Clock, Stethoscope, AlertCircle, DollarSign,
  FileText, Users, UserPlus, Bell, RotateCcw, ArrowRight, Mail,
  Activity, Eye, MessageCircle, MessageSquare, CheckSquare, ClipboardList, CreditCard, Wallet,
  Printer, Download, Trash2, Camera, Send, RefreshCw, Image as ImageIcon, FolderOpen, Maximize2, Filter, Sparkles, Award, ShieldAlert, Copy, Star, Zap, TrendingUp, Heart, Percent, Briefcase, User, PlusCircle, FilePlus, Upload, Shield, Pill
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNotification } from './NotificationProvider';
import { canViewFinancials, getRole } from '../lib/auth';
import { tasksStore, type Task } from '../lib/tasksStore';
import { openWhatsApp, thankYouMessage, followupMessage, appointmentConfirmationMessage, paymentReminderMessage } from '../utils/whatsapp';
import { APPOINTMENT_TIME_OPTIONS, isValidAppointmentTime } from '../utils/appointmentTime';
import ReasonForVisitSelect from './ReasonForVisitSelect';
import { sendSMS } from '../lib/sms';
import { getPatientDOB, getPatientAgeDisplay, formatDateDDMMYYYY } from '../utils/patientUtils';

interface Patient360Props {
  patient: any;
  patientAppointments: any[];
  patientTreatments: any[];
  doctors: any[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onRefresh: () => void;
  getPatientMetadata: (p: any) => any;
  supabase: any;
}

export default function Patient360({
  patient,
  patientAppointments = [],
  patientTreatments = [],
  doctors = [],
  activeTab,
  setActiveTab,
  onRefresh,
  getPatientMetadata,
  supabase
}: Patient360Props) {
  const { notify } = useNotification();
  
  // Search state across Patient 360 data
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Modals / Action Drawers states
  const [activeModal, setActiveModal] = useState<'none' | 'appointment' | 'note' | 'payment' | 'xray' | 'photo' | 'followup' | 'prescription' | 'letter'>('none');
  const [previewDoc, setPreviewDoc] = useState<{ type: string; title: string; content: any } | null>(null);

  // Form states
  const [noteForm, setNoteForm] = useState({ content: '', is_clinical: true });
  const [apptForm, setApptForm] = useState({
    treatment: 'General Consultation',
    next_visit: '',
    appointment_time: '',
    notes: '',
    doctor_name: doctors[0]?.name || 'Dr. Durga Bhavani Jupalli'
  });
  const [paymentForm, setPaymentForm] = useState({
    appointment_id: '',
    amount_paid: '',
    payment_mode: 'Cash',
    payment_notes: ''
  });
  const [xrayForm, setXrayForm] = useState({ name: 'Bitewing X-Ray', notes: '', fileData: '' });
  const [photoForm, setPhotoForm] = useState({ name: 'Pre-operative Intraoral', notes: '', fileData: '' });
  const [followupForm, setFollowupForm] = useState({ notes: '', scheduled_date: '', phone: patient.phone });
  const [rxForm, setRxForm] = useState({
    treatment_name: 'RCT Therapy',
    medicines: [
      { name: 'Amoxicillin 500mg', dosage: '1 tablet', frequency: 'Three times daily', duration: '5 days' }
    ]
  });
  const [letterForm, setLetterForm] = useState({
    type: 'Referral Letter',
    recipient: 'Dr. Durga Bhavani Jupalli (Cosmetic Dental Surgeon)',
    subject: 'Referral for wisdom tooth extraction evaluation',
    body: `Dear Specialist,\n\nI am referring ${patient.name}, a ${patient.age}-year-old ${patient.gender}, for evaluation and surgical extraction of impacted tooth 38.\n\nThank you,\nDr. Durga Bhavani Jupalli`
  });

  // Local state for communications log & tasks (fetched realtime)
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Fetch patient communications from Supabase whatsapp_messages table
  const fetchCommunications = async () => {
    if (!patient) return;
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .or(`patient_id.eq.${patient.id},phone.eq.${patient.phone}`)
        .order('sent_at', { ascending: false });
      
      if (!error && data) {
        setCommLogs(data);
      }
    } catch (e) {
      console.warn('Error fetching communications', e);
    }
  };

  // Fetch tasks
  const loadTasks = async () => {
    try {
      const all = await tasksStore.getTasks();
      const filtered = all.filter(t => t.patient_id === patient.id.toString() || t.patient_name === patient.name);
      setTasks(filtered);
    } catch (e) {
      console.warn('Error loading tasks', e);
    }
  };

  useEffect(() => {
    fetchCommunications();
    loadTasks();
  }, [patient]);

  // Handle adding task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await tasksStore.saveTask({
        id: '',
        task_code: '',
        title: newTaskTitle,
        description: `Patient 360 Action Task for ${patient.name}`,
        priority: 'Medium',
        assigned_by: 'Dr. Durga Bhavani Jupalli',
        assigned_to: 'Receptionist Pooja',
        department: 'Front Desk',
        patient_id: patient.id.toString(),
        patient_name: patient.name,
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        status: 'Assigned',
        task_type: 'CRM Checklist',
        created_at: new Date().toISOString()
      }, 'Dr. Durga Bhavani Jupalli');
      setNewTaskTitle('');
      loadTasks();
      notify('success', 'Task Assigned', 'A new operational task was successfully scheduled.');
    } catch (err) {
      notify('error', 'Failed Task Assignment', 'Error persisting operational task.');
    }
  };

  // Handle completing task
  const handleToggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const updatedTask: Task = {
        ...task,
        status: task.status === 'Completed' ? 'Assigned' : 'Completed'
      };
      await tasksStore.saveTask(updatedTask, 'Dr. Durga Bhavani Jupalli');
      loadTasks();
      notify('success', 'Task Updated', 'Task completion status refreshed.');
    } catch (e) {
      notify('error', 'Error Updating Task', 'Could not save state.');
    }
  };

  // Handle deleting task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksStore.deleteTask(taskId);
      loadTasks();
      notify('info', 'Task Deleted', 'Task removed from patient files.');
    } catch (e) {
      notify('error', 'Error Deleting Task', 'Could not delete.');
    }
  };

  // Parse patient metadata safely
  const metadata = useMemo(() => {
    return getPatientMetadata(patient);
  }, [patient]);

  // Compute stats
  const stats = useMemo(() => {
    const totalTreatments = patientTreatments.length;
    const completedTreatments = patientTreatments.filter(t => t.status === 'Completed' || t.stage === 'Completed').length;
    const completionRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 100;
    
    const caseValue = patientTreatments.reduce((sum, t) => sum + (Number(t.cost || t.estimated_cost) || 0), 0);
    const totalPaid = patientAppointments.reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
    const outstandingDue = patientAppointments.reduce((sum, a) => sum + (Number(a.balance_amount) || 0), 0);
    const visitCount = patientAppointments.length;
    
    return {
      completionRate,
      caseValue,
      lifetimeValue: totalPaid,
      outstandingDue,
      visitCount,
      referralSource: metadata.occupation ? 'Doctor Referral' : 'Google Search Maps',
      rating: 5.0
    };
  }, [patientAppointments, patientTreatments, metadata]);

  // Computed dental summary categories (derived from dental_chart)
  const dentalSummary = useMemo(() => {
    const chart = metadata.dental_chart || {};
    const caries: string[] = [];
    const missing: string[] = [];
    const restorations: string[] = [];
    const implants: string[] = [];
    const rct: string[] = [];
    const crowns: string[] = [];
    const bridges: string[] = [];

    Object.entries(chart).forEach(([tooth, status]: [string, any]) => {
      if (status === 'Caries') caries.push(tooth);
      else if (status === 'Missing' || status === 'Extraction') missing.push(tooth);
      else if (status === 'Filling') restorations.push(tooth);
      else if (status === 'Implant') implants.push(tooth);
      else if (status === 'RCT') rct.push(tooth);
      else if (status === 'Crown') crowns.push(tooth);
      else if (status === 'Bridge') bridges.push(tooth);
    });

    const orthoCases = patientTreatments.filter(t => /ortho/i.test(t.treatment_type)).map(t => `${t.treatment_type} (${t.stage})`);
    const activeAreas = patientTreatments.filter(t => t.stage !== 'Completed' && t.status !== 'Completed').map(t => `${t.treatment_type} (Tooth: ${t.tooth_no || 'All'})`);

    return {
      caries,
      missing,
      restorations,
      implants,
      rct,
      crowns,
      bridges,
      orthoCases,
      activeAreas,
      perioStatus: 'Grade A Gingival Plaque Index (Healthy Baseline)'
    };
  }, [metadata, patientTreatments]);

  // Formulate chronological unified timeline of ALL clinical and financial events
  const timelineEvents = useMemo(() => {
    const events: any[] = [];

    // Appointments
    patientAppointments.forEach(appt => {
      events.push({
        id: `appt-${appt.id}`,
        date: appt.created_at || appt.next_visit || new Date().toISOString(),
        type: 'Appointment',
        title: `Dental Consultation / Visit`,
        subtitle: `Procedure: ${appt.treatment || 'Consultation'}`,
        badge: appt.status || 'Scheduled',
        badgeColor: appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        details: [
          `Scheduled timeslot: ${appt.appointment_time || 'N/A'}`,
          `Amount invoiced: ₹${appt.amount_paid + appt.balance_amount}`,
          `Payment mode: ${appt.payment_mode || 'Cash'}`
        ],
        icon: Calendar,
        iconBg: 'bg-indigo-50 text-indigo-600',
        searchText: `appointment ${appt.treatment} ${appt.status} ${appt.payment_mode}`
      });
    });

    // Treatments
    patientTreatments.forEach(t => {
      events.push({
        id: `treat-${t.id}`,
        date: t.created_at || new Date().toISOString(),
        type: 'Treatment',
        title: t.treatment_type || 'Dental Procedure',
        subtitle: `Stage: ${t.stage || 'In Progress'}`,
        badge: t.status || 'Active',
        badgeColor: t.stage === 'Completed' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700',
        details: [
          `Tooth Area: ${t.tooth_no || 'Generalized'}`,
          `Assigned Specialist: ${t.doctor_name || 'Dr. Durga Bhavani Jupalli'}`,
          t.treatment_notes ? `Notes: ${t.treatment_notes}` : null
        ].filter(Boolean),
        icon: Stethoscope,
        iconBg: 'bg-emerald-50 text-emerald-600',
        searchText: `treatment ${t.treatment_type} ${t.stage} ${t.doctor_name} ${t.treatment_notes}`
      });
    });

    // Prescriptions (Rx)
    (metadata.prescriptions || []).forEach((rx: any, idx: number) => {
      events.push({
        id: `rx-${idx}`,
        date: rx.date || new Date().toISOString(),
        type: 'Prescription',
        title: `Generated Digital Rx`,
        subtitle: `For ${rx.treatment_name || 'Dental Procedure'}`,
        badge: 'Active Rx',
        badgeColor: 'bg-violet-50 text-violet-700',
        details: (rx.medicines || []).map((m: any) => `${m.name} - ${m.dosage} (${m.frequency}) for ${m.duration}`),
        icon: FileText,
        iconBg: 'bg-violet-50 text-violet-600',
        searchText: `prescription rx medicines amoxicillin paracetamol ${rx.treatment_name}`
      });
    });

    // Clinical Images & Radiographs
    (metadata.images || []).forEach((img: any, idx: number) => {
      events.push({
        id: `img-${idx}`,
        date: img.uploadedAt || new Date().toISOString(),
        type: 'Radiograph / Photo',
        title: img.name || 'Diagnostic Attachment',
        subtitle: `Category: ${img.category || 'X-Ray'}`,
        badge: 'Viewable File',
        badgeColor: 'bg-slate-50 text-slate-700',
        details: [img.notes || 'No added remarks.'],
        imageUrl: img.url,
        icon: ImageIcon,
        iconBg: 'bg-amber-50 text-amber-600',
        searchText: `radiograph photo x-ray opg imaging ${img.name} ${img.category} ${img.notes}`
      });
    });

    // Invoices and Payments
    if (canViewFinancials(getRole() as any)) {
      patientAppointments.forEach(appt => {
        if (appt.amount_paid > 0) {
          events.push({
            id: `pay-${appt.id}`,
            date: appt.created_at || new Date().toISOString(),
            type: 'Payment',
            title: `Receipt Recorded`,
            subtitle: `Amount: ₹${appt.amount_paid.toLocaleString('en-IN')}`,
            badge: 'Paid & Closed',
            badgeColor: 'bg-emerald-50 text-emerald-700',
            details: [`Invoiced via appointment reference SDC-BILL-${appt.id}`, `Mode: ${appt.payment_mode || 'Cash'}`],
            icon: DollarSign,
            iconBg: 'bg-emerald-50 text-emerald-600',
            searchText: `payment receipt paid cash bank transaction ${appt.amount_paid}`
          });
        }
        if (appt.balance_amount > 0) {
          events.push({
            id: `inv-${appt.id}`,
            date: appt.created_at || new Date().toISOString(),
            type: 'Invoice Due',
            title: `Invoice Outstanding`,
            subtitle: `Outstanding: ₹${appt.balance_amount.toLocaleString('en-IN')}`,
            badge: 'Unpaid Balance',
            badgeColor: 'bg-rose-50 text-rose-700',
            details: [`Bill reference: SDC-BILL-${appt.id}`],
            icon: CreditCard,
            iconBg: 'bg-rose-50 text-rose-600',
            searchText: `invoice due unpaid balance outstanding bill ${appt.balance_amount}`
          });
        }
      });
    }

    // Communications
    commLogs.forEach(log => {
      events.push({
        id: `comm-${log.id}`,
        date: log.sent_at || new Date().toISOString(),
        type: 'Communication',
        title: `WhatsApp Notification Dispatch`,
        subtitle: `Status: ${log.status || 'Sent'}`,
        badge: 'WhatsApp',
        badgeColor: 'bg-green-50 text-green-700',
        details: [log.message],
        icon: MessageCircle,
        iconBg: 'bg-green-50 text-green-600',
        searchText: `communication whatsapp sent message ${log.message}`
      });
    });

    // Sort descending by date
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientAppointments, patientTreatments, metadata, commLogs]);

  // Filtered Timeline
  const filteredTimeline = useMemo(() => {
    if (!globalSearch.trim()) return timelineEvents;
    const term = globalSearch.toLowerCase();
    return timelineEvents.filter(e => e.searchText.includes(term) || e.title.toLowerCase().includes(term) || e.subtitle.toLowerCase().includes(term));
  }, [timelineEvents, globalSearch]);

  // Smart Read-Only Dynamic AI Summary Formulation
  const smartSummaryText = useMemo(() => {
    const activeTxStr = dentalSummary.activeAreas.length > 0 
      ? `undergoing active ${dentalSummary.activeAreas.join(', ')}` 
      : 'no ongoing active procedures scheduled';
      
    const lastVisitStr = patient.last_visit_date 
      ? `Last visit was documented on ${new Date(patient.last_visit_date).toLocaleDateString('en-IN')}` 
      : 'No previous visits logged';

    const nextVisitStr = patient.next_visit_date 
      ? `Next visit scheduled on ${new Date(patient.next_visit_date).toLocaleDateString('en-IN')}` 
      : 'No upcoming appointments booked';

    const medHistoryStr = metadata.medical_history && metadata.medical_history.length > 0 
      ? `Medical history includes ${metadata.medical_history.join(', ')}` 
      : 'No clinical systemic contraindications reported';

    const allergiesStr = metadata.allergies && metadata.allergies.length > 0 
      ? `with reported allergies to ${metadata.allergies.join(', ')}` 
      : 'and zero allergies documented';

    const dueStr = canViewFinancials(getRole() as any) ? `Outstanding balance amounts to ₹${stats.outstandingDue.toLocaleString('en-IN')}.` : '';

    return `Patient ${patient.name} is currently ${activeTxStr}. ${dueStr} ${nextVisitStr}. ${lastVisitStr}. ${medHistoryStr} ${allergiesStr}.`;
  }, [patient, metadata, dentalSummary, stats]);

  // Quick Action Submissions
  const handleAddClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    try {
      // Re-read current metadata notes column and update
      const updatedNotes = JSON.stringify({
        ...metadata,
        internal_notes: noteForm.content + (metadata.internal_notes ? `\n---\n${metadata.internal_notes}` : '')
      });

      const { error } = await supabase
        .from('patients')
        .update({ notes: updatedNotes })
        .eq('id', patient.id);

      if (error) throw error;
      notify('success', 'Clinical Note Recorded', 'Successfully added notes into the patient file.');
      setActiveModal('none');
      setNoteForm({ content: '', is_clinical: true });
      onRefresh();
    } catch (e: any) {
      notify('error', 'Failed Note Recording', e.message);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptForm.next_visit) {
      notify('error', 'Booking Restrained', 'Select an upcoming date.');
      return;
    }
    if (!apptForm.appointment_time || !isValidAppointmentTime(apptForm.appointment_time)) {
      notify('error', 'Invalid Appointment Time', 'Please select a valid appointment time between 5:00 AM and 11:00 PM.');
      return;
    }
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patient.id,
          name: patient.name,
          phone: patient.phone,
          treatment: apptForm.treatment,
          next_visit: apptForm.next_visit,
          appointment_time: apptForm.appointment_time,
          status: 'Confirmed',
          visit_count: patientAppointments.length + 1,
          visit_type: 'Regular Follow-up',
          amount_paid: 0,
          balance_amount: 500,
          payment_mode: 'Cash',
          notes: apptForm.notes
        }]);

      if (error) throw error;
      
      // Update patient's next_visit_date
      await supabase
        .from('patients')
        .update({ next_visit_date: apptForm.next_visit })
        .eq('id', patient.id);

      notify('success', 'Appointment Scheduled', `Booked ${apptForm.treatment} for ${apptForm.next_visit}.`);
      setActiveModal('none');
      onRefresh();
    } catch (err: any) {
      notify('error', 'Failed Appointment Booking', err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.appointment_id || !paymentForm.amount_paid) {
      notify('error', 'Payment Unresolved', 'Please specify amount and bill ID.');
      return;
    }
    try {
      const apptId = Number(paymentForm.appointment_id);
      const matchedAppt = patientAppointments.find(a => a.id === apptId);
      if (!matchedAppt) return;

      const paidVal = parseFloat(paymentForm.amount_paid);
      const currentPaid = Number(matchedAppt.amount_paid) || 0;
      const currentDue = Number(matchedAppt.balance_amount) || 0;

      if (paidVal > currentDue) {
        notify('warning', 'Overpayment Detected', 'Paid value exceeds pending due.');
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          amount_paid: currentPaid + paidVal,
          balance_amount: Math.max(0, currentDue - paidVal),
          payment_notes: paymentForm.payment_notes || matchedAppt.payment_notes
        })
        .eq('id', apptId);

      if (error) throw error;
      notify('success', 'Payment Received', `Successfully recorded ₹${paidVal} towards Bill SDC-BILL-${apptId}.`);
      setActiveModal('none');
      setPaymentForm({ appointment_id: '', amount_paid: '', payment_mode: 'Cash', payment_notes: '' });
      onRefresh();
    } catch (err: any) {
      notify('error', 'Payment Logging Stalled', err.message);
    }
  };

  const handleUploadFile = async (category: 'Radiograph' | 'Clinical Photo') => {
    try {
      const form = category === 'Radiograph' ? xrayForm : photoForm;
      if (!form.name || !form.fileData) {
        notify('error', 'Attachment Missing', 'Please provide a file and title.');
        return;
      }

      const currentImages = metadata.images || [];
      const updatedImages = [
        ...currentImages,
        {
          name: form.name,
          category: category,
          notes: form.notes,
          url: form.fileData,
          uploadedAt: new Date().toISOString()
        }
      ];

      const updatedNotes = JSON.stringify({
        ...metadata,
        images: updatedImages
      });

      const { error } = await supabase
        .from('patients')
        .update({ notes: updatedNotes })
        .eq('id', patient.id);

      if (error) throw error;
      notify('success', 'Attachment Securely Saved', `"${form.name}" uploaded under Document center.`);
      setActiveModal('none');
      if (category === 'Radiograph') setXrayForm({ name: 'Bitewing X-Ray', notes: '', fileData: '' });
      else setPhotoForm({ name: 'Pre-operative Intraoral', notes: '', fileData: '' });
      onRefresh();
    } catch (err: any) {
      notify('error', 'Upload Encountered Error', err.message);
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupForm.scheduled_date || !followupForm.notes) {
      notify('error', 'Form Incomplete', 'Scheduled date and notes are required.');
      return;
    }
    try {
      // Trigger a task for staff to callback
      await tasksStore.saveTask({
        id: '',
        task_code: '',
        title: `Follow-up Callback: ${patient.name}`,
        description: `Call back patient. Notes: ${followupForm.notes}`,
        priority: 'High',
        assigned_by: 'Dr. Durga Bhavani Jupalli',
        assigned_to: 'Receptionist Pooja',
        department: 'Front Desk',
        patient_id: patient.id.toString(),
        patient_name: patient.name,
        due_date: followupForm.scheduled_date,
        status: 'Assigned',
        task_type: 'Call Patient',
        created_at: new Date().toISOString()
      }, 'Dr. Durga Bhavani Jupalli');

      // Insert WhatsApp template log
      const messageText = `Hi ${patient.name}, this is Sri Chaitanya Dental Care. Scheduling a quick clinical check on ${followupForm.scheduled_date} regarding: "${followupForm.notes}".`;
      await supabase.from('whatsapp_messages').insert({
        phone: followupForm.phone,
        message: messageText,
        status: 'Sent',
        sent_at: new Date().toISOString(),
        patient_id: patient.id
      });

      notify('success', 'Follow-up Configured', 'Follow-up task logged and SMS notification queued.');
      setActiveModal('none');
      setFollowupForm({ notes: '', scheduled_date: '', phone: patient.phone });
      fetchCommunications();
      loadTasks();
    } catch (e: any) {
      notify('error', 'Error Scheduling Followup', e.message);
    }
  };

  const handleGeneratePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentRx = metadata.prescriptions || [];
      const newRx = {
        treatment_name: rxForm.treatment_name,
        medicines: rxForm.medicines,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedNotes = JSON.stringify({
        ...metadata,
        prescriptions: [...currentRx, newRx]
      });

      const { error } = await supabase
        .from('patients')
        .update({ notes: updatedNotes })
        .eq('id', patient.id);

      if (error) throw error;
      notify('success', 'Rx Prescribed', `Digital Rx for ${rxForm.treatment_name} was saved and printed.`);
      setActiveModal('none');
      onRefresh();
    } catch (e: any) {
      notify('error', 'Prescription Saving Halted', e.message);
    }
  };

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentLetters = metadata.consent_forms || []; // store letters under consent_forms array
      const newLetter = {
        title: letterForm.type,
        recipient: letterForm.recipient,
        subject: letterForm.subject,
        body: letterForm.body,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedNotes = JSON.stringify({
        ...metadata,
        consent_forms: [...currentLetters, newLetter]
      });

      const { error } = await supabase
        .from('patients')
        .update({ notes: updatedNotes })
        .eq('id', patient.id);

      if (error) throw error;
      notify('success', 'Letter Formulated', `${letterForm.type} saved under Clinical Documents.`);
      setActiveModal('none');
      onRefresh();
    } catch (e: any) {
      notify('error', 'Letter Creation Blocked', e.message);
    }
  };

  const handleSendWhatsAppMessage = async (templateType: 'thank_you' | 'appointment' | 'payment_reminder') => {
    try {
      let msg = '';
      if (templateType === 'thank_you') {
        msg = thankYouMessage({ name: patient.name });
      } else if (templateType === 'appointment') {
        const nextAppt = patientAppointments[0];
        msg = appointmentConfirmationMessage({
          name: patient.name,
          next_visit: nextAppt?.next_visit || 'Tomorrow',
          appointment_time: nextAppt?.appointment_time || '10:00 AM',
          treatment: nextAppt?.treatment || 'Dental Care'
        });
      } else if (templateType === 'payment_reminder') {
        msg = paymentReminderMessage({
          name: patient.name,
          balance_amount: stats.outstandingDue,
          treatment: 'Dental Care'
        });
      }

      openWhatsApp(patient.phone, msg);

      // Audit log in Supabase
      await supabase.from('whatsapp_messages').insert({
        phone: patient.phone,
        message: msg,
        status: 'Sent',
        sent_at: new Date().toISOString(),
        patient_id: patient.id
      });

      notify('success', 'WhatsApp Initiated', 'Logged and dispatched message via web hook.');
      fetchCommunications();
    } catch (e: any) {
      notify('error', 'Notification dispatch failed', e.message);
    }
  };

  // Convert uploaded image file helper
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'xray' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'xray') {
        setXrayForm(prev => ({ ...prev, fileData: reader.result as string, name: file.name.split('.')[0] }));
      } else {
        setPhotoForm(prev => ({ ...prev, fileData: reader.result as string, name: file.name.split('.')[0] }));
      }
    };
    reader.readAsDataURL(file);
  };

  const calculateAge = (dobString: string): string => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return '';
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return String(computedAge);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-full text-slate-800 dark:text-slate-100 max-w-[1600px] mx-auto select-none overflow-hidden" id="patient-360-desk">
      
      {/* LEFT SIDEBAR PANEL */}
      <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-[85vh] xl:max-h-full">
        {/* Patient header */}
        <div className="text-center relative">
          <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-teal-50 border border-teal-100 flex items-center justify-center relative shadow-sm">
            <User size={48} className="text-teal-600" />
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-teal-600 text-white text-[8px] font-black uppercase rounded">
              {patient.patient_status || 'Registered'}
            </div>
          </div>
          <h2 className="text-base font-black text-slate-850 dark:text-white mt-3 truncate">{patient.name}</h2>
          <p className="text-[11px] font-mono font-black text-teal-600 dark:text-teal-400 mt-1">{patient.patient_code}</p>
        </div>

        {/* Essential details list */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Date of Birth</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {getPatientDOB(patient, metadata) ? formatDateDDMMYYYY(getPatientDOB(patient, metadata)) : 'Not Provided'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Age & Gender</span>
            <span className="font-extrabold">
              {getPatientAgeDisplay(patient, metadata)} • {patient.gender || metadata.gender || 'Unspecified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Contact</span>
            <a href={`tel:${patient.phone}`} className="font-mono text-teal-600 hover:underline font-bold">{patient.phone}</a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Email</span>
            <span className="truncate max-w-[180px] font-medium text-slate-600 dark:text-slate-400">{patient.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Blood Group</span>
            <span className="font-extrabold text-rose-600">{metadata.blood_group || 'Not Specified'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Occupation</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{metadata.occupation || 'Not Specified'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-[10px] uppercase">Primary Specialist</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">Dr. Durga Bhavani Jupalli</span>
          </div>
        </div>

        {/* CLINICAL CONTRAINDICATIONS & SAFETY */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Medical Risk Flags</p>
          
          {/* Medical History */}
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase text-slate-400">Systemic History:</p>
            {metadata.medical_history && metadata.medical_history.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {metadata.medical_history.map((h: string) => (
                  <span key={h} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 flex items-center gap-1">
                    <ShieldAlert size={10} /> {h}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={11} /> No systemic issues declared.
              </p>
            )}
          </div>

          {/* Allergies */}
          <div className="space-y-1 pt-1.5">
            <p className="text-[9px] font-bold uppercase text-slate-400">Drug/Local Allergies:</p>
            {metadata.allergies && metadata.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {metadata.allergies.map((a: string) => (
                  <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-150 flex items-center gap-1">
                    <AlertCircle size={10} /> {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10.5px] font-bold text-slate-500">No allergy files found.</p>
            )}
          </div>
        </div>

        {/* QUICK CONTACT ACTION TRIGGERS */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto space-y-2 select-none">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Telephony & Dispatch</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${patient.phone}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer"
            >
              <Phone size={12} /> Call Patient
            </a>
            <button
              onClick={() => handleSendWhatsAppMessage('thank_you')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-black rounded-xl transition cursor-pointer border-0"
            >
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* CENTER WORKSPACE SECTION */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[85vh] xl:max-h-full pr-1">
        
        {/* HEADING SEARCH BAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search notes, treatments, Rx, x-rays..."
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs font-semibold outline-none focus:border-teal-500 focus:bg-white dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setActiveModal('appointment')}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
            >
              <Plus size={12} /> Book Appointment
            </button>
            <button
              onClick={() => setActiveModal('note')}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
            >
              <FilePlus size={12} /> Clinical Note
            </button>
          </div>
        </div>

        {/* CLINICAL COPILOT SMART SUMMARY CARD */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-slate-850 dark:to-slate-900 border border-amber-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-xs relative overflow-hidden shrink-0 select-none">
          <div className="absolute -right-3 -bottom-3 text-amber-500/10 dark:text-amber-500/5">
            <Sparkles size={120} className="fill-amber-500/10" />
          </div>
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 mb-1.5">
            <Sparkles size={15} className="fill-amber-500 animate-pulse text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider">Clinical AI Copilot — Patient Case Index</span>
          </div>
          <p className="text-[12px] font-semibold leading-relaxed text-slate-700 dark:text-slate-300 max-w-4xl relative z-10">
            "{smartSummaryText}"
          </p>
        </div>

        {/* GRID OVERVIEW & HEALTH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* PATIENT 360 CLINICAL OVERVIEW PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Activity size={12} className="text-teal-600" /> Active Treatment Status Desk
              </h3>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Today's Appointment</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-white truncate">
                    {patientAppointments[0]?.next_visit === new Date().toISOString().split('T')[0] 
                      ? `${patientAppointments[0].treatment} (${patientAppointments[0].appointment_time})` 
                      : 'No visit today'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Outstanding Balance</p>
                  <p className="text-[11px] font-black text-rose-600">{canViewFinancials(getRole() as any) ? `₹${stats.outstandingDue.toLocaleString('en-IN')}` : '🔐 Restricted'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Pending Follow-ups</p>
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    {tasks.filter(t => t.title.toLowerCase().includes('follow-up') && t.status !== 'Completed').length} pending recall(s)
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Last / Next Visit</p>
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    {patient.last_visit_date ? new Date(patient.last_visit_date).toLocaleDateString('en-IN') : 'N/A'} / {patient.next_visit_date ? new Date(patient.next_visit_date).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Treatment Progress metrics */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>Treatment Track Completion</span>
                <span className="text-teal-600 font-extrabold">{stats.completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-teal-600 h-full transition-all duration-500" 
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* DENTAL HEALTH SUMMARY (Interactive Tooth Index) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Stethoscope size={12} className="text-teal-600" /> Electronic Health Dental Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                {dentalSummary.caries.length > 0 && (
                  <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                    <span className="text-rose-500 font-bold text-[10px] uppercase">Active Caries / Decay</span>
                    <span className="font-extrabold text-rose-600">{dentalSummary.caries.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">RCT Treated Teeth</span>
                  <span className="font-extrabold text-violet-600">{dentalSummary.rct.join(', ') || 'None'}</span>
                </div>
                <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Missing Teeth Areas</span>
                  <span className="font-extrabold text-slate-500">{dentalSummary.missing.join(', ') || 'None'}</span>
                </div>
                <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Restorations / Crowns</span>
                  <span className="font-extrabold text-amber-600">
                    {dentalSummary.restorations.length + dentalSummary.crowns.length > 0 
                      ? `Filling: ${dentalSummary.restorations.join(', ')} • Crown: ${dentalSummary.crowns.join(', ')}` 
                      : 'None'}
                  </span>
                </div>
                <div className="flex items-start justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Implants & Bridges</span>
                  <span className="font-extrabold text-teal-600">
                    {dentalSummary.implants.length + dentalSummary.bridges.length > 0 
                      ? `Implant: ${dentalSummary.implants.join(', ')} • Bridge: ${dentalSummary.bridges.join(', ')}` 
                      : 'None'}
                  </span>
                </div>
                <div className="flex items-start justify-between py-1">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Active Case Areas</span>
                  <span className="font-extrabold text-teal-600 truncate max-w-[200px]">{dentalSummary.activeAreas.join(', ') || 'Generalized Hygiene'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('dental_chart')}
              className="mt-3 w-full text-center py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-[11px] font-black rounded-xl border border-slate-200/50 dark:border-slate-800 transition cursor-pointer"
            >
              Open Comprehensive Dental Chart
            </button>
          </div>

        </div>

        {/* WORKFLOW AND TASK CENTER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
            <CheckSquare size={12} className="text-teal-600" /> Operational Workflows & Tasks
          </h3>

          <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Assign a new CRM checklist item or task..."
              className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 rounded-xl outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer"
            >
              Add Checklist
            </button>
          </form>

          {tasks.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-3 text-center bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-150">All workspace checklists and recall followups are completed.</p>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl text-xs font-semibold">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={() => handleToggleTask(task.id)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className={task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-750 dark:text-slate-300'}>{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      task.priority === 'High' || task.priority === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {task.priority}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FINANCIAL SNAPSHOT CARD */}
        {canViewFinancials(getRole() as any) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign size={12} className="text-teal-600" /> Revenue & Accounting Snapshot
              </h3>
              <button
                onClick={() => setActiveTab('billing')}
                className="text-[11px] font-black text-teal-600 hover:underline cursor-pointer"
              >
                Detailed Ledger
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/50 dark:bg-slate-950 border border-emerald-100 dark:border-slate-850 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Paid Revenue</span>
                <span className="text-base font-black text-emerald-600 block mt-1">₹{stats.lifetimeValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-rose-50/50 dark:bg-slate-950 border border-rose-100 dark:border-slate-850 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Outstanding Dues</span>
                <span className="text-base font-black text-rose-600 block mt-1">₹{stats.outstandingDue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Case Value</span>
                <span className="text-base font-black text-slate-750 dark:text-white block mt-1">₹{stats.caseValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Receipts</span>
                <span className="text-base font-black text-slate-750 dark:text-white block mt-1">{patientAppointments.filter(a => a.amount_paid > 0).length} bills</span>
              </div>
            </div>
          </div>
        )}

        {/* INTERACTIVE DOCUMENT STUDIO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderOpen size={12} className="text-teal-600" /> Patient Document Center
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal('xray')}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200/50 cursor-pointer"
              >
                <Plus size={10} /> X-Ray / OPG
              </button>
              <button
                onClick={() => setActiveModal('prescription')}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200/50 cursor-pointer"
              >
                <Plus size={10} /> Prescription
              </button>
              <button
                onClick={() => setActiveModal('letter')}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200/50 cursor-pointer"
              >
                <Plus size={10} /> Medical Letter
              </button>
            </div>
          </div>

          {/* Documents lists layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
            {/* Radiographs & Clinical Images */}
            <div className="border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Radiographs & Clinical Photos</p>
              {(metadata.images || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 py-4 text-center">No images uploaded.</p>
              ) : (
                <div className="space-y-1.5">
                  {(metadata.images || []).map((img: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-semibold">
                      <span className="truncate max-w-[150px]">{img.name}</span>
                      <button
                        onClick={() => setPreviewDoc({ type: 'img', title: img.name, content: img })}
                        className="text-teal-600 hover:underline p-1 cursor-pointer flex items-center gap-0.5"
                      >
                        <Eye size={11} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions & Consent/Letters */}
            <div className="border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Digital Prescriptions & Letters</p>
              {(metadata.prescriptions || []).length === 0 && (metadata.consent_forms || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 py-4 text-center">No digital documents generated.</p>
              ) : (
                <div className="space-y-1.5">
                  {(metadata.prescriptions || []).map((rx: any, idx: number) => (
                    <div key={`rx-${idx}`} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-semibold">
                      <span className="truncate max-w-[150px]">Rx: {rx.treatment_name}</span>
                      <button
                        onClick={() => setPreviewDoc({ type: 'rx', title: `Rx: ${rx.treatment_name}`, content: rx })}
                        className="text-teal-600 hover:underline p-1 cursor-pointer flex items-center gap-0.5"
                      >
                        <Eye size={11} /> View
                      </button>
                    </div>
                  ))}
                  {(metadata.consent_forms || []).map((cf: any, idx: number) => (
                    <div key={`cf-${idx}`} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs font-semibold">
                      <span className="truncate max-w-[150px]">{cf.title || 'Consent Form'}</span>
                      <button
                        onClick={() => setPreviewDoc({ type: 'cf', title: cf.title || 'Consent Form', content: cf })}
                        className="text-teal-600 hover:underline p-1 cursor-pointer flex items-center gap-0.5"
                      >
                        <Eye size={11} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHRONOLOGICAL CLINICAL TIMELINE (Searchable) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
            <Activity size={12} className="text-teal-600" /> Chronological Patient Timeline
          </h3>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {filteredTimeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No matching events match search criteria.</p>
            ) : (
              filteredTimeline.map((evt, idx) => {
                const IconComponent = evt.icon;
                return (
                  <div key={evt.id} className="flex gap-3 relative group">
                    {idx < filteredTimeline.length - 1 && (
                      <span className="absolute left-[13px] top-[26px] bottom-[-16px] w-[1.5px] bg-slate-100 dark:bg-slate-850" />
                    )}
                    <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 ${evt.iconBg} shadow-sm`}>
                      <IconComponent size={13} />
                    </div>
                    <div className="flex-1 bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">{new Date(evt.date).toLocaleString('en-IN')}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${evt.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                          {evt.badge || evt.type}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs">{evt.title}</h4>
                      <p className="text-slate-500 font-semibold text-[11px]">{evt.subtitle}</p>
                      
                      {evt.details && evt.details.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100/50 dark:border-slate-850/50 space-y-0.5 mt-1">
                          {evt.details.map((detail: string, dIdx: number) => (
                            <p key={dIdx} className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{detail}</p>
                          ))}
                        </div>
                      )}

                      {evt.imageUrl && (
                        <div className="pt-2">
                          <img 
                            src={evt.imageUrl} 
                            alt={evt.title} 
                            className="max-h-[140px] rounded-lg border border-slate-200 dark:border-slate-800 object-cover cursor-zoom-in"
                            onClick={() => setPreviewDoc({ type: 'img', title: evt.title, content: { url: evt.imageUrl, notes: evt.subtitle } })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR PANEL */}
      <div className="w-full xl:w-72 shrink-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh] xl:max-h-full">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award size={12} className="text-teal-600" /> Patient Lifetime KPI Center
        </h3>

        <div className="space-y-3">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="text-[9px] font-black uppercase text-slate-400 block">Total Lifetime Value</span>
            <span className="text-xl font-black text-teal-600 block mt-0.5">{canViewFinancials(getRole() as any) ? `₹${stats.lifetimeValue.toLocaleString('en-IN')}` : '🔐 Restricted'}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="text-[9px] font-black uppercase text-slate-400 block">Gross Treatment Case Value</span>
            <span className="text-xl font-black text-slate-800 dark:text-white block mt-0.5 font-mono">{canViewFinancials(getRole() as any) ? `₹${stats.caseValue.toLocaleString('en-IN')}` : '🔐 Restricted'}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Total visits</span>
              <span className="text-base font-black text-slate-750 dark:text-slate-300 block mt-0.5">{stats.visitCount} consultations</span>
            </div>
            <Calendar size={20} className="text-slate-400 shrink-0" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Referral Channel</span>
              <span className="text-xs font-bold text-slate-750 dark:text-slate-300 block mt-0.5">{stats.referralSource}</span>
            </div>
            <Users size={18} className="text-slate-400 shrink-0" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Sentiment/Satisfy</span>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={11} className="fill-amber-500 text-amber-500" />
                ))}
              </div>
            </div>
            <Heart size={18} className="text-rose-500 shrink-0 fill-rose-500/20" />
          </div>
        </div>

        {/* COMMUNICATION HISTORY LOG */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex-1 flex flex-col min-h-[220px]">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare size={10} className="text-teal-600" /> Messaging Dispatch
          </p>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[250px] pr-1">
            {commLogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-4">No logged communications.</p>
            ) : (
              commLogs.map((log: any, idx: number) => (
                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-[11px] space-y-1 leading-relaxed">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>{new Date(log.sent_at).toLocaleDateString('en-IN')}</span>
                    <span className="text-emerald-600 font-extrabold uppercase">WhatsApp</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium truncate" title={log.message}>{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS STICKY TRAY (Floats nicely as a premium responsive console) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-3 z-40 max-w-full overflow-x-auto select-none no-scrollbar">
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-r border-slate-200 dark:border-slate-800 pr-3 mr-1 shrink-0 flex items-center gap-1">
          <Zap size={10} className="fill-amber-500 text-amber-500" /> Desk Console
        </span>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveModal('appointment')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Book upcoming appointment"
          >
            <Calendar size={11} className="text-teal-600" /> Visit
          </button>
          
          <button
            onClick={() => setActiveModal('note')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Add clinical or internal notes"
          >
            <FileText size={11} className="text-teal-600" /> Clinical Note
          </button>
          
          <button
            onClick={() => setActiveTab('dental_chart')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Toggle full dental chart model"
          >
            <Stethoscope size={11} className="text-teal-600" /> Chart
          </button>
          
          {canViewFinancials(getRole() as any) && (
            <>
              <button
                onClick={() => setActiveTab('billing')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                title="Generate custom invoice"
              >
                <CreditCard size={11} className="text-teal-600" /> Invoice
              </button>

              <button
                onClick={() => setActiveModal('payment')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                title="Record payment received"
              >
                <DollarSign size={11} className="text-teal-600" /> Payment
              </button>
            </>
          )}

          <button
            onClick={() => setActiveModal('xray')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Upload radiograph or image file"
          >
            <Camera size={11} className="text-teal-600" /> Attach
          </button>

          <button
            onClick={() => setActiveModal('followup')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Create reminder follow up call"
          >
            <Bell size={11} className="text-teal-600" /> Follow-up
          </button>

          <button
            onClick={() => setActiveModal('prescription')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Create and print digital Rx"
          >
            <Pill size={11} className="text-teal-600" /> Rx
          </button>

          <button
            onClick={() => setActiveModal('letter')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-[10.5px] font-extrabold rounded-full border border-slate-200/50 dark:border-slate-800 cursor-pointer"
            title="Formulate official medical letter"
          >
            <Mail size={11} className="text-teal-600" /> Letter
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS ACTION DIALOGS */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-850 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="fill-amber-500 text-amber-500" />
                {activeModal === 'appointment' && 'Book Dental Visit'}
                {activeModal === 'note' && 'Add Clinical Remarks'}
                {activeModal === 'payment' && 'Record Bill Payment'}
                {activeModal === 'xray' && 'Upload Clinical Radiograph'}
                {activeModal === 'photo' && 'Upload Intraoral Photo'}
                {activeModal === 'followup' && 'Configure Call Followup'}
                {activeModal === 'prescription' && 'Generate Digital Rx'}
                {activeModal === 'letter' && 'Formulate Specialist Letter'}
              </h4>
              <button onClick={() => setActiveModal('none')} className="p-1 hover:bg-slate-100 rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Note Form */}
            {activeModal === 'note' && (
              <form onSubmit={handleAddClinicalNote} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Remarks Content</label>
                  <textarea
                    required
                    rows={4}
                    value={noteForm.content}
                    onChange={e => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Describe clinical observations, patient concerns, or diagnostic advice..."
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:bg-slate-950"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Save Clinical Notes
                </button>
              </form>
            )}

            {/* Appointment Form */}
            {activeModal === 'appointment' && (
              <form onSubmit={handleBookAppointment} className="space-y-3.5">
                <ReasonForVisitSelect
                  value={apptForm.treatment}
                  onChange={val => setApptForm(prev => ({ ...prev, treatment: val }))}
                  required
                  label="Procedure Type / Reason for Visit *"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Upcoming Date</label>
                    <input
                      type="date"
                      required
                      value={apptForm.next_visit}
                      onChange={e => setApptForm(prev => ({ ...prev, next_visit: e.target.value }))}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Timeslot Slot *</label>
                    <select
                      required
                      value={apptForm.appointment_time}
                      onChange={e => setApptForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                    >
                      <option value="">Select time</option>
                      {APPOINTMENT_TIME_OPTIONS.map(timeOption => (
                        <option key={timeOption} value={timeOption}>{timeOption}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes / Indications</label>
                  <input
                    type="text"
                    value={apptForm.notes}
                    onChange={e => setApptForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Tooth 46 RCT session 2"
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Schedule Booking
                </button>
              </form>
            )}

            {/* Record Payment Form */}
            {activeModal === 'payment' && (
              <form onSubmit={handleRecordPayment} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Active Bill</label>
                  <select
                    required
                    value={paymentForm.appointment_id}
                    onChange={e => setPaymentForm(prev => ({ ...prev, appointment_id: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  >
                    <option value="">-- Choose outstanding bill --</option>
                    {patientAppointments.filter(a => a.balance_amount > 0).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.treatment} (SDC-BILL-{a.id} • Due: ₹{a.balance_amount})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Amount to Pay (₹)</label>
                    <input
                      type="number"
                      required
                      value={paymentForm.amount_paid}
                      onChange={e => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                      placeholder="e.g. 1500"
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Mode</label>
                    <select
                      value={paymentForm.payment_mode}
                      onChange={e => setPaymentForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI / PhonePe">UPI / PhonePe</option>
                      <option value="Card Swipe">Card Swipe</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Receipt Remarks</label>
                  <input
                    type="text"
                    value={paymentForm.payment_notes}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payment_notes: e.target.value }))}
                    placeholder="e.g. Cash received by front desk"
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Submit Payment Record
                </button>
              </form>
            )}

            {/* Radiograph / Photo Upload Form */}
            {(activeModal === 'xray' || activeModal === 'photo') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Attachment Title</label>
                  <input
                    type="text"
                    required
                    value={activeModal === 'xray' ? xrayForm.name : photoForm.name}
                    onChange={e => {
                      const val = e.target.value;
                      if (activeModal === 'xray') setXrayForm(prev => ({ ...prev, name: val }));
                      else setPhotoForm(prev => ({ ...prev, name: val }));
                    }}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">File Upload (Base64/Local)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageFileChange(e, activeModal === 'xray' ? 'xray' : 'photo')}
                    className="w-full text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-850 p-4 rounded-xl cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Diagnosis Notes</label>
                  <input
                    type="text"
                    value={activeModal === 'xray' ? xrayForm.notes : photoForm.notes}
                    onChange={e => {
                      const val = e.target.value;
                      if (activeModal === 'xray') setXrayForm(prev => ({ ...prev, notes: val }));
                      else setPhotoForm(prev => ({ ...prev, notes: val }));
                    }}
                    placeholder="e.g. Tooth 46 apical radiolucency check"
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>

                <button
                  onClick={() => handleUploadFile(activeModal === 'xray' ? 'Radiograph' : 'Clinical Photo')}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
                >
                  Save Attachment File
                </button>
              </div>
            )}

            {/* Followup Form */}
            {activeModal === 'followup' && (
              <form onSubmit={handleCreateFollowup} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Callback Indication Notes</label>
                  <input
                    type="text"
                    required
                    value={followupForm.notes}
                    onChange={e => setFollowupForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Call back regarding post-op pain checks"
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Scheduled Callback Date</label>
                  <input
                    type="date"
                    required
                    value={followupForm.scheduled_date}
                    onChange={e => setFollowupForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Schedule Reminder Follow-up
                </button>
              </form>
            )}

            {/* Prescription Form */}
            {activeModal === 'prescription' && (
              <form onSubmit={handleGeneratePrescription} className="space-y-3.5 text-slate-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Treatment Name</label>
                  <input
                    type="text"
                    required
                    value={rxForm.treatment_name}
                    onChange={e => setRxForm(prev => ({ ...prev, treatment_name: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Medicines List</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pt-1">
                    {rxForm.medicines.map((med, index) => (
                      <div key={index} className="p-2 bg-slate-50 rounded-lg space-y-1.5 border border-slate-100">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={e => {
                            const newMeds = [...rxForm.medicines];
                            newMeds[index].name = e.target.value;
                            setRxForm(prev => ({ ...prev, medicines: newMeds }));
                          }}
                          className="w-full text-xs font-semibold px-2 py-1 bg-white border border-slate-250 rounded-md"
                        />
                        <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                          <input
                            type="text"
                            placeholder="Dosage"
                            value={med.dosage}
                            onChange={e => {
                              const newMeds = [...rxForm.medicines];
                              newMeds[index].dosage = e.target.value;
                              setRxForm(prev => ({ ...prev, medicines: newMeds }));
                            }}
                            className="px-2 py-1 bg-white border border-slate-250 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Freq"
                            value={med.frequency}
                            onChange={e => {
                              const newMeds = [...rxForm.medicines];
                              newMeds[index].frequency = e.target.value;
                              setRxForm(prev => ({ ...prev, medicines: newMeds }));
                            }}
                            className="px-2 py-1 bg-white border border-slate-250 rounded-md"
                          />
                          <input
                            type="text"
                            placeholder="Duration"
                            value={med.duration}
                            onChange={e => {
                              const newMeds = [...rxForm.medicines];
                              newMeds[index].duration = e.target.value;
                              setRxForm(prev => ({ ...prev, medicines: newMeds }));
                            }}
                            className="px-2 py-1 bg-white border border-slate-250 rounded-md"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setRxForm(prev => ({
                      ...prev,
                      medicines: [...prev.medicines, { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days' }]
                    }))}
                    className="mt-2 text-[10px] text-teal-600 font-extrabold flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                  >
                    <Plus size={12} /> Add Medicine
                  </button>
                </div>

                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Save & Publish Prescription
                </button>
              </form>
            )}

            {/* Letter Form */}
            {activeModal === 'letter' && (
              <form onSubmit={handleGenerateLetter} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Letter Type</label>
                  <select
                    value={letterForm.type}
                    onChange={e => setLetterForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  >
                    <option value="Referral Letter">Referral Letter</option>
                    <option value="Clinical Consent Certificate">Clinical Consent Certificate</option>
                    <option value="Medical Certificate">Medical Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Recipient Specialist</label>
                  <input
                    type="text"
                    required
                    value={letterForm.recipient}
                    onChange={e => setLetterForm(prev => ({ ...prev, recipient: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={letterForm.subject}
                    onChange={e => setLetterForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Letter Body Content</label>
                  <textarea
                    required
                    rows={4}
                    value={letterForm.body}
                    onChange={e => setLetterForm(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none dark:bg-slate-950"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Save & Formulate Document
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-850">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
                <FileText size={14} /> Document Preview Studio
              </h4>
              <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-slate-100 rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl text-xs overflow-y-auto max-h-[350px]">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">{previewDoc.title}</h3>
              
              {previewDoc.type === 'img' && (
                <div className="space-y-2">
                  <img src={previewDoc.content.url} alt={previewDoc.title} className="max-w-full rounded-xl border object-contain max-h-[300px] mx-auto" />
                  <p className="font-semibold text-slate-500 text-center text-[11px] mt-1">{previewDoc.content.notes}</p>
                </div>
              )}

              {previewDoc.type === 'rx' && (
                <div className="space-y-3 pt-2">
                  <p className="font-bold border-b pb-1 text-teal-700 uppercase text-[10px]">Active Prescription (Rx) Panel</p>
                  <p className="font-semibold">Treatment Track: {previewDoc.content.treatment_name}</p>
                  <div className="space-y-1.5">
                    {(previewDoc.content.medicines || []).map((m: any, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded border font-medium">
                        <p className="font-bold text-slate-700">{m.name}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{m.dosage} • {m.frequency} • {m.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewDoc.type === 'cf' && (
                <div className="space-y-3 pt-2 leading-relaxed">
                  <p className="font-bold border-b pb-1 text-teal-700 uppercase text-[10px]">Official Specialist Certificate</p>
                  <p className="font-bold">Recipient: {previewDoc.content.recipient}</p>
                  <p className="font-bold text-slate-650">Subject: {previewDoc.content.subject}</p>
                  <div className="bg-white p-3 rounded border font-semibold text-slate-600 whitespace-pre-wrap">{previewDoc.content.body}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 border-0"
              >
                <Printer size={12} /> Print Document
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer border-0"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
