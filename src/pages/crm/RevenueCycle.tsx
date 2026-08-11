import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useNotification } from '../../components/NotificationProvider';
import { usePatientsRealtime } from '../../hooks/useRealtimeHooks';
import { isAdmin, isLoggedIn } from '../../lib/auth';
import {
  getPaymentPlans,
  createPaymentPlan,
  getInstallments,
  payInstallment,
  getInsuranceProviders,
  getInsuranceClaims,
  submitClaim,
  updatePreAuthStatus,
  settleClaim,
  getTreatmentPackages,
  getPackageUtilizations,
  recordPackageUtilization,
  getRevenueDashboardMetrics,
  getPaymentFollowups,
  contactFollowup,
  createManualFollowup,
  compilePatientFinancialProfile,
  PaymentPlan,
  PaymentInstallment,
  InsuranceProvider,
  InsuranceClaim,
  CorporateAccount,
  TreatmentPackage,
  PackageUtilization,
  PaymentFollowup,
  PatientFinancialProfile,
  RevenueDashboardMetrics
} from '../../services/revenueCycleService';
import {
  DollarSign,
  CreditCard,
  Plus,
  Search,
  Building2,
  Shield,
  FileCheck,
  Bell,
  Percent,
  ArrowUpRight,
  Activity,
  TrendingUp,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Briefcase,
  Users,
  Upload,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function RevenueCycle() {
  const [, setLocation] = useLocation();
  const { notify } = useNotification();
  const admin = isAdmin();

  // Auth Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      setLocation('/admin');
    }
  }, [setLocation]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans' | 'claims' | 'packages' | 'corporate' | 'followups' | 'profile'>('dashboard');

  // Real-time Patient List from CRM Context Hook
  const { patients: hookPatients } = usePatientsRealtime();
  const [patientsList, setPatientsList] = useState<any[]>([]);
  useEffect(() => {
    if (hookPatients) {
      setPatientsList([...hookPatients].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    }
  }, [hookPatients]);

  // Core Module States
  const [metrics, setMetrics] = useState<RevenueDashboardMetrics | null>(null);
  const [paymentPlansList, setPaymentPlansList] = useState<PaymentPlan[]>([]);
  const [installmentsList, setInstallmentsList] = useState<PaymentInstallment[]>([]);
  const [claimsList, setClaimsList] = useState<InsuranceClaim[]>([]);
  const [providersList, setProvidersList] = useState<InsuranceProvider[]>([]);
  const [packagesList, setPackagesList] = useState<TreatmentPackage[]>([]);
  const [utilizationsList, setUtilizationsList] = useState<PackageUtilization[]>([]);
  const [followupsList, setFollowupsList] = useState<PaymentFollowup[]>([]);
  const [corporateList, setCorporateList] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded Items States
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Search Filter States
  const [planSearch, setPlanSearch] = useState('');
  const [claimSearch, setClaimSearch] = useState('');
  const [followupSearch, setFollowupSearch] = useState('');
  const [patientProfileId, setPatientProfileId] = useState<number | null>(null);
  const [patientProfileData, setPatientProfileData] = useState<PatientFinancialProfile | null>(null);

  // Modals & Action Forms States
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showSubmitClaimModal, setShowSubmitClaimModal] = useState(false);
  const [showSettleClaimModal, setShowSettleClaimModal] = useState(false);
  const [showRecordUtilModal, setShowRecordUtilModal] = useState(false);
  const [showCreateFollowupModal, setShowCreateFollowupModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Selected Target for Modals
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [selectedFollowupId, setSelectedFollowupId] = useState<string>('');

  // -------------------------------------------------------------
  // FORM STATES
  // -------------------------------------------------------------
  // 1. New Payment Plan Form
  const [planForm, setPlanForm] = useState({
    patient_id: 0,
    patient_name: '',
    treatment_type: 'Root Canal Therapy',
    total_amount: 15000,
    plan_type: 'Installments' as PaymentPlan['plan_type'],
    total_installments: 3
  });
  const [planPatientSearch, setPlanPatientSearch] = useState('');
  const [showPlanPatientsDropdown, setShowPlanPatientsDropdown] = useState(false);

  // 2. New Claim Form
  const [claimForm, setClaimForm] = useState({
    patient_id: 0,
    patient_name: '',
    provider_id: '',
    policy_number: '',
    coverage_details: 'Standard Surgical Flap & Prosthetics (Co-pay 10%)',
    claim_amount: 25000,
    claim_number: '',
    notes: '',
    documents: [] as string[]
  });
  const [claimPatientSearch, setClaimPatientSearch] = useState('');
  const [showClaimPatientsDropdown, setShowClaimPatientsDropdown] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // 3. Settle Claim Form
  const [settleForm, setSettleForm] = useState({
    approved_amount: 20000,
    rejected_amount: 5000,
    status: 'Payment Received' as InsuranceClaim['claim_status'],
    notes: 'Claim processed. Settlement check #889981 received and deposited.'
  });

  // 4. Record Package Utilization Form
  const [utilForm, setUtilForm] = useState({
    package_id: 'pkg-1',
    patient_id: 0,
    patient_name: '',
    procedure_name: 'Zirconia Crown Placement',
    doctor_name: 'Dr. Chaitanya Bolla'
  });
  const [utilPatientSearch, setUtilPatientSearch] = useState('');
  const [showUtilPatientsDropdown, setShowUtilPatientsDropdown] = useState(false);

  // 5. Manual Followup Form
  const [followupForm, setFollowupForm] = useState({
    patient_id: 0,
    patient_name: '',
    phone: '',
    type: 'Pending Payment' as PaymentFollowup['type'],
    amount: 5000,
    due_date: new Date().toISOString().split('T')[0],
    notes: 'Out-of-pocket balance on composite restorations. Need to coordinate.'
  });
  const [followupPatientSearch, setFollowupPatientSearch] = useState('');
  const [showFollowupPatientsDropdown, setShowFollowupPatientsDropdown] = useState(false);

  // 6. Contact Reminder Form
  const [contactLog, setContactLog] = useState('Called patient. Left a detailed voicemail requesting return call about overdue installment.');

  // Load all initial financial module data
  const loadData = async () => {
    setLoading(true);
    try {
      const dbMetrics = await getRevenueDashboardMetrics();
      const dbPlans = await getPaymentPlans();
      const dbInsts = await getInstallments();
      const dbClaims = await getInsuranceClaims();
      const dbProviders = await getInsuranceProviders();
      const dbPackages = await getTreatmentPackages();
      const dbUtils = await getPackageUtilizations();
      const dbFollowups = await getPaymentFollowups();

      // Retrieve Corporate list
      const corporateData = JSON.parse(localStorage.getItem('srichaitanya_corporate_accounts') || '[]');
      setCorporateList(corporateData);

      setMetrics(dbMetrics);
      setPaymentPlansList(dbPlans);
      setInstallmentsList(dbInsts);
      setClaimsList(dbClaims);
      setProvidersList(dbProviders);
      setPackagesList(dbPackages);
      setUtilizationsList(dbUtils);
      setFollowupsList(dbFollowups);

      // Default claim form provider if lists exist
      if (dbProviders.length > 0 && !claimForm.provider_id) {
        setClaimForm(prev => ({ ...prev, provider_id: dbProviders[0].id }));
      }
    } catch (e) {
      notify('error', 'Error', 'Failed to retrieve revenue dashboard items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync profile data when patient changes
  useEffect(() => {
    if (patientProfileId) {
      compilePatientFinancialProfile(patientProfileId).then(data => {
        setPatientProfileData(data);
      });
    } else {
      setPatientProfileData(null);
    }
  }, [patientProfileId, paymentPlansList, installmentsList, claimsList]);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleCreatePaymentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.patient_id) {
      notify('error', 'Validation Error', 'Please select a valid registered patient.');
      return;
    }
    try {
      await createPaymentPlan({
        patient_id: planForm.patient_id,
        patient_name: planForm.patient_name,
        treatment_type: planForm.treatment_type,
        total_amount: planForm.total_amount,
        plan_type: planForm.plan_type
      }, planForm.total_installments);

      notify('success', 'Plan Created Successfully', `Automated schedules of ${planForm.total_installments} installments generated for ${planForm.patient_name}.`);
      setShowCreatePlanModal(false);
      // Reset
      setPlanForm({
        patient_id: 0,
        patient_name: '',
        treatment_type: 'Root Canal Therapy',
        total_amount: 15000,
        plan_type: 'Installments',
        total_installments: 3
      });
      setPlanPatientSearch('');
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to save payment plan.');
    }
  };

  const handlePayInstallment = async (installmentId: string, mode: string) => {
    try {
      const paid = await payInstallment(installmentId, mode);
      notify('success', 'Payment Received', `Installment of ₹${paid.amount.toLocaleString()} was logged under receipt mode: ${mode}.`);
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to submit installment payment.');
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.patient_id) {
      notify('error', 'Validation Error', 'Please select a patient.');
      return;
    }
    const provider = providersList.find(p => p.id === claimForm.provider_id);
    if (!provider) {
      notify('error', 'Validation Error', 'Please select a valid insurance/TPA provider.');
      return;
    }

    try {
      const docs = claimForm.documents;
      if (uploadedFileName) {
        docs.push(uploadedFileName);
      }

      await submitClaim({
        patient_id: claimForm.patient_id,
        patient_name: claimForm.patient_name,
        provider_id: claimForm.provider_id,
        provider_name: provider.name,
        policy_number: claimForm.policy_number,
        coverage_details: claimForm.coverage_details,
        claim_amount: claimForm.claim_amount,
        claim_number: claimForm.claim_number || `CLM-${Date.now().toString().slice(-6).toUpperCase()}`,
        notes: claimForm.notes,
        documents: docs
      });

      notify('success', 'Pre-Auth & Claim Submitted', `Claim submitted to ${provider.name}. Policy logged & automated collection reminders queued.`);
      setShowSubmitClaimModal(false);
      // Reset
      setClaimForm({
        patient_id: 0,
        patient_name: '',
        provider_id: providersList[0]?.id || '',
        policy_number: '',
        coverage_details: 'Standard Surgical Flap & Prosthetics (Co-pay 10%)',
        claim_amount: 25000,
        claim_number: '',
        notes: '',
        documents: []
      });
      setClaimPatientSearch('');
      setUploadedFileName('');
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to submit claim.');
    }
  };

  const handleUpdatePreAuth = async (claimId: string, status: InsuranceClaim['pre_auth_status']) => {
    try {
      await updatePreAuthStatus(claimId, status);
      notify('success', 'Status Updated', `Pre-authorization status updated to ${status}.`);
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to update pre-authorization status.');
    }
  };

  const handleSettleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settleClaim(
        selectedClaimId,
        settleForm.status,
        settleForm.approved_amount,
        settleForm.rejected_amount,
        settleForm.notes
      );
      notify('success', 'Claim Settle Logged', `Settle processed successfully. Approved Amount: ₹${settleForm.approved_amount.toLocaleString()}.`);
      setShowSettleClaimModal(false);
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to settle insurance claim.');
    }
  };

  const handleRecordUtilization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utilForm.patient_id) {
      notify('error', 'Validation Error', 'Please select a registered patient.');
      return;
    }
    const pkg = packagesList.find(p => p.id === utilForm.package_id);
    if (!pkg) return;

    try {
      await recordPackageUtilization({
        package_id: utilForm.package_id,
        package_name: pkg.name,
        patient_id: utilForm.patient_id,
        patient_name: utilForm.patient_name,
        procedure_name: utilForm.procedure_name,
        doctor_name: utilForm.doctor_name
      });

      notify('success', 'Utilization Logged', `Recorded ${utilForm.procedure_name} under ${pkg.name} for ${utilForm.patient_name}.`);
      setShowRecordUtilModal(false);
      setUtilPatientSearch('');
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to record package utilization.');
    }
  };

  const handleManualFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupForm.patient_id) {
      notify('error', 'Validation Error', 'Please select a patient.');
      return;
    }
    try {
      await createManualFollowup({
        patient_id: followupForm.patient_id,
        patient_name: followupForm.patient_name,
        phone: followupForm.phone || '9845112233',
        type: followupForm.type,
        amount: followupForm.amount,
        due_date: followupForm.due_date,
        notes: followupForm.notes
      });

      notify('success', 'Reminder Added', `Manual recall/remittance reminder saved for ${followupForm.patient_name}.`);
      setShowCreateFollowupModal(false);
      setFollowupPatientSearch('');
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to save follow-up.');
    }
  };

  const handleContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contactFollowup(selectedFollowupId, contactLog);
      notify('success', 'Follow-up Call Logged', 'Contact event successfully compiled into client followup history.');
      setShowContactModal(false);
      setContactLog('Called patient. Left a detailed voicemail requesting return call about overdue installment.');
      loadData();
    } catch (err) {
      notify('error', 'Error', 'Failed to save contact log.');
    }
  };

  // Filter computations
  const filteredPlans = paymentPlansList.filter(p =>
    p.patient_name.toLowerCase().includes(planSearch.toLowerCase()) ||
    p.treatment_type.toLowerCase().includes(planSearch.toLowerCase()) ||
    p.plan_type.toLowerCase().includes(planSearch.toLowerCase())
  );

  const filteredClaims = claimsList.filter(c =>
    c.patient_name.toLowerCase().includes(claimSearch.toLowerCase()) ||
    c.provider_name.toLowerCase().includes(claimSearch.toLowerCase()) ||
    (c.policy_number || '').toLowerCase().includes(claimSearch.toLowerCase()) ||
    (c.claim_number || '').toLowerCase().includes(claimSearch.toLowerCase())
  );

  const filteredFollowups = followupsList.filter(f =>
    f.patient_name.toLowerCase().includes(followupSearch.toLowerCase()) ||
    f.type.toLowerCase().includes(followupSearch.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-100 rounded-full">CRM v2.5</span>
            <span className="text-slate-400 text-xs">|</span>
            <span className="text-xs text-slate-500 font-medium">Sri Chaitanya Multispeciality Dental</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Dental Revenue Cycle & Insurance Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage patient payment schedules, insurance pre-authorizations, corporate accounts, package logs, and collections follow-ups.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-white text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setShowCreatePlanModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Payment Plan
          </button>
          <button
            onClick={() => {
              setShowSubmitClaimModal(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-medium transition shadow-sm text-sm"
          >
            <Shield className="w-4 h-4" />
            New Insurance Claim
          </button>
        </div>
      </div>

      {/* METRIC CARD BAR (Module 6 & 8) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Collections Today</span>
            <div className="p-1 bg-green-50 rounded-lg text-green-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{metrics?.collectionsToday.toLocaleString() || '12,450'}
          </p>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            +8.3% vs yesterday
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
            <div className="p-1 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{metrics?.outstandingTotal.toLocaleString() || '95,000'}
          </p>
          <p className="text-xs text-amber-600 font-medium mt-1">
            Overdue accounts active
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Insurance Pending</span>
            <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{metrics?.insurancePending.toLocaleString() || '48,000'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Awaiting desk audits
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Corporate Balance</span>
            <div className="p-1 bg-violet-50 rounded-lg text-violet-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{metrics?.corporateOutstanding.toLocaleString() || '100,000'}
          </p>
          <p className="text-xs text-violet-600 font-medium mt-1">
            Ledger consolidated
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue Alerts</span>
            <div className="p-1 bg-red-50 rounded-lg text-red-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {metrics?.overdueAccountsCount || '1'} Accounts
          </p>
          <p className="text-xs text-red-600 font-medium mt-1">
            Require follow-up calls
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Efficiency Index</span>
            <div className="p-1 bg-teal-50 rounded-lg text-teal-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {metrics?.collectionEfficiency || '78'}%
          </p>
          <p className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Target meets 85% limit
          </p>
        </div>
      </div>

      {/* CORE TAB NAVIGATION */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          RCM Analytics
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'plans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Plans & EMIs
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'claims'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          Insurance & Pre-Auth Claims
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'packages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Packages Workspace
        </button>
        <button
          onClick={() => setActiveTab('corporate')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'corporate'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Corporate Ledger
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'followups'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          Collections & Follow-ups
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Financial Profiles Audit
        </button>
      </div>

      {/* LOADING SPINNER CONTAINER */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Compiling real-time ledgers, wait a moment...</p>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: DASHBOARD & ANALYTICS (Module 6 & 9)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-blue-500" />
                Collections vs. Billing Monthly Trend (Module 9)
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                    <Legend iconType="circle" />
                    <Bar dataKey="billing" name="Total Bill Amount" fill="#94a3b8" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collections" name="Total Cash Collected" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Percent className="w-4.5 h-4.5 text-teal-500" />
                  Collection Efficiency Distribution
                </h2>
                <div className="relative flex justify-center py-6">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-teal-600">{metrics?.collectionEfficiency}%</p>
                    <p className="text-xs text-slate-400 font-medium uppercase mt-1 tracking-wider">Total Ledger Recovery</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Paid Receivables</span>
                  <span className="font-semibold text-slate-800">₹91,250</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full" style={{ width: `${metrics?.collectionEfficiency}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pending Outstanding</span>
                  <span>₹25,000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Aging Outstanding Balances
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Overdue &gt; 30 Days</p>
                    <p className="text-base font-bold text-slate-900 mt-1">₹17,500</p>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 font-bold text-[10px] rounded-full uppercase">High Risk</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Pending 15-30 Days</p>
                    <p className="text-base font-bold text-slate-900 mt-1">₹32,500</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full uppercase">Recall Active</span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Current &lt; 15 Days</p>
                    <p className="text-base font-bold text-slate-900 mt-1">₹45,000</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full uppercase">Normal</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Upcoming Installment Reminders (This Week)
                </h3>
                <p className="text-xs text-slate-500 mb-4">The following payment plan EMIs are arriving within the next 7 calendar days:</p>
                <div className="space-y-2">
                  {installmentsList.filter(i => i.status === 'Pending').slice(0, 3).map((inst, index) => (
                    <div key={index} className="flex justify-between items-center text-xs p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900">Installment #{inst.installment_no}</p>
                        <p className="text-slate-400 text-[10px]">Due Date: {inst.due_date}</p>
                      </div>
                      <span className="font-bold text-blue-600">₹{inst.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: PAYMENT PLANS & EMIS (Module 1 & Automation)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search plan or treatment..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredPlans.length}</span> active structured accounts
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id;
              const relatedInstallments = installmentsList.filter(i => i.plan_id === plan.id);

              return (
                <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                  <div
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{plan.patient_name}</h3>
                        <span className="text-slate-300">|</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                          {plan.plan_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{plan.treatment_type}</p>
                    </div>

                    <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total Value</p>
                        <p className="font-bold text-slate-900 text-sm">₹{plan.total_amount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Next Due Date</p>
                        <p className="text-xs font-semibold text-slate-800">{plan.next_due_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                          plan.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          plan.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Installments Table Details */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-5">
                      <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Installment Breakdown Logs</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400">
                              <th className="pb-2 font-medium">Installment #</th>
                              <th className="pb-2 font-medium">Due Date</th>
                              <th className="pb-2 font-medium">Amount</th>
                              <th className="pb-2 font-medium">Paid Date</th>
                              <th className="pb-2 font-medium">Method</th>
                              <th className="pb-2 font-medium">Status</th>
                              <th className="pb-2 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatedInstallments.map((inst) => (
                              <tr key={inst.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-2.5 font-medium text-slate-700">Installment #{inst.installment_no}</td>
                                <td className="py-2.5 text-slate-500">{inst.due_date}</td>
                                <td className="py-2.5 font-semibold text-slate-900">₹{inst.amount.toLocaleString()}</td>
                                <td className="py-2.5 text-slate-500">{inst.payment_date || '-'}</td>
                                <td className="py-2.5 font-medium text-slate-600">{inst.payment_mode || '-'}</td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 font-semibold text-[10px] rounded uppercase ${
                                    inst.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                    inst.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {inst.status}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  {inst.status !== 'Paid' ? (
                                    <div className="inline-flex gap-1">
                                      <button
                                        onClick={() => handlePayInstallment(inst.id, 'UPI')}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition"
                                      >
                                        UPI
                                      </button>
                                      <button
                                        onClick={() => handlePayInstallment(inst.id, 'Cash')}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition"
                                      >
                                        Cash
                                      </button>
                                      <button
                                        onClick={() => handlePayInstallment(inst.id, 'Card')}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition"
                                      >
                                        Card
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-green-600 font-medium inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" /> Paid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: INSURANCE CLAIMS & PRE-AUTH (Modules 2, 3, 4)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search patient, claim #, provider..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500">
              Active Claims Pool Size: <span className="font-semibold text-slate-900">{filteredClaims.length}</span> claims
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{claim.patient_name}</h3>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                      {claim.provider_name}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-mono text-slate-400">Policy: {claim.policy_number}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Claim Number: </span>
                      <span className="font-semibold text-slate-700">{claim.claim_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Claim Amount: </span>
                      <span className="font-semibold text-slate-700">₹{claim.claim_amount.toLocaleString()}</span>
                    </div>
                    {claim.approved_amount && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Approved Amount: </span>
                        <span className="font-bold text-green-600">₹{claim.approved_amount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 italic">Notes: {claim.notes}</p>

                  {/* Claim Supporting Documents List (Module 3) */}
                  {claim.documents && claim.documents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {claim.documents.map((doc, dIdx) => (
                        <span key={dIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium rounded hover:bg-slate-100 cursor-pointer">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {doc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 self-stretch md:self-auto">
                  <div className="flex flex-col gap-2">
                    {/* Pre-Auth status badge (Module 3) */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Pre-Auth:</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        claim.pre_auth_status === 'Approved' ? 'bg-green-100 text-green-800' :
                        claim.pre_auth_status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {claim.pre_auth_status}
                      </span>
                    </div>

                    {/* Claim status badge (Module 4) */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Claim:</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        claim.claim_status === 'Payment Received' ? 'bg-green-100 text-green-800' :
                        claim.claim_status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {claim.claim_status}
                      </span>
                    </div>
                  </div>

                  {/* Actions to authorize and settle */}
                  <div className="flex flex-col gap-1.5">
                    {claim.pre_auth_status === 'Pending' || claim.pre_auth_status === 'Submitted' ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleUpdatePreAuth(claim.id, 'Approved')}
                          className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded font-bold text-[10px] uppercase transition"
                        >
                          Approve Pre-Auth
                        </button>
                        <button
                          onClick={() => handleUpdatePreAuth(claim.id, 'Rejected')}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[10px] uppercase transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {claim.claim_status !== 'Payment Received' && claim.claim_status !== 'Rejected' ? (
                      <button
                        onClick={() => {
                          setSelectedClaimId(claim.id);
                          setSettleForm({
                            approved_amount: claim.claim_amount,
                            rejected_amount: 0,
                            status: 'Payment Received',
                            notes: `Claim settled fully by ${claim.provider_name}. Reference checks cleared.`
                          });
                          setShowSettleClaimModal(true);
                        }}
                        className="w-full text-center px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] uppercase transition shadow-sm"
                      >
                        Log Settle Check
                      </button>
                    ) : (
                      <span className="text-green-600 font-semibold text-xs flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-4 h-4" /> Settle Done
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: PACKAGES WORKSPACE (Module 5)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Preventive & Restorative Treatment Packages</h2>
              <p className="text-xs text-slate-400 mt-0.5">Allow patients to leverage prepaid multithreaded packages for specialized wellness programs.</p>
            </div>
            <button
              onClick={() => setShowRecordUtilModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Log Package Use
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packagesList.map((pkg) => {
              const countUsed = utilizationsList.filter(u => u.package_id === pkg.id).length;
              return (
                <div key={pkg.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-900 text-sm">{pkg.name}</h3>
                      <span className="font-bold text-blue-600 text-sm">₹{pkg.total_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pkg.procedures_included.map((proc, pidx) => (
                        <span key={pidx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded">
                          {proc}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 italic">Max Utilizations allowed: {pkg.max_utilizations} times</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Log Utilizations</span>
                      <span className="font-semibold text-slate-800">{countUsed} / {pkg.max_utilizations} Used</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${(countUsed / pkg.max_utilizations) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Package Utilization Log Registry */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Patient Package Utilization Ledger History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Selected Package</th>
                    <th className="pb-2">Procedure Executed</th>
                    <th className="pb-2">Consulting Doctor</th>
                    <th className="pb-2">Log Date</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationsList.map((ut) => (
                    <tr key={ut.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 font-semibold text-slate-900">{ut.patient_name}</td>
                      <td className="py-2.5 font-medium text-slate-600">{ut.package_name}</td>
                      <td className="py-2.5 text-slate-700">{ut.procedure_name}</td>
                      <td className="py-2.5 text-slate-500">{ut.doctor_name || '-'}</td>
                      <td className="py-2.5 text-slate-400">{ut.utilized_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: CORPORATE LEDGER (Module 2)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'corporate' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Corporate Companies & TPA Outstanding Ledger</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track group coverage, bulk bill clearance rates, and accrued outstanding totals for empanelled organizations.</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Corporate Outstanding</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">₹{metrics?.corporateOutstanding.toLocaleString() || '1,00,000'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {corporateList.map((corp) => (
              <div key={corp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{corp.company_name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">TPA Partner: {corp.tpa_name || 'Direct empanelled'}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 rounded">Empanelled</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 text-xs">
                    <div>
                      <p className="text-slate-400">Bulk Billed</p>
                      <p className="font-semibold text-slate-700 mt-0.5">₹{corp.total_billed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Collected</p>
                      <p className="font-semibold text-green-600 mt-0.5">₹{corp.total_collected.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Admin Contact:</span>
                    <span className="font-medium text-slate-600">{corp.contact_person} ({corp.phone})</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Outstanding Remainder</span>
                  <span className={`font-bold text-sm ${corp.outstanding > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    ₹{corp.outstanding.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: FOLLOW-UPS & ALERTS (Module 7 & Automation)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search patient, reminder type..."
                value={followupSearch}
                onChange={(e) => setFollowupSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <button
              onClick={() => setShowCreateFollowupModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Manual Remittance Recall
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredFollowups.map((fol) => (
              <div key={fol.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{fol.patient_name}</h3>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-500 font-semibold">{fol.phone}</span>
                    <span className="text-slate-300">|</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded uppercase">
                      {fol.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Due Amount: <strong className="font-semibold text-slate-700">₹{fol.amount.toLocaleString()}</strong></span>
                    <span>Due Date: <strong className="font-semibold text-slate-700">{fol.due_date}</strong></span>
                    <span>Times Contacted: <strong className="font-semibold text-slate-700">{fol.reminder_count} times</strong></span>
                  </div>
                  <p className="text-xs text-slate-400 italic">Call Logs: {fol.notes}</p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  {fol.status !== 'Paid' ? (
                    <>
                      <button
                        onClick={() => {
                          setSelectedFollowupId(fol.id);
                          setShowContactModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold transition"
                      >
                        Log Outbound Call
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await contactFollowup(fol.id, 'Payment collected & ledger cleared.');
                            // Mark paid in followups
                            const item = followupsList.find(f => f.id === fol.id);
                            if (item) item.status = 'Paid';
                            notify('success', 'Resolved', 'Account cleared.');
                            loadData();
                          } catch (err) {}
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition shadow-sm"
                      >
                        Resolve Paid
                      </button>
                    </>
                  ) : (
                    <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4.5 h-4.5" /> Cleared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB content: PATIENT FINANCIAL PROFILE EXPLORER (Module 8)
          ------------------------------------------------------------- */}
      {!loading && activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Lookup Patient Clinical Finance Audit</h2>
            <p className="text-xs text-slate-400 mb-4">Select any registered patient to view total clinical value, amount cleared, insurance coverage, corporate subsidies, and full transaction history.</p>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <select
                onChange={(e) => setPatientProfileId(Number(e.target.value) || null)}
                value={patientProfileId || ''}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">-- Click to Select Patient --</option>
                {patientsList.map((pat) => (
                  <option key={pat.id} value={pat.id}>{pat.name} ({pat.phone})</option>
                ))}
              </select>
            </div>
          </div>

          {patientProfileData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                {/* Financial Summary Cards */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Patient Balance Sheet Summary</h3>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Treatment Cost</span>
                      <span className="font-bold text-slate-800">₹{patientProfileData.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Loyalty Discount Given</span>
                      <span className="font-semibold text-green-600">- ₹{patientProfileData.discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Collected Amount</span>
                      <span className="font-bold text-slate-800">₹{patientProfileData.collected.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center text-sm">
                      <span className="text-slate-900 font-semibold">Net Outstanding Balance</span>
                      <span className={`font-bold ${patientProfileData.outstanding > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        ₹{patientProfileData.outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Third Party Subsidies</h3>
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Insurance Portion Coverage</span>
                      <span className="font-semibold text-slate-800">₹{patientProfileData.insurancePortion.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Corporate Portion Support</span>
                      <span className="font-semibold text-slate-800">₹{patientProfileData.corporatePortion.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider text-[11px] font-mono">Patient Receipt History Logs</h3>
                  <div className="overflow-y-auto max-h-[300px]">
                    <div className="space-y-2">
                      {patientProfileData.paymentHistory.map((hist, hIdx) => (
                        <div key={hIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">{hist.reference}</span>
                              <span className="px-2 py-0.5 text-[9px] bg-slate-200 text-slate-600 rounded font-medium">{hist.mode}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{hist.notes}</p>
                            <p className="text-[10px] text-slate-400">Receipt date: {hist.date}</p>
                          </div>
                          <span className="font-bold text-slate-900 text-sm">₹{hist.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {patientProfileData.paymentHistory.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">No historical transaction entries logged on file.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!patientProfileData && (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Pick a patient from the selector above to audit financial summaries</p>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1: CREATE PAYMENT PLAN
          ------------------------------------------------------------- */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Create New Payment Plan Schedule</h2>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreatePaymentPlan} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Patient *</label>
                <input
                  type="text"
                  placeholder="Type name to search registered patient..."
                  value={planPatientSearch}
                  onChange={(e) => {
                    setPlanPatientSearch(e.target.value);
                    setShowPlanPatientsDropdown(true);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                {showPlanPatientsDropdown && planPatientSearch && (
                  <div className="absolute left-0 right-0 max-h-40 bg-white border border-slate-200 mt-1 rounded-lg shadow-lg overflow-y-auto z-10 text-xs">
                    {patientsList
                      .filter(p => p.name.toLowerCase().includes(planPatientSearch.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setPlanForm(prev => ({ ...prev, patient_id: p.id, patient_name: p.name }));
                            setPlanPatientSearch(p.name);
                            setShowPlanPatientsDropdown(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          {p.name} ({p.phone})
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Main Treatment Description</label>
                <input
                  type="text"
                  value={planForm.treatment_type}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, treatment_type: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Fee Amount (₹) *</label>
                <input
                  type="number"
                  value={planForm.total_amount}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Scheduling Mode</label>
                  <select
                    value={planForm.plan_type}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, plan_type: e.target.value as PaymentPlan['plan_type'] }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="Installments">Installments</option>
                    <option value="EMI">EMI</option>
                    <option value="Stage-wise">Stage-wise</option>
                    <option value="Custom">Custom Schedule</option>
                    <option value="Full Payment">Full Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Installments Count *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={planForm.total_installments}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, total_installments: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md mt-2"
              >
                Generate Schedules
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: SUBMIT INSURANCE CLAIM
          ------------------------------------------------------------- */}
      {showSubmitClaimModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Pre-Auth & Claims Submission</h2>
              <button onClick={() => setShowSubmitClaimModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitClaim} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Patient *</label>
                <input
                  type="text"
                  placeholder="Type name to search registered patient..."
                  value={claimPatientSearch}
                  onChange={(e) => {
                    setClaimPatientSearch(e.target.value);
                    setShowClaimPatientsDropdown(true);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                {showClaimPatientsDropdown && claimPatientSearch && (
                  <div className="absolute left-0 right-0 max-h-40 bg-white border border-slate-200 mt-1 rounded-lg shadow-lg overflow-y-auto z-10 text-xs">
                    {patientsList
                      .filter(p => p.name.toLowerCase().includes(claimPatientSearch.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setClaimForm(prev => ({ ...prev, patient_id: p.id, patient_name: p.name }));
                            setClaimPatientSearch(p.name);
                            setShowClaimPatientsDropdown(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          {p.name} ({p.phone})
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Empanelled Provider / Corporate / TPA *</label>
                <select
                  value={claimForm.provider_id}
                  onChange={(e) => setClaimForm(prev => ({ ...prev, provider_id: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                >
                  {providersList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.type}]</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Policy ID Number *</label>
                  <input
                    type="text"
                    required
                    value={claimForm.policy_number}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, policy_number: e.target.value }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Value (₹) *</label>
                  <input
                    type="number"
                    required
                    value={claimForm.claim_amount}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, claim_amount: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pre-Auth Treatment Details</label>
                <input
                  type="text"
                  value={claimForm.coverage_details}
                  onChange={(e) => setClaimForm(prev => ({ ...prev, coverage_details: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Supporting Document Upload Integration (Module 3 / Usability patterns) */}
              <div className="border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
                <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-[11px] font-medium text-slate-600 mt-1">Drag and drop dental x-rays or treatment plans, or click below</p>
                <input
                  type="file"
                  id="claim-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const name = e.target.files?.[0]?.name || '';
                    setUploadedFileName(name);
                    notify('success', 'File Attached', `Document "${name}" attached successfully.`);
                  }}
                />
                <label htmlFor="claim-file-upload" className="inline-block mt-2 px-3 py-1 bg-white hover:bg-slate-50 text-[10px] text-slate-600 border border-slate-200 rounded font-semibold cursor-pointer shadow-xs">
                  {uploadedFileName ? `Attached: ${uploadedFileName}` : 'Select Case Document'}
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md mt-2"
              >
                Submit Pre-Auth & Claim
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 3: SETTLE INSURANCE CLAIM
          ------------------------------------------------------------- */}
      {showSettleClaimModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Process Insurance Settlement Check</h2>
              <button onClick={() => setShowSettleClaimModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSettleClaim} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Approved Payout Amount (₹)</label>
                  <input
                    type="number"
                    value={settleForm.approved_amount}
                    onChange={(e) => setSettleForm(prev => ({ ...prev, approved_amount: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rejected Copay Amount (₹)</label>
                  <input
                    type="number"
                    value={settleForm.rejected_amount}
                    onChange={(e) => setSettleForm(prev => ({ ...prev, rejected_amount: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Resolution Notes</label>
                <textarea
                  rows={3}
                  value={settleForm.notes}
                  onChange={(e) => setSettleForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md"
              >
                Confirm Settlement Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 4: RECORD PACKAGE UTILIZATION
          ------------------------------------------------------------- */}
      {showRecordUtilModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Record Package Utilization Event</h2>
              <button onClick={() => setShowRecordUtilModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRecordUtilization} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Wellness Package *</label>
                <select
                  value={utilForm.package_id}
                  onChange={(e) => setUtilForm(prev => ({ ...prev, package_id: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                >
                  {packagesList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Max: {p.max_utilizations} uses)</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name *</label>
                <input
                  type="text"
                  placeholder="Lookup registered patient..."
                  value={utilPatientSearch}
                  onChange={(e) => {
                    setUtilPatientSearch(e.target.value);
                    setShowUtilPatientsDropdown(true);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                {showUtilPatientsDropdown && utilPatientSearch && (
                  <div className="absolute left-0 right-0 max-h-40 bg-white border border-slate-200 mt-1 rounded-lg shadow-lg overflow-y-auto z-10 text-xs">
                    {patientsList
                      .filter(p => p.name.toLowerCase().includes(utilPatientSearch.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setUtilForm(prev => ({ ...prev, patient_id: p.id, patient_name: p.name }));
                            setUtilPatientSearch(p.name);
                            setShowUtilPatientsDropdown(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          {p.name} ({p.phone})
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure Executed *</label>
                <input
                  type="text"
                  value={utilForm.procedure_name}
                  onChange={(e) => setUtilForm(prev => ({ ...prev, procedure_name: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Consulting Doctor</label>
                <input
                  type="text"
                  value={utilForm.doctor_name}
                  onChange={(e) => setUtilForm(prev => ({ ...prev, doctor_name: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md"
              >
                Log Utilization entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 5: CREATE MANUAL FOLLOWUP REMITTANCE REMINDER
          ------------------------------------------------------------- */}
      {showCreateFollowupModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Add Remittance Recall Reminder</h2>
              <button onClick={() => setShowCreateFollowupModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleManualFollowup} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Patient *</label>
                <input
                  type="text"
                  placeholder="Lookup registered patient..."
                  value={followupPatientSearch}
                  onChange={(e) => {
                    setFollowupPatientSearch(e.target.value);
                    setShowFollowupPatientsDropdown(true);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                />
                {showFollowupPatientsDropdown && followupPatientSearch && (
                  <div className="absolute left-0 right-0 max-h-40 bg-white border border-slate-200 mt-1 rounded-lg shadow-lg overflow-y-auto z-10 text-xs">
                    {patientsList
                      .filter(p => p.name.toLowerCase().includes(followupPatientSearch.toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setFollowupForm(prev => ({ ...prev, patient_id: p.id, patient_name: p.name, phone: p.phone || '9845112233' }));
                            setFollowupPatientSearch(p.name);
                            setShowFollowupPatientsDropdown(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          {p.name} ({p.phone})
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Outstanding Balance (₹) *</label>
                  <input
                    type="number"
                    value={followupForm.amount}
                    onChange={(e) => setFollowupForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Recall Date *</label>
                  <input
                    type="date"
                    value={followupForm.due_date}
                    onChange={(e) => setFollowupForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Recall Focus Type</label>
                <select
                  value={followupForm.type}
                  onChange={(e) => setFollowupForm(prev => ({ ...prev, type: e.target.value as PaymentFollowup['type'] }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                >
                  <option value="Pending Payment">Pending Out-of-Pocket Payment</option>
                  <option value="Installment Due">Overdue Installment Recall</option>
                  <option value="Claim Pending">Claim Audit Follow-up</option>
                  <option value="Corporate Follow-up">Corporate Ledger Subsidy Reconciliation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Note</label>
                <textarea
                  rows={2}
                  value={followupForm.notes}
                  onChange={(e) => setFollowupForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md"
              >
                Schedule Recall Action
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 6: LOG OUTBOUND CALL WITH REMINDER PATIENT
          ------------------------------------------------------------- */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Log Outbound Patient Contact Recall</h2>
              <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleContactLog} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Call Note Log Details</label>
                <textarea
                  rows={3}
                  required
                  value={contactLog}
                  onChange={(e) => setContactLog(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition shadow-md"
              >
                Log Contact Call
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
