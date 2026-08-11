import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Receipt, Clock, BarChart3, Plus, Trash2, Send,
  CheckCircle2, AlertTriangle, Calendar, FileDown, Search, ArrowRight,
  User, TrendingUp, Sparkles, Filter, X, Eye, Phone, MessageSquare, ShieldAlert
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import {
  getTreatmentPlans,
  getTreatmentPlanItems,
  createTreatmentPlan,
  updateTreatmentPlanStatus,
  getTreatmentFollowups,
  createTreatmentFollowup,
  updateFollowupStatus,
  getTreatmentEstimates,
  createTreatmentEstimate,
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentFollowup,
  TreatmentEstimate
} from '../../services/treatmentCoordinatorService';
import { openWhatsApp } from '../../utils/whatsapp';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function TreatmentCoordinator() {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'planner' | 'followups' | 'analytics'>('dashboard');
  
  // Data States
  const [patients, setPatients] = useState<any[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [followups, setFollowups] = useState<TreatmentFollowup[]>([]);
  const [estimates, setEstimates] = useState<TreatmentEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form States for Plan Creation
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [estimatedDuration, setEstimatedDuration] = useState('2 Weeks');
  const [doctorName, setDoctorName] = useState('Dr. Durga Bhavani Jupalli');
  const [notes, setNotes] = useState('');
  const [procedureRows, setProcedureRows] = useState<{ treatment_name: string; tooth_no: string; cost: number; notes: string }[]>([
    { treatment_name: 'Root Canal Treatment', tooth_no: '', cost: 12000, notes: '' }
  ]);

  // Modals / Status Change
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [planItems, setPlanItems] = useState<TreatmentPlanItem[]>([]);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'Accepted' | 'Rejected' | 'Thinking' | 'Postponed'>('Accepted');
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  // Follow-up Creator State
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [fPatientId, setFPatientId] = useState<number | ''>('');
  const [fTaskType, setFTaskType] = useState('Call Tomorrow');
  const [fDueDate, setFDueDate] = useState('');
  const [fNotes, setFNotes] = useState('');

  // Notification States
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Base Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Patients to support dropdowns
      const { data: ptData } = await supabase
        .from('patients')
        .select('id, name, phone, patient_code')
        .order('name', { ascending: true });
      setPatients(ptData || []);

      // 2. Fetch Treatment Coordinator Data
      const fetchedPlans = await getTreatmentPlans();
      const fetchedFollowups = await getTreatmentFollowups();
      const fetchedEstimates = await getTreatmentEstimates();

      setPlans(fetchedPlans);
      setFollowups(fetchedFollowups);
      setEstimates(fetchedEstimates);
    } catch (err) {
      console.error('[TreatmentCoordinator] Fetch failed', err);
      showToast('error', 'Sync Failure', 'Failed to retrieve cloud synchronizations. falling back to offline records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Plans & Followups
  const filteredPlans = plans.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.diagnosis.toLowerCase().includes(q) ||
      (p.patient_name && p.patient_name.toLowerCase().includes(q)) ||
      (p.coordinator_name && p.coordinator_name.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const pendingPlans = plans.filter(p => ['Diagnosis Created', 'Treatment Planned', 'Estimate Shared', 'Patient Thinking'].includes(p.status));
  const thinkingPlans = plans.filter(p => p.status === 'Patient Thinking' || p.status === 'Estimate Shared');
  const todayStr = new Date().toISOString().split('T')[0];
  const activeFollowupsToday = followups.filter(f => f.status === 'Pending' && f.due_date <= todayStr);
  
  const acceptedPlans = plans.filter(p => ['Accepted', 'Scheduled', 'Treatment Started', 'Completed'].includes(p.status));
  const rejectedPlans = plans.filter(p => p.status === 'Rejected');

  const totalProposed = plans.length;
  const conversionRate = totalProposed > 0 ? Math.round((acceptedPlans.length / totalProposed) * 100) : 0;
  
  const totalPipelineRevenue = plans
    .filter(p => !['Rejected', 'Cancelled', 'Completed'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.estimated_cost), 0);

  const pendingRevenue = pendingPlans.reduce((sum, p) => sum + Number(p.estimated_cost), 0);
  const acceptedRevenue = acceptedPlans.reduce((sum, p) => sum + Number(p.estimated_cost), 0);

  // Row operations for treatment planner
  const addProcedureRow = () => {
    setProcedureRows([...procedureRows, { treatment_name: '', tooth_no: '', cost: 0, notes: '' }]);
  };

  const removeProcedureRow = (index: number) => {
    if (procedureRows.length === 1) return;
    setProcedureRows(procedureRows.filter((_, idx) => idx !== index));
  };

  const updateProcedureRow = (index: number, field: string, value: any) => {
    const updated = procedureRows.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setProcedureRows(updated);
  };

  // Submit Treatment Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      showToast('error', 'Selection Required', 'Please select a valid patient.');
      return;
    }

    const patient = patients.find(p => p.id === Number(selectedPatientId));
    if (!patient) return;

    const totalCost = procedureRows.reduce((sum, row) => sum + Number(row.cost), 0);

    const planPayload = {
      patient_id: patient.id,
      patient_name: patient.name,
      patient_phone: patient.phone,
      diagnosis,
      priority,
      status: 'Treatment Planned' as const,
      estimated_cost: totalCost,
      estimated_duration: estimatedDuration,
      doctor_name: doctorName,
      coordinator_name: 'Bhavani', // Current coordinator
      notes
    };

    const itemsPayload = procedureRows.map(row => ({
      treatment_name: row.treatment_name,
      tooth_no: row.tooth_no,
      cost: Number(row.cost),
      status: 'Proposed' as const,
      notes: row.notes
    }));

    try {
      const created = await createTreatmentPlan(planPayload, itemsPayload);
      
      // Auto generate estimates too
      await createTreatmentEstimate({
        plan_id: created.id,
        patient_id: patient.id,
        patient_name: patient.name,
        valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        terms: '1. Estimate valid for 30 days.\n2. Standard clinic guidelines apply.\n3. Digital EMI options available.',
        share_status: 'Draft'
      });

      showToast('success', 'Plan Logged', 'Treatment plan and estimates logged successfully. Automated followup scheduled.');
      
      // Clear Form
      setSelectedPatientId('');
      setDiagnosis('');
      setPriority('Medium');
      setEstimatedDuration('2 Weeks');
      setNotes('');
      setProcedureRows([{ treatment_name: '', tooth_no: '', cost: 0, notes: '' }]);
      
      fetchData();
      setActiveSubTab('dashboard');
    } catch (err) {
      showToast('error', 'Failed', 'Could not save treatment plan.');
    }
  };

  // View Plan Details and fetch its procedural items
  const handleViewPlan = async (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    try {
      const items = await getTreatmentPlanItems(plan.id);
      setPlanItems(items);
    } catch {
      setPlanItems([]);
    }
  };

  // Log Decision / Case Acceptance
  const handleLogDecisionSubmit = async () => {
    if (!selectedPlan) return;
    
    try {
      const dbStatus = decisionType === 'Accepted' ? 'Accepted' :
                       decisionType === 'Rejected' ? 'Rejected' :
                       decisionType === 'Postponed' ? 'Recall' : 'Patient Thinking';

      await updateTreatmentPlanStatus(selectedPlan.id, dbStatus, {
        decision: decisionType,
        reason: rejectionReason,
        notes: decisionNotes,
        patient_name: selectedPlan.patient_name
      });

      showToast('success', 'Case Updated', `Patient decision logged. Automated tasks generated.`);
      setIsDecisionModalOpen(false);
      setSelectedPlan(null);
      setRejectionReason('');
      setDecisionNotes('');
      fetchData();
    } catch (err) {
      showToast('error', 'Error', 'Failed to update patient decision.');
    }
  };

  // Create Custom Follow-up task
  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPatientId || !fDueDate) {
      showToast('error', 'Validation Error', 'Please select a patient and due date.');
      return;
    }

    const patient = patients.find(p => p.id === Number(fPatientId));
    if (!patient) return;

    try {
      await createTreatmentFollowup({
        patient_id: patient.id,
        patient_name: patient.name,
        patient_phone: patient.phone,
        task_type: fTaskType,
        due_date: fDueDate,
        status: 'Pending',
        notes: fNotes
      });

      showToast('success', 'Task Scheduled', 'New clinical follow-up task added.');
      setIsFollowupModalOpen(false);
      setFPatientId('');
      setFNotes('');
      fetchData();
    } catch {
      showToast('error', 'Failure', 'Failed to create task.');
    }
  };

  // Complete Followup task
  const handleCompleteFollowup = async (id: string) => {
    try {
      await updateFollowupStatus(id, 'Completed');
      showToast('success', 'Completed', 'Followup task marked as resolved.');
      fetchData();
    } catch {
      showToast('error', 'Error', 'Failed to update task.');
    }
  };

  // Trigger simulated WhatsApp notification
  const triggerWhatsApp = (pPhone: string | undefined, pName: string | undefined, diag: string) => {
    if (!pPhone) return;
    const cleanPhone = pPhone.replace(/\s+/g, '');
    const message = `Hi ${pName || 'Patient'}, this is Sri Chaitanya Multispeciality Dental Care. Our Treatment Coordinator shared your customized treatment plan for *${diag}*. Please feel free to call us or reply here if you have any questions or to schedule your appointment!`;
    openWhatsApp(cleanPhone, message);
    showToast('info', 'WhatsApp Initiated', `Opening WhatsApp dispatch console for ${pName}.`);
  };

  // Generate Estimate PDF
  const generatePDF = (plan: TreatmentPlan, items: TreatmentPlanItem[]) => {
    const doc = new jsPDF() as any;

    // Headings
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 118, 110); // Teal 700
    doc.text('SRI CHAITANYA MULTISPECIALITY DENTAL CARE', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.text('Vijayawada, Andhra Pradesh | Contact: +91 98480 22338', 14, 26);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 30, 196, 30);

    // Document Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL TREATMENT ESTIMATE & COST SUMMARY', 14, 40);

    // Metadata Grid
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT DETAILS', 14, 50);
    doc.text('CLINICAL DETAILS', 110, 50);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient Name: ${plan.patient_name || 'N/A'}`, 14, 56);
    doc.text(`Patient ID: ${(plan as any).patient_code || `PAT-${plan.patient_id}`}`, 14, 62);
    doc.text(`Phone: +91 ${plan.patient_phone || 'N/A'}`, 14, 68);

    doc.text(`Diagnosis: ${plan.diagnosis}`, 110, 56);
    doc.text(`Priority Level: ${plan.priority}`, 110, 62);
    doc.text(`Lead Doctor: ${plan.doctor_name || 'N/A'}`, 110, 68);
    doc.text(`Estimated Duration: ${plan.estimated_duration}`, 110, 74);

    // Table of Items
    const tableHeaders = [['S.No', 'Treatment / Procedure Name', 'Tooth Number', 'Estimated Cost (INR)']];
    const tableRows = items.map((item, idx) => [
      idx + 1,
      item.treatment_name,
      item.tooth_no || 'All',
      `Rs. ${Number(item.cost).toLocaleString('en-IN')}`
    ]);

    doc.autoTable({
      startY: 82,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 100 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: 'right' }
      }
    });

    // Grand Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(`GRAND TOTAL ESTIMATE: Rs. ${Number(plan.estimated_cost).toLocaleString('en-IN')}`, 115, finalY);

    // Terms
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & CONDITIONS:', 14, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text('1. This estimate is valid for 30 calendar days from the date of generation.', 14, finalY + 21);
    doc.text('2. Actual clinical findings during surgical procedures may slightly alter treatment protocols.', 14, finalY + 26);
    doc.text('3. Flexible financing & Zero-cost EMI options are available via Bajaj Finserv / Pine Labs.', 14, finalY + 31);

    // Signatures
    doc.text('Authorized Seal / Signature', 140, finalY + 50);
    doc.line(140, finalY + 46, 190, finalY + 46);

    doc.save(`Treatment_Estimate_${plan.patient_name?.replace(/\s+/g, '_')}.pdf`);
    showToast('success', 'PDF Export Complete', 'Treatment estimate PDF has been compiled and downloaded.');
  };

  // Recharts Chart Data Prep
  const analyticsData = plans.reduce((acc: any[], plan) => {
    const month = new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short' });
    const existing = acc.find(item => item.name === month);
    if (existing) {
      existing.Pipeline += Number(plan.estimated_cost);
      if (['Accepted', 'Completed', 'Scheduled', 'Treatment Started'].includes(plan.status)) {
        existing.Accepted += Number(plan.estimated_cost);
      }
    } else {
      acc.push({
        name: month,
        Pipeline: Number(plan.estimated_cost),
        Accepted: ['Accepted', 'Completed', 'Scheduled', 'Treatment Started'].includes(plan.status) ? Number(plan.estimated_cost) : 0
      });
    }
    return acc;
  }, []);

  // Root cause of rejections
  const rejectionData = plans
    .filter(p => p.status === 'Rejected')
    .reduce((acc: any[], plan) => {
      // Find historical rejection reason if logged, or fallback
      const reason = 'Fear / Anxiety of Surgery'; // sample fallback
      const existing = acc.find(item => item.name === reason);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: reason, value: 1 });
      }
      return acc;
    }, []);

  // Colors for Recharts
  const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-xl animate-bounce">
          <div className={`p-2 rounded-xl ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{toast.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Premium Executive Header */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-teal-500/15 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Sparkles size={11} className="text-teal-400" /> Sri Chaitanya Enterprise Care Suite
          </div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            Treatment Coordinator Dashboard <span className="text-xs font-mono font-bold bg-teal-600 text-white px-2.5 py-0.5 rounded-full uppercase">Active</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Increase clinical case acceptance. Manage procedural estimates, structure patient-facing payment choices, track follow-up communication intervals, and compile performance pipelines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedPatientId('');
              setDiagnosis('');
              setProcedureRows([{ treatment_name: '', tooth_no: '', cost: 0, notes: '' }]);
              setActiveSubTab('planner');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus size={14} /> New Treatment Plan
          </button>
          <button
            onClick={() => setIsFollowupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Clock size={14} /> New Follow-up Task
          </button>
        </div>
      </div>

      {/* Internal Navigation Toggles */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1 flex-shrink-0">
        {[
          { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard },
          { id: 'planner', label: 'Plan & Estimate Builder', icon: Receipt },
          { id: 'followups', label: 'Follow-up Scheduler', icon: Clock },
          { id: 'analytics', label: 'Case Acceptance Metrics', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100/50 font-black'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB TAB RENDERINGS */}

      {/* 1. EXECUTIVE OVERVIEW */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics Board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border rounded-2xl p-4.5 shadow-sm space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Revenue Pipeline</span>
              <div className="text-xl font-black text-slate-800">Rs. {totalPipelineRevenue.toLocaleString('en-IN')}</div>
              <div className="text-[9.5px] text-slate-500 font-medium">Pending: <span className="font-bold text-amber-600">Rs. {pendingRevenue.toLocaleString('en-IN')}</span></div>
            </div>
            
            <div className="bg-white border rounded-2xl p-4.5 shadow-sm space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Case Acceptance Rate</span>
              <div className="text-xl font-black text-slate-800 flex items-baseline gap-1">
                {conversionRate}% <TrendingUp size={14} className="text-emerald-500 inline shrink-0" />
              </div>
              <div className="text-[9.5px] text-slate-500 font-medium">Accepted: <span className="font-bold text-emerald-600">Rs. {acceptedRevenue.toLocaleString('en-IN')}</span></div>
            </div>

            <div className="bg-white border rounded-2xl p-4.5 shadow-sm space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Today's Follow-ups</span>
              <div className="text-xl font-black text-slate-800">{activeFollowupsToday.length} Tasks</div>
              <div className="text-[9.5px] text-slate-500 font-medium">Outstanding communication touchpoints</div>
            </div>

            <div className="bg-white border rounded-2xl p-4.5 shadow-sm space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Accepted Cases</span>
              <div className="text-xl font-black text-slate-800">{acceptedPlans.length} Patients</div>
              <div className="text-[9.5px] text-emerald-600 font-bold">Successfully Scheduled / Started</div>
            </div>

            <div className="bg-white border rounded-2xl p-4.5 shadow-sm space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Postponed & Thinking</span>
              <div className="text-xl font-black text-slate-800">{thinkingPlans.length} Cases</div>
              <div className="text-[9.5px] text-slate-500 font-medium">Require proactive clinical reminders</div>
            </div>
          </div>

          {/* Active Treatment Plans List */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Active Case Pipeline & Estimates Tracker</h3>
                <p className="text-[10px] text-slate-400 font-medium">Track generated estimates, change statuses dynamically upon decisions, and dispatch patient WhatsApp sheets.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient, diagnosis..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-48 sm:w-64 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs italic">Loading pipeline records...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">No treatment coordinator plans recorded. Create one using the Plan Builder tab!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b">
                      <th className="p-3">Patient Code / Name</th>
                      <th className="p-3">Primary Diagnosis</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Estimated Cost</th>
                      <th className="p-3">Coordinator / Doctor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPlans.map(plan => (
                      <tr key={plan.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-800">{plan.patient_name || 'Walk-in Patient'}</div>
                          <div className="text-[9px] text-slate-400 font-mono">SC-PT-{plan.patient_id}</div>
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          <div>{plan.diagnosis}</div>
                          <div className="text-[9px] text-slate-400">Duration: {plan.estimated_duration}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            plan.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            plan.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {plan.priority}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-slate-800">
                          Rs. {Number(plan.estimated_cost).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-slate-500">
                          <div>{plan.coordinator_name || 'Bhavani'}</div>
                          <div className="text-[9px] font-mono">{plan.doctor_name || 'Dr. Durga Bhavani Jupalli'}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            ['Accepted', 'Completed', 'Scheduled', 'Treatment Started'].includes(plan.status) ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                            plan.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-150' :
                            plan.status === 'Recall' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                            'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}>
                            {plan.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={async () => {
                              await handleViewPlan(plan);
                              setIsDecisionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                          >
                            <CheckCircle2 size={12} /> Log Decision
                          </button>
                          <button
                            onClick={async () => {
                              const items = await getTreatmentPlanItems(plan.id);
                              generatePDF(plan, items);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold rounded-lg cursor-pointer"
                          >
                            <FileDown size={12} /> Estimate PDF
                          </button>
                          <button
                            onClick={() => triggerWhatsApp(plan.patient_phone, plan.patient_name, plan.diagnosis)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg cursor-pointer"
                          >
                            <Send size={12} /> WhatsApp
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PLAN & ESTIMATE CREATOR */}
      {activeSubTab === 'planner' && (
        <form onSubmit={handleCreatePlan} className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">New Clinical Treatment Plan & Financial Estimate</h3>
            <p className="text-[10px] text-slate-400 font-medium">Add procedure items, define estimated clinician costs, and configure auto-followup reminders based on priority levels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Select Patient *</label>
              <select
                required
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.patient_code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Diagnosis/Indication *</label>
              <input
                type="text"
                required
                placeholder="e.g. Deep dental decay, spacing correction..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Plan Priority Level</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="High">High (Urgent Attention)</option>
                <option value="Medium">Medium (Recommended)</option>
                <option value="Low">Low (Elective/Recall)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Estimated Duration</label>
              <input
                type="text"
                placeholder="e.g. 2 Weeks, 6 Months"
                value={estimatedDuration}
                onChange={e => setEstimatedDuration(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Primary Doctor</label>
              <input
                type="text"
                placeholder="Doctor's Name"
                value={doctorName}
                onChange={e => setDoctorName(e.target.value)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Administrative Coordinator</label>
              <input
                type="text"
                readOnly
                value="Bhavani"
                className="w-full text-xs font-bold p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-sans">Clinical Case Coordinator Notes</label>
            <textarea
              rows={2}
              placeholder="Add payment plan discussions, financing barriers, patient constraints, or follow-up insights..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Procedure Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Procedure / Treatment Line Items</span>
              <button
                type="button"
                onClick={addProcedureRow}
                className="flex items-center gap-1 text-[11px] font-black text-[#2F63E0] hover:underline cursor-pointer"
              >
                <Plus size={12} /> Add Procedure Item
              </button>
            </div>

            <div className="space-y-3">
              {procedureRows.map((row, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150 relative">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-400 font-extrabold uppercase">Procedure Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Composite Restoration, Zirconia Crown..."
                      value={row.treatment_name}
                      onChange={e => updateProcedureRow(idx, 'treatment_name', e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="w-24 space-y-1">
                    <label className="text-[9px] text-slate-400 font-extrabold uppercase">Tooth No</label>
                    <input
                      type="text"
                      placeholder="e.g. 16, 22"
                      value={row.tooth_no}
                      onChange={e => updateProcedureRow(idx, 'tooth_no', e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg text-center"
                    />
                  </div>

                  <div className="w-32 space-y-1">
                    <label className="text-[9px] text-slate-400 font-extrabold uppercase">Cost (INR) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="Cost"
                      value={row.cost || ''}
                      onChange={e => updateProcedureRow(idx, 'cost', Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg text-right"
                    />
                  </div>

                  <div className="flex items-end justify-center pb-1">
                    <button
                      type="button"
                      disabled={procedureRows.length === 1}
                      onClick={() => removeProcedureRow(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total calculation banner */}
            <div className="bg-slate-900 text-white p-4.5 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-black tracking-wide uppercase">Calculated Estimate Total:</span>
              <span className="text-base font-black">
                Rs. {procedureRows.reduce((sum, r) => sum + Number(r.cost), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wide cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 size={14} /> Commit Treatment Estimate
            </button>
          </div>
        </form>
      )}

      {/* 3. FOLLOW-UPS */}
      {activeSubTab === 'followups' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Case Coordinator Follow-up Planner</h3>
                <p className="text-[10px] text-slate-400 font-medium font-sans">Proactively schedule, execute, and mark clinical touchpoints as complete. Includes instant WhatsApp reminders.</p>
              </div>
              <button
                onClick={() => setIsFollowupModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
              >
                <Plus size={13} /> Schedule Task
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b">
                    <th className="p-3">Patient Code / Name</th>
                    <th className="p-3">Communication Channel</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Notes & Reminders</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {followups.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-800">{f.patient_name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">SC-PT-{f.patient_id}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-[#2F63E0]">{f.task_type}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-600">
                        {f.due_date}
                      </td>
                      <td className="p-3 max-w-sm truncate italic text-slate-500">
                        "{f.notes || 'None'}"
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          f.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {f.status === 'Pending' && (
                          <button
                            onClick={() => handleCompleteFollowup(f.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-150 text-emerald-700 border border-emerald-200 font-bold rounded-lg cursor-pointer text-[11px]"
                          >
                            Mark Done
                          </button>
                        )}
                        <button
                          onClick={() => triggerWhatsApp(f.patient_phone, f.patient_name, 'Proposed Treatment Plan')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer text-[11px]"
                        >
                          Send WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue distribution chart */}
          <div className="bg-white rounded-3xl border p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pipeline vs Acceptance Distribution</h3>
              <p className="text-[10px] text-slate-400 font-medium">Monthly breakdown of proposed estimates vs patients who proceeded with clinical bookings.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Pipeline" stroke="#14b8a6" fillOpacity={1} fill="url(#colorPipeline)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Accepted" stroke="#6366f1" fillOpacity={1} fill="url(#colorAccepted)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rejection Root Causes pie chart */}
          <div className="bg-white rounded-3xl border p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Rejection Root Cause Analysis</h3>
              <p className="text-[10px] text-slate-400 font-medium">Visual classification of the psychological/financial reasons patients chose not to accept plans.</p>
            </div>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-around">
              {rejectionData.length === 0 ? (
                <div className="text-slate-400 text-xs italic py-12">No rejection records found to classify.</div>
              ) : (
                <>
                  <div className="h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rejectionData}
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {rejectionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                    {rejectionData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span>{entry.name}: {entry.value} Cases</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DECISION LOGGER MODAL */}
      {isDecisionModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Log Patient Case Decision</h3>
                <p className="text-[9.5px] text-slate-400 font-medium">Update the status of estimate SC-EST-{selectedPlan.id.slice(0, 5)} for {selectedPlan.patient_name}</p>
              </div>
              <button
                onClick={() => {
                  setIsDecisionModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Patient Final Decision *</label>
                <select
                  value={decisionType}
                  onChange={e => setDecisionType(e.target.value as any)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="Accepted">Accepted - Wants to Proceed</option>
                  <option value="Rejected">Rejected - Does Not Want to Proceed</option>
                  <option value="Thinking">Thinking - Needs Follow-up</option>
                  <option value="Postponed">Postponed - Delayed to Future Date</option>
                </select>
              </div>

              {decisionType === 'Rejected' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Rejection Primary Reason *</label>
                  <select
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                  >
                    <option value="">-- Choose Reason --</option>
                    <option value="Financial / Cost Constraint">Financial / Cost Constraint</option>
                    <option value="Fear / Anxiety of Surgery">Fear / Anxiety of Surgery</option>
                    <option value="Decided Second Opinion Elsewhere">Decided Second Opinion Elsewhere</option>
                    <option value="Time / Schedule Constraint">Time / Schedule Constraint</option>
                    <option value="Unconvinced of Treatment Utility">Unconvinced of Treatment Utility</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Internal Decision Notes</label>
                <textarea
                  rows={3}
                  placeholder="Record insights, discount promises, alternative suggestions discussed..."
                  value={decisionNotes}
                  onChange={e => setDecisionNotes(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDecisionModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogDecisionSubmit}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Log Case Acceptance Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOWUP MODAL */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleCreateFollowup} className="bg-white w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Schedule Coordinator Follow-up</h3>
                <p className="text-[9.5px] text-slate-400 font-medium">Add communication intervals to keep patient estimates warm.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFollowupModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Select Patient *</label>
                <select
                  required
                  value={fPatientId}
                  onChange={e => setFPatientId(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Action Type</label>
                <select
                  value={fTaskType}
                  onChange={e => setFTaskType(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                >
                  <option value="Call Tomorrow">Call Tomorrow</option>
                  <option value="WhatsApp Reminder">WhatsApp Reminder</option>
                  <option value="Email Reminder">Email Reminder</option>
                  <option value="Review After 7 Days">Review After 7 Days</option>
                  <option value="Schedule Consultation">Schedule Consultation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Due Date *</label>
                <input
                  type="date"
                  required
                  value={fDueDate}
                  onChange={e => setFDueDate(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Task Description Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record what is to be explained or asked..."
                  value={fNotes}
                  onChange={e => setFNotes(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFollowupModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Schedule Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
