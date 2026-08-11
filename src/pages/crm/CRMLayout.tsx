import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard, Users, CalendarPlus, Stethoscope,
  FileText, DollarSign, Bell, LogOut, Menu,
  ChevronRight, Building2, Shield, UserCircle, UserCog, TrendingUp, FolderDown, Settings,
  Search, X, Loader2, Calendar, Phone, Mail, MapPin, CheckCircle2, AlertCircle, RefreshCw, HeartPulse,
  Clock, History, Tv, Microscope, Award, Package, MessageSquare, CalendarCheck, Moon, Sun,
  Cloud, CloudOff, Layers, Sparkles, Briefcase, Activity, CreditCard, Zap, Star, ChevronDown, UserPlus
} from 'lucide-react';
import { logout, getCurrentUser, isAdmin, getRole, isLoggedIn, validateSession, hasAccessToRoute, canViewFinancials } from '../../lib/auth';
import { startIdleTimeoutWatcher, stopIdleTimeoutWatcher, getActiveSessions } from '../../lib/security';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getDbHealthState, subscribeDbHealth, checkDbHealthNow, type DbHealthState } from '../../lib/dbHealth';
import { useNotification } from '../../components/NotificationProvider';
import DentalLogo from '../../components/DentalLogo';
import { calculateAgeFromDOB, validateDOB, validateIndianPhone, normalizeIndianPhone, validatePatientRegistration, generateUniquePatientCode } from '../../utils/patientUtils';
import { DuplicatePatientWarningModal } from '../../components/DuplicatePatientWarningModal';
import { getLocalTodayDateString, getApptDate } from '../../utils/dateUtils';
import { notifyAppointmentBooked } from '../../lib/email';
import { sendWhatsAppNotification, constructWhatsAppMessage, type WhatsAppNotificationParams } from '../../lib/whatsapp';
import { openWhatsApp } from '../../utils/whatsapp';
import { APPOINTMENT_TIME_OPTIONS, isValidAppointmentTime } from '../../utils/appointmentTime';
import ReasonForVisitSelect from '../../components/ReasonForVisitSelect';
import LocationSelect from '../../components/LocationSelect';

interface CRMLayoutProps {
  children: React.ReactNode;
}

