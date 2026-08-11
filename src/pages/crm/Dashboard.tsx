import { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { supabase } from '../../lib/supabase';
import { isAdmin, isLoggedIn, getRole, canViewFinancials, getCurrentUser } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';
import { CLINIC_SIGNATURE, openWhatsApp } from '../../utils/whatsapp';
import ReasonForVisitSelect from '../../components/ReasonForVisitSelect';
import { APPOINTMENT_TIME_OPTIONS, isValidAppointmentTime, parseTimeToMinutes, normalizeTo12HourTime } from '../../utils/appointmentTime';
import { useAppointments, getLocalTodayDateString, getApptDate } from '../../components/AppointmentsContext';
import { getRecallRule } from '../../config/recallConfig';
import {
  getActivePostponement,
  addRecallPostponement,
  calculateNextOutreachDate,
  getISTDateString,
  fetchRecallPostponementsFromSupabase,
  formatPostponementDisplayDate
} from '../../services/recallPostponementService';
import { startGlobalSync, stopGlobalSync } from '../../lib/syncState';
import { motion } from 'motion/react';
import {
  Users, CalendarCheck, AlertCircle, DollarSign, UserCheck,
  Clock, CheckCircle2, Activity, TrendingUp, ArrowUpRight,
  Plus, Search, FileText, Stethoscope, CalendarPlus, ChevronRight,
  Hourglass, TriangleAlert, Bell, Send, X, RefreshCw, MessageSquare, Phone
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { usePatientsRealtime, useAppointmentsRealtime, useTreatmentsRealtime } from '../../hooks/useRealtimeHooks';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 14
    }
  }
};

const TREATMENT_TYPES = ['RCT', 'Scaling', 'Crown', 'Extraction', 'Orthodontics', 'Implant', 'Cleaning', 'Filling'];

