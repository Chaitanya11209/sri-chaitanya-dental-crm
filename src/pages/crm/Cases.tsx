import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Layers,
  Activity,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  ClipboardList,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  ChevronRight,
  Printer,
  UserCheck,
  Check,
  User,
  Trash2,
  Lock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  getCases,
  createCase,
  updateCase,
  getCaseDocuments,
  uploadCaseDocument,
  getCaseTimeline,
  addCaseTimelineEvent,
  CaseRecord,
  CaseType,
  CaseStage,
  MultiSpecialtyPlan,
  CaseDocument,
  CaseTimelineEvent
} from '../../services/caseService';
import { getCurrentUser } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function Cases() {
  const { notify } = useNotification();
  const currentUser = getCurrentUser();

  // Primary States
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [timeline, setTimeline] = useState<CaseTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // New Case Modal & Forms
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    title: '',
    patient_id: '',
    patient_name: '',
    case_type: 'Full Mouth Rehabilitation' as CaseType,
    stage: 'Consultation' as CaseStage,
    coordinator_name: 'Suneetha Reddy',
    doctor_name: 'Dr. Durga Bhavani Jupalli',
    assistant_name: 'Ramesh K.',
    lab_name: 'Apex Digital Labs',
    target_completion_date: '',
    estimated_cost: 50000,
    clinical_notes: ''
  });

  // Adding multi-specialty plan row to selected case
  const [showAddPlanRow, setShowAddPlanRow] = useState(false);
  const [newPlanRow, setNewPlanRow] = useState({
    tooth: '18',
    procedure: '',
    specialty: 'General Dentistry',
    status: 'Planned' as any,
    cost: 5000,
    dependency_tooth: ''
  });

  // Document Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    type: 'Consent' as any,
    title: '',
    url: ''
  });

  // Checklist Validation Alert
  const [showChecklistWarning, setShowChecklistWarning] = useState(false);
  const [checklistWarnings, setChecklistWarnings] = useState<string[]>([]);

  // Simulation of Case PDF Review Mode
  const [showPDFReview, setShowPDFReview] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [customPDFNotes, setCustomPDFNotes] = useState('');

  // Active View Tab on Central Case Detail Panel
  const [activeDetailTab, setActiveDetailTab] = useState<'planner' | 'documents' | 'timeline' | 'coordination' | 'finances'>('planner');

  // Load primary dataset
  const loadDataset = async () => {
    try {
      setLoading(true);
      const allCases = await getCases();
      setCases(allCases);
      if (allCases.length > 0) {
        // Retain selected case if possible
        if (selectedCase) {
          const reselect = allCases.find(c => c.id === selectedCase.id);
          if (reselect) {
            setSelectedCase(reselect);
          } else {
            setSelectedCase(allCases[0]);
          }
        } else {
          setSelectedCase(allCases[0]);
        }
      }
    } catch (e) {
      console.error(e);
      notify('error', 'Error', 'Failed to retrieve Case Management registry files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset();
  }, []);

  // Fetch sub-data when selected case changes
  useEffect(() => {
    if (selectedCase) {
      const loadSubData = async () => {
        try {
          const [docs, tl] = await Promise.all([
            getCaseDocuments(selectedCase.id),
            getCaseTimeline(selectedCase.id)
          ]);
          setDocuments(docs);
          setTimeline(tl);
        } catch (e) {
          console.error(e);
        }
      };
      loadSubData();
    }
  }, [selectedCase]);

  // Handle create case
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseData.title || !newCaseData.patient_name || !newCaseData.patient_id) {
      notify('error', 'Incomplete', 'Patient information and Case title are required.');
      return;
    }

    try {
      const freshCase = await createCase({
        patient_id: Number(newCaseData.patient_id),
        patient_name: newCaseData.patient_name,
        title: newCaseData.title,
        case_type: newCaseData.case_type,
        stage: newCaseData.stage,
        coordinator_id: 'coord-1',
        coordinator_name: newCaseData.coordinator_name,
        doctor_id: 'doc-1',
        doctor_name: newCaseData.doctor_name,
        assistant_name: newCaseData.assistant_name,
        lab_name: newCaseData.lab_name,
        target_completion_date: newCaseData.target_completion_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delay_reasons: '',
        plans: [],
        checklist: {
          consent_checked: false,
          images_checked: false,
          billing_checked: false,
          payments_checked: false,
          notes_checked: false,
          rx_checked: false,
          followups_checked: false,
          warranty_checked: false
        },
        finances: {
          id: `fin-${Date.now()}`,
          case_id: '',
          estimated_cost: Number(newCaseData.estimated_cost),
          approved_cost: Number(newCaseData.estimated_cost),
          collected: 0,
          discount: 0,
          lab_cost: 0
        }
      });

      notify('success', 'Case Established', `Case ${freshCase.case_number} registered for ${freshCase.patient_name}.`);
      setShowNewModal(false);
      // Reset form
      setNewCaseData({
        title: '',
        patient_id: '',
        patient_name: '',
        case_type: 'Full Mouth Rehabilitation',
        stage: 'Consultation',
        coordinator_name: 'Suneetha Reddy',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        assistant_name: 'Ramesh K.',
        lab_name: 'Apex Digital Labs',
        target_completion_date: '',
        estimated_cost: 50000,
        clinical_notes: ''
      });
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Add Treatment Row to Case
  const handleAddPlanRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const newPlanItem: MultiSpecialtyPlan = {
      id: `p-${Date.now()}`,
      tooth: newPlanRow.tooth,
      procedure: newPlanRow.procedure || 'Diagnostics / Evaluation',
      specialty: newPlanRow.specialty,
      status: newPlanRow.status,
      cost: Number(newPlanRow.cost),
      dependency_tooth: newPlanRow.dependency_tooth || undefined
    };

    const updatedPlans = [...selectedCase.plans, newPlanItem];
    const newEst = updatedPlans.reduce((sum, p) => sum + (p.cost || 0), 0);

    try {
      await updateCase(selectedCase.id, {
        plans: updatedPlans,
        finances: {
          ...selectedCase.finances,
          estimated_cost: newEst,
          approved_cost: Math.max(selectedCase.finances.approved_cost, newEst)
        }
      });

      // Automatically add to case timeline (Module 7 & 15)
      await addCaseTimelineEvent({
        case_id: selectedCase.id,
        event_type: 'Treatment',
        text: `Added treatment plan: Tooth ${newPlanRow.tooth} - ${newPlanRow.procedure} (${newPlanRow.specialty})`,
        amount: Number(newPlanRow.cost),
        date: new Date().toISOString().split('T')[0]
      });

      notify('success', 'Milestone Appended', `Tooth ${newPlanRow.tooth} added to multi-specialty clinical plan.`);
      setShowAddPlanRow(false);
      setNewPlanRow({
        tooth: '18',
        procedure: '',
        specialty: 'General Dentistry',
        status: 'Planned',
        cost: 5000,
        dependency_tooth: ''
      });
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Update Status of a Treatment Row
  const handleUpdatePlanStatus = async (planId: string, status: any) => {
    if (!selectedCase) return;
    const updatedPlans = selectedCase.plans.map(p => p.id === planId ? { ...p, status } : p);

    try {
      await updateCase(selectedCase.id, { plans: updatedPlans });
      notify('success', 'Plan Status Updated', `Milestone status changed to ${status}.`);
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Delete a Treatment Row
  const handleDeletePlanRow = async (planId: string) => {
    if (!selectedCase) return;
    const updatedPlans = selectedCase.plans.filter(p => p.id !== planId);
    try {
      await updateCase(selectedCase.id, { plans: updatedPlans });
      notify('success', 'Milestone Removed', `Plan item deleted.`);
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Toggle checklist value & evaluate quality score
  const handleChecklistToggle = async (key: keyof typeof selectedCase.checklist) => {
    if (!selectedCase) return;
    const updatedChecklist = {
      ...selectedCase.checklist,
      [key]: !selectedCase.checklist[key]
    };

    try {
      await updateCase(selectedCase.id, { checklist: updatedChecklist });
      loadDataset();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Transition Stage & Trigger Automations (Module 11 Quality Checklist Check)
  const handleStageChange = async (newStage: CaseStage) => {
    if (!selectedCase) return;

    // Quality gate if closing or completing (Module 11)
    if (newStage === 'Completed') {
      const warnings: string[] = [];
      if (!selectedCase.checklist.consent_checked) warnings.push('Patient surgical consent forms have not been signed.');
      if (!selectedCase.checklist.images_checked) warnings.push('Clinical pre/post photography or CBCT scans are not attached.');
      if (selectedCase.finances.collected < selectedCase.finances.approved_cost) {
        warnings.push(`Financial deficit detected. Collected: ₹${selectedCase.finances.collected} / Outstanding: ₹${selectedCase.finances.approved_cost - selectedCase.finances.collected}`);
      }
      if (!selectedCase.checklist.notes_checked) warnings.push('Comprehensive Clinical SOAP notes are missing.');
      if (!selectedCase.checklist.rx_checked) warnings.push('Post-treatment prescriptions or pharmacotherapy has not been marked as issued.');
      if (!selectedCase.checklist.followups_checked) warnings.push('6-Month Recall & Maintenance appointment is not scheduled.');

      if (warnings.length > 0) {
        setChecklistWarnings(warnings);
        setShowChecklistWarning(true);
        return;
      }
    }

    try {
      await updateCase(selectedCase.id, { stage: newStage });
      notify('success', 'Stage Transitioned', `Case moved to stage: ${newStage}`);
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Skip checklist verification and force complete
  const handleForceComplete = async () => {
    if (!selectedCase) return;
    try {
      await updateCase(selectedCase.id, { stage: 'Completed' });
      notify('success', 'Quality Override Success', `Case forcefully advanced to Completed status.`);
      setShowChecklistWarning(false);
      loadDataset();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Upload Doc Simulation
  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    try {
      await uploadCaseDocument({
        case_id: selectedCase.id,
        type: uploadData.type,
        title: uploadData.title || `Diagnostic ${uploadData.type} Scan`,
        url: uploadData.url || 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60'
      });

      notify('success', 'PACS Entry Created', `Uploaded ${uploadData.type} to case records.`);
      setShowUploadModal(false);
      setUploadData({ type: 'Consent', title: '', url: '' });
      loadDataset();
    } catch (e: any) {
      notify('error', 'Upload Error', e.message);
    }
  };

  // Calculate Progress percentage (Module 10)
  const calculateProgress = (record: CaseRecord): number => {
    if (!record.plans || record.plans.length === 0) return 0;
    const completed = record.plans.filter(p => p.status === 'Completed').length;
    return Math.round((completed / record.plans.length) * 100);
  };

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'All' || c.stage === stageFilter;
    const matchesType = typeFilter === 'All' || c.case_type === typeFilter;
    return matchesSearch && matchesStage && matchesType;
  });

  // Analytics Computation (Module 13)
  const computeAnalytics = () => {
    const started = cases.length;
    const completed = cases.filter(c => c.stage === 'Completed').length;
    const totalRev = cases.reduce((sum, c) => sum + (c.finances?.approved_cost || 0), 0);
    const collected = cases.reduce((sum, c) => sum + (c.finances?.collected || 0), 0);
    const pendingRev = totalRev - collected;

    // Completion percentage
    const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

    // Grouping revenues for chart
    const revByType: { [key: string]: number } = {};
    cases.forEach(c => {
      revByType[c.case_type] = (revByType[c.case_type] || 0) + (c.finances?.approved_cost || 0);
    });

    const chartData = Object.entries(revByType).map(([name, value]) => ({ name, value }));

    return {
      started,
      completed,
      avgCompletionTime: '24 Days',
      avgRevenue: started > 0 ? Math.round(totalRev / started) : 0,
      completionRate,
      pendingRev,
      chartData
    };
  };

  const analytics = computeAnalytics();

  // Dental Chart Tooth Grid Renderer (Module 5)
  const renderInteractiveToothChart = () => {
    if (!selectedCase) return null;

    // Quad arrays
    const q1 = ['18', '17', '16', '15', '14', '13', '12', '11'];
    const q2 = ['21', '22', '23', '24', '25', '26', '27', '28'];
    const q3 = ['38', '37', '36', '35', '34', '33', '32', '31'];
    const q4 = ['41', '42', '43', '44', '45', '46', '47', '48'];

    const getToothStatusColor = (toothNum: string) => {
      const plan = selectedCase.plans.find(p => p.tooth === toothNum);
      if (!plan) return 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400';

      switch (plan.status) {
        case 'Completed':
          return 'bg-emerald-500 border-emerald-600 text-white animate-pulse';
        case 'Planned':
          return 'bg-sky-500 border-sky-600 text-white';
        case 'Pending':
          return 'bg-amber-400 border-amber-500 text-slate-950';
        case 'Under Review':
          return 'bg-purple-500 border-purple-600 text-white';
        case 'Deferred':
          return 'bg-orange-500 border-orange-600 text-white';
        case 'Rejected':
          return 'bg-rose-500 border-rose-600 text-white';
        default:
          return 'bg-slate-100 border-slate-300 text-slate-500';
      }
    };

    const renderQuadrant = (teeth: string[]) => (
      <div className="flex gap-1.5 justify-center py-1">
        {teeth.map(t => {
          const plan = selectedCase.plans.find(p => p.tooth === t);
          return (
            <button
              key={t}
              onClick={() => {
                if (plan) {
                  notify('info', `Milestone Detail`, `Tooth ${t}: ${plan.procedure} is currently ${plan.status}`);
                } else {
                  setNewPlanRow(prev => ({ ...prev, tooth: t }));
                  setShowAddPlanRow(true);
                }
              }}
              className={`w-9 h-11 rounded-lg border-2 flex flex-col items-center justify-center font-bold text-[11px] transition hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${getToothStatusColor(t)}`}
              title={plan ? `${plan.procedure} (${plan.status})` : `No scheduled treatment on tooth ${t}. Click to plan.`}
            >
              <span>{t}</span>
              {plan && <span className="text-[7px] tracking-tighter uppercase font-black">{plan.status.substring(0, 3)}</span>}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">Module 5: Full Mouth Planner Chart</span>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-sky-500 rounded"></span> Planned</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded"></span> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-purple-500 rounded"></span> Under Review</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded"></span> Deferred</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Rejected</span>
          </div>
        </div>

        <div className="space-y-3 overflow-x-auto select-none p-2">
          {/* Maxillary Teeth */}
          <div className="flex justify-center gap-4 min-w-[500px]">
            {renderQuadrant(q1)}
            <div className="w-[1px] bg-slate-300 dark:bg-slate-700"></div>
            {renderQuadrant(q2)}
          </div>

          <div className="h-[1px] bg-slate-300 dark:bg-slate-700 w-11/12 mx-auto"></div>

          {/* Mandibular Teeth */}
          <div className="flex justify-center gap-4 min-w-[500px]">
            {renderQuadrant(q4)}
            <div className="w-[1px] bg-slate-300 dark:bg-slate-700"></div>
            {renderQuadrant(q3)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 font-sans">
      
      {/* Top Banner Accent */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[#0F6E6E] dark:text-[#14B8A6] text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={13} className="animate-spin" /> SRI CHAITANYA MULTISPECIALITY DENTAL CRM
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <Briefcase className="text-[#0F6E6E] dark:text-[#14B8A6]" /> Case Management Workspace <span className="text-xs bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-[#14B8A6] font-bold px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800/60">v2.2 Production</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise class multi-specialty treatment planning, full mouth rehabilitation scheduler, and diagnostic mini-PACS.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-[#0F6E6E] hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
          >
            <Plus size={14} /> Establish New Case
          </button>
        </div>
      </div>

      {/* Analytics Bento Row (Module 13) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Cases Started</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.started}</div>
          <span className="text-[9px] text-teal-600 font-bold">Active in pipeline</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Completed</span>
          <div className="text-xl font-black text-emerald-600 mt-1">{analytics.completed}</div>
          <span className="text-[9px] text-slate-500">Quality Checklist approved</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Completion %</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.completionRate}%</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-teal-500 h-full" style={{ width: `${analytics.completionRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Avg Revenue</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{analytics.avgRevenue.toLocaleString()}</div>
          <span className="text-[9px] text-slate-500">Per specialty case</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Pending Revenue</span>
          <div className="text-xl font-black text-red-600 mt-1">₹{analytics.pendingRev.toLocaleString()}</div>
          <span className="text-[9px] text-slate-400">To be collected</span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Cases Directory List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-400">Cases Directory</h3>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                {filteredCases.length} records found
              </span>
            </div>

            {/* Simple Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-xs w-full font-semibold focus:outline-hidden"
                >
                  <option value="All">All Stages</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="Records Collection">Records Collection</option>
                  <option value="Treatment Planning">Treatment Planning</option>
                  <option value="Estimate">Estimate</option>
                  <option value="Acceptance">Acceptance</option>
                  <option value="Execution">Execution</option>
                  <option value="Review">Review</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-xs w-full font-semibold focus:outline-hidden"
                >
                  <option value="All">All Types</option>
                  <option value="Full Mouth Rehabilitation">FMR</option>
                  <option value="Smile Makeover">Smile Makeover</option>
                  <option value="Implants">Implants</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Combination Cases">Combination</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search case, patient, number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 pl-8 w-full rounded text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Records list */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border p-6 text-center text-xs text-slate-400 rounded-2xl">
                No active clinical cases found matching criteria.
              </div>
            ) : (
              filteredCases.map(c => {
                const isSelected = selectedCase?.id === c.id;
                const progress = calculateProgress(c);

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 rounded-2xl border transition duration-150 cursor-pointer text-left relative overflow-hidden ${
                      isSelected
                        ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500 dark:border-teal-700/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="absolute top-0 right-0 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black rounded-bl-xl border-l border-b border-slate-200/50 dark:border-slate-700">
                      {c.case_number}
                    </div>

                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">{c.case_type}</span>
                    <h4 className="font-bold text-slate-950 dark:text-white text-xs mt-0.5">{c.patient_name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{c.title}</p>
                    
                    {/* Status Badge & Progress map */}
                    <div className="flex items-center justify-between mt-3.5 border-t border-slate-100 dark:border-slate-800/50 pt-2 text-[10px]">
                      <span className="font-black text-teal-700 dark:text-teal-400 uppercase">Stage: {c.stage}</span>
                      <span className="font-black text-slate-500 dark:text-slate-400">Progress: {progress}%</span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-[#0F6E6E] dark:bg-teal-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Interactive Case Command Center */}
        <div className="xl:col-span-2 space-y-6">
          {selectedCase ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6">
              
              {/* Patient header info */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#0F6E6E]/10 text-[#0F6E6E] dark:text-[#14B8A6] dark:bg-teal-950/40 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      {selectedCase.case_number}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{selectedCase.case_type}</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">{selectedCase.patient_name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCase.title}</p>
                </div>

                {/* Status selector directly here */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Clinical Stage:</span>
                  <select
                    value={selectedCase.stage}
                    onChange={(e) => handleStageChange(e.target.value as CaseStage)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs rounded font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Records Collection">Records Collection</option>
                    <option value="Treatment Planning">Treatment Planning</option>
                    <option value="Estimate">Estimate</option>
                    <option value="Acceptance">Acceptance</option>
                    <option value="Execution">Execution</option>
                    <option value="Review">Review</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Progress Bar Display (Module 10) */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1">
                    <span>Clinical Progression completeness score</span>
                    <span className="text-[#0F6E6E] dark:text-teal-400">{calculateProgress(selectedCase)}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${calculateProgress(selectedCase)}%` }}
                    ></div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPDFReview(true)}
                  className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-black hover:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <Printer size={12} /> Review PDF Summary
                </button>
              </div>

              {/* Full Mouth Chart Module 5 */}
              {renderInteractiveToothChart()}

              {/* Segmented Sub Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setActiveDetailTab('planner')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition ${
                    activeDetailTab === 'planner'
                      ? 'border-[#0F6E6E] text-[#0F6E6E] dark:border-[#14B8A6] dark:text-[#14B8A6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Treatment Planner
                </button>
                <button
                  onClick={() => setActiveDetailTab('documents')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition ${
                    activeDetailTab === 'documents'
                      ? 'border-[#0F6E6E] text-[#0F6E6E] dark:border-[#14B8A6] dark:text-[#14B8A6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Documents & Scans ({documents.length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition ${
                    activeDetailTab === 'timeline'
                      ? 'border-[#0F6E6E] text-[#0F6E6E] dark:border-[#14B8A6] dark:text-[#14B8A6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Case Timeline
                </button>
                <button
                  onClick={() => setActiveDetailTab('coordination')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition ${
                    activeDetailTab === 'coordination'
                      ? 'border-[#0F6E6E] text-[#0F6E6E] dark:border-[#14B8A6] dark:text-[#14B8A6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Case Coordination
                </button>
                <button
                  onClick={() => setActiveDetailTab('finances')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition ${
                    activeDetailTab === 'finances'
                      ? 'border-[#0F6E6E] text-[#0F6E6E] dark:border-[#14B8A6] dark:text-[#14B8A6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Financial Tracker
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="space-y-4 pt-1">
                
                {/* 1. Treatment Planner (Module 4) */}
                {activeDetailTab === 'planner' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase text-slate-400 tracking-wider">Multi-Specialty Planner & Dependencies</h4>
                      <button
                        onClick={() => setShowAddPlanRow(true)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#0F6E6E] text-white hover:bg-teal-800 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus size={11} /> Append Specialty Plan
                      </button>
                    </div>

                    {selectedCase.plans.length === 0 ? (
                      <div className="p-8 border rounded-2xl bg-slate-50 dark:bg-slate-900 text-center text-xs text-slate-400 space-y-2">
                        <p>No multi-specialty clinical items added yet to this case.</p>
                        <button
                          onClick={() => setShowAddPlanRow(true)}
                          className="text-[#0F6E6E] dark:text-teal-400 font-bold hover:underline"
                        >
                          Establish first plan row now
                        </button>
                      </div>
                    ) : (
                      <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3">Tooth</th>
                              <th className="p-3">Specialty / Treatment</th>
                              <th className="p-3">Dependency</th>
                              <th className="p-3">Est. Cost</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedCase.plans.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="p-3 font-black text-[#0F6E6E] dark:text-teal-400">
                                  Tooth {p.tooth}
                                </td>
                                <td className="p-3 space-y-0.5">
                                  <div className="font-bold text-slate-950 dark:text-white">{p.procedure}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{p.specialty}</div>
                                </td>
                                <td className="p-3 text-slate-500 font-mono text-[11px]">
                                  {p.dependency_tooth ? `Tooth ${p.dependency_tooth}` : '—'}
                                </td>
                                <td className="p-3 font-bold text-slate-900 dark:text-slate-200">
                                  ₹{p.cost?.toLocaleString() || '0'}
                                </td>
                                <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                  <select
                                    value={p.status}
                                    onChange={(e) => handleUpdatePlanStatus(p.id, e.target.value)}
                                    className="bg-slate-100 dark:bg-slate-800 border px-2 py-0.5 rounded text-[10px] font-bold focus:outline-hidden"
                                  >
                                    <option value="Planned">Planned</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Deferred">Deferred</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                  <button
                                    onClick={() => handleDeletePlanRow(p.id)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                    title="Delete plan row"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Documents & Scans (Module 6) */}
                {activeDetailTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase text-slate-400 tracking-wider">Case Documents Mini-PACS</h4>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#0F6E6E] text-white hover:bg-teal-800 rounded-lg flex items-center gap-1 cursor-pointer transition"
                      >
                        <Upload size={11} /> Upload Scans / Files
                      </button>
                    </div>

                    {documents.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        No case-specific diagnostic OPGs, CBCT, or consent files uploaded yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {documents.map((d) => (
                          <div key={d.id} className="group relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-2xs">
                            <div className="h-28 overflow-hidden bg-slate-950 flex items-center justify-center">
                              <img
                                src={d.url}
                                alt={d.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition referrer-policy"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-2.5">
                              <span className="text-[9px] font-black uppercase text-[#0F6E6E] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
                                {d.type}
                              </span>
                              <h5 className="font-bold text-slate-950 dark:text-white text-[11px] truncate mt-1.5">{d.title}</h5>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Uploaded: {d.uploaded_at}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Case Timeline (Module 7) */}
                {activeDetailTab === 'timeline' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-xs uppercase text-slate-400 tracking-wider">Automated Case Timeline Audit Feed</h4>
                    
                    {timeline.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No timeline activity logged.</p>
                    ) : (
                      <div className="space-y-3">
                        {timeline.map((item) => (
                          <div key={item.id} className="relative pl-5 border-l border-slate-200 dark:border-slate-800 py-1 text-xs">
                            <div className="absolute top-2 left-[-4.5px] w-2 h-2 rounded-full bg-[#0F6E6E] dark:bg-teal-500 ring-4 ring-teal-50 dark:ring-teal-950/40"></div>
                            <div className="flex justify-between items-center font-bold text-slate-500 dark:text-slate-400">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                                {item.event_type}
                              </span>
                              <span className="font-mono text-[10px]">{item.date}</span>
                            </div>
                            <p className="text-slate-850 dark:text-slate-300 mt-1 leading-relaxed">{item.text}</p>
                            {item.amount && (
                              <p className="text-[#0F6E6E] dark:text-teal-400 font-bold mt-0.5 text-[10px]">
                                Amount Logged: ₹{item.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Case Coordination (Module 8) */}
                {activeDetailTab === 'coordination' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-xs uppercase text-slate-400 tracking-wider">Staffing & Target Milestones</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border rounded-xl space-y-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Responsible Team</span>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px]">Case Coordinator</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedCase.coordinator_name || 'Unassigned'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Lead Dentist</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedCase.doctor_name}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Chairside Assistant</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedCase.assistant_name || 'Unassigned'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Linked Dental Lab</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedCase.lab_name || 'Internal Tech'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border rounded-xl space-y-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Target Completion Milestones</span>
                        <div className="text-xs space-y-3">
                          <div>
                            <span className="text-slate-400 text-[10px]">Estimated Target Date</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                              <Calendar size={13} className="text-teal-600" /> {selectedCase.target_completion_date}
                            </p>
                          </div>
                          
                          {/* Delay Reasons log */}
                          <div>
                            <span className="text-slate-400 text-[10px]">Delay / Variance Remarks Log</span>
                            <textarea
                              rows={2}
                              value={selectedCase.delay_reasons}
                              onChange={(e) => {
                                updateCase(selectedCase.id, { delay_reasons: e.target.value });
                                setSelectedCase({ ...selectedCase, delay_reasons: e.target.value });
                              }}
                              className="bg-white dark:bg-slate-800 border px-3 py-1.5 w-full rounded text-xs mt-1 font-semibold focus:outline-hidden"
                              placeholder="Log case variance or delay reasons..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Financial Tracker (Module 9) */}
                {activeDetailTab === 'finances' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-xs uppercase text-slate-400 tracking-wider">Financial Statement Audit Log</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Estimated Cost</span>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">₹{selectedCase.finances.estimated_cost.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Approved Cost</span>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">₹{selectedCase.finances.approved_cost.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Collected Deposited</span>
                        <p className="text-sm font-black text-emerald-600 mt-1">₹{selectedCase.finances.collected.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border rounded-xl">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Outstanding</span>
                        <p className="text-sm font-black text-red-600 mt-1">
                          ₹{(selectedCase.finances.approved_cost - selectedCase.finances.collected - selectedCase.finances.discount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Cost ledger updating inputs */}
                    <div className="p-4 bg-[#0F6E6E]/5 dark:bg-teal-950/10 border border-[#0F6E6E]/10 rounded-xl space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Refine Financial Log Values</span>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Approved Cost (₹)</label>
                          <input
                            type="number"
                            value={selectedCase.finances.approved_cost}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateCase(selectedCase.id, { finances: { ...selectedCase.finances, approved_cost: v } });
                              setSelectedCase({ ...selectedCase, finances: { ...selectedCase.finances, approved_cost: v } });
                            }}
                            className="bg-white dark:bg-slate-800 border px-3 py-1.5 w-full rounded text-xs font-semibold focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Total Collected (₹)</label>
                          <input
                            type="number"
                            value={selectedCase.finances.collected}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateCase(selectedCase.id, { finances: { ...selectedCase.finances, collected: v } });
                              setSelectedCase({ ...selectedCase, finances: { ...selectedCase.finances, collected: v } });
                            }}
                            className="bg-white dark:bg-slate-800 border px-3 py-1.5 w-full rounded text-xs font-semibold focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Est. Dental Lab Cost (₹)</label>
                          <input
                            type="number"
                            value={selectedCase.finances.lab_cost || 0}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateCase(selectedCase.id, { finances: { ...selectedCase.finances, lab_cost: v } });
                              setSelectedCase({ ...selectedCase, finances: { ...selectedCase.finances, lab_cost: v } });
                            }}
                            className="bg-white dark:bg-slate-800 border px-3 py-1.5 w-full rounded text-xs font-semibold focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quality Checklist verification (Module 11) */}
              <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-200">Module 11: Clinical Quality & Validation Checklist</h3>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Before finalizing treatment rehabilitation and archiving this case file, the lead dentist must verify clinical adherence criteria.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Surgical Consent Forms signed', key: 'consent_checked' },
                    { label: 'Pre/Post Photography on file', key: 'images_checked' },
                    { label: 'Billing transaction initialized', key: 'billing_checked' },
                    { label: 'Deficits settled (100% Paid)', key: 'payments_checked' },
                    { label: 'Comprehensive SOAP clinical notes', key: 'notes_checked' },
                    { label: 'Post-op Rx pharmacotherapy', key: 'rx_checked' },
                    { label: 'Recall & maintenance scheduled', key: 'followups_checked' },
                    { label: 'Warranty cards delivered', key: 'warranty_checked' }
                  ].map(chk => (
                    <label key={chk.key} className="flex items-center gap-2.5 p-2 bg-slate-850 border border-slate-800 rounded-lg hover:bg-slate-800 transition select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(selectedCase.checklist as any)[chk.key] || false}
                        onChange={() => handleChecklistToggle(chk.key as any)}
                        className="rounded border-slate-700 bg-slate-800 text-teal-600 focus:ring-0"
                      />
                      <span className="text-[10px] text-slate-300 font-medium">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border p-12 text-center text-slate-400 rounded-2xl">
              Select an active case record from the left directory list or establish a new multidisciplinary case.
            </div>
          )}
        </div>

      </div>

      {/* ESTABLISH CASE MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleCreateCase} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Establish Multi-Specialty Case File</h3>
            
            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={newCaseData.patient_name}
                  onChange={(e) => setNewCaseData({ ...newCaseData, patient_name: e.target.value })}
                  placeholder="e.g. Chaitu Bolla"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Patient ID Reference</label>
                <input
                  type="number"
                  value={newCaseData.patient_id}
                  onChange={(e) => setNewCaseData({ ...newCaseData, patient_id: e.target.value })}
                  placeholder="e.g. 1"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Case Clinical Title</label>
                <input
                  type="text"
                  value={newCaseData.title}
                  onChange={(e) => setNewCaseData({ ...newCaseData, title: e.target.value })}
                  placeholder="e.g. Full Mouth Implant Overdentures Rehab"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Case Category Type</label>
                <select
                  value={newCaseData.case_type}
                  onChange={(e) => setNewCaseData({ ...newCaseData, case_type: e.target.value as CaseType })}
                  className="bg-slate-50 dark:bg-slate-800 border px-2 py-1.5 w-full rounded font-semibold focus:ring-1 focus:ring-teal-500"
                >
                  <option value="General Dentistry">General Dentistry</option>
                  <option value="Full Mouth Rehabilitation">Full Mouth Rehabilitation</option>
                  <option value="Smile Makeover">Smile Makeover</option>
                  <option value="Implants">Implants</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Combination Cases">Combination Cases</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={newCaseData.target_completion_date}
                  onChange={(e) => setNewCaseData({ ...newCaseData, target_completion_date: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Diagnostic Clinical notes</label>
              <textarea
                rows={2}
                value={newCaseData.clinical_notes}
                onChange={(e) => setNewCaseData({ ...newCaseData, clinical_notes: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded text-xs font-semibold focus:ring-1 focus:ring-teal-500"
                placeholder="Diagnostic evaluation notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0F6E6E] text-white text-xs font-bold rounded-lg hover:bg-teal-800 transition"
              >
                Launch Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APPEND SPECIALTY PLAN ROW MODAL */}
      {showAddPlanRow && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleAddPlanRow} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Append Specialty Milestone</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Tooth Number</label>
                <input
                  type="text"
                  value={newPlanRow.tooth}
                  onChange={(e) => setNewPlanRow({ ...newPlanRow, tooth: e.target.value })}
                  placeholder="e.g. 11, 21, 46"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Clinical Procedure</label>
                <input
                  type="text"
                  value={newPlanRow.procedure}
                  onChange={(e) => setNewPlanRow({ ...newPlanRow, procedure: e.target.value })}
                  placeholder="e.g. Ceramic Zirconia Veneer"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Specialty Department</label>
                <select
                  value={newPlanRow.specialty}
                  onChange={(e) => setNewPlanRow({ ...newPlanRow, specialty: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-800 border px-2 py-1.5 w-full rounded font-semibold focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Prosthodontics">Prosthodontics</option>
                  <option value="Implants">Implants</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Cosmetic Dentistry">Cosmetic Dentistry</option>
                  <option value="Oral Surgery">Oral Surgery</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Dependency Tooth (Optional)</label>
                <input
                  type="text"
                  value={newPlanRow.dependency_tooth}
                  onChange={(e) => setNewPlanRow({ ...newPlanRow, dependency_tooth: e.target.value })}
                  placeholder="e.g. 46 (must complete 46 RCT first)"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded focus:ring-1 focus:ring-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Line-Item Cost Estimate (₹)</label>
                <input
                  type="number"
                  value={newPlanRow.cost}
                  onChange={(e) => setNewPlanRow({ ...newPlanRow, cost: Number(e.target.value) })}
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded font-semibold focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddPlanRow(false)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0F6E6E] text-white text-xs font-bold rounded-lg hover:bg-teal-800 transition"
              >
                Add Row
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENT PACS UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleDocUpload} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Upload PACS Diagnostic File</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Document Category</label>
                <select
                  value={uploadData.type}
                  onChange={(e) => setUploadData({ ...uploadData, type: e.target.value as any })}
                  className="bg-slate-50 dark:bg-slate-800 border px-2 py-1.5 w-full rounded font-semibold"
                >
                  <option value="Consent">Consent Form</option>
                  <option value="Photograph">Clinical Photograph</option>
                  <option value="CBCT">CBCT Scan</option>
                  <option value="OPG">Panoramic OPG</option>
                  <option value="IOPA">Intraoral Periapical (IOPA)</option>
                  <option value="Scan">Digital Impression Scan</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="e.g. Post-Op CBCT Scan Left"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">URL Reference</label>
                <input
                  type="text"
                  value={uploadData.url}
                  onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                  placeholder="e.g. URL to image or cloud storage"
                  className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 w-full rounded font-semibold text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0F6E6E] text-white text-xs font-bold rounded-lg hover:bg-teal-800 transition"
              >
                Commit File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUALITY CHECKLIST WARNING DIALOG */}
      {showChecklistWarning && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-xl text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-black">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-black uppercase tracking-wider">Quality Gate Blocked</h3>
            </div>
            
            <p className="text-slate-500 leading-relaxed">
              The CRM Quality Validation Engine has prevented this case from being marked as Completed. The following clinical parameters are outstanding:
            </p>

            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 border border-rose-100 dark:border-rose-900 rounded-xl space-y-1.5 text-rose-800 dark:text-rose-300 font-semibold leading-relaxed">
              {checklistWarnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span>•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t text-xs">
              <button
                onClick={() => setShowChecklistWarning(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-lg hover:bg-slate-200 transition"
              >
                Go Back & Complete Parameters
              </button>
              <button
                onClick={handleForceComplete}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition"
              >
                Force Complete Case File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE REVIEW & SUMMARY GENERATOR WORKSPACE (Module 12) */}
      {showPDFReview && selectedCase && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-slate-900 p-6 lg:p-8 rounded-3xl max-w-3xl w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowPDFReview(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-black text-sm"
            >
              Close Print Preview [X]
            </button>

            {/* Clinic Branding Header */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Sri Chaitanya Multispeciality Dental</h2>
                <p className="text-[10px] text-slate-500 font-bold">Vijayawada HQ · Clinical Command Center</p>
                <p className="text-[9px] text-slate-400 font-semibold">Web: srichaitanyadental.com | Ph: +91 9988776655</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-teal-100 text-teal-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Official Case Document
                </span>
                <p className="text-xs font-bold text-slate-600 mt-2">Case: {selectedCase.case_number}</p>
                <p className="text-[10px] text-slate-400">Date Generated: {new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* Case & Patient Meta details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-black">Patient Name</span>
                <p className="font-bold text-slate-800">{selectedCase.patient_name}</p>
                <p className="text-[10px] text-slate-400">Patient Code: {(selectedCase as any).patient_code || `PAT-${selectedCase.patient_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-black">Case Classification</span>
                <p className="font-bold text-slate-800">{selectedCase.case_type}</p>
                <p className="text-[10px] text-slate-400">{selectedCase.title}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-black">Responsible Dentist</span>
                <p className="font-bold text-slate-800">{selectedCase.doctor_name}</p>
                <p className="text-[10px] text-slate-400">Coordinator: {selectedCase.coordinator_name}</p>
              </div>
            </div>

            {/* Multi-specialty plans list */}
            <div className="space-y-2 text-xs">
              <h4 className="font-black text-xs uppercase text-slate-500 tracking-wider">Clinical Treatment Breakdown</h4>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-500 uppercase text-[9px] border-b">
                    <tr>
                      <th className="p-2.5">Tooth</th>
                      <th className="p-2.5">Procedure</th>
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Approved Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedCase.plans.map(p => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-bold">Tooth {p.tooth}</td>
                        <td className="p-2.5">{p.procedure}</td>
                        <td className="p-2.5 uppercase text-[9px] text-slate-500">{p.specialty}</td>
                        <td className="p-2.5 font-bold">{p.status}</td>
                        <td className="p-2.5 text-right font-mono">₹{p.cost?.toLocaleString() || '0'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={4} className="p-2.5 text-right uppercase">Financial Est Total</td>
                      <td className="p-2.5 text-right font-mono text-xs">₹{selectedCase.finances.approved_cost.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-800 font-bold">
                      <td colSpan={4} className="p-2.5 text-right uppercase">Total Collected Deposited</td>
                      <td className="p-2.5 text-right font-mono text-xs">₹{selectedCase.finances.collected.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* OPG/PACS Scan Attachments mini gallery */}
            <div className="space-y-2 text-xs">
              <h4 className="font-black text-xs uppercase text-slate-500 tracking-wider">Diagnostic Scan Attachments (OPG/CBCT)</h4>
              {documents.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No imaging scans uploaded.</p>
              ) : (
                <div className="flex gap-4">
                  {documents.slice(0, 3).map(doc => (
                    <div key={doc.id} className="border p-1.5 rounded-lg bg-slate-50 w-28">
                      <div className="h-14 overflow-hidden rounded bg-slate-950">
                        <img src={doc.url} alt="Scan" className="w-full h-full object-cover referrer-policy" referrerPolicy="no-referrer" />
                      </div>
                      <p className="text-[9px] font-black mt-1 truncate">{doc.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Signature Canvas for Lead Doctor */}
            <div className="border-t pt-4 grid grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Authorized Doctor Notes / Directives</label>
                <textarea
                  rows={2}
                  className="bg-slate-50 border p-2 w-full rounded text-xs font-semibold focus:outline-hidden"
                  placeholder="Add custom clinician notes to the printed statement..."
                  value={customPDFNotes}
                  onChange={(e) => setCustomPDFNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Lead Dentist Signature (Draw/Type)</label>
                <input
                  type="text"
                  placeholder="Type Name for Digital Cryptographic Signature..."
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  className="bg-slate-50 border px-3 py-1.5 w-full rounded text-xs font-semibold focus:outline-hidden"
                />
                <div className="border border-dashed p-3 text-center text-[13px] font-serif italic text-slate-600 bg-slate-50 rounded-lg min-h-11">
                  {signatureData || 'No Signature Recorded'}
                </div>
              </div>
            </div>

            {/* Print Action button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-[9px] text-slate-400 font-bold">Generated under Sri Chaitanya Clinical Audit Guidelines</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPDFReview(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-1.5 bg-[#0F6E6E] text-white hover:bg-teal-800 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={12} /> Print Physical Copy
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
