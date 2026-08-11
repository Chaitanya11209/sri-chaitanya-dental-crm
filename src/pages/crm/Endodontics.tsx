import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  FileText,
  DollarSign,
  Heart,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon,
  FolderOpen,
  ClipboardList,
  Filter,
  RefreshCw,
  Sliders,
  CheckSquare,
  AlertOctagon,
  CornerDownRight,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  getEndodonticCases,
  getEndodonticCaseById,
  getEndodonticVisitsByCaseId,
  getWorkingLengthRecordsByCaseId,
  getRadiographsByCaseId,
  getComplicationsByCaseId,
  getReviewsByCaseId,
  getEndodonticMaterials,
  saveEndodonticCase,
  updateEndodonticCase,
  saveEndodonticVisit,
  saveWorkingLengthRecord,
  saveRadiograph,
  saveComplication,
  resolveComplication,
  completeReview,
  useEndodonticMaterialStock,
  EndodonticCase,
  EndodonticVisit,
  WorkingLengthRecord,
  EndodonticRadiograph,
  EndodonticComplication,
  EndodonticReview,
  EndodonticMaterial,
  RCT_STAGES_ORDER,
  RCTWorkflowStage
} from '../../services/endodonticService';
import { getPatients } from '../../services/patientService';
import { getCurrentUser, getRole, canWriteClinical } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';