export default function CRMDashboard() {
  const [, setLocation] = useLocation();
  const admin = isAdmin();
  const role = getRole();
  const validRoles = ['admin', 'doctor', 'receptionist', 'assistant'];
  const isValidRole = role && validRoles.includes(role);
  const { notify } = useNotification();

  useEffect(() => {
    if (!isLoggedIn()) {
      setLocation('/admin');
      return;
    }
    if (!isValidRole) {
      console.error("Access Denied: Dashboard role lookup failed or unauthorized role. Value:", role);
    }
  }, [setLocation, role, isValidRole]);

  const {
    updateAppointmentStatus,
    refreshAppointments,
    todayAppointments: contextTodayAppointments,
  } = useAppointments();

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isFetchingRef = useRef(false);
  const fetchAgainRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    todayTotal: 0, todayPending: 0, todayCompleted: 0,
    waitingPatients: 0, inTreatment: 0, followupDue: 0,
    overdueFollowups: 0, tomorrowFollowups: 0, upcomingFollowups: 0,
    completedTreatments: 0,
    todayCollection: 0, pendingBalance: 0, monthCollection: 0,
    totalPendingPayments: 0,
    newPatientsCount: 0,
  });
  const [treatmentBreakdown, setTreatmentBreakdown] = useState<{ name: string; count: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [attendancePatterns7Days, setAttendancePatterns7Days] = useState<any[]>([]);
  const [weeklyCollectionsData, setWeeklyCollectionsData] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [monthlyCollection, setMonthlyCollection] = useState<any[]>([]);
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);

  // Daily Huddle States (Admin Only)
  const [patientStatuses, setPatientStatuses] = useState<{ phoneMap: Record<string, string>; idMap: Record<number, string> }>({ phoneMap: {}, idMap: {} });


  const [huddleTab, setHuddleTab] = useState<'all' | 'balance' | 'followup'>('all');
  const [huddleSearch, setHuddleSearch] = useState('');
  const [huddleChecklist, setHuddleChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sdc_huddle_checklist');
      return stored ? JSON.parse(stored) : {
        goals: false,
        charts: false,
        labs: false,
        payments: false,
      };
    } catch {
      return {
        goals: false,
        charts: false,
        labs: false,
        payments: false,
      };
    }
  });

  const toggleHuddleChecklist = (key: string) => {
    const next = { ...huddleChecklist, [key]: !huddleChecklist[key] };
    setHuddleChecklist(next);
    localStorage.setItem('sdc_huddle_checklist', JSON.stringify(next));
  };

  const handleEditUpcomingAppt = (appt: any) => {
    setEditingAppt(appt);
    setEditForm({
      id: appt.id || 0,
      name: appt.name || '',
      phone: appt.phone || '',
      treatment: appt.treatment || '',
      next_visit: appt.next_visit || '',
      appointment_time: appt.appointment_time || '',
      status: appt.status || 'Pending',
      notes: appt.notes || '',
      doctor_name: appt.doctor_name || ''
    });
  };

  const handleSaveUpcomingAppt = async (e: any) => {
    e.preventDefault();
    if (!editForm.appointment_time || !isValidAppointmentTime(editForm.appointment_time)) {
      notify('error', 'Invalid Appointment Time', 'Please select a valid appointment time between 5:00 AM and 11:00 PM.');
      return;
    }
    startGlobalSync();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          treatment: editForm.treatment,
          next_visit: editForm.next_visit,
          appointment_time: editForm.appointment_time,
          status: editForm.status,
          notes: editForm.notes,
          doctor_name: editForm.doctor_name
        })
        .eq('id', editForm.id);

      if (error) throw error;

      notify('success', 'Appointment Updated', `Successfully updated upcoming slot for ${editForm.name}.`);
      setEditingAppt(null);
      fetchAll();
    } catch (err: any) {
      console.error('[Dashboard] Error updating upcoming appt:', err);
      notify('error', 'Update Failed', err.message || 'Could not update appointment.');
    } finally {
      stopGlobalSync();
    }
  };

  const handleSendWhatsAppSingle = async (appt: any) => {
    const template = `Hi ${appt.name}, this is Sri Chaitanya Dental Care. This is a friendly reminder for your upcoming ${appt.treatment || 'general consultation'} session with ${appt.doctor_name || 'Dr. Bhavani'} scheduled on ${appt.next_visit} at ${appt.appointment_time || 'your scheduled time'}. Please confirm your visit by replying.\n\n${CLINIC_SIGNATURE}`;
    openWhatsApp(appt.phone, template);

    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      const user = session?.user;
      
      const patientsList = hookPatients || [];
      let parsedPatientId = appt.patient_id ? Number(appt.patient_id) : null;
      if (!parsedPatientId && appt.phone) {
        const cleanPhone = appt.phone.trim();
        const matchedPatient = patientsList.find((p: any) => p.phone && p.phone.trim() === cleanPhone);
        if (matchedPatient) {
          parsedPatientId = Number(matchedPatient.id);
        }
      }
      if (!parsedPatientId && appt.name) {
        const cleanName = appt.name.trim().toLowerCase();
        const matchedPatient = patientsList.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName);
        if (matchedPatient) {
          parsedPatientId = Number(matchedPatient.id);
        }
      }

      // Validate patient_id before insert
      if (!parsedPatientId) {
        notify('warning', 'Patient Record Missing', `No matching patient record found for ${appt.name}. Skipping database insert but WhatsApp will still open.`);
        console.warn(`[Campaign] Skipping single reminder DB logging for ${appt.name} as a matching patient record was not found.`);
        return;
      }

      // Validate appointment_id before insert
      const parsedAppointmentId = appt.id ? Number(appt.id) : null;
      if (!parsedAppointmentId) {
        notify('warning', 'Appointment ID Invalid', `No valid appointment ID found. Skipping database log but opening WhatsApp.`);
        return;
      }

      const payload = {
        patient_id: parsedPatientId,
        appointment_id: parsedAppointmentId,
        phone: appt.phone,
        message: template,
        status: 'Sent',
        sent_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('whatsapp_messages').insert(payload).select();
      if (error) {
        console.error('Supabase Single Insert Error Object:', error);
        throw error;
      }
      notify('success', 'Reminder Logged', `WhatsApp message successfully queued & logged in the database.`);
    } catch (err: any) {
      console.error('[Dashboard] error logging whatsapp:', err);
      notify('error', 'Campaign Failed', err.message || 'Could not queue campaign.');
    }
  };

  const getCampaignDates = () => {
    const today = new Date();
    const todayStr = getLocalTodayDateString(today);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalTodayDateString(tomorrow);
    
    const day3 = new Date(today);
    day3.setDate(day3.getDate() + 3);
    const day3Str = getLocalTodayDateString(day3);

    return { todayStr, tomorrowStr, day3Str };
  };

  const startBulkReminderCampaign = async (type: 'tomorrow' | '3days' | 'all') => {
    const { todayStr, tomorrowStr, day3Str } = getCampaignDates();
    const pendingSlots = appointments.filter((a: any) => a.status === 'Pending' && a.status !== 'Deleted');
    
    let targets: any[] = [];
    let name = '';
    if (type === 'tomorrow') {
      targets = pendingSlots.filter((a: any) => getApptDate(a) === tomorrowStr);
      name = "Tomorrow's Patients";
    } else if (type === '3days') {
      targets = pendingSlots.filter((a: any) => getApptDate(a) >= todayStr && getApptDate(a) <= day3Str);
      name = "3-Day Window Patients";
    } else {
      targets = pendingSlots.filter((a: any) => getApptDate(a) >= todayStr);
      name = "All Pending Patients";
    }

    if (targets.length === 0) {
      notify('info', 'No Targets Found', `No pending slots found requiring reminder dispatch in the specified range.`);
      return;
    }

    // Resolve details for the first valid appointment to open synchronously
    const patientsList = hookPatients || [];
    let firstValidAppt: any = null;
    let firstValidUrl = '';
    let firstValidMessage = '';

    for (const appt of targets) {
      let parsedPatientId = appt.patient_id ? Number(appt.patient_id) : null;
      if (!parsedPatientId && appt.phone) {
        const cleanPhone = appt.phone.trim();
        const matchedPatient = patientsList.find((p: any) => p.phone && p.phone.trim() === cleanPhone);
        if (matchedPatient) {
          parsedPatientId = Number(matchedPatient.id);
        }
      }
      if (!parsedPatientId && appt.name) {
        const cleanName = appt.name.trim().toLowerCase();
        const matchedPatient = patientsList.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName);
        if (matchedPatient) {
          parsedPatientId = Number(matchedPatient.id);
        }
      }

      if (parsedPatientId && appt.phone) {
        firstValidAppt = appt;
        firstValidMessage = `Hi ${appt.name}, this is Sri Chaitanya Dental Care. This is a friendly reminder for your upcoming ${appt.treatment || 'general consultation'} session with ${appt.doctor_name || 'Dr. Bhavani'} scheduled on ${appt.next_visit} at ${appt.appointment_time || 'your scheduled time'}. Please confirm your visit by replying.\n\n${CLINIC_SIGNATURE}`;
        break;
      }
    }

    if (!firstValidAppt) {
      notify('warning', 'No Valid Patients Linked', 'None of the target appointments are linked to active patient profiles. Skipping campaign logged execution.');
      return;
    }

    // Open first reminder URL using audited and sanitized utility
    openWhatsApp(firstValidAppt.phone, firstValidMessage);

    startGlobalSync();
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      const user = session?.user;

      const messageList: any[] = [];

      for (const appt of targets) {
        let parsedPatientId = appt.patient_id ? Number(appt.patient_id) : null;
        
        if (!parsedPatientId && appt.phone) {
          const cleanPhone = appt.phone.trim();
          const matchedPatient = patientsList.find((p: any) => p.phone && p.phone.trim() === cleanPhone);
          if (matchedPatient) {
            parsedPatientId = Number(matchedPatient.id);
          }
        }
        
        if (!parsedPatientId && appt.name) {
          const cleanName = appt.name.trim().toLowerCase();
          const matchedPatient = patientsList.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName);
          if (matchedPatient) {
            parsedPatientId = Number(matchedPatient.id);
          }
        }

        // If patient record is missing: Skip record, Show warning/toast, Continue campaign
        if (!parsedPatientId) {
          notify('warning', 'Patient Skipped', `No patient record found for ${appt.name}. Skipping reminder logging in campaign.`);
          console.warn(`[Campaign] Skipping reminder for ${appt.name} as a matching patient record was not found.`);
          continue;
        }

        // Validate appointment_id before insert
        const parsedApptId = appt.id ? Number(appt.id) : null;
        if (!parsedApptId) {
          notify('warning', 'Appointment Skipped', `No valid appointment ID for ${appt.name}. Skipping reminder logging in campaign.`);
          console.warn(`[Campaign] Skipping reminder for ${appt.name} as a valid appointment ID was not found.`);
          continue;
        }

        const txt = `Hi ${appt.name}, this is Sri Chaitanya Dental Care. This is a friendly reminder for your upcoming ${appt.treatment || 'general consultation'} session with ${appt.doctor_name || 'Dr. Bhavani'} scheduled on ${appt.next_visit} at ${appt.appointment_time || 'your scheduled time'}. Please confirm your visit by replying.\n\n${CLINIC_SIGNATURE}`;
        
        messageList.push({
          patient_id: parsedPatientId,
          appointment_id: parsedApptId,
          phone: appt.phone,
          message: txt,
          status: 'Sent',
          sent_at: new Date().toISOString()
        });
      }

      if (messageList.length === 0) {
        notify('error', 'Campaign Execution Blocked', 'None of the selected appointments are linked to active patient profiles. Campaign aborted.');
        return;
      }

      const { data, error } = await supabase.from('whatsapp_messages').insert(messageList).select();
      if (error) {
        console.error('Supabase Campaign Insert Error Object:', error);
        throw error;
      }

      notify('success', 'Campaign Processed!', `Successfully logged & queued ${messageList.length} reminders for ${name} in database.`);
    } catch (err: any) {
      console.error('[Dashboard] campaign error:', err);
      notify('error', 'Campaign Failed', err.message || 'Could not queue campaign.');
    } finally {
      stopGlobalSync();
    }
  };

  // Recall Queue states
  const [recalls, setRecalls] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [contactedList, setContactedList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sdc_contacted_recalls');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Recall Postponement modal state
  const [postponeModalItem, setPostponeModalItem] = useState<any | null>(null);
  const [postponePeriod, setPostponePeriod] = useState<'6 Months' | '8 Months' | '12 Months' | 'Custom Date' | "Don't Postpone">('6 Months');
  const [postponeCustomDate, setPostponeCustomDate] = useState<string>('');

  // Dynamic booking overlay/modal state
  const [bookingRecall, setBookingRecall] = useState<any | null>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bBooking, setBBooking] = useState(false);

  const { patients: hookPatients } = usePatientsRealtime();
  const { appointments: hookAppointments } = useAppointmentsRealtime();
  const { treatments: hookTreatments } = useTreatmentsRealtime();

  // Unified appointments lists and filters for future-proof upcoming tracking
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const currentTodayStr = getLocalTodayDateString();

  const [upcomingFilter, setUpcomingFilter] = useState<'tomorrow' | '3days' | '7days' | '30days' | 'all'>('all');
  const [upcomingSearch, setUpcomingSearch] = useState('');
  const [viewingAppt, setViewingAppt] = useState<any | null>(null);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    id: 0,
    name: '',
    phone: '',
    treatment: '',
    next_visit: '',
    appointment_time: '',
    status: '',
    notes: '',
    doctor_name: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);

  const todayVal = new Date();
  const todayStr = currentTodayStr;

  const tomorrowVal = new Date(todayVal);
  tomorrowVal.setDate(tomorrowVal.getDate() + 1);
  const tomorrowStr = getLocalTodayDateString(tomorrowVal);

  const next3Val = new Date(todayVal);
  next3Val.setDate(next3Val.getDate() + 3);
  const next3Str = getLocalTodayDateString(next3Val);

  const next7Val = new Date(todayVal);
  next7Val.setDate(next7Val.getDate() + 7);
  const next7Str = getLocalTodayDateString(next7Val);

  const next30Val = new Date(todayVal);
  next30Val.setDate(next30Val.getDate() + 30);
  const next30Str = getLocalTodayDateString(next30Val);

  const filteredUpcoming = upcomingAppointments
    .filter((appt: any) => {
      // Exclude Completed, Cancelled, Deleted appointments
      const statusLower = (appt.status || '').toLowerCase();
      if (statusLower === 'completed' || statusLower === 'cancelled' || statusLower === 'deleted') {
        return false;
      }

      // Apply search filter
      const searchLower = upcomingSearch.toLowerCase().trim();
      if (searchLower) {
        const matchesSearch = 
          (appt.name || '').toLowerCase().includes(searchLower) ||
          (appt.phone || '').toLowerCase().includes(searchLower) ||
          (appt.treatment || '').toLowerCase().includes(searchLower) ||
          (appt.doctor_name || '').toLowerCase().includes(searchLower) ||
          (appt.patient_code || appt.patient_id || '').toString().toLowerCase().includes(searchLower) ||
          (appt.chair_no || appt.chair || '').toString().toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Apply date filter
      const dStr = getApptDate(appt);
      if (upcomingFilter === 'tomorrow') {
        return dStr === tomorrowStr;
      } else if (upcomingFilter === '3days') {
        return dStr >= tomorrowStr && dStr <= next3Str;
      } else if (upcomingFilter === '7days') {
        return dStr >= tomorrowStr && dStr <= next7Str;
      } else if (upcomingFilter === '30days') {
        return dStr >= tomorrowStr && dStr <= next30Str;
      }
      return dStr > todayStr; // all future
    })
    .sort((a: any, b: any) => {
      const dateA = getApptDate(a);
      const dateB = getApptDate(b);
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return parseTimeToMinutes(a.appointment_time) - parseTimeToMinutes(b.appointment_time);
    });

  const tomorrowPendingCount = upcomingAppointments.filter((a: any) => getApptDate(a) === tomorrowStr && a.status === 'Pending').length;
  const next3PendingCount = upcomingAppointments.filter((a: any) => getApptDate(a) >= todayStr && getApptDate(a) <= next3Str && a.status === 'Pending').length;
  const allPendingCount = upcomingAppointments.filter((a: any) => a.status === 'Pending').length;

  useEffect(() => {
    if (!isLoggedIn()) { setLocation('/admin'); return; }
    console.info("[Dashboard] Reactive hook change or context status update registered. Initiating aggregate dashboard calculations.");
    
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      console.info("[Dashboard] Executing debounced fetchAll.");
      fetchAll();
    }, 200);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [hookPatients, hookAppointments, hookTreatments, setLocation]);

  useEffect(() => {
    console.info("[Dashboard] Subscribing to postgres changes channel ('dashboard-inventory-realtime').");
    const channel = supabase
      .channel('dashboard-inventory-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          console.info("[Dashboard] Inventory change detected, refreshing dashboard data.");
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchTimeoutRef.current = setTimeout(() => {
            fetchAll();
          }, 200);
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.info("[Dashboard] Window active / visible. Revalidating dashboard dataset.");
        fetchAll();
      }
    };
    const handleFocus = () => {
      console.info("[Dashboard] Window focused. Revalidating dashboard dataset.");
      fetchAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const toggleContacted = (phone: string, reason: string) => {
    const key = `${phone}-${reason}`;
    let next: string[] = [];
    if (contactedList.includes(key)) {
      next = contactedList.filter(k => k !== key);
    } else {
      next = [...contactedList, key];
    }
    setContactedList(next);
    localStorage.setItem('sdc_contacted_recalls', JSON.stringify(next));
  };

  const handleRecallWhatsAppOutreach = (item: any, waText: string) => {
    openWhatsApp(item.phone, waText);
    toggleContacted(item.phone, item.reason);

    setPostponeModalItem(item);
    setPostponePeriod('6 Months');
    const defaultCustom = new Date();
    defaultCustom.setMonth(defaultCustom.getMonth() + 1);
    setPostponeCustomDate(getISTDateString(defaultCustom));
  };

  const handleOpenPostponeModal = (item: any) => {
    setPostponeModalItem(item);
    setPostponePeriod('6 Months');
    const defaultCustom = new Date();
    defaultCustom.setMonth(defaultCustom.getMonth() + 1);
    setPostponeCustomDate(getISTDateString(defaultCustom));
  };

  const handleSavePostponement = async () => {
    if (!postponeModalItem) return;

    if (postponePeriod === "Don't Postpone") {
      setPostponeModalItem(null);
      return;
    }

    const calculatedDate = calculateNextOutreachDate(postponePeriod, postponeCustomDate);
    if (!calculatedDate) {
      notify('warning', 'Invalid Date', 'Please select a valid future date for next outreach.');
      return;
    }

    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data?.session?.user;
      const sentBy = user?.email || role || 'Staff';

      await addRecallPostponement({
        patient_id: postponeModalItem.patientId,
        patient_code: postponeModalItem.patientCode || null,
        outreach_sent_at: new Date().toISOString(),
        outreach_sent_by: sentBy,
        postponement_period: postponePeriod,
        next_outreach_date: calculatedDate,
        recall_category: postponeModalItem.reason || postponeModalItem.treatment,
        completed_date: postponeModalItem.completedDate
      });

      const formattedDate = formatPostponementDisplayDate(calculatedDate);
      notify(
        'success',
        'Outreach Postponed',
        `Patient postponed until ${formattedDate}.`
      );

      setPostponeModalItem(null);
      await fetchAll();
    } catch (err: any) {
      console.error('[Dashboard] error saving recall postponement:', err);
      notify(
        'error',
        'Postponement Failed',
        err.message || 'Unable to save postponement. The patient will remain in the recall queue.'
      );
    }
  };

  const openBookingModal = (recallItem: any) => {
    setBookingRecall(recallItem);
    const tomorrowStr = getLocalTodayDateString(new Date(Date.now() + 86400000));
    setBookDate(tomorrowStr);
    setBookTime('');
    setBookingError('');
    setBookingSuccess('');
    setBBooking(false);
  };

  const handleBookRecallAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRecall) return;
    if (!bookTime || !isValidAppointmentTime(bookTime)) {
      setBookingError('Please select a valid appointment time between 5:00 AM and 11:00 PM.');
      return;
    }
    setBBooking(true);
    setBookingError('');
    setBookingSuccess('');

    let attempts = 0;
    const maxAttempts = 2;
    let finalErr = null;

    while (attempts < maxAttempts) {
      try {
        // Match exactly by both Phone and Name to handle shared phone numbers
        const { data: existingPatients } = await supabase
          .from('patients')
          .select('id, email, location')
          .eq('phone', bookingRecall.phone)
          .eq('name', bookingRecall.name);
        
        let existing = existingPatients?.[0];
        if (!existing) {
          // Fallback to match by phone only
          const { data: fallbackPatients } = await supabase
            .from('patients')
            .select('id, email, location')
            .eq('phone', bookingRecall.phone);
          existing = fallbackPatients?.[0];
        }

        let patientId = existing?.id;
        let email = existing?.email || '';
        let location = existing?.location || '';

        const { error } = await supabase.from('appointments').insert([{
          name: bookingRecall.name,
          phone: bookingRecall.phone,
          email: email,
          location: location,
          treatment: bookingRecall.treatment,
          next_visit: bookDate,
          appointment_time: bookTime,
          patient_id: patientId,
          status: 'Pending',
          visit_count: 1,
          amount_paid: 0,
          balance_amount: 0,
          notes: `Scheduled via automated recall outreach for: ${bookingRecall.reason}`
        }]);

        if (error) {
          if (error.code === '23505') {
            const dupMsg = 'Duplicate appointment slot detected. This slot is already booked for this phone number.';
            setBookingError(dupMsg);
            notify('error', 'Duplicate Appointment', dupMsg);
            setBBooking(false);
            return;
          }
          throw error;
        }

        setBookingSuccess('Recall appointment scheduled successfully!');
        notify('success', 'Recall Appointment Created', `Successfully scheduled recall appointment for ${bookingRecall.name}.`);
        
        // Remove from contacted logs if success
        const outreachKey = `${bookingRecall.phone}-${bookingRecall.reason}`;
        const nextContacted = contactedList.filter(k => k !== outreachKey);
        setContactedList(nextContacted);
        localStorage.setItem('sdc_contacted_recalls', JSON.stringify(nextContacted));

        setTimeout(() => {
          setBookingRecall(null);
          fetchAll();
        }, 1200);

        setBBooking(false);
        return;
      } catch (err: any) {
        attempts++;
        finalErr = err;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    const errMsg = finalErr?.message || 'A network error occurred during booking. Please try again.';
    setBookingError(errMsg);
    notify('error', 'Booking Failed', errMsg);
    setBBooking(false);
  };

  const fetchAll = async () => {
    if (isFetchingRef.current) {
      console.info("[Dashboard] fetchAll is already running. Queueing subsequent refresh.");
      fetchAgainRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    startGlobalSync();
    
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const today = getLocalTodayDateString();
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalTodayDateString(tomorrow);
      const next7 = new Date(); next7.setDate(next7.getDate() + 7);
      const next7Str = getLocalTodayDateString(next7);
      const monthStart = new Date(); monthStart.setDate(1);
      const monthStartStr = getLocalTodayDateString(monthStart);
      const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const tenDaysAgoStr = getLocalTodayDateString(tenDaysAgo);

      console.info(`[Dashboard] [DEBUG] fetchAll() started query. Computed local-time dates (Asia/Kolkata): today=${today}, tomorrow=${tomorrowStr}, next7=${next7Str}, monthStartStr=${monthStartStr}`);

      console.info("[STAGE 1: AUTHORITATIVE DATABASE QUERY] Querying Supabase exact counts and date-partitioned datasets...");
      
      const [
        patientsCountRes,
        apptsCountRes,
        todayApptsRes,
        upcomingApptsRes,
        recentApptsRes,
        trendApptsRes,
        monthApptsRes,
        patientsListRes,
        treatmentsRes,
        overdueCountRes,
        tomorrowCountRes,
        completedApptsRes
      ] = await Promise.all([
        // 1. Total Patients exact count
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        // 2. Total Non-Deleted Appointments exact count
        supabase.from('appointments').select('*', { count: 'exact', head: true }).neq('status', 'Deleted'),
        // 3. Today's Appointments (All records scheduled for today)
        supabase.from('appointments').select('*').neq('status', 'Deleted').gte('next_visit', today).lt('next_visit', tomorrowStr).order('appointment_time', { ascending: true }),
        // 4. Upcoming Appointments (All future scheduled dates)
        supabase.from('appointments').select('*').neq('status', 'Deleted').gt('next_visit', today).order('next_visit', { ascending: true }),
        // 5. Recent 10 Appointments
        supabase.from('appointments').select('*').neq('status', 'Deleted').order('created_at', { ascending: false }).limit(10),
        // 6. Recent 10 Days Appointments (for trends & attendance patterns)
        supabase.from('appointments').select('*').neq('status', 'Deleted').gte('next_visit', tenDaysAgoStr),
        // 7. Month-to-date Appointments (for monthly financials)
        supabase.from('appointments').select('*').neq('status', 'Deleted').gte('next_visit', monthStartStr),
        // 8. Patients List (for status mapping & recent list)
        supabase.from('patients').select('id, name, phone, patient_status, created_at, due_amount, systemic_history, last_recall_date').order('created_at', { ascending: false }).limit(100),
        // 9. Treatments List
        supabase.from('treatments').select('*').limit(200),
        // 10. Overdue Followups exact count
        supabase.from('appointments').select('*', { count: 'exact', head: true }).lt('next_visit', today).not('status', 'in', '("Completed","Cancelled","Deleted")'),
        // 11. Tomorrow Followups exact count
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('next_visit', tomorrowStr).not('status', 'in', '("Completed","Cancelled","Deleted")'),
        // 12. Historical Completed Appointments
        supabase.from('appointments').select('*').eq('status', 'Completed').neq('status', 'Deleted').order('created_at', { ascending: false }).limit(200)
      ]);

      const totalPatientsExact = patientsCountRes.count || 0;
      const totalAppointmentsExact = apptsCountRes.count || 0;
      
      const todayAppointmentsList = (todayApptsRes.data || [])
        .filter((a: any) => getApptDate(a) === today)
        .sort((a: any, b: any) => parseTimeToMinutes(a.appointment_time) - parseTimeToMinutes(b.appointment_time));
      const upcomingAppointmentsList = upcomingApptsRes.data || [];
      const recentAppointmentsList = recentApptsRes.data || [];
      const trendAppointmentsList = trendApptsRes.data || [];
      const monthAppointmentsList = monthApptsRes.data || [];
      const patientsList = patientsListRes.data || [];
      const treatmentsList = treatmentsRes.data || [];
      const completedAppointmentsList = completedApptsRes.data || [];

      console.info("[STAGE 2: AUTHORITATIVE RETURNED METRICS]");
      console.info("--> Exact DB Total Patients Count:", totalPatientsExact);
      console.info("--> Exact DB Total Appointments Count:", totalAppointmentsExact);
      console.info("--> Today's Total Appointments Count:", todayAppointmentsList.length);

      // Query only the non-realtime inventory from Supabase (safely handled with local storage fallback)
      let rawInventoryData = [];
      try {
        const { data: invData, error: invError } = await supabase.from('inventory').select('*');
        if (invError) {
          console.warn('[Dashboard] Inventory query returned error, falling back:', invError);
          const rawLocal = localStorage.getItem('srichaitanya_local_inventory');
          if (rawLocal) rawInventoryData = JSON.parse(rawLocal);
        } else {
          rawInventoryData = invData || [];
        }
      } catch (err) {
        console.warn('[Dashboard] Inventory query caught exception, falling back:', err);
        const rawLocal = localStorage.getItem('srichaitanya_local_inventory');
        if (rawLocal) rawInventoryData = JSON.parse(rawLocal);
      }

      const statusMap: Record<string, string> = {};
      const statusIdMap: Record<number, string> = {};
      patientsList.forEach((p: any) => {
        if (p.phone) {
          statusMap[p.phone.trim()] = p.patient_status;
        }
        if (p.id) {
          statusIdMap[p.id] = p.patient_status;
        }
      });
      setPatientStatuses({ phoneMap: statusMap, idMap: statusIdMap });

      // Weekly appointments chart (7 days)
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = getLocalTodayDateString(d);
        const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const count = trendAppointmentsList.filter((a: any) => getApptDate(a) === key).length;
        days.push({ day: label, count });
      }
      setWeeklyData(days);

      // 7-day daily appointment counts and attendance patterns for Recharts BarChart
      const patterns7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = getLocalTodayDateString(d);
        const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        
        const dayAppts = trendAppointmentsList.filter((a: any) => getApptDate(a) === key);
        const total = dayAppts.length;
        const attended = dayAppts.filter((a: any) => a.status === 'Completed').length;
        const missedOrCancelled = dayAppts.filter((a: any) => a.status === 'Cancelled' || a.status === 'Deleted').length;
        const pendingOrInTreatment = dayAppts.filter((a: any) => a.status === 'Pending' || a.status === 'In Treatment').length;

        patterns7Days.push({
          date: label,
          Total: total,
          Attended: attended,
          'Missed / Cancelled': missedOrCancelled,
          'Pending / In Treatment': pendingOrInTreatment,
        });
      }
      setAttendancePatterns7Days(patterns7Days);

      // Weekly collections chart (daily collections for active week)
      if (canViewFinancials(role as any)) {
        const collectionsWeek = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const key = getLocalTodayDateString(d);
          const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
          const dayAmount = trendAppointmentsList
            .filter((a: any) => getApptDate(a) === key)
            .reduce((sum: number, a: any) => sum + Number(a.amount_paid || 0), 0);
          collectionsWeek.push({ day: label, amount: dayAmount });
        }
        setWeeklyCollectionsData(collectionsWeek);
      } else {
        setWeeklyCollectionsData([]);
      }

      // Treatment breakdown
      const tMap: Record<string, number> = {};
      monthAppointmentsList.forEach((a: any) => {
        if (!a.treatment) return;
        const key = TREATMENT_TYPES.find(t => a.treatment.toLowerCase().includes(t.toLowerCase())) || 'Other';
        tMap[key] = (tMap[key] || 0) + 1;
      });
      const breakdown = Object.entries(tMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
      setTreatmentBreakdown(breakdown);

      // Financial data calculations
      let todayCollection = 0, pendingBalance = 0, monthCollection = 0;
      if (canViewFinancials(role as any)) {
        todayCollection = todayAppointmentsList.reduce((t: number, a: any) => t + Number(a.amount_paid || 0), 0);
        pendingBalance = monthAppointmentsList.reduce((t: number, a: any) => t + Number(a.balance_amount || 0), 0);
        monthCollection = monthAppointmentsList.reduce((t: number, a: any) => t + Number(a.amount_paid || 0), 0);

        // Monthly collection chart (last 30 days grouped by week)
        const weeks: Record<string, number> = {};
        monthAppointmentsList.forEach((a: any) => {
          const d = new Date(getApptDate(a));
          const weekLabel = `W${Math.ceil(d.getDate() / 7)}`;
          weeks[weekLabel] = (weeks[weekLabel] || 0) + Number(a.amount_paid || 0);
        });
        setMonthlyCollection(Object.entries(weeks).map(([week, amount]) => ({ week, amount })));
      }

      // Compute Today's status metrics accurately from authoritative todayAppointmentsList
      const computedTodayTotal = todayAppointmentsList.filter((a: any) => a.status !== 'Cancelled' && a.status !== 'Deleted').length;
      const computedTodayPending = todayAppointmentsList.filter((a: any) => a.status === 'Pending').length;
      const computedTodayCompleted = todayAppointmentsList.filter((a: any) => a.status === 'Completed').length;
      const waitingPatientsCount = todayAppointmentsList.filter((a: any) => a.status === 'Waiting' || a.status === 'Checked In').length;
      const inTreatmentCount = todayAppointmentsList.filter((a: any) => a.status === 'In Treatment' || a.status === 'In Consultation' || a.status === 'In-Consultation' || a.status === 'In Chair').length;
      const totalPendingPayments = monthAppointmentsList.reduce((t: number, a: any) => t + Number(a.balance_amount || 0), 0);

      // Query actual new clinical registrations since month start
      let monthNewPatients = 0;
      try {
        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStartStr);
        monthNewPatients = count || 0;
      } catch (err) {
        console.warn("Bypassed dynamic monthly registrations lookup:", err);
      }

      const overdueFollowupsCount = overdueCountRes.count || 0;
      const tomorrowFollowupsCount = tomorrowCountRes.count || 0;
      const upcomingFollowupsCount = upcomingAppointmentsList.length;
      const completedTreatmentsCount = treatmentsList.filter((t: any) => t.status === 'Completed' || t.stage === 'Completed').length;

      setStats({
        totalPatients: totalPatientsExact,
        totalAppointments: totalAppointmentsExact,
        todayTotal: computedTodayTotal,
        todayPending: computedTodayPending,
        todayCompleted: computedTodayCompleted,
        waitingPatients: waitingPatientsCount,
        inTreatment: inTreatmentCount,
        followupDue: overdueFollowupsCount,
        overdueFollowups: overdueFollowupsCount,
        tomorrowFollowups: tomorrowFollowupsCount,
        upcomingFollowups: upcomingFollowupsCount,
        completedTreatments: completedTreatmentsCount,
        todayCollection, pendingBalance, monthCollection,
        totalPendingPayments,
        newPatientsCount: monthNewPatients,
      });

      // Silently sync the appointments provider context
      refreshAppointments().catch((err) => {
        console.error('[Dashboard] [DEBUG] [ERROR] syncing appointments context:', err);
      });

      let lowStockAlerts: any[] = [];
      if (rawInventoryData) {
        lowStockAlerts = rawInventoryData.filter((item: any) => {
          const currentStock = item.current_stock !== undefined && item.current_stock !== null 
            ? item.current_stock 
            : (item.stock !== undefined && item.stock !== null ? item.stock : (item.quantity ?? 0));
          const limit = item.safety_min_limit !== undefined && item.safety_min_limit !== null 
            ? item.safety_min_limit 
            : (item.min_stock !== undefined && item.min_stock !== null ? item.min_stock : (item.reorder_level ?? 0));
          return currentStock < limit;
        });

        lowStockAlerts = lowStockAlerts.map((item: any) => ({
          ...item,
          name: item.name || item.item_name || 'Unnamed Item',
          stock: item.current_stock !== undefined && item.current_stock !== null 
            ? item.current_stock 
            : (item.stock !== undefined && item.stock !== null ? item.stock : (item.quantity ?? 0)),
          min_stock: item.safety_min_limit !== undefined && item.safety_min_limit !== null 
            ? item.safety_min_limit 
            : (item.min_stock !== undefined && item.min_stock !== null ? item.min_stock : (item.reorder_level ?? 0)),
        }));
      }
      setLowStockItems(lowStockAlerts);

      setRecentAppointments(recentAppointmentsList.slice(0, 6));
      setRecentPatients(patientsList.slice(0, 6));

      // Fetch Dr names and IDs
      const doctorsRes = await supabase.from('doctors').select('*');
      if (doctorsRes.data) {
        setDoctors(doctorsRes.data);
      } else {
        setDoctors([
          { id: '1', name: 'Dr. Bhavani Prasad (MDS)' },
          { id: '2', name: 'Dr. Durga Bhavani Jupalli (BDS)' },
          { id: '3', name: 'Dr. Srilatha' }
        ]);
      }

      // Compute Daily appointment volume and clinic attendance patterns for last 10 operating days
      const trends = [];
      const nowIdx = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(nowIdx.getDate() - i);
        const key = getLocalTodayDateString(d);
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        const dayAppts = trendAppointmentsList.filter((a: any) => getApptDate(a) === key);
        const volume = dayAppts.length;
        const attended = dayAppts.filter((a: any) => a.status === 'Completed' || a.status === 'Confirmed').length;
        const noShow = dayAppts.filter((a: any) => a.status === 'No Show' || a.status === 'Cancelled').length;
        const revenue = dayAppts.reduce((sum: number, a: any) => sum + Number(a.amount_paid || 0), 0);
        
        trends.push({
          date: label,
          volume,
          attended,
          noShow,
          revenue
        });
      }
      setDailyTrends(trends);

      // Build Dynamic Recall Queue using Canonical Patient Identity
      interface CompletedRecallEvent {
        patientId: string | number | null;
        patientCode: string | null;
        name: string;
        phone: string;
        treatment: string;
        date: string;
      }

      // Fetch authoritative recall postponements from Supabase before evaluating queue
      await fetchRecallPostponementsFromSupabase();

      const completedEvents: CompletedRecallEvent[] = [];
      const allPatients = [...patientsList, ...(hookPatients || [])];

      // Helper to resolve patient identity
      const resolvePatient = (pId: any, pName?: string, pPhone?: string) => {
        if (pId) {
          const found = allPatients.find((p: any) => p.id === pId);
          if (found) return found;
        }
        if (pName && pPhone) {
          const found = allPatients.find((p: any) => 
            p.phone?.trim() === pPhone.trim() && p.name?.trim().toLowerCase() === pName.trim().toLowerCase()
          );
          if (found) return found;
        }
        return null;
      };

      // 1. Gather from completed treatment plans (from treatmentsList & hookTreatments)
      const combinedTreatments = [...treatmentsList, ...(hookTreatments || [])];
      const seenTreatmentIds = new Set();
      combinedTreatments.forEach((t: any) => {
        if (!t) return;
        const tid = t.id || `${t.patient_id || t.patient_name}-${t.treatment_type}-${t.created_at}`;
        if (seenTreatmentIds.has(tid)) return;
        seenTreatmentIds.add(tid);

        const isCompleted = t.stage === 'Completed' || t.status === 'Completed';
        if (isCompleted) {
          const matchedPatient = resolvePatient(t.patient_id || t.patient, t.patient_name || t.name, t.phone || t.mobile);
          const pId = matchedPatient?.id || t.patient_id || t.patient || null;
          const pCode = matchedPatient?.patient_code || t.patient_code || null;
          const pName = matchedPatient?.name || t.patient_name || t.name;
          const pPhone = matchedPatient?.phone || t.phone || t.mobile;

          if (pName && pPhone) {
            completedEvents.push({
              patientId: pId,
              patientCode: pCode,
              name: pName,
              phone: pPhone,
              treatment: t.treatment_type || t.treatment || 'Dental Service',
              date: t.completed_date || t.start_date || t.created_at?.split('T')[0] || getApptDate(t) || ''
            });
          }
        }
      });

      // 2. Gather from historical completed appointment care sessions (from completedAppointmentsList, todayAppointmentsList & hookAppointments)
      const combinedCompletedAppts = [
        ...completedAppointmentsList,
        ...todayAppointmentsList.filter((a: any) => a.status === 'Completed'),
        ...(hookAppointments || []).filter((a: any) => a.status === 'Completed')
      ];
      const seenApptIds = new Set();
      combinedCompletedAppts.forEach((a: any) => {
        if (!a) return;
        const aid = a.id || `${a.patient_id || a.phone}-${a.treatment}-${getApptDate(a)}`;
        if (seenApptIds.has(aid)) return;
        seenApptIds.add(aid);

        const matchedPatient = resolvePatient(a.patient_id || a.patient, a.name || a.patient_name, a.phone || a.mobile);
        const pId = matchedPatient?.id || a.patient_id || a.patient || null;
        const pCode = matchedPatient?.patient_code || a.patient_code || null;
        const pName = matchedPatient?.name || a.name || a.patient_name;
        const pPhone = matchedPatient?.phone || a.phone || a.mobile;

        if (pName && pPhone) {
          completedEvents.push({
            patientId: pId,
            patientCode: pCode,
            name: pName,
            phone: pPhone,
            treatment: a.treatment || a.service || 'Dental Care Session',
            date: getApptDate(a) || a.created_at?.split('T')[0] || ''
          });
        }
      });

      // 3. Gather from patient profiles with recorded last_recall_date
      const seenPatientIdsForLastRecall = new Set();
      allPatients.forEach((p: any) => {
        if (!p || !p.id || seenPatientIdsForLastRecall.has(p.id)) return;
        seenPatientIdsForLastRecall.add(p.id);

        if (p.last_recall_date && p.phone) {
          completedEvents.push({
            patientId: p.id,
            patientCode: p.patient_code || null,
            name: p.name || 'Patient',
            phone: p.phone,
            treatment: 'Routine Dental Care',
            date: p.last_recall_date
          });
        }
      });

      // Sort chronological descending (latest first)
      completedEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // Group latest event by canonical patient identity (patientId/patientCode) + treatment category
      const latestByPatientAndType: Record<string, CompletedRecallEvent> = {};
      completedEvents.forEach(ev => {
        const rule = getRecallRule(ev.treatment);
        
        // Canonical Key: MUST differentiate individual patients even if sharing family phone
        const patientIdentity = ev.patientId 
          ? `pid-${ev.patientId}` 
          : (ev.patientCode ? `pcode-${ev.patientCode}` : `phone-${ev.phone.trim()}-${ev.name.trim().toLowerCase()}`);
        
        const key = `${patientIdentity}-${rule.category}`;
        if (!latestByPatientAndType[key]) {
          latestByPatientAndType[key] = ev;
        }
      });

      const todayStr = getLocalTodayDateString();

      // Formulate active recall due items
      const computedRecalls: any[] = [];
      Object.values(latestByPatientAndType).forEach(ev => {
        if (!ev.date) return;
        const completedDate = new Date(ev.date);
        if (isNaN(completedDate.getTime())) return;

        const rule = getRecallRule(ev.treatment);
        const intervalMonths = rule.intervalMonths;
        const reason = rule.reason;

        const dueDate = new Date(completedDate);
        dueDate.setMonth(dueDate.getMonth() + intervalMonths);
        const dueDateStr = getLocalTodayDateString(dueDate);

        const diffTime = dueDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          // Verify future appointment exclusion for THIS SPECIFIC PATIENT
          const hasFutureActive = (hookAppointments || []).some((appt: any) => {
            if (!appt) return false;
            if (appt.status === 'Cancelled' || appt.status === 'Deleted') return false;

            // Strict patient identity check (do not suppress recall of another family member sharing same phone)
            let matchesPatient = false;
            if (ev.patientId && (appt.patient_id || appt.patient)) {
              matchesPatient = String(appt.patient_id || appt.patient) === String(ev.patientId);
            } else if (ev.patientCode && appt.patient_code) {
              matchesPatient = appt.patient_code === ev.patientCode;
            } else if (appt.phone && ev.phone && appt.name && ev.name) {
              matchesPatient = appt.phone.trim() === ev.phone.trim() && appt.name.trim().toLowerCase() === ev.name.trim().toLowerCase();
            }

            if (!matchesPatient) return false;

            return (appt.status === 'Pending' || appt.status === 'Confirmed') && getApptDate(appt) >= todayStr;
          });

          if (!hasFutureActive) {
            // Verify manual outreach postponement exclusion for THIS SPECIFIC PATIENT & CATEGORY
            const activePostponement = getActivePostponement(ev.patientId, reason, ev.date, ev.patientCode);

            if (!activePostponement) {
              computedRecalls.push({
                patientId: ev.patientId,
                patientCode: ev.patientCode,
                name: ev.name,
                phone: ev.phone,
                treatment: ev.treatment,
                completedDate: ev.date,
                dueDate: dueDateStr,
                reason,
                isOverdue: dueDateStr < todayStr,
                daysDiff: diffDays
              });
            }
          }
        }
      });

      computedRecalls.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setRecalls(computedRecalls);

      // Store appointments datasets in React state
      setAppointments([...todayAppointmentsList, ...upcomingAppointmentsList]);
      setTodayAppointments(todayAppointmentsList);
      setUpcomingAppointments(upcomingAppointmentsList);

    } catch (e) {
      console.error('[Dashboard] Error in fetchAll:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setIsInitialLoad(false);
      setIsRefreshing(false);
      stopGlobalSync();

      if (fetchAgainRef.current) {
        fetchAgainRef.current = false;
        console.info("[Dashboard] Running queued fetchAll after previous completion.");
        fetchAll();
      }
    }
  };

  if (!isLoggedIn()) {
    return null;
  }

  if (!isValidRole) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-red-150 text-red-700 flex items-center justify-center mb-4">
          <TriangleAlert size={24} />
        </div>
        <h2 className="text-slate-800 font-bold text-base">Dashboard Access Denied</h2>
        <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed font-semibold">
          Your account role is either unassigned or unrecognized. Please sign out and sign back in to establish a secure session.
        </p>
      </div>
    );
  }

  if (loading && isInitialLoad) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'Completed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'Pending') return 'bg-amber-100 text-amber-700';
    if (s === 'Cancelled') return 'bg-red-100 text-red-700';
    if (s === 'In Treatment') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  };

  const formatRoleLabel = (r: string) => {
    if (r === 'admin') return 'Practice Admin';
    if (r === 'doctor') return 'Doctor / Surgeon';
    if (r === 'receptionist') return 'Front Desk Receptionist';
    if (r === 'assistant') return 'Dental Assistant';
    return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Staff';
  };



  console.info("[STAGE 4: DASHBOARD RENDER & STAGE 5: FINAL DISPLAY]");
  console.info("--> Card Widget [Total Registered Patients] - Rendered Value:", stats.totalPatients);
  console.info("--> Card Widget [Today's Appointments] - Rendered Value (length of todayAppointments state):", todayAppointments.length);
  console.info("--> Card Widget [Pending Payments (Dues)] - Rendered Value:", stats.totalPendingPayments);
  console.info("--> Grid Widget [Today's Appointments Volume] - Rendered Value:", stats.todayTotal);
  console.info("--> Grid Widget [Total Patients Count] - Rendered Value:", stats.totalPatients);
  console.info("--> Grid Widget [Total Appointments Count] - Rendered Value:", stats.totalAppointments);
  console.info("--> Huddle Widget [Outstanding Dues Amount] - Rendered Value:", todayAppointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted').reduce((sum, a) => sum + Number(a.balance_amount || 0), 0));
  console.info("--> Huddle Widget [Clinical Follow-up Alerts] - Rendered Value:", todayAppointments.filter(a => {
    const cleanedPhone = a.phone?.trim() || '';
    const st = patientStatuses.phoneMap[cleanedPhone] || patientStatuses.idMap[a.patient_id!] || '';
    return st === 'Follow-up Required';
  }).length);
  console.info("--> Upcoming Table [Filtered Count] - Rendered Value:", filteredUpcoming.length);
  console.info("--> Recalls Table [Recall Count] - Rendered Value:", recalls.length);

  return (
    <div className="space-y-6 pb-6">

      {/* CRM Dashboard Welcome Banner */}
      <div className="bg-[#2F63E0] rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg className="w-28 h-28 text-white rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 0 0-4 4c0 .82.11 1.48.33 1.83.33.5.67.67.67 1.17 0 1-.61 1.54-1.22 2.6A9 9 0 0 0 7 16c0 3 2 5 4.5 5 .5 0 .9-.2 1.5-.5.6.3 1 .5 1.5.5 2.5 0 4.5-2 4.5-5a9 9 0 0 0-.78-4.4c-.61-1.06-1.22-1.6-1.22-2.6 0-.5.34-.67.67-1.17.22-.35.33-1 .33-1.83a4 4 0 0 0-4-4h-2z" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, Sri Chaitanya Dental Care!
            </h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium pb-1.5">
              Here is your clinic overview for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
          </div>
          {isRefreshing && (
            <div className="self-start sm:self-center flex items-center gap-1.5 bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse shadow-xs border border-white/10">
              <RefreshCw size={12} className="animate-spin" />
              <span>Updating background data...</span>
            </div>
          )}
        </div>
      </div>


          {/* Quick Clinic Status Summary Row */}
          <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#111827] tracking-tight font-sans">
          Quick Clinic Status
        </h3>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Card 1: Total Registered Patients */}
          <motion.div variants={cardVariants} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registered Patients</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-800 font-sans">{stats.totalPatients}</span>
                <span className="text-[10px] font-bold text-teal-600">+Active Directory</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100/45">
              <Users size={18} strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Card 2: Today's Appointments */}
          <motion.div variants={cardVariants} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Today's Appointments</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-[#2F63E0] font-sans">{todayAppointments.length}</span>
                <span className="text-[10px] font-bold text-[#2F63E0]/80">Active Sessions</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2F63E0] flex items-center justify-center border border-blue-100/45">
              <CalendarCheck size={18} strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Card 3: Pending Payments / Clinical Status */}
          <motion.div variants={cardVariants} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {canViewFinancials(role as any) ? "Pending Payments (Dues)" : "In Treatment Today"}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-extrabold font-sans ${canViewFinancials(role as any) ? 'text-[#EF4444]' : 'text-blue-600'}`}>
                  {canViewFinancials(role as any)
                    ? `₹${Number(stats.totalPendingPayments || 0).toLocaleString('en-IN')}`
                    : todayAppointments.filter(a => a.status === 'In Treatment').length}
                </span>
                <span className={`text-[10px] font-bold ${canViewFinancials(role as any) ? 'text-[#EF4444]/80' : 'text-blue-600/80'}`}>
                  {canViewFinancials(role as any) ? "Outstanding" : "Active Patients"}
                </span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              canViewFinancials(role as any) 
                ? 'bg-red-50 text-[#EF4444] border-red-100/45' 
                : 'bg-blue-50 text-blue-600 border-blue-100/45'
            }`}>
              {canViewFinancials(role as any) ? <DollarSign size={18} strokeWidth={2.5} /> : <Stethoscope size={18} strokeWidth={2.5} />}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Quick Action Buttons Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#111827] tracking-tight font-sans">
          Quick Actions
        </h3>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={cardVariants}>
            <Link href="/crm/appointments">
              <button className="w-full flex items-center justify-between p-4.5 rounded-[12px] bg-[#2F63E0] hover:bg-[#2554CC] text-white font-semibold transition-all shadow-sm active:scale-98 cursor-pointer group text-xs text-left">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">🗓️</span>
                  <span>Schedule Appointment</span>
                </span>
                <ChevronRight size={15} className="text-white/75 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Link href="/crm/patients">
              <button className="w-full flex items-center justify-between p-4.5 rounded-[12px] bg-gradient-to-r from-[#8757EA] to-[#8B5CF6] hover:opacity-95 text-white font-semibold transition-all shadow-sm active:scale-98 cursor-pointer group text-xs text-left">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">👥</span>
                  <span>Add New Patient</span>
                </span>
                <ChevronRight size={15} className="text-white/75 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Link href="/crm/profile">
              <button className="w-full flex items-center justify-between p-4.5 rounded-[12px] bg-gradient-to-r from-[#1FA0DD] to-[#22A7F0] hover:opacity-95 text-white font-semibold transition-all shadow-sm active:scale-98 cursor-pointer group text-xs text-left">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">⚙️</span>
                  <span>Clinic Profile</span>
                </span>
                <ChevronRight size={15} className="text-white/75 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Statistics Cards Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#111827] tracking-tight font-sans">
          Daily Metrics
        </h3>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Card 1: Today's Appointments */}
          <motion.div variants={cardVariants} className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-[52px] font-extrabold text-[#2F63E0] leading-none mb-1 font-sans">
              {todayAppointments.length}
            </p>
            <p className="text-[10px] font-bold text-[#6B7280] tracking-widest uppercase">
              Today's Appointments
            </p>
          </motion.div>

          {/* Card 2: Total Patients */}
          <motion.div variants={cardVariants} className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-[52px] font-extrabold text-[#14B874] leading-none mb-1 font-sans">
              {stats.totalPatients}
            </p>
            <p className="text-[10px] font-bold text-[#6B7280] tracking-widest uppercase">
              Total Patients
            </p>
          </motion.div>

          {/* Card 3: Total Appointments */}
          <motion.div variants={cardVariants} className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-[52px] font-extrabold text-[#8757EA] leading-none mb-1 font-sans">
              {stats.totalAppointments}
            </p>
            <p className="text-[10px] font-bold text-[#6B7280] tracking-widest uppercase">
              Total Appointments
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ── SRI CHAITANYA CLINICAL DAILY HUDDLE (ADMIN ONLY) ── */}
      {admin && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                  MANAGEMENT COMMAND CENTER
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-700 font-mono font-bold">Active Board</span>
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm mt-1 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                <Activity size={15} className="text-amber-500 animate-pulse" /> Today's Clinical Daily Huddle
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed font-semibold">
                An exclusive administrative command center to align morning briefings, audit chart readiness, prioritize revenue collections, and secure follow-up checkups.
              </p>
            </div>

            <div className="text-right flex items-center md:flex-col gap-2 md:gap-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Huddle Date</span>
              <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Huddle Briefing Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Today's Huddle Volume</span>
                <span className="bg-blue-50 text-blue-700 p-1.5 rounded-lg border border-blue-200">
                  <Users size={12} />
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                {todayAppointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted').length} Patients
              </p>
              <p className="text-[10px] text-slate-450 mt-1 font-semibold">Scheduled clinical sessions today</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-amber-700 tracking-wider">Financial Priorities</span>
                <span className="bg-amber-50 text-amber-700 p-1.5 rounded-lg border border-amber-200">
                  <DollarSign size={12} />
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-amber-700 mt-1">
                ₹{todayAppointments
                  .filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted')
                  .reduce((sum, a) => sum + Number(a.balance_amount || 0), 0)
                  .toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-450 mt-1 font-semibold">
                {todayAppointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted' && Number(a.balance_amount || 0) > 0).length} accounts with outstanding dues
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-rose-700 tracking-wider">Clinical Follow-up Alerts</span>
                <span className="bg-rose-50 text-rose-700 p-1.5 rounded-lg border border-rose-200">
                  <Bell size={12} />
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                {todayAppointments.filter(a => {
                  const cleanedPhone = a.phone?.trim() || '';
                  const st = patientStatuses.phoneMap[cleanedPhone] || patientStatuses.idMap[a.patient_id!] || '';
                  return st === 'Follow-up Required';
                }).length} Required
              </p>
              <p className="text-[10px] text-slate-450 mt-1 font-semibold">Active clinical follow-up records scheduled</p>
            </div>
          </div>

          {/* Interactive Huddle Planning checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3">
            <h4 className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-slate-455" /> Morning Huddle Alignment Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'goals', label: 'Review Collection Goals', desc: 'Brief receptionist desk' },
                { key: 'charts', label: 'Inspect Diagnostic Charts', desc: 'Confirm clinical consents' },
                { key: 'labs', label: 'Verify Prosthetic Lab Deliveries', desc: 'Check crown/onlay statuses' },
                { key: 'payments', label: 'Confirm UPI/POS Payment Mode', desc: 'Ensure registers are active' },
              ].map(item => (
                <div
                  key={item.key}
                  onClick={() => toggleHuddleChecklist(item.key)}
                  className={`border rounded-xl p-3 flex flex-col justify-between gap-1 cursor-pointer transition select-none
                    ${huddleChecklist[item.key]
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors
                      ${huddleChecklist[item.key]
                        ? 'bg-emerald-600 border-transparent text-white'
                        : 'bg-white border-slate-300'}`}
                    >
                      {huddleChecklist[item.key] && (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[11px] font-bold line-clamp-2 leading-tight">{item.label}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1 italic pl-5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Huddle Filtered Schedule Viewer */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-3">
            <div className="bg-slate-50/50 px-4.5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: "All Today's Huddle", count: todayAppointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted').length, color: 'hover:bg-slate-100 text-slate-700 border-slate-300' },
                  { id: 'balance', label: 'Outstanding Dues Only', count: todayAppointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted' && Number(a.balance_amount || 0) > 0).length, color: 'hover:bg-amber-50 text-amber-800 border-amber-205 bg-amber-50/30' },
                  { id: 'followup', label: 'Clinical Follow-ups Only', count: todayAppointments.filter(a => {
                    const cleanedPhone = a.phone?.trim() || '';
                    const st = patientStatuses.phoneMap[cleanedPhone] || patientStatuses.idMap[a.patient_id!] || '';
                    return st === 'Follow-up Required';
                  }).length, color: 'hover:bg-rose-50 text-rose-800 border-rose-205 bg-rose-50/30' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setHuddleTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer select-none
                      ${huddleTab === tab.id
                        ? tab.id === 'balance' ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : tab.id === 'followup' ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : tab.color}`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full font-bold
                      ${huddleTab === tab.id
                        ? 'bg-white/20 text-white'
                        : tab.id === 'balance' ? 'bg-amber-100 text-amber-800'
                        : tab.id === 'followup' ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-600'}`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dynamic search inside the daily schedule */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter huddle schedule..."
                  value={huddleSearch}
                  onChange={(e) => setHuddleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-teal-500 text-xs text-slate-800"
                />
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* In-Line List View of patients representing the filtered list */}
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
              {(() => {
                const query = huddleSearch.toLowerCase().trim();
                const filtered = todayAppointments
                  .filter(a => a.status !== 'Cancelled' && a.status !== 'Deleted')
                  .filter(appt => {
                    // Match Tab
                    if (huddleTab === 'balance') {
                      return Number(appt.balance_amount || 0) > 0;
                    }
                    if (huddleTab === 'followup') {
                      const st = patientStatuses.phoneMap[appt.phone?.trim() || ''] || patientStatuses.idMap[appt.patient_id!] || '';
                      return st === 'Follow-up Required';
                    }
                    return true;
                  })
                  .filter(appt => {
                    // Match Search Query
                    if (!query) return true;
                    return (
                      appt.name?.toLowerCase().includes(query) ||
                      appt.phone?.toLowerCase().includes(query) ||
                      appt.treatment?.toLowerCase().includes(query)
                    );
                  });

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-slate-400 text-xs font-semibold">
                      {huddleTab === 'balance' ? 'No patients with outstanding balances scheduled today.' :
                        huddleTab === 'followup' ? 'No patients with active clinical follow-up flags scheduled today.' :
                        'No matching patients found in this morning huddle filter.'}
                    </div>
                  );
                }

                return filtered.map((appt) => {
                  const cleanedPhone = appt.phone?.trim() || '';
                  const pStatus = patientStatuses.phoneMap[cleanedPhone] || patientStatuses.idMap[appt.patient_id!] || '';
                  const hasBalance = Number(appt.balance_amount || 0) > 0;
                  const isFollowup = pStatus === 'Follow-up Required';

                  return (
                    <div
                      key={`huddle-row-${appt.id}`}
                      className={`px-4.5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/50 transition border-l-4
                        ${isFollowup ? 'border-l-rose-500 bg-rose-50/20' :
                        hasBalance ? 'border-l-amber-500 bg-amber-50/10' :
                        'border-l-teal-500 bg-white'}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl font-bold flex-shrink-0 flex items-center justify-center uppercase border text-xs
                          ${isFollowup ? 'bg-rose-950 border-rose-900 text-rose-450' :
                          hasBalance ? 'bg-amber-950 border-amber-900 text-amber-400' :
                          'bg-teal-950 border-teal-900 text-teal-400'}`}
                        >
                          {appt.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 font-sans">
                            <span className="text-xs font-bold text-slate-800">{appt.name || 'Unknown Patient'}</span>
                            <span className="text-[10px] font-mono text-slate-400">({appt.appointment_time || '10:00 AM'})</span>
                          </div>
                          
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-none">
                            Procedure: <strong className="text-slate-700 font-bold">{appt.treatment || 'Consultation'}</strong> · {appt.phone || 'No Contact'}
                          </p>

                          {/* Detail Highlighting Tags */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {canViewFinancials(role as any) && hasBalance && (
                              <span className="text-[9px] font-bold text-amber-805 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 uppercase">
                                <DollarSign size={9} /> Dues Outstanding: ₹{Number(appt.balance_amount).toLocaleString('en-IN')}
                              </span>
                            )}
                            {isFollowup && (
                              <span className="text-[9px] font-bold text-rose-805 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 uppercase">
                                <Bell size={9} /> Clinical Follow-Up Required
                              </span>
                            )}
                            {canViewFinancials(role as any) && !hasBalance && !isFollowup && (
                              <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded uppercase font-semibold">
                                Clean Account Balance
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Side quick administrative action controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* WhatsApp / Phone trigger */}
                        <a
                          href={`https://wa.me/91${cleanedPhone.replace(/[\s-+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer select-none"
                        >
                          <Send size={11} className="text-emerald-600" /> WhatsApp Direct
                        </a>

                        {/* Bill routing */}
                        <Link href="/crm/billing">
                          <span className="bg-white hover:bg-amber-50 text-amber-800 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer select-none">
                            <FileText size={11} className="text-amber-600" /> Billing Center
                          </span>
                        </Link>

                        {/* Complete queue shortcut */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (appt.status === 'Pending') {
                              await updateAppointmentStatus(appt.id, 'In Treatment');
                              await fetchAll();
                            } else if (appt.status === 'In Treatment') {
                              await updateAppointmentStatus(appt.id, 'Completed');
                              await fetchAll();
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer select-none border
                            ${appt.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' :
                            appt.status === 'In Treatment' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' :
                            'bg-slate-50 text-slate-400 border-slate-200 pointer-events-none'}`}
                        >
                          {appt.status === 'Pending' ? 'Start Tx' : appt.status === 'In Treatment' ? 'Complete Tx' : 'Handled'}
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}



      {/* KPI & Clinical Metrics Grid Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: stats.todayTotal, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50/55', sub: "Active schedules today" },
          { label: "Completed Appointments", value: stats.todayCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/55', sub: "Successfully treated today" },
          { label: "Pending Appointments", value: stats.todayPending, icon: Hourglass, color: 'text-amber-500', bg: 'bg-amber-50/55', sub: "Awaiting consultation" },
          { label: "New Patients", value: `${stats.totalPatients} (All) / ${stats.newPatientsCount} (Month)`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50/55', sub: "Registrations logged" },
          { label: "Today's Revenue", value: canViewFinancials(role as any) ? `₹${Number(stats.todayCollection).toLocaleString('en-IN')}` : '🔐 Restricted', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50/55', sub: "Today's payments" },
          { label: "Monthly Revenue", value: canViewFinancials(role as any) ? `₹${Number(stats.monthCollection).toLocaleString('en-IN')}` : '🔐 Restricted', icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50/55', sub: "Current month collections" },
          { label: "Pending Payments", value: canViewFinancials(role as any) ? `₹${Number(stats.pendingBalance).toLocaleString('en-IN')}` : '🔐 Restricted', icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50/55', sub: "Total dues outstanding" },
          { label: "Follow-ups Due", value: stats.overdueFollowups, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50/55', sub: "Return recall actions" },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{label}</span>
              <div className={`p-1.5 rounded-xl ${bg} ${color}`}>
                <Icon size={15} />
              </div>
            </div>
            <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Daily Schedule Summary - Today's Workflow at a glance */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck size={15} className="text-teal-600" /> Daily Schedule Summary
            </h3>
            <p className="text-slate-400 text-[10.5px] mt-0.5 font-medium">
              Today's direct workflow, time slot sequences, and queue controls at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-100 uppercase font-mono">
              {todayAppointments.length} Active Slot{todayAppointments.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
            No appointments scheduled today
            <div className="mt-2.5">
              <Link href="/crm/appointments">
                <span className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-xl inline-block shadow-sm transition cursor-pointer">
                  + Create Appointment
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">
                    <th className="py-2.5">Time Slot</th>
                    <th className="py-2.5">Patient Details</th>
                    <th className="py-2.5">Treatment Procedure</th>
                    {canViewFinancials(role as any) && <th className="py-2.5">Financials</th>}
                    <th className="py-2.5">Workflow Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-105 text-slate-700">
                  {todayAppointments.map((appt) => (
                    <tr key={`sched-${appt.id}`} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 font-mono font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} className="text-teal-600" />
                        {appt.appointment_time || '10:00 AM'}
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            {appt.name || 'Unknown Patient'}
                            {appt.notes && appt.notes.includes('[CANCELLATION_REQUESTED]') && (
                              <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse inline-flex items-center gap-0.5">
                                ⚠️ CANCEL REQ
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{appt.phone || 'No Contact'}</p>
                        </div>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-205 text-slate-700 px-2 py-0.5 rounded text-[10.5px] font-semibold">
                          {appt.treatment || 'General Checkup'}
                        </span>
                      </td>
                      {canViewFinancials(role as any) && (
                        <td className="py-3 whitespace-nowrap font-mono">
                          <div>
                            <p className="text-slate-800 font-bold">₹{Number(appt.amount_paid || 0).toLocaleString('en-IN')}</p>
                            {appt.balance_amount > 0 && (
                              <p className="text-rose-605 font-bold text-[9px] mt-0.5">Due: ₹{Number(appt.balance_amount || 0).toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                          appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          appt.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          appt.status === 'In Treatment' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {appt.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {appt.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => updateAppointmentStatus(appt.id, 'In Treatment')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg shadow-xs transition cursor-pointer"
                            >
                              In Treatment
                            </button>
                          )}
                          {appt.status === 'In Treatment' && (
                            <button
                              type="button"
                              onClick={() => updateAppointmentStatus(appt.id, 'Completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-lg shadow-xs transition cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                            appt.notes && appt.notes.includes('[CANCELLATION_REQUESTED]') ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmApprove = window.confirm(`Approve cancellation request for ${appt.name || 'this patient'}?`);
                                  if (!confirmApprove) return;
                                  const cleanedNotes = (appt.notes || '').replace(/\[CANCELLATION_REQUESTED\]/g, '').trim();
                                  await updateAppointmentStatus(appt.id, 'Cancelled');
                                  try {
                                    await supabase.from('appointments').update({ notes: cleanedNotes }).eq('id', appt.id);
                                  } catch {}
                                }}
                                className="bg-rose-605 hover:bg-rose-700 text-white text-[9.5px] font-bold px-2 py-1 rounded-lg shadow-xs transition cursor-pointer animate-pulse"
                                title="Approve patient's cancellation request"
                              >
                                Approve Cancel
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appt.id, 'Cancelled')}
                                className="bg-slate-100 hover:bg-slate-205 text-slate-600 text-[9.5px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            )
                          )}
                          {appt.status === 'Completed' && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 uppercase pr-2">
                              <CheckCircle2 size={11} /> Handled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {todayAppointments.map((appt) => (
                <div key={`sched-mob-${appt.id}`} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs">{appt.name || 'Unknown Patient'}</span>
                        {appt.notes && appt.notes.includes('[CANCELLATION_REQUESTED]') && (
                          <span className="bg-rose-100 text-rose-700 text-[8px] px-1 py-0.2 rounded font-black animate-pulse">
                            ⚠️ CANCEL REQ
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {appt.phone || 'No Contact'}
                      </p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                      appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      appt.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      appt.status === 'In Treatment' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {appt.status || 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs gap-2 pt-0.5">
                    <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                      <Clock size={11} className="text-teal-600 shrink-0" />
                      {appt.appointment_time || '10:00 AM'}
                    </span>
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold truncate max-w-[150px]">
                      {appt.treatment || 'General Checkup'}
                    </span>
                  </div>

                  {canViewFinancials(role as any) && (
                    <div className="flex items-center justify-between text-[10px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-600 font-bold">Paid: ₹{Number(appt.amount_paid || 0).toLocaleString('en-IN')}</span>
                      {appt.balance_amount > 0 ? (
                        <span className="text-rose-600 font-bold">Due: ₹{Number(appt.balance_amount || 0).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Fully Settled</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1 flex-wrap">
                    {appt.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => updateAppointmentStatus(appt.id, 'In Treatment')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        In Treatment
                      </button>
                    )}
                    {appt.status === 'In Treatment' && (
                      <button
                        type="button"
                        onClick={() => updateAppointmentStatus(appt.id, 'Completed')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}
                    {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                      appt.notes && appt.notes.includes('[CANCELLATION_REQUESTED]') ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmApprove = window.confirm(`Approve cancellation request for ${appt.name || 'this patient'}?`);
                            if (!confirmApprove) return;
                            const cleanedNotes = (appt.notes || '').replace(/\[CANCELLATION_REQUESTED\]/g, '').trim();
                            await updateAppointmentStatus(appt.id, 'Cancelled');
                            try {
                              await supabase.from('appointments').update({ notes: cleanedNotes }).eq('id', appt.id);
                            } catch {}
                          }}
                          className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer animate-pulse"
                        >
                          Approve Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(appt.id, 'Cancelled')}
                          className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )
                    )}
                    {appt.phone && (
                      <a
                        href={`tel:${appt.phone}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <Phone size={10} /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── UPCOMING PATIENTS SECTION ── */}
      <div id="upcoming-appointments-command-center" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-150 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <CalendarCheck size={15} className="text-teal-605 animate-pulse" />
              Upcoming Patients
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Upcoming scheduled appointments ordered by date and time slot with patient details and status.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/crm/appointments">
              <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer">
                View All Appointments <ChevronRight size={14} />
              </span>
            </Link>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Upcoming:</span>
              <span className="text-xs font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {upcomingAppointments.length} Patients
              </span>
            </div>
          </div>
        </div>

        {/* Campaign Control Center Group */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Send size={13} className="text-teal-605" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Bulk Reminder Outreach Campaigns</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              id="btn-campaign-tomorrow"
              onClick={() => startBulkReminderCampaign('tomorrow')}
              className="bg-white hover:bg-slate-50 text-slate-750 flex items-center justify-between p-3 rounded-lg border border-slate-150 shadow-xs text-xs font-bold transition group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-left">Send Tomorrow Reminders</span>
              </div>
              <span className="bg-amber-100 text-amber-800 font-mono text-[10px] px-2 py-0.5 rounded">
                {tomorrowPendingCount} Pending
              </span>
            </button>
            <button
              type="button"
              id="btn-campaign-3day"
              onClick={() => startBulkReminderCampaign('3days')}
              className="bg-white hover:bg-slate-50 text-slate-755 flex items-center justify-between p-3 rounded-lg border border-slate-150 shadow-xs text-xs font-bold transition group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-left">Send 3-Day Reminder Campaign</span>
              </div>
              <span className="bg-blue-100 text-blue-800 font-mono text-[10px] px-2 py-0.5 rounded">
                {next3PendingCount} Pending
              </span>
            </button>
            <button
              type="button"
              id="btn-campaign-all"
              onClick={() => startBulkReminderCampaign('all')}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-between p-3 rounded-lg border border-teal-700 shadow-xs text-xs font-bold transition group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-teal-200 shrink-0 animate-ping" />
                <span className="text-left">Send All Pending Campaign</span>
              </div>
              <span className="bg-teal-700 text-white font-mono text-[10px] px-2 py-0.5 rounded">
                {allPendingCount} Pending
              </span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
            {[
              { id: 'all', label: 'All Upcoming' },
              { id: 'tomorrow', label: 'Tomorrow Only' },
              { id: '3days', label: 'Next 3 Days' },
              { id: '7days', label: 'Next 7 Days' },
              { id: '30days', label: 'Next 30 Days' }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`upcoming-tab-${tab.id}`}
                onClick={() => setUpcomingFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  upcomingFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-550 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="upcoming-search-input"
              value={upcomingSearch}
              onChange={(e) => setUpcomingSearch(e.target.value)}
              placeholder="Search upcoming patient lists..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-xs placeholder-slate-450 font-medium"
            />
          </div>
        </div>

        {/* Upcoming Table */}
        {filteredUpcoming.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50 font-semibold">
            No upcoming appointments
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-xl">
              <table className="min-w-full divide-y divide-slate-150 text-left text-xs bg-slate-50/30">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-550 text-[10px] uppercase">Patient Name</th>
                    <th className="p-3 font-bold text-slate-550 text-[10px] uppercase">Treatment Session</th>
                    <th className="p-3 font-bold text-slate-550 text-[10px] uppercase">Scheduled Info</th>
                    <th className="p-3 font-bold text-slate-550 text-[10px] uppercase">Session Status</th>
                    <th className="p-3 font-bold text-slate-550 text-[10px] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {filteredUpcoming.map((appt: any) => {
                    const isToday = appt.next_visit === todayStr;
                    const isTomorrow = appt.next_visit === tomorrowStr;

                    return (
                      <tr key={appt.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-extrabold text-slate-800">{appt.name}</p>
                            {appt.patient_code && (
                              <span className="text-[9px] font-mono font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                                {appt.patient_code}
                              </span>
                            )}
                            {!appt.patient_code && appt.patient_id && (
                              <span className="text-[9px] font-mono font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                P-{appt.patient_id}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold font-mono">{appt.phone}</p>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-black text-teal-800 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded">
                            {appt.treatment || 'Consultation'}
                          </span>
                          {appt.doctor_name && (
                            <p className="text-[9.5px] text-slate-450 mt-1 font-medium flex items-center gap-0.5">
                              <Stethoscope size={10} className="text-teal-605" />
                              {appt.doctor_name}
                            </p>
                          )}
                          {(appt.chair_no || appt.chair) && (
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-1 inline-block">
                              Chair: {appt.chair_no || appt.chair}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-750">
                              {new Date(appt.next_visit).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {isToday && (
                              <span className="text-[9px] font-extrabold px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-150 rounded uppercase animate-pulse">
                                Today
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="text-[9px] font-extrabold px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-150 rounded uppercase">
                                Tomorrow
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5 flex items-center gap-0.5">
                            <Clock size={10} className="text-slate-400" />
                            {appt.appointment_time || 'General Slot'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={`text-[9.5px] font-extrabold px-2 py-0.5 border rounded-full uppercase ${
                            appt.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-150'
                              : appt.status === 'In Treatment'
                              ? 'bg-sky-50 text-sky-850 border-sky-150 shadow-2xs'
                              : appt.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-150'
                              : 'bg-amber-50 text-amber-800 border-amber-150'
                          }`}>
                            {appt.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingAppt(appt)}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-1 rounded border border-slate-205 shadow-3xs cursor-pointer transition"
                              title="View Overview"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditUpcomingAppt(appt)}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-1 rounded border border-slate-205 shadow-3xs cursor-pointer transition"
                              title="Edit / Reschedule"
                            >
                              Edit
                            </button>
                            <a
                              href={`tel:${appt.phone}`}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-1 rounded border border-slate-205 shadow-3xs cursor-pointer transition flex items-center gap-0.5"
                              title="Call Patient"
                            >
                              Call
                            </a>
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppSingle(appt)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded border border-emerald-150 shadow-3xs cursor-pointer transition flex items-center gap-0.5"
                              title="WhatsApp Reminder"
                            >
                              <Send size={10} />
                              Notify
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredUpcoming.map((appt: any) => {
                const isToday = appt.next_visit === todayStr;
                const isTomorrow = appt.next_visit === tomorrowStr;

                return (
                  <div key={`up-mob-${appt.id}`} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs">{appt.name}</span>
                          {appt.patient_code && (
                            <span className="text-[8px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1 py-0.2 rounded">
                              {appt.patient_code}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {appt.phone}
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 border rounded-full uppercase shrink-0 ${
                        appt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-150'
                          : appt.status === 'In Treatment'
                          ? 'bg-sky-50 text-sky-850 border-sky-150'
                          : appt.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-800 border-rose-150'
                          : 'bg-amber-50 text-amber-800 border-amber-150'
                      }`}>
                        {appt.status || 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">
                          {new Date(appt.next_visit).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </span>
                        {isToday && (
                          <span className="text-[8px] font-black px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-150 rounded uppercase">
                            Today
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="text-[8px] font-black px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-150 rounded uppercase">
                            Tomorrow
                          </span>
                        )}
                        <span className="text-slate-400 text-[10px] font-mono">
                          {appt.appointment_time || 'General Slot'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded">
                        {appt.treatment || 'Consultation'}
                      </span>
                    </div>

                    {(appt.doctor_name || appt.chair_no || appt.chair) && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        {appt.doctor_name && (
                          <span className="flex items-center gap-0.5">
                            <Stethoscope size={10} className="text-teal-600" /> {appt.doctor_name}
                          </span>
                        )}
                        {(appt.chair_no || appt.chair) && (
                          <span className="text-[8px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Chair: {appt.chair_no || appt.chair}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingAppt(appt)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditUpcomingAppt(appt)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        Edit
                      </button>
                      {appt.phone && (
                        <a
                          href={`tel:${appt.phone}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-0.5"
                        >
                          <Phone size={10} /> Call
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppSingle(appt)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-150 transition cursor-pointer flex items-center gap-1"
                      >
                        <Send size={10} /> Notify
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Middle Row: Today's Appointments + Patient Queue + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck size={14} className="text-teal-600" /> Today's Appointments
            </h3>
            <Link href="/crm/appointments">
              <span className="text-[10px] uppercase font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer">View <ChevronRight size={11} /></span>
            </Link>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Total Today', value: stats.todayTotal, color: 'bg-blue-500', text: 'text-slate-900' },
              { label: 'Pending Queue', value: stats.todayPending, color: 'bg-amber-400', text: 'text-amber-700' },
              { label: 'Completed Care', value: stats.todayCompleted, color: 'bg-emerald-500', text: 'text-emerald-700' },
            ].map(({ label, value, color, text }) => (
              <div key={label} className="flex items-center gap-3 py-0.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-xs text-slate-600 flex-1">{label}</span>
                <span className={`text-xs font-bold font-mono ${text}`}>{value}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-1.5 animate-pulse">
                <div
                  className="bg-teal-600 h-1.5 rounded-full transition-all"
                  style={{ width: stats.todayTotal > 0 ? `${(stats.todayCompleted / stats.todayTotal) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                {stats.todayTotal > 0 ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}% completed
              </p>
            </div>
          </div>
        </div>

        {/* Patient Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-blue-600" /> Patient Queue
            </h3>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Pending Consultations', value: stats.waitingPatients, icon: Hourglass, bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-100' },
              { label: 'Active In Treatment', value: stats.inTreatment, icon: Stethoscope, bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-100' },
              { label: 'Follow-ups Required', value: stats.followupDue, icon: Bell, bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-100' },
            ].map(({ label, value, icon: Icon, bg, text, border }) => (
              <div key={label} className={`flex items-center gap-3 px-2.5 py-1.5 rounded-lg border ${bg} ${border}`}>
                <Icon size={13} className="text-slate-450" />
                <span className="text-xs font-semibold text-slate-700 flex-1">{label}</span>
                <span className={`text-xs font-bold font-mono ${text}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Tracker */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Bell size={14} className="text-rose-600" /> Follow-up Tracker
            </h3>
            <Link href="/crm/followups">
              <span className="text-[10px] uppercase font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer">View <ChevronRight size={11} /></span>
            </Link>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Overdue Schedules', value: stats.overdueFollowups, icon: TriangleAlert, bg: 'bg-red-50/70', text: 'text-red-700', border: 'border-red-100/50' },
              { label: "Today's Schedules", value: stats.todayPending, icon: Clock, bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-100' },
              { label: 'Upcoming (7 days)', value: stats.upcomingFollowups, icon: CalendarCheck, bg: 'bg-slate-50', text: 'text-slate-80% ', border: 'border-slate-100' },
            ].map(({ label, value, icon: Icon, bg, text, border }) => (
              <div key={label} className={`flex items-center gap-3 px-2.5 py-1.5 rounded-lg border ${bg} ${border}`}>
                <Icon size={13} className="text-slate-450" />
                <span className="text-xs font-semibold text-slate-700 flex-1">{label}</span>
                <span className={`text-xs font-bold font-mono ${text}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AUTOMATED CLINICAL RECALL OUTREACH QUEUE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity size={15} className="text-teal-605 animate-pulse" />
              Follow-ups & Recalls
            </h3>
            <p className="text-[11px] text-slate-500">Automated scheduling alerts based on elapsed intervals (Scaling @ 6mo, RCT @ 1mo) — Reach out to reactivate dormant cases</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link href="/crm/followups">
              <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer">
                View All <ChevronRight size={14} />
              </span>
            </Link>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span className="text-[10px] font-bold text-slate-600 font-mono">{recalls.length} Patients Due</span>
            </div>
          </div>
        </div>

        {recalls.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-150 rounded-xl bg-slate-50/50 font-semibold">
            No follow-ups due
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-slate-150 rounded-xl">
              <table className="min-w-full divide-y divide-slate-150 text-left text-xs bg-slate-50/30">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-semibold text-slate-550">Patient</th>
                    <th className="p-3 font-semibold text-slate-550">Last Completed Procedure</th>
                    <th className="p-3 font-semibold text-slate-550">Outreach Frequency Alert</th>
                    <th className="p-3 font-semibold text-slate-550">Recall Target Date</th>
                    <th className="p-3 font-semibold text-slate-550">Outreach Status</th>
                    <th className="p-3 font-semibold text-slate-550 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {recalls.map((item, idx) => {
                    const contactedKey = `${item.phone}-${item.reason}`;
                    const isContacted = contactedList.includes(contactedKey);
                    const isOverdue = item.isOverdue;
                    
                    // WhatsApp template message
                    const waText = `Hi ${item.name}, this is Sri Chaitanya Multispeciality Dental Care. Hope you are doing well! Our records show you are due for your recommended "${item.reason}" checkup (completed on ${new Date(item.completedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}). Would you like to schedule a quick evaluation slot this week? Please let us know. Thank you!`;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.phone}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-700">{item.treatment}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Done: {new Date(item.completedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-150">
                            {item.reason}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold font-mono text-slate-700">
                            {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                            isOverdue 
                              ? 'bg-rose-50 text-rose-700 border-rose-150 animate-pulse' 
                              : 'bg-amber-50 text-amber-700 border-amber-150'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Due Soon'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isContacted 
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isContacted ? '📞 Outreach Initiated' : '⏳ Pending Contact'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => toggleContacted(item.phone, item.reason)}
                              className={`p-1.5 rounded-lg border transition ${
                                isContacted 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={isContacted ? 'Mark Pending Outreach' : 'Log Contact Outcome'}
                            >
                              <UserCheck size={14} />
                            </button>
                            
                            <button
                              onClick={() => handleRecallWhatsAppOutreach(item, waText)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-150 hover:bg-emerald-100 transition inline-flex items-center cursor-pointer"
                              title="Send WhatsApp Outreach & Configure Postponement"
                            >
                              <Send size={14} />
                            </button>

                            <button
                              onClick={() => handleOpenPostponeModal(item)}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition inline-flex items-center cursor-pointer"
                              title="Postpone Next Outreach"
                            >
                              <Clock size={14} />
                            </button>

                            <button
                              onClick={() => openBookingModal(item)}
                              className="px-2 py-1 text-[10px] font-extrabold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs transition flex items-center gap-1"
                            >
                              <CalendarPlus size={11} /> Book Slot
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {recalls.map((item, idx) => {
                const contactedKey = `${item.phone}-${item.reason}`;
                const isContacted = contactedList.includes(contactedKey);
                const isOverdue = item.isOverdue;
                const waText = `Hi ${item.name}, this is Sri Chaitanya Multispeciality Dental Care. Hope you are doing well! Our records show you are due for your recommended "${item.reason}" checkup (completed on ${new Date(item.completedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}). Would you like to schedule a quick evaluation slot this week? Please let us know. Thank you!`;

                return (
                  <div key={`recall-mob-${idx}`} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs">{item.name}</span>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {item.phone}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isContacted 
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isContacted ? '📞 Contacted' : '⏳ Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-2 pt-0.5 flex-wrap">
                      <span className="font-medium text-slate-700 text-[11px]">
                        {item.treatment}
                      </span>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-150">
                        {item.reason}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-600 font-bold">
                        Target: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className={`font-bold px-1.5 py-0.2 rounded border uppercase ${
                        isOverdue 
                          ? 'bg-rose-50 text-rose-700 border-rose-150 animate-pulse' 
                          : 'bg-amber-50 text-amber-700 border-amber-150'
                      }`}>
                        {isOverdue ? 'Overdue' : 'Due Soon'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 flex-wrap">
                      <button
                        onClick={() => toggleContacted(item.phone, item.reason)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                          isContacted 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <UserCheck size={11} />
                        {isContacted ? 'Contacted' : 'Pending'}
                      </button>

                      <button
                        onClick={() => handleRecallWhatsAppOutreach(item, waText)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                      >
                        <Send size={11} /> WhatsApp
                      </button>

                      <button
                        onClick={() => handleOpenPostponeModal(item)}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                      >
                        <Clock size={11} /> Postpone
                      </button>

                      <button
                        onClick={() => openBookingModal(item)}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-teal-600 text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <CalendarPlus size={11} /> Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Booking Modal Overlay for Recall */}
      {bookingRecall && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-teal-700 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <CalendarPlus size={18} />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Book Recall Appointment</h4>
              </div>
              <button onClick={() => setBookingRecall(null)} className="text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleBookRecallAppt} className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-800 text-sm mb-0.5">{bookingRecall.name}</p>
                <p className="text-slate-500 font-mono">Contact: {bookingRecall.phone}</p>
                <div className="mt-2 bg-teal-50 border border-teal-150 p-2 rounded-lg text-teal-800">
                  <strong>Recall Context:</strong> {bookingRecall.reason} ({bookingRecall.treatment})
                </div>
              </div>

              {bookingError && (
                <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-150 font-bold">
                  Error: {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-150 font-bold">
                  {bookingSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Appointment Time *</label>
                  <select
                    required
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-teal-500 text-xs font-semibold"
                  >
                    <option value="">Select appointment time</option>
                    {APPOINTMENT_TIME_OPTIONS.map((timeOption) => (
                      <option key={timeOption} value={timeOption}>{timeOption}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 justify-end font-semibold">
                <button
                  type="button"
                  onClick={() => setBookingRecall(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bBooking}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
                >
                  {bBooking ? 'Scheduling...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Postpone Next Outreach Modal */}
      {postponeModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-teal-400" />
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">Postpone Next Outreach</h4>
                  <p className="text-[10px] text-slate-400">Configure future recall outreach schedule</p>
                </div>
              </div>
              <button
                onClick={() => setPostponeModalItem(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* WhatsApp Success Alert */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900 text-xs">WhatsApp outreach sent successfully.</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Postpone when {postponeModalItem.name} should next appear in the Recall Queue?
                  </p>
                </div>
              </div>

              {/* Patient Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 text-sm">{postponeModalItem.name}</span>
                  {postponeModalItem.patientCode && (
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                      {postponeModalItem.patientCode}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 font-mono text-[11px]">Phone: {postponeModalItem.phone}</p>
                <p className="text-slate-500 text-[11px]">
                  Procedure: <strong className="text-slate-700">{postponeModalItem.treatment}</strong> ({postponeModalItem.reason})
                </p>
              </div>

              {/* Postponement Period Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Select Postponement Period
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '6 Months', value: '6 Months' },
                    { label: '8 Months', value: '8 Months' },
                    { label: '12 Months', value: '12 Months' },
                    { label: 'Custom Date', value: 'Custom Date' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPostponePeriod(opt.value as any)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        postponePeriod === opt.value
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPostponePeriod("Don't Postpone")}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                    postponePeriod === "Don't Postpone"
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Don't Postpone (Keep In Active Queue)
                </button>
              </div>

              {/* Custom Date Picker */}
              {postponePeriod === 'Custom Date' && (
                <div className="space-y-1 bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
                  <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">
                    Choose Specific Next Outreach Date
                  </label>
                  <input
                    type="date"
                    required
                    value={postponeCustomDate}
                    min={getISTDateString()}
                    onChange={(e) => setPostponeCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 bg-white rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 text-xs font-mono font-bold"
                  />
                </div>
              )}

              {/* Calculated Next Outreach Preview */}
              {postponePeriod !== "Don't Postpone" && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 text-teal-900 space-y-1">
                  <p className="text-[10px] uppercase font-extrabold text-teal-700 tracking-wider">
                    Calculated Next Outreach Schedule
                  </p>
                  <p className="font-extrabold text-sm font-mono text-teal-950">
                    {new Date(calculateNextOutreachDate(postponePeriod, postponeCustomDate)).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-[10px] text-teal-800">
                    Patient will be hidden from active Recall Queue until this date.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setPostponeModalItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSavePostponement}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock size={14} />
                  {postponePeriod === "Don't Postpone" ? 'Keep In Queue' : 'Save & Postpone Outreach'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal Overlay */}
      {editingAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-blue-700 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <CalendarPlus size={18} />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Edit Upcoming Appointment</h4>
              </div>
              <button onClick={() => setEditingAppt(null)} className="text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUpcomingAppt} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Patient Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-505 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-505 text-xs text-slate-800"
                />
              </div>

              <ReasonForVisitSelect
                value={editForm.treatment}
                onChange={(val) => setEditForm({ ...editForm, treatment: val })}
                required
                label="Reason for Visit / Treatment *"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.next_visit}
                    onChange={(e) => setEditForm({ ...editForm, next_visit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-505 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Appointment Time *</label>
                  <select
                    required
                    value={editForm.appointment_time}
                    onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-800"
                  >
                    <option value="">Select appointment time</option>
                    {APPOINTMENT_TIME_OPTIONS.map((timeOption) => (
                      <option key={timeOption} value={timeOption}>{timeOption}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Attending Doctor</label>
                <select
                  value={editForm.doctor_name}
                  onChange={(e) => setEditForm({ ...editForm, doctor_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-505 text-xs text-slate-800"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  <option value="Dr. Bhavani">Dr. Bhavani</option>
                  <option value="Dr. Srilatha">Dr. Srilatha</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Appointment Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-505 text-xs text-slate-800 font-bold"
                >
                  <option value="Pending">Pending / Scheduled</option>
                  <option value="In Treatment">In Treatment / Active</option>
                  <option value="Completed">Completed / Handled</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Deleted">Deleted</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Session Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:ring-1 focus:ring-blue-550 text-xs text-slate-800 resize-none"
                  placeholder="E.g., patient desires check-up before trip, requested afternoon slot"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end font-bold">
                <button
                  type="button"
                  onClick={() => setEditingAppt(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-655 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-sm transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Appointment Modal Overlay */}
      {viewingAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-150 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Appointment Overview</h4>
              </div>
              <button onClick={() => setViewingAppt(null)} className="text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-905 text-base">{viewingAppt.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Mobile: {viewingAppt.phone}</p>
                {viewingAppt.email && <p className="text-[11px] text-slate-500 font-mono">Email: {viewingAppt.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scheduled Date</span>
                  <p className="font-bold font-mono text-slate-800 mt-0.5">{viewingAppt.next_visit}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Session Time</span>
                  <p className="font-bold font-mono text-slate-800 mt-0.5">{viewingAppt.appointment_time || 'General slot'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">treatment type</span>
                  <span className="inline-block mt-0.5 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded">
                    {viewingAppt.treatment || 'Consultation'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Session Status</span>
                  <span className={`inline-block mt-0.5 text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    viewingAppt.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-150'
                      : viewingAppt.status === 'In Treatment'
                      ? 'bg-sky-50 text-sky-850 border-sky-150'
                      : viewingAppt.status === 'Cancelled'
                      ? 'bg-rose-50 text-rose-800 border-rose-150'
                      : 'bg-amber-50 text-amber-800 border-amber-150'
                  }`}>
                    {viewingAppt.status || 'Pending'}
                  </span>
                </div>
              </div>

              {viewingAppt.doctor_name && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">assigned clinical doctor</span>
                  <p className="font-bold text-slate-850 mt-0.5 flex items-center gap-1">
                    <Stethoscope size={12} className="text-teal-605" />
                    {viewingAppt.doctor_name}
                  </p>
                </div>
              )}

              {viewingAppt.notes && (
                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg">
                  <span className="text-[9.5px] text-slate-450 font-bold uppercase tracking-wider block mb-1">administrative notes</span>
                  <p className="text-slate-650 leading-relaxed font-semibold">{viewingAppt.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 justify-end font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setViewingAppt(null);
                    handleEditUpcomingAppt(viewingAppt);
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-750 border border-blue-150 rounded-lg hover:bg-blue-100 transition font-bold cursor-pointer"
                >
                  Modify Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAppt(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="bg-white/40 p-1.5 rounded-3xl border border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* CHART 1: Revenue Trend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div>
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Revenue Trend</h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Clinical financial performance over the active tracking cycle</p>
            </div>
            <div className="h-52 mt-4">
              {weeklyCollectionsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyCollectionsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={38} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 10 }} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                    <Line type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={3} dot={{ fill: '#0f766e', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-semibold italic">🔐 Secured / No collections recorded.</div>
              )}
            </div>
          </div>

          {/* CHART 2: Treatment Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div>
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Treatment Distribution</h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Diagnosed therapies and clinical services rendered</p>
            </div>
            <div className="h-52 mt-4 flex flex-col justify-center space-y-3">
              {treatmentBreakdown.length > 0 ? (
                treatmentBreakdown.slice(0, 5).map(({ name, count }, i) => {
                  const max = treatmentBreakdown[0].count || 1;
                  const pct = Math.round((count / max) * 100);
                  const colors = ['bg-teal-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-amber-500'];
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-650 truncate max-w-[180px]">{name}</span>
                        <span className="text-[11px] font-mono font-black text-slate-800">{count} visits</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">No treatment distribution recorded.</div>
              )}
            </div>
          </div>

          {/* CHART 3: Appointment Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div>
              <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">Appointment Status</h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Tracking daily clinical attendance patterns</p>
            </div>
            <div className="h-52 mt-4">
              {attendancePatterns7Days.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendancePatterns7Days} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 7, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={15} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 10 }} />
                    <Legend iconSize={6} iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 6 }} />
                    <Bar dataKey="Attended" name="Attended" stackId="statusStack" fill="#10b981" />
                    <Bar dataKey="Pending / In Treatment" name="Pending" stackId="statusStack" fill="#cb5a07" />
                    <Bar dataKey="Missed / Cancelled" name="Cancelled" stackId="statusStack" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Bypassed status patterns.</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity size={14} className="text-teal-600" /> Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Add Patient', icon: Plus, href: '/crm/patients', color: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100' },
            { label: 'New Appointment', icon: CalendarPlus, href: '/crm/appointments', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
            { label: 'New Treatment', icon: Stethoscope, href: '/crm/treatments', color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' },
            { label: 'Search Patient', icon: Search, href: '/crm/patients', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' },
            ...(canViewFinancials(role as any) ? [
              { label: 'Generate Bill', icon: FileText, href: '/crm/billing', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
              { label: 'Collections', icon: DollarSign, href: '/crm/collections', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
            ] : []),
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={label} href={href}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${color} uppercase tracking-wider`}>
                <Icon size={13} />
                {label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dashboard Bottom Flex-Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent Appointments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit">
          <div className="px-5 py-3 border-b border-slate-150 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={14} className="text-teal-600" /> Recent Appointments
            </h3>
            <Link href="/crm/appointments">
              <span className="text-[10px] uppercase font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer">View all <ChevronRight size={11} /></span>
            </Link>
          </div>
          <div className="divide-y divide-slate-100 pb-2">
            {recentAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No appointments yet</div>
            ) : recentAppointments.slice(0, 5).map((a: any) => (
              <div key={a.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-900 text-teal-400 font-bold text-xs flex-shrink-0 flex items-center justify-center uppercase">
                  {a.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                  <p className="text-[10px] text-slate-405 font-medium leading-none mt-0.5">{a.treatment || 'Consultation'} · {a.phone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${statusColor(a.status)}`}>
                    {a.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{a.next_visit}</p>
                </div>
                {canViewFinancials(role as any) && a.amount_paid > 0 && (
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs font-bold text-emerald-600">₹{Number(a.amount_paid).toLocaleString('en-IN')}</p>
                    {a.balance_amount > 0 && <p className="text-[10px] text-rose-600 font-semibold">₹{Number(a.balance_amount).toLocaleString('en-IN')} due</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}