export default function CRMLayout({ children }: CRMLayoutProps) {
  const { notify } = useNotification();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [dynamicRole, setDynamicRole] = useState<string | null>(null);
  const [roleLookupFailed, setRoleLookupFailed] = useState(false);
  const [roleLookupError, setRoleLookupError] = useState<string | null>(null);

  // Database Connection Health State
  const [dbHealth, setDbHealth] = useState<DbHealthState>(getDbHealthState());
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeDbHealth((state) => {
      setDbHealth(state);
    });
    // Trigger initial health check
    checkDbHealthNow();
    return () => unsubscribe();
  }, []);

  // Dark Scheme state engine
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('crm_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('crm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('crm_theme', 'light');
    }
  }, [isDarkMode]);
  
  // Multi-clinic branch state
  const [activeBranch, setActiveBranch] = useState(() => {
    return localStorage.getItem('crm_active_branch') || 'Vijayawada HQ';
  });

  // Global search & real-time syncing states
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    patients: any[];
    appointments: any[];
  }>({ patients: [], appointments: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<any | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);

  // Sync state tracking listener
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsGlobalSyncing(!!detail?.syncing);
    };
    window.addEventListener('crm-sync-state', handleSync);
    return () => window.removeEventListener('crm-sync-state', handleSync);
  }, []);

  // Auto-Sync state
  const [autoSyncInterval, setAutoSyncInterval] = useState<string>(() => {
    return localStorage.getItem('crm_auto_sync_interval') || '30s';
  });
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  // Auto-Sync timer effect
  useEffect(() => {
    if (autoSyncInterval === 'Off') {
      return;
    }

    const getDuration = (interval: string) => {
      if (interval === '10s') return 10;
      if (interval === '30s') return 30;
      if (interval === '1m') return 60;
      if (interval === '5m') return 300;
      return 30;
    };

    const period = getDuration(autoSyncInterval);
    setSecondsRemaining(period);

    const triggerSync = () => {
      console.info(`[Auto Sync] Timer fired for interval: ${autoSyncInterval}. Dispatching crm-force-sync.`);
      window.dispatchEvent(new CustomEvent('crm-force-sync'));
    };

    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          triggerSync();
          return period;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [autoSyncInterval]);

  // Online / Offline state tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Live Queue update broadcast alerts subscriber for all clinic staff
  useEffect(() => {
    const channel = supabase
      .channel('clinic-staff-queue-alerts-layout')
      .on('broadcast', { event: 'alert' }, (payload) => {
        const { event, name, message } = payload.payload;
        notify(
          event === 'new-patient' ? 'info' : 'success',
          event === 'new-patient' ? 'New Patient Registered' : 'Appointment Ready / సిద్ధంగా ఉంది',
          message
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notify]);

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<'register' | 'book' | 'expense'>('register');

  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: '', location: '', dob: '' });
  const [newAppt, setNewAppt] = useState({ name: '', phone: '', treatment: 'General Consultation', next_visit: getLocalTodayDateString(), appointment_time: '' });
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'Clinical Supplies', date: getLocalTodayDateString() });

  // Quick Actions Desk - Patient Autocomplete states
  const [selectedQuickApptPatient, setSelectedQuickApptPatient] = useState<any | null>(null);
  const [quickPatientSearchQuery, setQuickPatientSearchQuery] = useState('');
  const [quickPatientSearchResults, setQuickPatientSearchResults] = useState<any[]>([]);
  const [isSearchingQuickPatients, setIsSearchingQuickPatients] = useState(false);
  const [showQuickPatientDropdown, setShowQuickPatientDropdown] = useState(false);
  const [isBookingQuickAppt, setIsBookingQuickAppt] = useState(false);
  const [isRegisteringForAppt, setIsRegisteringForAppt] = useState(false);
  const [quickDuplicatePatients, setQuickDuplicatePatients] = useState<any[]>([]);
  const [showQuickDuplicateModal, setShowQuickDuplicateModal] = useState(false);

  // Search registered patients for Quick Actions Appointment Booking
  const searchQuickPatients = async (query: string) => {
    setIsSearchingQuickPatients(true);
    try {
      const q = query.trim();
      let queryBuilder;
      if (!q) {
        queryBuilder = supabase
          .from('patients')
          .select('id, name, phone, patient_code, age, gender')
          .order('created_at', { ascending: false })
          .limit(10);
      } else {
        queryBuilder = supabase
          .from('patients')
          .select('id, name, phone, patient_code, age, gender')
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%,patient_code.ilike.%${q}%`)
          .order('name', { ascending: true })
          .limit(20);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        console.error('[Quick Actions Desk] Patient search error:', error);
        setQuickPatientSearchResults([]);
      } else {
        setQuickPatientSearchResults(data || []);
      }
    } catch (err) {
      console.error('[Quick Actions Desk] Patient search exception:', err);
      setQuickPatientSearchResults([]);
    } finally {
      setIsSearchingQuickPatients(false);
    }
  };

  useEffect(() => {
    if (isQuickActionsOpen && activeQuickAction === 'book' && !selectedQuickApptPatient) {
      searchQuickPatients(quickPatientSearchQuery);
    }
  }, [isQuickActionsOpen, activeQuickAction]);

  const handleQuickRegisterPatient = async (e: React.FormEvent | null, forceBypass = false) => {
    if (e) e.preventDefault();
    
    const val = validatePatientRegistration(newPatient);
    if (!val.isValid) {
      const firstKey = Object.keys(val.errors)[0];
      notify('error', 'Validation Error', val.errors[firstKey]);
      return;
    }

    const { name, phone: normalizedPhone, date_of_birth, age: calculatedAge, gender, location } = val.normalizedData;

    if (!forceBypass) {
      const { data: existingPts } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', normalizedPhone);

      if (existingPts && existingPts.length > 0) {
        setQuickDuplicatePatients(existingPts);
        setShowQuickDuplicateModal(true);
        return;
      }
    }

    try {
      const newCode = generateUniquePatientCode();
      const { data, error } = await supabase.from('patients').insert([{
        patient_code: newCode,
        name,
        phone: normalizedPhone,
        date_of_birth: date_of_birth || null,
        age: calculatedAge,
        gender,
        location,
        patient_status: 'Registered'
      }]).select();

      if (error) throw error;

      const registeredPatient = data && data[0] ? data[0] : null;
      const returnedCode = registeredPatient?.patient_code || (registeredPatient?.id ? `SDC-${registeredPatient.id}` : 'Registered');

      notify('success', 'Patient Registered Successfully', `"${name}" (${returnedCode}) was registered.`);
      setNewPatient({ name: '', phone: '', age: '', gender: '', location: '', dob: '' });
      setShowQuickDuplicateModal(false);
      setQuickDuplicatePatients([]);
      window.dispatchEvent(new CustomEvent('crm-force-sync'));

      if (isRegisteringForAppt) {
        setSelectedQuickApptPatient(registeredPatient);
        setActiveQuickAction('book');
        setIsRegisteringForAppt(false);
        notify('info', 'Patient Selected', `"${registeredPatient.name}" selected. Complete appointment details below.`);
      } else {
        setIsQuickActionsOpen(false);
      }
    } catch (err: any) {
      notify('error', 'Registration Failed', err.message);
    }
  };

  const handleQuickBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBookingQuickAppt) return; // Submission lock

    if (!selectedQuickApptPatient || !selectedQuickApptPatient.id) {
      notify('error', 'Patient Required', 'Please search and select a registered patient before booking.');
      return;
    }
    if (!newAppt.treatment || !newAppt.next_visit || !newAppt.appointment_time) {
      notify('error', 'Incomplete Fields', 'Procedure, Scheduled Date, and Timeslot are required.');
      return;
    }
    if (!isValidAppointmentTime(newAppt.appointment_time)) {
      notify('error', 'Invalid Appointment Time', 'Please select a valid appointment time between 5:00 AM and 11:00 PM.');
      return;
    }

    // Pre-open popup window reference synchronously to prevent browser popup blockers if WhatsApp Web is used
    let waWindow: Window | null = null;
    try {
      waWindow = window.open('about:blank', '_blank');
      if (waWindow && waWindow.document) {
        waWindow.document.write(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>Booking Appointment...</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #38bdf8; text-align: center; }
                .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
                .spinner { border: 3px solid #334155; border-top: 3px solid #38bdf8; border-radius: 50%; width: 28px; height: 28px; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="spinner"></div>
                <h3 style="margin:0 0 0.5rem;font-size:1.1rem;color:#f8fafc;">Confirming Appointment</h3>
                <p style="margin:0;font-size:0.85rem;color:#94a3b8;">Saving to database & launching WhatsApp notification...</p>
              </div>
            </body>
          </html>`
        );
      }
    } catch (e) {
      waWindow = null;
    }

    setIsBookingQuickAppt(true);
    try {
      // 1. Authoritative registered patient data from database selection
      const patientId = selectedQuickApptPatient.id;
      const patientName = selectedQuickApptPatient.name;
      const patientPhone = selectedQuickApptPatient.phone;
      const patientEmail = selectedQuickApptPatient.email || '';
      const doctorName = 'Dr. Durga Bhavani Jupalli';

      // 2. Insert into Supabase FIRST (Database-First Rule)
      const { data, error } = await supabase.from('appointments').insert([{
        patient_id: patientId,
        name: patientName,
        phone: patientPhone,
        email: patientEmail,
        treatment: newAppt.treatment,
        next_visit: newAppt.next_visit,
        appointment_time: newAppt.appointment_time,
        status: 'Pending',
        visit_count: 1,
        visit_type: 'New',
        amount_paid: 0,
        balance_amount: 500,
        payment_mode: 'Cash',
        doctor_name: doctorName,
        notes: 'Booked via Enterprise Quick Actions Desk'
      }]).select();

      if (error) {
        if (waWindow && !waWindow.closed) waWindow.close();
        throw error;
      }

      if (!data || data.length === 0) {
        if (waWindow && !waWindow.closed) waWindow.close();
        throw new Error('Database insert succeeded but returned no record.');
      }

      const savedAppt = data[0];

      // Primary notification: Database appointment saved successfully
      notify('success', 'Appointment Saved', `Appointment saved in database for "${patientName}" on ${newAppt.next_visit} at ${newAppt.appointment_time}.`);

      // Reset form & close Quick Actions on database success
      setSelectedQuickApptPatient(null);
      setQuickPatientSearchQuery('');
      setNewAppt({ name: '', phone: '', treatment: 'General Consultation', next_visit: new Date().toISOString().split('T')[0], appointment_time: '' });
      setIsQuickActionsOpen(false);

      // Broadcast event for UI synchronization
      window.dispatchEvent(new CustomEvent('crm-force-sync'));

      // 3. Email Notification (Isolated Error Boundary)
      try {
        const emailRes = await notifyAppointmentBooked({
          name: patientName,
          phone: patientPhone,
          email: patientEmail,
          treatment: newAppt.treatment,
          next_visit: newAppt.next_visit,
          appointment_time: newAppt.appointment_time,
          notes: 'Booked via Enterprise Quick Actions Desk. Specialist: Dr. Durga Bhavani Jupalli',
          bookedBy: 'Enterprise Quick Actions Desk'
        });

        if (emailRes.success) {
          notify('success', 'Email Sent', `Confirmation email dispatched to ${patientEmail || 'srichaitanyadentalcare9@gmail.com'}.`);
        } else {
          notify('warning', 'Email Failed', `Appointment booked successfully, but email notification could not be sent: ${emailRes.error || 'EmailJS service unavailable'}`);
        }
      } catch (emailErr: any) {
        console.error('[Quick Actions Desk] Email notification exception:', emailErr);
        notify('warning', 'Email Failed', `Appointment booked successfully, but email notification could not be sent: ${emailErr.message || 'Network error'}`);
      }

      // 4. WhatsApp Notification (Isolated Error Boundary & Popup Blocker Handling)
      try {
        const waParams: WhatsAppNotificationParams = {
          patientName: patientName,
          patientPhone: patientPhone,
          doctorName: doctorName,
          doctorPhone: '918317575165',
          treatment: newAppt.treatment,
          date: newAppt.next_visit,
          time: newAppt.appointment_time,
          status: 'Scheduled',
          patient_id: patientId,
          id: savedAppt.id
        };

        const waResult = await sendWhatsAppNotification(waParams);

        if (waResult.sentAutomatically) {
          if (waWindow && !waWindow.closed) waWindow.close();
          notify('success', 'WhatsApp Sent', `Automated WhatsApp notification dispatched to ${patientName} (${patientPhone}).`);
        } else {
          // Redirect pre-opened window or launch fallback to open WhatsApp Web safely
          if (waWindow && !waWindow.closed) {
            waWindow.location.href = waResult.patientUrl;
          } else {
            openWhatsApp(patientPhone, constructWhatsAppMessage(waParams));
          }
          notify('success', 'WhatsApp Prepared', `WhatsApp message opened for ${patientName}.`);
        }
      } catch (waErr: any) {
        console.error('[Quick Actions Desk] WhatsApp notification exception:', waErr);
        if (waWindow && !waWindow.closed) waWindow.close();
        notify('warning', 'WhatsApp Failed', `Appointment booked successfully, but WhatsApp notification could not be sent: ${waErr.message || 'Dispatch error'}`);
      }

    } catch (err: any) {
      if (waWindow && !waWindow.closed) waWindow.close();
      notify('error', 'Booking Failed', err.message || 'Error occurred while saving appointment to database.');
    } finally {
      setIsBookingQuickAppt(false);
    }
  };

  const handleQuickLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      notify('error', 'Incomplete Fields', 'Title and Amount are required.');
      return;
    }
    try {
      const { data, error } = await supabase.from('expenses').insert([{
        title: newExpense.title,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: newExpense.date,
        payment_method: 'Cash',
        status: 'Approved'
      }]).select();

      if (error) throw error;
      notify('success', 'Expense Recorded', `₹${newExpense.amount} for "${newExpense.title}" was logged.`);
      setNewExpense({ title: '', amount: '', category: 'Clinical Supplies', date: new Date().toISOString().split('T')[0] });
      setIsQuickActionsOpen(false);
      window.dispatchEvent(new CustomEvent('crm-force-sync'));
    } catch (err: any) {
      notify('error', 'Logging Failed', err.message);
    }
  };

  // Live global query trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ patients: [], appointments: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const q = searchQuery.trim();
        const { data: matchedPatients } = await supabase
          .from('patients')
          .select('*')
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5);

        const { data: matchedAppts } = await supabase
          .from('appointments')
          .select('*')
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .order('next_visit', { ascending: false })
          .limit(5);

        setSearchResults({
          patients: matchedPatients || [],
          appointments: matchedAppts || []
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- FAVORITES AND RECENT ITEMS STATE & LOGIC ---
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(path => ['/crm/patients', '/crm/dashboard', '/crm/appointments', '/crm/billing', '/crm/followups', '/crm/imaging', '/crm/labwork', '/crm/expenses', '/crm/users', '/crm/audit', '/crm/export', '/crm/setup', '/crm/automation'].includes(path));
          if (valid.length > 0) return valid;
        }
      }
      return ['/crm/patients', '/crm/dashboard', '/crm/appointments', '/crm/billing'];
    } catch {
      return ['/crm/patients', '/crm/dashboard', '/crm/appointments', '/crm/billing'];
    }
  });

  const [recentItems, setRecentItems] = useState<{ path: string; label: string }[]>(() => {
    try {
      const saved = localStorage.getItem('crm_recent_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => ['/crm/patients', '/crm/dashboard', '/crm/appointments', '/crm/billing', '/crm/followups', '/crm/imaging', '/crm/labwork', '/crm/expenses', '/crm/users', '/crm/audit', '/crm/export', '/crm/setup', '/crm/automation'].includes(item.path));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const currentItem = allNavItems.find(item => item.path === location);
    if (currentItem && !currentItem.path.includes('-care') && !currentItem.path.includes('-clinical') && !currentItem.path.includes('-finance') && !currentItem.path.includes('-operations') && !currentItem.path.includes('-administration')) {
      setRecentItems(prev => {
        const filtered = prev.filter(item => item.path !== currentItem.path && ['/crm/patients', '/crm/dashboard', '/crm/appointments', '/crm/billing', '/crm/followups', '/crm/imaging', '/crm/labwork', '/crm/expenses', '/crm/users', '/crm/audit', '/crm/export', '/crm/setup', '/crm/automation'].includes(item.path));
        const updated = [{ path: currentItem.path, label: currentItem.label }, ...filtered].slice(0, 5);
        try {
          localStorage.setItem('crm_recent_items', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  }, [location]);

  const toggleFavorite = (path: string) => {
    setFavorites(prev => {
      const updated = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      try {
        localStorage.setItem('crm_favorites', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      notify(
        prev.includes(path) ? 'info' : 'success', 
        prev.includes(path) ? 'Favorites Updated' : 'Added to Favorites', 
        `"${allNavItems.find(n => n.path === path)?.label || 'Page'}" has been ${prev.includes(path) ? 'removed from' : 'added to'} your workspace shortcuts.`
      );
      return updated;
    });
  };

  const user = getCurrentUser();
  const admin = isAdmin();
  const roleName = getRole();

  const allNavItems = [
    { path: '/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/crm/patient-care', label: 'Patient Care', icon: Users },
    { path: '/crm/patients', label: 'Patients', icon: Users },
    { path: '/crm/appointments', label: 'Appointments', icon: Calendar },
    { path: '/crm/followups', label: 'Follow-ups', icon: Clock },
    { path: '/crm/clinical', label: 'Clinical', icon: Stethoscope },
    { path: '/crm/patients?view=chart', label: 'Dental Chart', icon: Award },
    { path: '/crm/imaging', label: 'X-Rays & Imaging', icon: Layers },
    { path: '/crm/labwork', label: 'Lab Work', icon: Microscope },
    { path: '/crm/finance', label: 'Finance', icon: DollarSign },
    { path: '/crm/billing', label: 'Billing & Invoices', icon: CreditCard },
    { path: '/crm/expenses', label: 'Expenses', icon: DollarSign },
    { path: '/crm/administration', label: 'Administration', icon: Settings },
    { path: '/crm/users', label: 'Users & Roles', icon: UserCog },
    { path: '/crm/audit', label: 'Audit Logs', icon: Shield },
    { path: '/crm/export', label: 'Data Export', icon: FolderDown },
    { path: '/crm/setup', label: 'Settings', icon: Settings },
    { path: '/crm/automation', label: 'Workflow Automation', icon: Zap },
    { path: '/crm/profile', label: 'Profile', icon: UserCircle },
  ];

  const workspaces = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/crm/dashboard',
      items: [
        { path: '/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      key: 'patient-care',
      label: 'Patient Care',
      icon: Users,
      path: '/crm/patient-care',
      items: [
        { path: '/crm/patients', label: 'Patients', icon: Users },
        { path: '/crm/appointments', label: 'Appointments', icon: Calendar },
        { path: '/crm/followups', label: 'Follow-ups', icon: Clock }
      ]
    },
    {
      key: 'clinical',
      label: 'Clinical',
      icon: Stethoscope,
      path: '/crm/clinical',
      items: [
        { path: '/crm/patients?view=chart', label: 'Dental Chart', icon: Award },
        { path: '/crm/imaging', label: 'X-Rays & Imaging', icon: Layers },
        { path: '/crm/labwork', label: 'Lab Work', icon: Microscope }
      ]
    },
    {
      key: 'finance',
      label: 'Finance',
      icon: DollarSign,
      path: '/crm/finance',
      items: [
        { path: '/crm/billing', label: 'Billing & Invoices', icon: CreditCard },
        { path: '/crm/expenses', label: 'Expenses', icon: DollarSign }
      ]
    },
    {
      key: 'administration',
      label: 'Administration',
      icon: Settings,
      path: '/crm/administration',
      items: [
        { path: '/crm/users', label: 'Users & Roles', icon: UserCog },
        { path: '/crm/audit', label: 'Audit Logs', icon: Shield },
        { path: '/crm/export', label: 'Data Export', icon: FolderDown },
        { path: '/crm/setup', label: 'Settings', icon: Settings },
        { path: '/crm/automation', label: 'Workflow Automation', icon: Zap }
      ]
    }
  ];

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { dashboard: true };
    const activeWs = workspaces.find(ws => 
      ws.items.some(item => {
        const basePath = item.path.split('?')[0];
        if (item.path.includes('?')) {
          return location === basePath && window.location.search.includes(item.path.split('?')[1]);
        }
        return location === basePath && !window.location.search.includes('view=chart');
      })
    );
    if (activeWs) {
      initial[activeWs.key] = true;
    }
    return initial;
  });

  useEffect(() => {
    const activeWs = workspaces.find(ws => 
      ws.items.some(item => {
        const basePath = item.path.split('?')[0];
        if (item.path.includes('?')) {
          return location === basePath && window.location.search.includes(item.path.split('?')[1]);
        }
        return location === basePath && !window.location.search.includes('view=chart');
      })
    );
    if (activeWs) {
      setExpandedWorkspaces(prev => ({ ...prev, [activeWs.key]: true }));
    }
  }, [location]);

  // --- IDLE TIMEOUT AND SESSION REVOCATION WATCHER ---
  useEffect(() => {
    const logged = isLoggedIn();
    if (!logged) return;

    const email = localStorage.getItem('userEmail') || '';
    const currentSessionId = localStorage.getItem('currentSessionId');

    // 1. Setup Idle Timeout Watcher
    const handleIdleTimeout = async () => {
      notify('warning', 'Session Expired', 'Your session has expired due to inactivity (30 minutes idle limit).');
      await logout();
      setLocation('/admin');
    };
    startIdleTimeoutWatcher(handleIdleTimeout);

    // 2. Setup Revocation check: Poll active session list existence to support immediate remote revocation
    const interval = setInterval(async () => {
      if (email && currentSessionId) {
        const sessions = getActiveSessions(email);
        const exists = sessions.some(s => s.id === currentSessionId);
        if (!exists) {
          notify('error', 'Session Revoked', 'Your session has been terminated remotely.');
          await logout();
          setLocation('/admin');
        }
      }
    }, 5000);

    return () => {
      stopIdleTimeoutWatcher();
      clearInterval(interval);
    };
  }, [location, setLocation]);

  // Centralized auth guard and administrator/role path protection with strict runtime validation:
  useEffect(() => {
    const logged = isLoggedIn();
    if (!logged) {
      setLocation('/admin');
      return;
    }

    const loadAndVerify = async () => {
      // Force redirect to Admin Login if live DB mode is active but lacks a valid auth token
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          console.warn('[Security Guard] Configured for live database but lacks a valid authentication token. Redirecting to Admin Login.');
          await logout().catch(() => {});
          setLocation('/admin');
          return;
        }
      }

      const valid = await validateSession();
      if (!valid) {
        setLocation('/admin');
        return;
      }

      const mode = localStorage.getItem('crmAuthMode');
      const cachedRole = localStorage.getItem('userRole');
      let fetchedRole: string | null = null;

      if (mode === 'dev' || !isSupabaseConfigured) {
        fetchedRole = cachedRole;
      } else {
        try {
          const sessionRes = await supabase.auth.getSession();
          const userObj = sessionRes.data?.session?.user;
          if (userObj) {
            // Query Supabase 'users' table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', userObj.id)
              .maybeSingle();

            if (!userError && userData?.role) {
              fetchedRole = userData.role;
            } else {
              // Fallback to 'staff_roles' table
              let { data: staffData, error: staffError } = await supabase
                .from('staff_roles')
                .select('role, status')
                .eq('user_id', userObj.id)
                .maybeSingle();

              if (staffError && (staffError.message?.includes('status') || staffError.code === '42703')) {
                const { data: fallbackData, error: fallbackError } = await supabase
                  .from('staff_roles')
                  .select('role')
                  .eq('user_id', userObj.id)
                  .maybeSingle();
                if (!fallbackError && fallbackData) {
                  staffData = { ...fallbackData, status: 'Active' };
                  staffError = null;
                }
              }

              if (!staffError && staffData) {
                if (staffData.status === 'Inactive') {
                  console.error("Access Denied: Account is deactivated.");
                  setRoleLookupFailed(true);
                  setRoleLookupError("Access Denied: Your account has been deactivated. Please contact your administrator.");
                  logout().catch(() => {});
                  setLocation('/admin');
                  return;
                }
                fetchedRole = staffData.role;
              }
            }
          }
        } catch (err: any) {
          console.error("Error fetching dynamic user role from Supabase:", err);
        }
      }

      // If we are in 'supabase' mode, we MUST NOT trust cachedRole — we only trust fresh fetchedRole from database queries!
      const rawRole = ((mode === 'dev') ? (fetchedRole || cachedRole) : fetchedRole) || '';
      const activeRole = rawRole.toLowerCase().trim();
      const validRoles = ['admin', 'doctor', 'receptionist', 'assistant', 'staff'];
      const isValidRole = activeRole && validRoles.includes(activeRole);

      if (!isValidRole) {
        const errorMsg = `Access Denied: Role lookup failed or unauthorized role. Value: "${activeRole || 'undefined'}".`;
        console.error(errorMsg);
        setRoleLookupFailed(true);
        setRoleLookupError(`Access Denied: Your account role was not found in the database. Please contact an administrator.`);
        if (mode === 'supabase') {
          logout().catch(() => {});
        }
        setSessionChecked(true);
        return;
      }

      const sanitizedRole = activeRole === 'staff' ? 'receptionist' : activeRole;
      setDynamicRole(sanitizedRole);
      localStorage.setItem('userRole', sanitizedRole);

      // Strict role-based protection for sensitive routes is handled centrally via hasAccessDenied check
      setRoleLookupFailed(false);
      setSessionChecked(true);
    };

    loadAndVerify();
  }, [location, setLocation, admin, roleName]);

  const handleLogout = async () => {
    await logout();
    setLocation('/admin');
  };

  // Database Connection Unavailable Guard for Production/Live Database Mode
  const isLiveDbMode = localStorage.getItem('crmAuthMode') === 'supabase' || (!localStorage.getItem('crmAuthMode') && isSupabaseConfigured);
  const isDbUnavailable = isLiveDbMode && (!isSupabaseConfigured || dbHealth.status === 'OFFLINE' || dbHealth.status === 'AUTH_EXPIRED');

  if (isDbUnavailable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-900/50 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
          <CloudOff size={32} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Database Connection Unavailable</h1>
        <p className="text-slate-400 text-xs max-w-md leading-relaxed mb-6">
          Sri Chaitanya Multispeciality Dental CRM is operating in Production Database mode, but cannot confirm a connection to the Supabase database engine. To protect patient data integrity and prevent un-persisted records, operational CRM forms have been safely paused.
        </p>

        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={async () => {
              setCheckingHealth(true);
              const newHealth = await checkDbHealthNow();
              setCheckingHealth(false);
              if (newHealth.status === 'CONNECTED') {
                notify('success', 'Database Reconnected', 'Live Supabase connection restored.');
              } else {
                notify('error', 'Connection Failed', newHealth.message || 'Still unable to reach database.');
              }
            }}
            disabled={checkingHealth}
            className="w-full h-11 rounded-xl text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: '#0f766e' }}
          >
            {checkingHealth ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {checkingHealth ? 'Checking Connection...' : 'Retry Connection'}
          </button>

          {(isAdmin() || (roleName || '').toLowerCase() === 'admin' || (roleName || '').toLowerCase() === 'clinic_owner') && (
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Settings size={13} /> {showTechDetails ? 'Hide Technical Details' : 'Technical Details (Admin Only)'}
            </button>
          )}

          {showTechDetails && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left text-[11px] font-mono text-slate-300 space-y-1.5 animate-fadeIn">
              <p><span className="text-slate-500">Status:</span> <span className="text-amber-400 font-bold">{dbHealth.status}</span></p>
              <p><span className="text-slate-500">Configured:</span> {isSupabaseConfigured ? 'Yes (URL & Anon Key detected)' : 'No (Missing/Placeholder keys)'}</p>
              <p className="break-all"><span className="text-slate-500">Last Message:</span> {dbHealth.message || 'None'}</p>
              <p><span className="text-slate-500">Checked At:</span> {new Date(dbHealth.lastChecked).toLocaleTimeString()}</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition text-xs font-semibold cursor-pointer"
          >
            Log Out Session
          </button>
        </div>
      </div>
    );
  }

  // If role lookup failed completely, prevent further rendering and show secure Access Denied UI
  if (roleLookupFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <Shield size={32} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-6">
          {roleLookupError || 'Your account lookup failed or your account has not been assigned a valid permission role. Please log out and sign in with authorized credentials.'}
        </p>
        <div className="space-y-2 w-full max-w-xs">
          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-xl text-white font-semibold text-xs active:scale-95 transition-all"
            style={{ backgroundColor: '#dc2626' }}
          >
            Log Out Session
          </button>
          <a
            href="/admin"
            className="block py-2 text-xs font-semibold text-slate-500 hover:text-slate-350 transition"
          >
            Go Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  // Don't render CRM shell until session is confirmed valid
  if (!isLoggedIn() || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter navigation items dynamically based on active CRM staff roles
  const activeRole = dynamicRole || roleName;
  const roleLower = (activeRole || '').toLowerCase().trim();

  // Determine allowed paths for the current role
  const getNavItemsForRole = (role: string) => {
    return allNavItems.filter(item => hasAccessToRoute(item.path, role));
  };

  const navItems = getNavItemsForRole(roleLower);

  const isWorkspaceActive = (wsKey: string) => {
    const ws = workspaces.find(w => w.key === wsKey);
    if (!ws) return false;
    return ws.items.some(item => {
      const basePath = item.path.split('?')[0];
      if (item.path.includes('?')) {
        return location === basePath && window.location.search.includes(item.path.split('?')[1]);
      }
      return location === basePath && !window.location.search.includes('view=chart');
    });
  };

  const currentNav = allNavItems.find(item => {
    const basePath = item.path.split('?')[0];
    if (item.path.includes('?')) {
      return location === basePath && window.location.search.includes(item.path.split('?')[1]);
    }
    return location === basePath && !window.location.search.includes('view=chart');
  }) || allNavItems.find(item => location.startsWith(item.path.split('?')[0]));

  // Access check for restricted admin-only / doctor-only paths
  const checkHasAccess = (path: string, role: string): boolean => {
    return hasAccessToRoute(path, role);
  };

  const hasAccessDenied = sessionChecked && !checkHasAccess(location, roleLower);

  // Nice role label helper
  const formatRoleLabel = (role: string) => {
    if (role === 'clinic_owner') return 'Clinic Owner';
    if (role === 'admin') return 'Admin Role';
    if (role === 'doctor') return 'Doctor Role';
    if (role === 'receptionist') return 'Receptionist';
    if (role === 'assistant') return 'Assistant';
    if (role === 'lab_technician') return 'Lab Technician';
    if (role === 'accountant') return 'Accountant';
    return role.replace('_', ' ').toUpperCase();
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'clinic_owner') return 'bg-amber-950 border border-amber-800 text-amber-400';
    if (role === 'admin') return 'bg-teal-950 border border-teal-800 text-teal-400';
    if (role === 'doctor') return 'bg-indigo-950 border border-indigo-800 text-indigo-400';
    if (role === 'receptionist') return 'bg-blue-950 border border-blue-800 text-blue-400';
    if (role === 'lab_technician') return 'bg-purple-950 border border-purple-800 text-purple-400';
    if (role === 'accountant') return 'bg-emerald-950 border border-emerald-800 text-emerald-400';
    return 'bg-slate-800 border border-slate-700 text-slate-300';
  };

  const getRoleHeaderStyle = (role: string) => {
    if (role === 'clinic_owner') return 'bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-350 border border-amber-100 dark:border-amber-900/50';
    if (role === 'admin') return 'bg-teal-50 dark:bg-teal-950/45 text-teal-700 dark:text-teal-350 border border-teal-100 dark:border-teal-900/50';
    if (role === 'doctor') return 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-350 border border-indigo-100 dark:border-indigo-900/50';
    if (role === 'receptionist') return 'bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-350 border border-blue-100 dark:border-blue-900/50';
    if (role === 'lab_technician') return 'bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-350 border border-purple-100 dark:border-purple-900/50';
    if (role === 'accountant') return 'bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900/50';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar matching screenshot */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
          <Link href="/crm/dashboard" className="cursor-pointer">
            <DentalLogo size={18} textColor="text-[#0F6E6E] dark:text-[#14B8A6]" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#94A3B8] hover:text-[#0F6E6E] transition"
          >
            <ChevronRight className="rotate-180 text-[#94A3B8]" size={16} />
          </button>
        </div>

        {/* Sidebar menu list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <nav className="space-y-1.5">
            {workspaces.map((ws) => {
              const allowedItems = ws.items.filter(item => hasAccessToRoute(item.path, roleLower));
              if (allowedItems.length === 0) return null;

              const isExpanded = !!expandedWorkspaces[ws.key];
              const isActive = isWorkspaceActive(ws.key);
              const Icon = ws.icon;

              return (
                <div key={ws.key} className="space-y-1">
                  {/* Workspace Header */}
                  <div
                    onClick={() => {
                      setExpandedWorkspaces(prev => ({ ...prev, [ws.key]: !prev[ws.key] }));
                      if (location !== ws.path) {
                        setLocation(ws.path);
                      }
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all select-none cursor-pointer duration-150 group
                      ${isActive
                        ? 'bg-teal-500/10 text-teal-850 dark:text-teal-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={14} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'} />
                      <span className="truncate">{ws.label}</span>
                    </div>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>

                  {/* Expanded Sub-items */}
                  {isExpanded && (
                    <div className="pl-4 ml-3 border-l border-slate-200 dark:border-slate-800 space-y-1.5 py-1">
                      {allowedItems.map((item) => {
                        const isItemActive = item.path.includes('?')
                          ? location === item.path.split('?')[0] && window.location.search.includes(item.path.split('?')[1])
                          : location === item.path && !window.location.search.includes('view=chart');
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[11px] font-medium tracking-wide transition-all select-none cursor-pointer duration-150
                              ${isItemActive
                                ? 'bg-[#0F6E6E] text-white font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-[#F3F4F6]/75 dark:hover:bg-slate-800/50 hover:text-[#111827] dark:hover:text-white'
                              }`}
                          >
                            <ItemIcon size={12} className={isItemActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* FAVORITES */}
          {favorites.length > 0 && (
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800">
              <p className="px-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Star size={10} className="text-amber-505 fill-amber-500 shrink-0" />
                Pinned Favorites
              </p>
              <div className="space-y-1">
                {favorites.map(path => {
                  const matched = allNavItems.find(n => n.path === path);
                  if (!matched || !hasAccessToRoute(matched.path, roleLower)) return null;
                  const Icon = matched.icon;
                  const isActive = location === path.split('?')[0];
                  return (
                    <div key={path} className="flex items-center group justify-between gap-1">
                      <Link
                        href={path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex-1 flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-medium transition-all select-none cursor-pointer duration-150
                          ${isActive 
                            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold' 
                            : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <Icon size={12} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
                        <span className="truncate">{matched.label}</span>
                      </Link>
                      <button 
                        onClick={() => toggleFavorite(path)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition shrink-0 cursor-pointer"
                        title="Unpin Favorite"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECENT ITEMS */}
          {recentItems.length > 0 && (
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800">
              <p className="px-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={10} className="text-slate-400 shrink-0" />
                Recently Opened
              </p>
              <div className="space-y-1">
                {recentItems.map(item => {
                  const matched = allNavItems.find(n => n.path === item.path);
                  if (!matched || !hasAccessToRoute(matched.path, roleLower)) return null;
                  const Icon = matched.icon;
                  const isActive = location === item.path.split('?')[0];
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-medium transition-all select-none cursor-pointer duration-150
                        ${isActive 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        }`}
                    >
                      <Icon size={12} className="text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Supabase Status Banner */}
        <div className="px-4 py-3 mx-4 mb-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/65 dark:bg-slate-900/40 font-semibold text-[11px] space-y-1.5 select-none">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="uppercase text-[9px] tracking-wider font-bold">DATABASE SYNC</span>
            <div className="flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                !isOnline ? 'bg-red-500' :
                isGlobalSyncing ? 'bg-amber-500 animate-pulse' :
                'bg-emerald-500'
              }`} />
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
                {!isOnline ? 'OFFLINE' : isGlobalSyncing ? 'SYNCING' : 'SECURE'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('crm-force-sync'));
              notify('success', 'Sync Initiated', 'Manual synchronization query completed.');
            }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200/60 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-350 transition active:scale-[0.98] cursor-pointer"
            title="Click to force fetch absolute latest records from Supabase"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {!isOnline ? (
                <CloudOff size={13} className="text-red-500 shrink-0" />
              ) : isGlobalSyncing ? (
                <Cloud size={13} className="text-amber-500 shrink-0 animate-bounce" />
              ) : (
                <Cloud size={13} className="text-emerald-500 shrink-0" />
              )}
              <span className="truncate font-sans font-black text-[10px]">
                {!isOnline ? 'No Cloud Connection' : isGlobalSyncing ? 'Syncing Tables...' : 'Supabase Active'}
              </span>
            </div>
            <RefreshCw size={10} className={`text-slate-400 self-center shrink-0 ${isGlobalSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Precise Red-bordered Logout Button */}
        <div className="p-4 border-t border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#E74C3C] text-[#E74C3C] hover:bg-[#E74C3C]/5 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <LogOut size={13} className="text-[#E74C3C]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-805 transition"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-slate-800 dark:text-white font-semibold text-base">{currentNav?.label ?? 'Dashboard'}</h1>
                {currentNav && !currentNav.path.includes('-care') && !currentNav.path.includes('-clinical') && !currentNav.path.includes('-finance') && !currentNav.path.includes('-operations') && !currentNav.path.includes('-administration') && (
                  <button
                    onClick={() => toggleFavorite(currentNav.path)}
                    className="p-1 rounded-full text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
                    title={favorites.includes(currentNav.path) ? "Remove from Favorites" : "Pin to Favorites"}
                  >
                    <Star
                      size={13}
                      className={favorites.includes(currentNav.path) ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-650"}
                    />
                  </button>
                )}
                {!isOnline && (
                  <span className="inline-flex items-center gap-1.5 px-2.0 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800 animate-pulse shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Offline Mode (Cached View)
                  </span>
                )}
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] hidden sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* GLOBAL SEARCH BAR */}
          <div className="flex-1 max-w-[200px] sm:max-w-xs md:max-w-md mx-1 sm:mx-4 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient profiles & workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/75 dark:hover:bg-slate-700/75 focus:bg-white dark:focus:bg-slate-900 border border-slate-250/70 dark:border-slate-750 text-[11px] rounded-lg pl-8 pr-7 py-2.0 outline-none focus:border-teal-500 dark:focus:border-teal-400 text-slate-800 dark:text-slate-100 transition-all font-medium py-1.5"
              />
              {searchLoading ? (
                <RefreshCw size={11} className="absolute right-2.5 top-2.5 text-slate-400 animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-650"
                >
                  <X size={11} />
                </button>
              ) : null}
            </div>

            {/* Live Dropdown Options overlay */}
            {searchQuery.trim().length >= 2 && (
              <>
                {/* Backdrop to close search overlay on mobile tap outside */}
                <div 
                  className="fixed inset-0 z-40 sm:hidden" 
                  onClick={() => setSearchQuery('')}
                />
                
                <div className="fixed sm:absolute top-[52px] sm:top-full left-3 right-3 sm:left-0 sm:right-auto sm:w-[380px] md:w-[440px] mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl shadow-2xl overflow-hidden z-50 text-xs text-slate-800 dark:text-slate-100">
                  {searchLoading ? (
                    <div className="p-4 text-center text-slate-400 font-medium flex items-center justify-center gap-1.5">
                      <Loader2 size={13} className="animate-spin text-teal-600" />
                      Searching Sri Chaitanya...
                    </div>
                  ) : (searchResults.patients.length === 0 && searchResults.appointments.length === 0) ? (
                    <div className="p-4 text-center text-slate-400 font-medium">
                      No clinical records found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Patient list matched */}
                      {searchResults.patients.length > 0 && (
                        <div className="p-2.5">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-1.5">Matched Patient Profiles</p>
                          <div className="space-y-1">
                            {searchResults.patients.map((p) => (
                              <div
                                key={`p-${p.id}`}
                                onClick={() => {
                                  setSelectedPatientDetail(p);
                                  setSearchQuery('');
                                }}
                                className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0"
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                                    {p.name}
                                  </p>
                                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    {(p.patient_code || p.patient_id) && (
                                      <span className="font-bold text-teal-700 dark:text-teal-400">
                                        {p.patient_code || `SDC-${String(p.patient_id).padStart(4, '0')}`}
                                      </span>
                                    )}
                                    {(p.patient_code || p.patient_id) && p.phone && <span className="text-slate-300 dark:text-slate-600">•</span>}
                                    {p.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone size={10} className="text-slate-400 shrink-0" /> {p.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 uppercase shrink-0">
                                  {p.patient_status || 'Registered'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Appointment list matched */}
                      {searchResults.appointments.length > 0 && (
                        <div className="p-2.5">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-1.5">Matched Appointments</p>
                          <div className="space-y-1">
                            {searchResults.appointments.map((appt) => (
                              <div
                                key={`appt-${appt.id}`}
                                onClick={() => {
                                  setSelectedAppointmentDetail(appt);
                                  setSearchQuery('');
                                }}
                                className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0"
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                                    {appt.name || 'Unknown Patient'}
                                  </p>
                                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="font-semibold text-teal-700 dark:text-teal-400">{appt.treatment || 'Consultation'}</span>
                                    <span>•</span>
                                    <span className="font-mono">{appt.next_visit}</span>
                                    {appt.appointment_time && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono">{appt.appointment_time}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase shrink-0 ${
                                  appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                  appt.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                  appt.status === 'In Treatment' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                                  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}>
                                  {appt.status || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Persistent Quick Actions Trigger */}
            <button
              onClick={() => setIsQuickActionsOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full border border-amber-400 transition select-none cursor-pointer shadow-sm active:scale-95 duration-100"
              title="Persistent Workspace Quick Actions"
            >
              <Zap size={11} className="text-white shrink-0 fill-white animate-[pulse_2s_infinite]" />
              <span className="hidden md:inline">Quick Actions</span>
            </button>

            {/* Multi-Clinic Branch Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-slate-200 transition">
              <Building2 size={12} className="text-teal-600 shrink-0" />
              <select
                value={activeBranch}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveBranch(val);
                  localStorage.setItem('crm_active_branch', val);
                  window.dispatchEvent(new CustomEvent('crm-branch-changed', { detail: { branch: val } }));
                }}
                className="bg-transparent border-none p-0 m-0 text-[11px] font-black focus:ring-0 focus:outline-none cursor-pointer outline-none"
              >
                <option value="Vijayawada HQ">Vijayawada HQ</option>
                <option value="Guntur Branch">Guntur Branch</option>
                <option value="Hyderabad Clinic">Hyderabad Clinic</option>
              </select>
            </div>

            {/* Unified Interactive Auto-Sync Tool & Live Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-150 text-slate-705 px-2.5 py-1 rounded-full border border-slate-200 transition-all duration-200 select-none">
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('crm-force-sync'));
                  notify('success', 'Page Synchronized', 'Initiating full-page cloud database refresh.');
                }}
                className="flex items-center gap-1 hover:bg-white active:scale-95 px-1.5 py-0.5 rounded transition"
                title="Force Synchronize Page Now"
              >
                <RefreshCw size={11} className={`${isGlobalSyncing ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
                <span className="text-[10px] uppercase tracking-wide font-extrabold hidden md:inline">Reload Data</span>
              </button>
              <div className="h-3 w-[1px] bg-slate-300 self-center" />
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Auto:</span>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAutoSyncInterval(val);
                    localStorage.setItem('crm_auto_sync_interval', val);
                  }}
                  className="bg-transparent border-none p-0 m-0 text-[10px] font-black focus:ring-0 focus:outline-none cursor-pointer outline-none text-slate-800"
                >
                  <option value="Off">Off</option>
                  <option value="10s">10s</option>
                  <option value="30s">30s</option>
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                </select>
              </div>
              {autoSyncInterval !== 'Off' ? (
                <div className="text-[9px] text-teal-600 font-mono pl-0.5 hidden lg:inline tracking-tight">
                  ({secondsRemaining}s)
                </div>
              ) : (
                <div className="text-[9px] text-slate-400 font-mono pl-0.5 hidden lg:inline tracking-tight">
                  (man)
                </div>
              )}
            </div>

            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full
              ${getRoleHeaderStyle(activeRole)}`}>
              <Shield size={11} />
              {formatRoleLabel(activeRole)}
            </div>

            {/* Visual Theme Switcher */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="crm-theme-switcher"
            >
              {isDarkMode ? <Sun size={13} className="text-amber-500 animate-[spin_10s_linear_infinite]" /> : <Moon size={13} className="text-indigo-600" />}
            </button>
            
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-350 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-100/50 dark:border-emerald-900/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6 relative z-10">
          {hasAccessDenied ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center bg-white border border-slate-200 rounded-2xl shadow-sm animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4 shadow-sm animate-bounce">
                <Shield size={26} />
              </div>
              <h2 className="text-slate-800 font-extrabold text-lg tracking-tight">Access Denied</h2>
              <p className="text-slate-500 text-xs mt-2 max-w-sm leading-relaxed font-semibold">
                You do not have the required administrative permissions to access this module. Please contact your system administrator if you require authorization.
              </p>
              <div className="mt-6">
                <Link
                  href="/crm/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0F6E6E] hover:bg-[#0c5959] active:scale-95 transition-all shadow-sm"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Dynamic Mobile Bottom Navigation Bar styled as a premium modern floating dock */}
        <nav id="crm-mobile-bottom-nav" className="lg:hidden fixed bottom-3 left-4 right-4 h-15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-around px-2 z-40 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {(() => {
            const mobileItems = [
              { path: '/crm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { path: '/crm/appointments', label: 'Appointments', icon: Calendar },
              { path: '/crm/patients', label: 'Patients', icon: Users },
            ].filter(item => hasAccessToRoute(item.path, roleLower));
            return mobileItems.map(item => {
              const isActive = location.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 h-full select-none cursor-pointer text-center transition-all ${
                    isActive ? 'text-[#0F6E6E] dark:text-[#14B8A6] font-bold font-sans' : 'text-[#6B7280] dark:text-slate-400 active:scale-95'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#0F6E6E]/10 dark:bg-[#14B8A6]/10 scale-105' : 'bg-transparent'}`}>
                    <Icon size={16} className={isActive ? 'text-[#0F6E6E] dark:text-[#14B8A6]' : 'text-[#6B7280] dark:text-slate-400'} />
                  </div>
                  <span className="text-[9px] tracking-wide font-semibold">{item.label}</span>
                </Link>
              );
            });
          })()}
        </nav>
      </div>

      {/* GLOBAL PATIENT CARE PROFILE OVERLAY */}
      {selectedPatientDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-150 shadow-2xl overflow-hidden animate-in zoom-in duration-200 text-slate-800">
            <div className="bg-teal-750 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <UserCircle size={18} />
                <h4 className="font-bold text-xs uppercase tracking-wider">Patient Care Profile</h4>
              </div>
              <button onClick={() => setSelectedPatientDetail(null)} className="text-white/80 hover:text-white transition cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-850 font-extrabold text-lg flex items-center justify-center shadow-xs">
                  {selectedPatientDetail.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedPatientDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold text-slate-500 font-mono">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{selectedPatientDetail.patient_code || 'No Code'}</span>
                    <span>·</span>
                    <span>{selectedPatientDetail.gender || 'Unspecified'}</span>
                    <span>·</span>
                    <span>Age: {selectedPatientDetail.age || '--'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Phone Record</span>
                  <p className="flex items-center gap-1.5 text-slate-700 font-mono">
                    <Phone size={13} className="text-slate-400" />
                    {selectedPatientDetail.phone || 'Not provided'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Email Address</span>
                  <p className="flex items-center gap-1.5 text-slate-700 truncate">
                    <Mail size={13} className="text-slate-400" />
                    {selectedPatientDetail.email || 'Not provided'}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Home/Billing Location</span>
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <MapPin size={13} className="text-slate-400" />
                    {selectedPatientDetail.location || 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Active Treatment Summary</span>
                <p className="text-slate-700 italic">
                  {selectedPatientDetail.treatment_summary || 'No active treatments documented in dental history.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-[10.5px] font-semibold">
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-150">
                  <span className="block text-[9px] uppercase font-bold text-slate-450">Last Visited Date</span>
                  <span className="text-slate-700 font-mono">{selectedPatientDetail.last_visit_date || 'No registry record'}</span>
                </div>
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-150">
                  <span className="block text-[9px] uppercase font-bold text-slate-450">Next Scheduled Date</span>
                  <span className="text-slate-700 font-mono">{selectedPatientDetail.next_visit_date || 'None scheduled'}</span>
                </div>
              </div>

              {selectedPatientDetail.notes && (
                <div className="text-xs bg-amber-50/55 border border-amber-100 p-3 rounded-lg">
                  <strong className="text-amber-800 block text-[10px] uppercase tracking-wider mb-0.5">Clinical/Staff Notes</strong>
                  <p className="text-slate-655 italic leading-relaxed">{selectedPatientDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Sri Chaitanya Dental Care</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientDetail(null);
                  setLocation('/crm/patients');
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border-0"
              >
                Manage Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL APPOINTMENT WORKFLOW OVERLAY */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-155 shadow-2xl overflow-hidden animate-in zoom-in duration-200 text-slate-800">
            <div className="bg-indigo-755 p-4 flex items-center justify-between text-white" style={{ backgroundColor: '#4338ca' }}>
              <div className="flex items-center gap-2">
                <CalendarPlus size={18} />
                <h4 className="font-bold text-xs uppercase tracking-wider">Scheduled Appointment Workflow</h4>
              </div>
              <button onClick={() => setSelectedAppointmentDetail(null)} className="text-white/80 hover:text-white transition cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedAppointmentDetail.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">Contact: {selectedAppointmentDetail.phone}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  selectedAppointmentDetail.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                  selectedAppointmentDetail.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                  selectedAppointmentDetail.status === 'In Treatment' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {selectedAppointmentDetail.status || 'Pending'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Scheduled Date</span>
                  <p className="flex items-center gap-1.5 text-slate-800 font-mono">
                    <Calendar size={13} className="text-indigo-500" />
                    {selectedAppointmentDetail.next_visit || '--'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Meeting Slot</span>
                  <p className="flex items-center gap-1.5 text-slate-800 font-mono">
                    <Clock size={13} className="text-indigo-500" />
                    {selectedAppointmentDetail.appointment_time || '--'}
                  </p>
                </div>
                <div className="space-y-1 col-span-2 pt-1 border-t border-slate-105">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Treatment Procedure</span>
                  <p className="text-slate-800 font-semibold text-xs leading-relaxed flex items-center gap-1.5">
                    <Stethoscope size={13} className="text-indigo-500" />
                    {selectedAppointmentDetail.treatment || 'Consultation / Evaluation'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[10px] font-bold uppercase tracking-wider text-center">
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2">
                  <span className="block text-[8px] text-slate-450">Visit Count</span>
                  <span className="text-slate-800 font-mono text-xs">{selectedAppointmentDetail.visit_count ?? 1}</span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2">
                  <span className="block text-[8px] text-slate-450">Session Type</span>
                  <span className="text-slate-800 text-xs">{selectedAppointmentDetail.visit_type || 'New'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2">
                  <span className="block text-[8px] text-slate-450">Mode of Payment</span>
                  <span className="text-slate-800 text-xs">{selectedAppointmentDetail.payment_mode || 'Cash'}</span>
                </div>
              </div>

              {(selectedAppointmentDetail.amount_paid > 0 || selectedAppointmentDetail.balance_amount > 0) && (
                <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Total Cleared Payment</span>
                    <p className="text-emerald-700 font-extrabold text-sm">₹{Number(selectedAppointmentDetail.amount_paid || 0).toLocaleString('en-IN')}</p>
                  </div>
                  {selectedAppointmentDetail.balance_amount > 0 && (
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Outstanding Balance</span>
                      <p className="text-rose-600 font-extrabold text-sm">₹{Number(selectedAppointmentDetail.balance_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedAppointmentDetail.notes && (
                <div className="text-xs bg-slate-50 border border-slate-150 p-3 rounded-lg">
                  <strong className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Scheduler notes</strong>
                  <p className="text-slate-600 italic leading-relaxed">{selectedAppointmentDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-405 uppercase font-mono">Sri Chaitanya DentalCare</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedAppointmentDetail(null);
                  setLocation('/crm/appointments');
                }}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border-0"
                style={{ backgroundColor: '#4338ca' }}
              >
                Go to Appointments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PERSISTENT QUICK ACTIONS DIALOG */}
      {isQuickActionsOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 text-slate-800">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-amber-500 p-4 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <Zap size={18} className="fill-white" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Enterprise Quick Actions Desk</h4>
              </div>
              <button 
                onClick={() => setIsQuickActionsOpen(false)} 
                className="text-white hover:text-amber-100 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Layout Body */}
            <div className="flex flex-col md:flex-row h-[420px] md:h-[450px]">
              {/* Sidebar Menu - Left */}
              <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 p-3 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setActiveQuickAction('register')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left w-full cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                    ${activeQuickAction === 'register'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <Users size={14} className={activeQuickAction === 'register' ? 'text-white' : ''} />
                  <span>Register Patient</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveQuickAction('book')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left w-full cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                    ${activeQuickAction === 'book'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <Calendar size={14} className={activeQuickAction === 'book' ? 'text-white' : ''} />
                  <span>Book Appointment</span>
                </button>

                {canViewFinancials(roleLower as any) && (
                  <button
                    type="button"
                    onClick={() => setActiveQuickAction('expense')}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left w-full cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                      ${activeQuickAction === 'expense'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    <DollarSign size={14} className={activeQuickAction === 'expense' ? 'text-white' : ''} />
                    <span>Record Expense</span>
                  </button>
                )}

                <div className="hidden md:block pt-4 border-t border-slate-200/60 dark:border-slate-800/60 mt-4 space-y-2">
                  <span className="px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Workspace Shortcuts</span>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => { setIsQuickActionsOpen(false); setLocation('/crm/clinical?tab=sop-manuals'); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-[10.5px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText size={11} className="text-slate-400" />
                      Browse Medical SOPs
                    </button>
                    {canViewFinancials(roleLower as any) && (
                      <button
                        type="button"
                        onClick={() => { setIsQuickActionsOpen(false); setLocation('/crm/billing'); }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[10.5px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard size={11} className="text-slate-400" />
                        Invoicing / Ledger
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Area - Right */}
              <div className="flex-1 p-5 overflow-y-auto bg-white dark:bg-slate-900">
                {activeQuickAction === 'register' && (
                  <form onSubmit={handleQuickRegisterPatient} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Register New Dental Patient</h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Instantly add a new registered patient record to the centralized CRM system.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Full Patient Name *</label>
                        <input
                          type="text"
                          required
                          value={newPatient.name}
                          onChange={e => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Rama Rao"
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:focus:border-teal-400 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Primary Phone Number *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          value={newPatient.phone}
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw.includes('+') || raw.includes(' ') || raw.includes('-') || raw.length > 10) {
                              const norm = normalizeIndianPhone(raw);
                              setNewPatient(prev => ({ ...prev, phone: norm.slice(0, 10) }));
                            } else {
                              const digits = raw.replace(/\D/g, '').slice(0, 10);
                              setNewPatient(prev => ({ ...prev, phone: digits }));
                            }
                          }}
                          placeholder="10-digit mobile number"
                          className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:focus:border-teal-400 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={newPatient.dob}
                          onChange={e => {
                            const dobVal = e.target.value;
                            const calculatedAge = dobVal ? calculateAgeFromDOB(dobVal) : null;
                            setNewPatient(prev => ({
                              ...prev,
                              dob: dobVal,
                              age: calculatedAge !== null ? calculatedAge.toString() : prev.age
                            }));
                          }}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:focus:border-teal-400 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                          Age {newPatient.dob ? '(Calculated)' : '(Years)'}
                        </label>
                        <input
                          type="number"
                          value={newPatient.age}
                          disabled={!!newPatient.dob}
                          onChange={e => setNewPatient(prev => ({ ...prev, age: e.target.value }))}
                          placeholder="e.g. 42"
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:focus:border-teal-400 dark:bg-slate-850 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Gender *</label>
                        <select
                          required
                          value={newPatient.gender}
                          onChange={e => setNewPatient(prev => ({ ...prev, gender: e.target.value }))}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-teal-500 dark:focus:border-teal-400 dark:bg-slate-850 dark:text-white"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <LocationSelect
                          value={newPatient.location}
                          onChange={val => setNewPatient(prev => ({ ...prev, location: val }))}
                          required
                          label="Location *"
                          placeholder="Search area or location"
                        />
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsQuickActionsOpen(false)}
                        className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition cursor-pointer shadow-sm border-0"
                      >
                        Register Patient
                      </button>
                    </div>
                  </form>
                )}

                {activeQuickAction === 'book' && (
                  <form onSubmit={handleQuickBookAppointment} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Book Dental Appointment</h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Directly reserve a treatment calendar slot for clinical consultations.</p>
                    </div>

                    {/* Search Registered Patient Autocomplete / Selected Patient Card */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                        SEARCH REGISTERED PATIENT *
                      </label>

                      {selectedQuickApptPatient ? (
                        /* Selected Patient Compact Card */
                        <div className="p-3 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {selectedQuickApptPatient.name}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                                {selectedQuickApptPatient.patient_code || `SDC-${selectedQuickApptPatient.id}`}
                              </span>
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-600 dark:text-slate-400">
                              Patient ID: <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedQuickApptPatient.patient_code || `SDC-${selectedQuickApptPatient.id}`}</strong> • Phone: <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedQuickApptPatient.phone || 'N/A'}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuickApptPatient(null);
                              setQuickPatientSearchQuery('');
                              setShowQuickPatientDropdown(true);
                              searchQuickPatients('');
                            }}
                            className="shrink-0 px-2.5 py-1 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-white dark:bg-slate-750 border border-indigo-200 dark:border-slate-650 rounded-lg transition cursor-pointer shadow-2xs"
                          >
                            Change Patient
                          </button>
                        </div>
                      ) : (
                        /* Autocomplete Combobox */
                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={quickPatientSearchQuery}
                              onFocus={() => {
                                setShowQuickPatientDropdown(true);
                                searchQuickPatients(quickPatientSearchQuery);
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuickPatientSearchQuery(val);
                                setShowQuickPatientDropdown(true);
                                searchQuickPatients(val);
                              }}
                              placeholder="Search by Patient Name, Phone (+91...), or Patient ID (SDC-1024)..."
                              className="w-full text-xs font-semibold pl-8 pr-8 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-450 dark:bg-slate-850 dark:text-white"
                            />
                            {isSearchingQuickPatients && (
                              <Loader2 size={14} className="absolute right-3 text-slate-400 animate-spin" />
                            )}
                          </div>

                          {/* Search Dropdown Results */}
                          {showQuickPatientDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                              {quickPatientSearchResults.length > 0 ? (
                                quickPatientSearchResults.map((pt) => (
                                  <button
                                    key={pt.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedQuickApptPatient(pt);
                                      setShowQuickPatientDropdown(false);
                                    }}
                                    className="w-full text-left p-2.5 hover:bg-indigo-50/70 dark:hover:bg-slate-800 transition cursor-pointer flex flex-col gap-0.5"
                                  >
                                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                                      {pt.name}
                                    </div>
                                    <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {pt.patient_code || `SDC-${pt.id}`}
                                      </span>
                                      <span>•</span>
                                      <span>{pt.phone || 'No phone recorded'}</span>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                                  {isSearchingQuickPatients ? 'Searching patients...' : 'No registered patient found matching search.'}
                                </div>
                              )}

                              {/* Register New Patient Action */}
                              <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsRegisteringForAppt(true);
                                    setActiveQuickAction('register');
                                    setShowQuickPatientDropdown(false);
                                    if (quickPatientSearchQuery) {
                                      setNewPatient((prev) => ({ ...prev, name: quickPatientSearchQuery }));
                                    }
                                  }}
                                  className="w-full py-1.5 px-3 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:bg-teal-950/40 rounded-lg transition flex items-center justify-center gap-1.5 border border-dashed border-teal-300 dark:border-teal-800 cursor-pointer"
                                >
                                  <UserPlus size={13} />
                                  <span>+ Register New Patient</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <ReasonForVisitSelect
                        value={newAppt.treatment}
                        onChange={val => setNewAppt(prev => ({ ...prev, treatment: val }))}
                        required
                        label="Procedure / Reason for Visit *"
                        className="col-span-2"
                      />

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Scheduled Date *</label>
                        <input
                          type="date"
                          required
                          value={newAppt.next_visit}
                          onChange={e => setNewAppt(prev => ({ ...prev, next_visit: e.target.value }))}
                          className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-450 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Timeslot Slot *</label>
                        <select
                          required
                          value={newAppt.appointment_time}
                          onChange={e => setNewAppt(prev => ({ ...prev, appointment_time: e.target.value }))}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-450 dark:bg-slate-850 dark:text-white"
                        >
                          <option value="">Select appointment time</option>
                          {APPOINTMENT_TIME_OPTIONS.map(timeOption => (
                            <option key={timeOption} value={timeOption}>{timeOption}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsQuickActionsOpen(false)}
                        className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedQuickApptPatient || !newAppt.treatment || !newAppt.next_visit || !newAppt.appointment_time || isBookingQuickAppt}
                        className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-sm border-0 flex items-center gap-1.5"
                      >
                        {isBookingQuickAppt ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Booking...</span>
                          </>
                        ) : (
                          <span>Book Appointment</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeQuickAction === 'expense' && (
                  <form onSubmit={handleQuickLogExpense} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Record Cash Expense</h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Directly record operational or clinical supplies cash outflows.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Expense Description / Title *</label>
                        <input
                          type="text"
                          required
                          value={newExpense.title}
                          onChange={e => setNewExpense(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Sterile Gloves & Syringes Batch"
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-rose-500 dark:focus:border-rose-450 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Amount In ₹ *</label>
                        <input
                          type="number"
                          required
                          value={newExpense.amount}
                          onChange={e => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="e.g. 1500"
                          className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-rose-500 dark:focus:border-rose-450 dark:bg-slate-850 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Expense Category</label>
                        <select
                          value={newExpense.category}
                          onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-rose-500 dark:focus:border-rose-450 dark:bg-slate-850 dark:text-white"
                        >
                          <option value="Clinical Supplies">Clinical Supplies</option>
                          <option value="Lab Charges">Lab Charges</option>
                          <option value="Staff Refreshments">Staff Refreshments</option>
                          <option value="Marketing Ads">Marketing Ads</option>
                          <option value="Utility Repairs">Utility Repairs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Date Logged</label>
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={e => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-rose-500 dark:focus:border-rose-450 dark:bg-slate-850 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsQuickActionsOpen(false)}
                        className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-sm border-0"
                      >
                        Log Expense
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Duplicate Patient Warning Modal for Quick Actions */}
      <DuplicatePatientWarningModal
        isOpen={showQuickDuplicateModal}
        existingPatients={quickDuplicatePatients}
        phoneNumber={newPatient.phone}
        onUseExisting={(patient) => {
          setShowQuickDuplicateModal(false);
          if (isRegisteringForAppt) {
            setSelectedQuickApptPatient(patient);
            setActiveQuickAction('book');
            setIsRegisteringForAppt(false);
            notify('info', 'Patient Selected', `"${patient.name}" selected.`);
          } else {
            setIsQuickActionsOpen(false);
            notify('info', 'Existing Patient Selected', `Selected "${patient.name}" (${patient.patient_code || 'Record'}).`);
          }
        }}
        onContinueAsNew={() => {
          setShowQuickDuplicateModal(false);
          handleQuickRegisterPatient(null, true);
        }}
        onClose={() => {
          setShowQuickDuplicateModal(false);
        }}
      />
    </div>
  );
}