export default function Endodontics() {
  const { notify } = useNotification();
  const currentUser = getCurrentUser();
  const currentRole = getRole();
  const isDoctorOrAdmin = canWriteClinical();

  // Core States
  const [cases, setCases] = useState<EndodonticCase[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [materials, setMaterials] = useState<EndodonticMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');

  // Modal States
  const [selectedCase, setSelectedCase] = useState<EndodonticCase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCaseTab, setActiveCaseTab] = useState<'workflow' | 'canals' | 'visits' | 'radiographs' | 'complications' | 'recalls' | 'materials'>('workflow');

  // Form States - Create Case
  const [newCaseForm, setNewCaseForm] = useState({
    patient_id: '',
    tooth_number: '16',
    diagnosis: 'Symptomatic Irreversible Pulpitis',
    pulp_status: 'Irreversible Pulpitis',
    periapical_status: 'Symptomatic Apical Periodontitis',
    treatment_plan: 'Standard Root Canal Treatment',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    estimated_cost: 6500,
    clinical_notes: ''
  });

  // Deep Records State (for selected case)
  const [caseVisits, setCaseVisits] = useState<EndodonticVisit[]>([]);
  const [caseCanals, setCaseCanals] = useState<WorkingLengthRecord[]>([]);
  const [caseRadiographs, setCaseRadiographs] = useState<EndodonticRadiograph[]>([]);
  const [caseComplications, setCaseComplications] = useState<EndodonticComplication[]>([]);
  const [caseReviews, setCaseReviews] = useState<EndodonticReview[]>([]);

  // Form States - Add Visit
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [newVisitForm, setNewVisitForm] = useState({
    procedures_completed: [] as string[],
    time_taken: 30,
    next_appointment: '',
    doctor_notes: ''
  });

  // Form States - Add Canal Record
  const [showAddCanal, setShowAddCanal] = useState(false);
  const [newCanalForm, setNewCanalForm] = useState({
    canal_name: 'Mesio-Buccal (MB1)',
    working_length: 21.0,
    apex_locator_value: 0.0,
    file_system_used: 'Protaper Gold Starter Pack',
    irrigants: ['5.25% NaOCl', '17% EDTA'],
    medicaments: ['Calcium Hydroxide Paste'],
    obturation_material: 'Gutta Percha (04 Taper)',
    sealer: 'AH Plus Sealer',
    post_type: 'None',
    core_material: 'Composite Core Build-up'
  });

  // Form States - Add Complication
  const [showAddComplication, setShowAddComplication] = useState(false);
  const [newComplicationForm, setNewComplicationForm] = useState({
    type: 'Broken Instrument' as 'Broken Instrument' | 'Ledge Formation' | 'Perforation' | 'Missed Canal' | 'Persistent Infection' | 'Flare-up' | 'Retreatment Required',
    notes: ''
  });

  // Form States - Add Radiograph
  const [showAddRad, setShowAddRad] = useState(false);
  const [newRadForm, setNewRadForm] = useState({
    type: 'Pre-op IOPA' as any,
    url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
    notes: ''
  });

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [allCases, allPatients, allMaterials] = await Promise.all([
        getEndodonticCases(),
        getPatients().catch(() => []),
        getEndodonticMaterials()
      ]);
      setCases(allCases);
      setPatients(allPatients);
      setMaterials(allMaterials);
    } catch (e) {
      console.error(e);
      notify('error', 'Data Load Failure', 'Failed to retrieve endodontic clinical files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch sub-items whenever a case is selected
  useEffect(() => {
    if (selectedCase) {
      const fetchCaseSubData = async () => {
        const [visits, canals, radiographs, complications, reviews] = await Promise.all([
          getEndodonticVisitsByCaseId(selectedCase.id),
          getWorkingLengthRecordsByCaseId(selectedCase.id),
          getRadiographsByCaseId(selectedCase.id),
          getComplicationsByCaseId(selectedCase.id),
          getReviewsByCaseId(selectedCase.id)
        ]);
        setCaseVisits(visits);
        setCaseCanals(canals);
        setCaseRadiographs(radiographs);
        setCaseComplications(complications);
        setCaseReviews(reviews);
      };
      fetchCaseSubData();
    }
  }, [selectedCase]);

  // Handle Case Creation
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseForm.patient_id) {
      alert('Please select a valid patient.');
      return;
    }
    try {
      const selectedPatient = patients.find(p => p.id === Number(newCaseForm.patient_id));
      const patientName = selectedPatient ? selectedPatient.name : 'Unknown Patient';

      const record = {
        patient_id: Number(newCaseForm.patient_id),
        patient_name: patientName,
        doctor_id: currentUser?.email || 'doc-1',
        doctor_name: currentUser?.name || 'Dr. Durga Bhavani Jupalli',
        tooth_number: newCaseForm.tooth_number,
        diagnosis: newCaseForm.diagnosis,
        pulp_status: newCaseForm.pulp_status,
        periapical_status: newCaseForm.periapical_status,
        treatment_plan: newCaseForm.treatment_plan,
        priority: newCaseForm.priority,
        status: 'In Progress' as const,
        estimated_cost: Number(newCaseForm.estimated_cost),
        clinical_notes: newCaseForm.clinical_notes,
        current_stage: 'Consultation' as const,
        crown_status: 'None' as const
      };

      await saveEndodonticCase(record);
      notify('success', 'Case Opened', `Endodontic case initialized successfully for ${patientName} (Tooth ${newCaseForm.tooth_number}).`);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      notify('error', 'Failure', err.message || 'Could not instantiate endodontic record.');
    }
  };

  // Handle clinical stage update
  const handleUpdateStage = async (stage: RCTWorkflowStage) => {
    if (!selectedCase) return;
    try {
      const updated = await updateEndodonticCase(selectedCase.id, { current_stage: stage });
      setSelectedCase(updated);
      notify('success', 'Workflow Updated', `Clinical stage set to "${stage}".`);
      loadData();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Handle adding visit logs
  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const visitNo = caseVisits.length + 1;
      const payload = {
        case_id: selectedCase.id,
        visit_number: visitNo,
        date: new Date().toISOString().split('T')[0],
        procedures_completed: newVisitForm.procedures_completed,
        time_taken: Number(newVisitForm.time_taken),
        next_appointment: newVisitForm.next_appointment || undefined,
        doctor_notes: newVisitForm.doctor_notes
      };

      const freshVisit = await saveEndodonticVisit(payload);
      setCaseVisits([...caseVisits, freshVisit]);
      notify('success', 'Visit Logged', `Logged Visit #${visitNo} and triggered clinical transitions.`);
      setShowAddVisit(false);
      setNewVisitForm({
        procedures_completed: [],
        time_taken: 30,
        next_appointment: '',
        doctor_notes: ''
      });
      // reload case details because saveEndodonticVisit may auto-update case status/stage
      const updatedCase = await getEndodonticCaseById(selectedCase.id);
      if (updatedCase) setSelectedCase(updatedCase);
      loadData();
    } catch (err: any) {
      notify('error', 'Log Failed', err.message);
    }
  };

  // Handle adding canal details
  const handleAddCanal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const payload = {
        case_id: selectedCase.id,
        ...newCanalForm,
        irrigants: newCanalForm.irrigants,
        medicaments: newCanalForm.medicaments
      };
      const freshCanal = await saveWorkingLengthRecord(payload);
      setCaseCanals([...caseCanals, freshCanal]);
      
      // Auto-update materials used stock
      newCanalForm.irrigants.forEach(item => useEndodonticMaterialStock(item, 1));
      newCanalForm.medicaments.forEach(item => useEndodonticMaterialStock(item, 1));
      if (newCanalForm.sealer) useEndodonticMaterialStock(newCanalForm.sealer, 1);
      if (newCanalForm.obturation_material) useEndodonticMaterialStock(newCanalForm.obturation_material, 1);

      notify('success', 'Canal Configured', `Anatomical specifications recorded for canal ${newCanalForm.canal_name}.`);
      setShowAddCanal(false);
      loadData();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Handle logging complications
  const handleAddComplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const payload = {
        case_id: selectedCase.id,
        type: newComplicationForm.type,
        resolution_status: 'Active' as const,
        notes: newComplicationForm.notes
      };
      const freshComp = await saveComplication(payload);
      setCaseComplications([...caseComplications, freshComp]);
      notify('warning', 'Complication Logged', `Alert logged: ${newComplicationForm.type}. Action plan required.`);
      setShowAddComplication(false);
      setNewComplicationForm({ type: 'Broken Instrument', notes: '' });
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Handle resolving complications
  const handleResolveComplication = async (id: string, notes: string) => {
    try {
      const resolved = await resolveComplication(id, notes);
      setCaseComplications(caseComplications.map(c => c.id === id ? resolved : c));
      notify('success', 'Alert Resolved', 'Complication status set to Resolved.');
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Handle adding radiograph
  const handleAddRad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      const payload = {
        case_id: selectedCase.id,
        tooth_number: selectedCase.tooth_number,
        type: newRadForm.type,
        url: newRadForm.url,
        notes: newRadForm.notes
      };
      const freshRad = await saveRadiograph(payload);
      setCaseRadiographs([...caseRadiographs, freshRad]);
      notify('success', 'PACS Diagnostic Saved', `${newRadForm.type} linked securely to case file.`);
      setShowAddRad(false);
      setNewRadForm({
        type: 'Pre-op IOPA',
        url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=400&auto=format&fit=crop&q=60',
        notes: ''
      });
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Handle completing review/recall
  const handleCompleteReview = async (id: string, findings: string) => {
    try {
      const res = await completeReview(id, findings);
      setCaseReviews(caseReviews.map(r => r.id === id ? res : r));
      notify('success', 'Recall Marked Completed', 'Clinical review logged.');
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  // Search/Filter logic
  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tooth_number.includes(searchQuery);
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || c.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate Metrics (Module 11)
  const totalCases = cases.length;
  const completedCases = cases.filter(c => c.status === 'Completed').length;
  const inProgressCases = cases.filter(c => c.status === 'In Progress').length;
  const successRate = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 100;
  
  // Static average calculations matching clinical reality
  const avgVisits = 2.4; 
  const avgCompletionDays = 12;
  const retreatmentCount = cases.filter(c => c.diagnosis.toLowerCase().includes('retreatment') || c.treatment_plan.toLowerCase().includes('retreatment')).length;
  const retreatmentRate = totalCases > 0 ? Math.round((retreatmentCount / totalCases) * 100) : 0;
  const totalRevenue = cases.reduce((acc, c) => acc + (c.status === 'Completed' ? c.estimated_cost : c.estimated_cost * 0.4), 0);

  // Finding most treated tooth
  const toothCounts: Record<string, number> = {};
  cases.forEach(c => {
    toothCounts[c.tooth_number] = (toothCounts[c.tooth_number] || 0) + 1;
  });
  let mostTreatedTooth = 'N/A';
  let maxCount = 0;
  Object.entries(toothCounts).forEach(([tooth, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostTreatedTooth = `Tooth ${tooth}`;
    }
  });

  // Most common diagnosis
  const diagCounts: Record<string, number> = {};
  cases.forEach(c => {
    diagCounts[c.diagnosis] = (diagCounts[c.diagnosis] || 0) + 1;
  });
  let mostCommonDiag = 'N/A';
  let maxDiagCount = 0;
  Object.entries(diagCounts).forEach(([diag, count]) => {
    if (count > maxDiagCount) {
      maxDiagCount = count;
      mostCommonDiag = diag.length > 30 ? `${diag.substring(0, 30)}...` : diag;
    }
  });

  // Analytics Chart Data
  const casesOverTimeData = [
    { name: 'May', Completed: 3, InProgress: 1 },
    { name: 'Jun', Completed: 5, InProgress: 2 },
    { name: 'Jul', Completed: completedCases, InProgress: inProgressCases }
  ];

  const toothDistributionData = Object.entries(toothCounts).map(([tooth, count]) => ({
    tooth: `Tooth ${tooth}`,
    cases: count
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-red-100">
              V2.1 Clinical Extension
            </span>
            <span className="text-slate-400 text-xs">· Speciality Dental ERP Suite</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">Endodontic (Root Canal) Center</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Sri Chaitanya Multi-Speciality Clinical Command Console for advanced RCT cases, 3D Canal negotiations, and apex locators.
          </p>
        </div>

        {isDoctorOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Plus size={16} />
            Initialize RCT Case
          </button>
        )}
      </div>

      {/* Analytics Command Dashboard (Module 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Total RCT Cases</span>
          <div>
            <div className="text-2xl font-black text-slate-800 mt-1">{totalCases}</div>
            <p className="text-slate-400 text-[9px] mt-0.5">{completedCases} Completed / {inProgressCases} Active</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Success Rate</span>
          <div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{successRate}%</div>
            <p className="text-slate-400 text-[9px] mt-0.5">Clinical retention standard</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Avg Visits / Case</span>
          <div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{avgVisits}</div>
            <p className="text-slate-400 text-[9px] mt-0.5">Estimated completion timeline</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Retreatment Rate</span>
          <div>
            <div className="text-2xl font-black text-amber-600 mt-1">{retreatmentRate}%</div>
            <p className="text-slate-400 text-[9px] mt-0.5">Complex refitting required</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Active Revenue</span>
          <div>
            <div className="text-2xl font-black text-teal-600 mt-1">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-slate-400 text-[9px] mt-0.5">Endodontic clinical yield</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Key Focus Area</span>
          <div>
            <div className="text-xs font-bold text-slate-800 mt-1 truncate">{mostTreatedTooth}</div>
            <p className="text-slate-400 text-[9px] mt-0.5">Most treated anatomical zone</p>
          </div>
        </div>
      </div>

      {/* Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border shadow-xs lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Case Volume Trends</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={casesOverTimeData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <ChartTooltip />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                <Area type="monotone" dataKey="InProgress" stroke="#ef4444" fillOpacity={1} fill="url(#colorActive)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Most Treated Teeth Distribution</h3>
          {toothDistributionData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-xs">No active cases to map tooth distribution.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toothDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tooth" fontSize={9} tickLine={false} />
                  <YAxis fontSize={9} tickLine={false} />
                  <ChartTooltip />
                  <Bar dataKey="cases" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {toothDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Case Management Workspace (Module 1) */}
      <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
        {/* Filters Panel */}
        <div className="p-5 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by case, patient, tooth..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto justify-end">
            <div className="flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg text-xs">
              <Filter size={12} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent focus:outline-none text-[11px] font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Reopened">Reopened</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg text-xs">
              <Sliders size={12} className="text-slate-400" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent focus:outline-none text-[11px] font-medium"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">Loading root canal case files...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No endodontic cases match your selection parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-5">Case Number</th>
                  <th className="py-3 px-5">Patient Name</th>
                  <th className="py-3 px-5 text-center">Tooth</th>
                  <th className="py-3 px-5">Clinical Diagnosis</th>
                  <th className="py-3 px-5 text-center">Priority</th>
                  <th className="py-3 px-5">Current Stage</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs text-slate-600">
                {filteredCases.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-5 font-bold text-red-600">{item.case_number}</td>
                    <td className="py-3 px-5">
                      <div>
                        <p className="font-bold text-slate-800">{item.patient_name}</p>
                        <p className="text-[10px] text-slate-400">ID: {(item as any).patient_code || `PAT-${item.patient_id}`}</p>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="inline-block bg-slate-100 text-slate-700 font-black px-2 py-1 rounded text-xs border">
                        {item.tooth_number}
                      </span>
                    </td>
                    <td className="py-3 px-5 max-w-xs truncate" title={item.diagnosis}>
                      {item.diagnosis}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-100' :
                        item.priority === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        item.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-slate-50 text-slate-600 border'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1">
                        <Activity size={12} className="text-red-500 animate-pulse" />
                        <span className="font-semibold text-slate-700">{item.current_stage}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        item.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition"
                      >
                        Open Case File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Details Dialog (Large View for Modules 2, 3, 4, 5, 6, 7, 8, 10) */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-start bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-100 uppercase">
                    {selectedCase.case_number}
                  </span>
                  <span className="text-slate-400 text-xs">· Clinical command file</span>
                </div>
                <h2 className="text-lg font-black text-slate-800 mt-1">
                  {selectedCase.patient_name} — Tooth {selectedCase.tooth_number} Endodontics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diagnosis: <span className="font-semibold text-slate-700">{selectedCase.diagnosis}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 bg-white border hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                Close File
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b overflow-x-auto bg-slate-50 px-6 gap-1">
              {[
                { id: 'workflow', label: '17-Stage Workflow', icon: Activity },
                { id: 'canals', label: 'Tooth Details & WL', icon: Stethoscope },
                { id: 'visits', label: 'Multi-Visit Logs', icon: Clock },
                { id: 'radiographs', label: 'PACS Radiographs', icon: ImageIcon },
                { id: 'complications', label: 'Complications', icon: AlertTriangle },
                { id: 'recalls', label: 'Recalls & Reviews', icon: Calendar },
                { id: 'materials', label: 'Materials Checked', icon: ClipboardList }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCaseTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 -mb-px ${
                    activeCaseTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: WORKFLOW STAGES (Module 2) */}
              {activeCaseTab === 'workflow' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Crown follow-up pipeline (Module 8)</h4>
                    <div className="flex flex-col md:flex-row items-center gap-3">
                      {[
                        { stage: 'Completed RCT', active: selectedCase.status === 'Completed' },
                        { stage: 'Post & Core', active: selectedCase.crown_status === 'Post & Core' || selectedCase.crown_status === 'Crown Prep' || selectedCase.crown_status === 'Crown Delivered' },
                        { stage: 'Crown Prep', active: selectedCase.crown_status === 'Crown Prep' || selectedCase.crown_status === 'Crown Delivered' },
                        { stage: 'Sent to Lab', active: selectedCase.crown_status === 'Sent to Lab' },
                        { stage: 'Crown Delivered', active: selectedCase.crown_status === 'Crown Delivered' }
                      ].map((item, idx, arr) => (
                        <React.Fragment key={item.stage}>
                          <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold flex-1 text-center justify-center ${
                            item.active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {item.stage}
                          </div>
                          {idx < arr.length - 1 && <ChevronRight size={14} className="text-slate-300 hidden md:block" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        17-Stage Endodontic Progression Map (Module 2)
                      </h3>
                      <p className="text-[10px] text-slate-400">Click a stage block to override case clinical position manually.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {RCT_STAGES_ORDER.map((stage, idx) => {
                        const isCurrent = selectedCase.current_stage === stage;
                        const currentIdx = RCT_STAGES_ORDER.indexOf(selectedCase.current_stage);
                        const isPast = idx < currentIdx;

                        return (
                          <button
                            key={stage}
                            onClick={() => handleUpdateStage(stage)}
                            disabled={!isDoctorOrAdmin}
                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                              isCurrent ? 'bg-red-50 border-red-500 text-red-700 shadow-xs ring-1 ring-red-500/20' :
                              isPast ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <span className="text-[9px] font-black text-slate-400 uppercase">Step {idx + 1}</span>
                            <span className="text-[10px] font-bold tracking-tight leading-tight block mt-1">{stage}</span>
                            {isPast && <span className="text-[8px] text-emerald-600 font-bold self-end mt-1">✓ Passed</span>}
                            {isCurrent && <span className="text-[8px] text-red-600 font-bold self-end mt-1 animate-pulse">● Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TOOTH DETAILS & WL (Module 3) */}
              {activeCaseTab === 'canals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Canal Morphology & Diagnostic Specifications</h3>
                      <p className="text-[10px] text-slate-400">Physical measurements of root canals from tactile negotiation and apex locator readings.</p>
                    </div>
                    {isDoctorOrAdmin && (
                      <button
                        onClick={() => setShowAddCanal(true)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Canal Config
                      </button>
                    )}
                  </div>

                  {caseCanals.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border rounded-xl text-slate-400 text-xs">
                      No root canals have been measured or specified. Click 'Add Canal Config' to log morphology.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {caseCanals.map((canal) => (
                        <div key={canal.id} className="bg-white border rounded-xl p-4 shadow-xs space-y-3">
                          <div className="flex justify-between items-start border-b pb-2">
                            <div>
                              <p className="font-black text-slate-800 text-xs">{canal.canal_name}</p>
                              <p className="text-[9px] text-slate-400">File System: {canal.file_system_used}</p>
                            </div>
                            <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-100">
                              WL: {canal.working_length} mm
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                            <div>
                              <span className="text-slate-400 font-medium">Apex Locator:</span>
                              <p className="font-bold text-slate-800">{canal.apex_locator_value === 0 ? '0.0 (Apex)' : `${canal.apex_locator_value} mm`}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Obturation Point:</span>
                              <p className="font-bold text-slate-800">{canal.obturation_material}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Sealer Compound:</span>
                              <p className="font-bold text-slate-800">{canal.sealer}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Post / Core Integration:</span>
                              <p className="font-bold text-slate-800">
                                {canal.post_type !== 'None' ? `${canal.post_type} / ${canal.core_material}` : `Core Only: ${canal.core_material}`}
                              </p>
                            </div>
                          </div>

                          <div className="border-t pt-2 mt-2">
                            <span className="text-slate-400 text-[9px] font-bold block mb-1">Irrigants & Medicaments:</span>
                            <div className="flex flex-wrap gap-1">
                              {canal.irrigants.map(irr => (
                                <span key={irr} className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded border">{irr}</span>
                              ))}
                              {canal.medicaments.map(med => (
                                <span key={med} className="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded border border-amber-100 font-medium">{med}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Canal Modal (Embedded Form) */}
                  {showAddCanal && (
                    <form onSubmit={handleAddCanal} className="bg-slate-50 border rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Configure Root Canal Morphology</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Canal Name / Code</label>
                          <input
                            type="text"
                            value={newCanalForm.canal_name}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, canal_name: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                            placeholder="e.g. Mesio-Buccal 1 (MB1)"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Working Length (mm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newCanalForm.working_length}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, working_length: Number(e.target.value) })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Apex Locator Value</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newCanalForm.apex_locator_value}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, apex_locator_value: Number(e.target.value) })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Rotary File System</label>
                          <input
                            type="text"
                            value={newCanalForm.file_system_used}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, file_system_used: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Sealer Compound</label>
                          <input
                            type="text"
                            value={newCanalForm.sealer}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, sealer: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Obturation Cone</label>
                          <input
                            type="text"
                            value={newCanalForm.obturation_material}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, obturation_material: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Post System</label>
                          <select
                            value={newCanalForm.post_type}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, post_type: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          >
                            <option value="None">None</option>
                            <option value="Glass Fiber Post">Glass Fiber Post</option>
                            <option value="Custom Cast Post">Custom Cast Post</option>
                            <option value="Metal Screw Post">Metal Screw Post</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Core Material</label>
                          <input
                            type="text"
                            value={newCanalForm.core_material}
                            onChange={(e) => setNewCanalForm({ ...newCanalForm, core_material: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddCanal(false)}
                          className="px-3 py-1.5 bg-white border text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                        >
                          Confirm Canal Setup
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: VISITS LOGS (Module 5) */}
              {activeCaseTab === 'visits' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Multi-Visit Chronological Logs (Module 5)</h3>
                      <p className="text-[10px] text-slate-400">Records of clinical steps executed across appointments, timings, and notes.</p>
                    </div>
                    {isDoctorOrAdmin && (
                      <button
                        onClick={() => setShowAddVisit(true)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Log Visit Procedures
                      </button>
                    )}
                  </div>

                  {/* Visit Add Form */}
                  {showAddVisit && (
                    <form onSubmit={handleAddVisit} className="bg-slate-50 border rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Record Visit Procedures</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Select Completed Stages / Procedures</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white border p-3 rounded max-h-40 overflow-y-auto">
                            {RCT_STAGES_ORDER.map(stage => (
                              <label key={stage} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newVisitForm.procedures_completed.includes(stage)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewVisitForm({
                                        ...newVisitForm,
                                        procedures_completed: [...newVisitForm.procedures_completed, stage]
                                      });
                                    } else {
                                      setNewVisitForm({
                                        ...newVisitForm,
                                        procedures_completed: newVisitForm.procedures_completed.filter(s => s !== stage)
                                      });
                                    }
                                  }}
                                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                {stage}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Chair Time Taken (Mins)</label>
                            <input
                              type="number"
                              value={newVisitForm.time_taken}
                              onChange={(e) => setNewVisitForm({ ...newVisitForm, time_taken: Number(e.target.value) })}
                              className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Next Appt Recommendation</label>
                            <input
                              type="datetime-local"
                              value={newVisitForm.next_appointment}
                              onChange={(e) => setNewVisitForm({ ...newVisitForm, next_appointment: e.target.value })}
                              className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Clinical Doctor Notes</label>
                        <textarea
                          rows={2}
                          value={newVisitForm.doctor_notes}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, doctor_notes: e.target.value })}
                          className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          placeholder="Describe root canal anatomy, instrumentation sizes, canal patency, etc."
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddVisit(false)}
                          className="px-3 py-1.5 bg-white border text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                        >
                          Save Visit Log
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Visits Timeline */}
                  {caseVisits.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border rounded-xl text-slate-400 text-xs">
                      No visits have been logged for this case.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {caseVisits.map((visit) => (
                        <div key={visit.id} className="bg-white border rounded-xl p-4 shadow-xs relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-50 text-red-700 font-black text-xs px-2.5 py-1 rounded border border-red-100">
                                Visit #{visit.visit_number}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">{visit.date}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1"><Clock size={11} /> {visit.time_taken} mins chair time</span>
                              {visit.next_appointment && (
                                <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded font-bold border border-yellow-100">
                                  Next: {new Date(visit.next_appointment).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block">Procedures Completed:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {visit.procedures_completed.map(proc => (
                                  <span key={proc} className="bg-slate-100 text-slate-800 text-[9px] px-2 py-0.5 rounded border font-medium">
                                    {proc}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block">Doctor Notes & Observations:</span>
                              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded border">
                                {visit.doctor_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PACS RADIOGRAPHS (Module 4) */}
              {activeCaseTab === 'radiographs' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Endodontic PACS Diagnostic Imaging Center (Module 4)</h3>
                      <p className="text-[10px] text-slate-400">Store and inspect critical intra-oral periapical radiographs (IOPA) for each stage.</p>
                    </div>
                    {isDoctorOrAdmin && (
                      <button
                        onClick={() => setShowAddRad(true)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Link IOPA / RVG File
                      </button>
                    )}
                  </div>

                  {showAddRad && (
                    <form onSubmit={handleAddRad} className="bg-slate-50 border rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add Radiograph Asset</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Radiograph Stage Category</label>
                          <select
                            value={newRadForm.type}
                            onChange={(e) => setNewRadForm({ ...newRadForm, type: e.target.value as any })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          >
                            <option value="Pre-op IOPA">Pre-op IOPA</option>
                            <option value="Working Length IOPA">Working Length IOPA</option>
                            <option value="Master Cone IOPA">Master Cone IOPA</option>
                            <option value="Obturation IOPA">Obturation IOPA</option>
                            <option value="Post-op IOPA">Post-op IOPA</option>
                            <option value="CBCT">CBCT Scan</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Upload File (Mock Simulation URL)</label>
                          <input
                            type="text"
                            value={newRadForm.url}
                            onChange={(e) => setNewRadForm({ ...newRadForm, url: e.target.value })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Radiographic Notes & Diagnostic Annotations</label>
                        <textarea
                          rows={2}
                          value={newRadForm.notes}
                          onChange={(e) => setNewRadForm({ ...newRadForm, notes: e.target.value })}
                          className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          placeholder="e.g., Periapical radiolucency size, obturation density..."
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddRad(false)}
                          className="px-3 py-1.5 bg-white border text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
                        >
                          Link Radiograph
                        </button>
                      </div>
                    </form>
                  )}

                  {caseRadiographs.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border rounded-xl text-slate-400 text-xs">
                      No radiographs have been attached to this clinical file.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {caseRadiographs.map((rad) => (
                        <div key={rad.id} className="bg-white border rounded-xl overflow-hidden shadow-xs">
                          <img
                            src={rad.url}
                            alt={rad.type}
                            className="w-full h-44 object-cover border-b referrer-policy"
                            referrerPolicy="no-referrer"
                          />
                          <div className="p-3.5 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-100">
                                {rad.type}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">Uploaded: {new Date(rad.uploaded_at).toLocaleDateString()}</span>
                            </div>
                            {rad.notes && <p className="text-[11px] text-slate-500 italic">Notes: {rad.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: COMPLICATIONS (Module 6) */}
              {activeCaseTab === 'complications' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Clinical Complications Tracker (Module 6)</h3>
                      <p className="text-[10px] text-slate-400">Strictly record procedural mishaps, flare-ups, and resolution records.</p>
                    </div>
                    {isDoctorOrAdmin && (
                      <button
                        onClick={() => setShowAddComplication(true)}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Log Misadventure / Alert
                      </button>
                    )}
                  </div>

                  {showAddComplication && (
                    <form onSubmit={handleAddComplication} className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Log Complication</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Complication Type</label>
                          <select
                            value={newComplicationForm.type}
                            onChange={(e) => setNewComplicationForm({ ...newComplicationForm, type: e.target.value as any })}
                            className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          >
                            <option value="Broken Instrument">Broken Instrument</option>
                            <option value="Ledge Formation">Ledge Formation</option>
                            <option value="Perforation">Perforation (Pulpal Floor/Lateral)</option>
                            <option value="Missed Canal">Missed Canal</option>
                            <option value="Persistent Infection">Persistent Infection</option>
                            <option value="Flare-up">Acute Flare-up</option>
                            <option value="Retreatment Required">Retreatment Required</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Clinical Intervention Plan</label>
                        <textarea
                          rows={2}
                          value={newComplicationForm.notes}
                          onChange={(e) => setNewComplicationForm({ ...newComplicationForm, notes: e.target.value })}
                          className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                          placeholder="Describe how this event will be handled (e.g., bypass attempt, mineral trioxide aggregate (MTA) patch, specialized referral)..."
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddComplication(false)}
                          className="px-3 py-1.5 bg-white border text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
                        >
                          Log Procedural Complication
                        </button>
                      </div>
                    </form>
                  )}

                  {caseComplications.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border rounded-xl text-slate-400 text-xs">
                      No procedural complications or clinical alert flags are recorded.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {caseComplications.map((comp) => (
                        <div key={comp.id} className={`p-4 rounded-xl border relative ${
                          comp.resolution_status === 'Resolved' ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className={comp.resolution_status === 'Resolved' ? 'text-emerald-600' : 'text-red-600'} size={16} />
                              <span className="font-bold text-slate-800 text-xs">{comp.type}</span>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              comp.resolution_status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                            }`}>
                              {comp.resolution_status}
                            </span>
                          </div>

                          <div className="mt-2.5 text-xs text-slate-600">
                            <span className="text-slate-400 font-bold text-[10px] block">Incident Notes:</span>
                            <p className="mt-0.5 leading-relaxed bg-white border p-2.5 rounded">{comp.notes}</p>
                          </div>

                          {comp.resolution_status === 'Active' ? (
                            <div className="mt-3 text-right">
                              <button
                                onClick={() => {
                                  const notes = prompt('Enter resolution clinical procedures notes:');
                                  if (notes) handleResolveComplication(comp.id, notes);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition"
                              >
                                Resolve Incident & Log Notes
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2.5 text-xs text-slate-600">
                              <span className="text-slate-400 font-bold text-[10px] block">Resolution Action Logs:</span>
                              <p className="mt-0.5 leading-relaxed bg-emerald-50/80 border border-emerald-100 p-2.5 rounded font-medium italic text-emerald-800">
                                {comp.resolution_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: RECALLS & REVIEWS (Module 10) */}
              {activeCaseTab === 'recalls' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Automated Post-RCT Recalls & Long-term Reviews (Module 10)</h3>
                    <p className="text-[10px] text-slate-400">Standardized timelines to monitor apical healing, bone regeneration, and crown structural integrity.</p>
                  </div>

                  {caseReviews.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border rounded-xl text-slate-400 text-xs">
                      No recall schedules have been generated. (Recall schedules are created automatically when the RCT case is marked 'Completed').
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {caseReviews.map((rev) => (
                        <div key={rev.id} className="bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] border">
                                {rev.recall_type} Review
                              </span>
                              <span className={`text-[10px] font-black ${
                                rev.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400'
                              }`}>
                                {rev.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span className="font-semibold text-slate-400">Target Date:</span> {rev.scheduled_at}
                            </div>
                            {rev.completed_at && (
                              <div className="text-[10px] text-emerald-600">
                                <span className="font-semibold text-emerald-700">Completed On:</span> {rev.completed_at}
                              </div>
                            )}
                            {rev.clinical_findings && (
                              <div className="bg-slate-50 p-2 border rounded text-xs text-slate-600 mt-1 italic">
                                "{rev.clinical_findings}"
                              </div>
                            )}
                          </div>

                          {rev.status === 'Scheduled' && (
                            <button
                              onClick={() => {
                                const findings = prompt('Enter review findings & symptoms (if any):');
                                if (findings) handleCompleteReview(rev.id, findings);
                              }}
                              className="w-full mt-4 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition text-center"
                            >
                              Log Completed Review
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: MATERIALS USED (Module 7) */}
              {activeCaseTab === 'materials' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Clinical Materials Inventory Integration (Module 7)</h3>
                    <p className="text-[10px] text-slate-400">Tracks micro-consumption of endodontic rotary files, gutta percha tapers, sealers, and posts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-xl p-4 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Recorded Materials Consumption in this Case</h4>
                      
                      {caseCanals.length === 0 ? (
                        <p className="text-slate-400 text-xs py-10 text-center">No materials consumption logged. Add canal configurations to map specific sealers, file series, and medicaments.</p>
                      ) : (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b pb-1.5 text-slate-400 text-[10px] uppercase font-bold">
                            <span>Item Name / Category</span>
                            <span>Quantity Mapped</span>
                          </div>
                          {caseCanals.map((canal) => (
                            <div key={canal.id} className="space-y-1 bg-slate-50/50 p-2 rounded border border-slate-100">
                              <p className="font-bold text-[10px] text-red-600">{canal.canal_name} specs:</p>
                              <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                                <span>{canal.obturation_material}</span>
                                <span className="font-bold">1 point</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                                <span>{canal.sealer}</span>
                                <span className="font-bold">0.1 ml</span>
                              </div>
                              {canal.post_type !== 'None' && (
                                <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                                  <span>{canal.post_type}</span>
                                  <span className="font-bold">1 unit</span>
                                </div>
                              )}
                              <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                                <span>{canal.core_material}</span>
                                <span className="font-bold">1 dose</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border rounded-xl p-4 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Live Endodontic Central Stock Status</h4>
                      <div className="space-y-2.5">
                        {materials.map((mat) => (
                          <div key={mat.id} className="flex justify-between items-center text-xs border-b pb-2 last:border-none">
                            <div>
                              <p className="font-bold text-slate-800">{mat.name}</p>
                              <p className="text-[10px] text-slate-400">{mat.brand} · {mat.category}</p>
                            </div>
                            <span className={`font-black px-2 py-0.5 rounded ${
                              mat.stock < 10 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-700 border'
                            }`}>
                              {mat.stock} {mat.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Close Case File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CASE DIALOG (Module 14) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleCreateCase} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-start bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Initialize Clinical Endodontic Case</h2>
                <p className="text-xs text-slate-500 mt-0.5">Launches automatic workflows including billing, dental chart updating, and TC notifications.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 bg-white border hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Active Patient</label>
                  <select
                    value={newCaseForm.patient_id}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, patient_id: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Patient File --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Code: {p.patient_code || `P-${p.id}`})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Tooth Number</label>
                  <input
                    type="text"
                    value={newCaseForm.tooth_number}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, tooth_number: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g. 16, 21, 46..."
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pulp Vitality Status</label>
                  <select
                    value={newCaseForm.pulp_status}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, pulp_status: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Normal Pulp">Normal Pulp (Vital)</option>
                    <option value="Reversible Pulpitis">Reversible Pulpitis</option>
                    <option value="Irreversible Pulpitis">Symptomatic Irreversible Pulpitis</option>
                    <option value="Asymptomatic Irreversible Pulpitis">Asymptomatic Irreversible Pulpitis</option>
                    <option value="Necrotic">Pulpal Necrosis (Non-Vital)</option>
                    <option value="Previously Treated">Previously Treated</option>
                    <option value="Previously Initiated">Previously Initiated</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Periapical Status</label>
                  <select
                    value={newCaseForm.periapical_status}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, periapical_status: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Normal Periapical">Normal Periapical Tissues</option>
                    <option value="Symptomatic Apical Periodontitis">Symptomatic Apical Periodontitis</option>
                    <option value="Asymptomatic Apical Periodontitis">Asymptomatic Apical Periodontitis</option>
                    <option value="Acute Apical Abscess">Acute Apical Abscess</option>
                    <option value="Chronic Apical Abscess">Chronic Apical Abscess</option>
                    <option value="Condensing Osteitis">Condensing Osteitis</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Diagnosis</label>
                  <input
                    type="text"
                    value={newCaseForm.diagnosis}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, diagnosis: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Endodontic Treatment Plan</label>
                  <select
                    value={newCaseForm.treatment_plan}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, treatment_plan: e.target.value })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Standard Root Canal Treatment">Standard Root Canal Treatment</option>
                    <option value="Endodontic Retreatment">Endodontic Retreatment</option>
                    <option value="Apicoectomy / Surgical">Apicoectomy / Surgical Endodontics</option>
                    <option value="Pulpotomy / Vital Pulp Therapy">Pulpotomy / Vital Pulp Therapy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority Alert Level</label>
                  <select
                    value={newCaseForm.priority}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value as any })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent (Severe Infection/Pain)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estimated Cost Plan (INR)</label>
                  <input
                    type="number"
                    value={newCaseForm.estimated_cost}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, estimated_cost: Number(e.target.value) })}
                    className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Case Notes / Symptoms / History</label>
                <textarea
                  rows={3}
                  value={newCaseForm.clinical_notes}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, clinical_notes: e.target.value })}
                  className="border border-slate-200 px-3 py-2 w-full rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Lingering pain to hot/cold, localized swelling, tender on bite..."
                />
              </div>
            </div>

            <div className="p-5 border-t bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white border text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition"
              >
                Dismiss Form
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Launch Endodontic Case
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
