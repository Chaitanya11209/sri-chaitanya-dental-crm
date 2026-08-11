import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  FileCheck,
  AlertOctagon,
  Calendar,
  Layers,
  Database,
  Activity,
  UserCheck,
  Clock,
  Settings as SettingsIcon,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Trash,
  HelpCircle,
  Eye,
  CheckSquare,
  Search,
  User,
  Users as UsersIcon,
  Download,
  Terminal,
  Zap,
  Lock,
  Building,
  Heart,
  TrendingUp,
  Sliders,
  Bell,
  HardDrive
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
  getPolicies,
  savePolicy,
  getAcknowledgements,
  acknowledgePolicy,
  getDocuments,
  saveDocument,
  getChecklists,
  getChecklistRuns,
  saveChecklistRun,
  getIncidents,
  saveIncident,
  getChangeLogs,
  logSystemChange,
  getBackupHistory,
  triggerManualBackup,
  getDataQualityReports,
  resolveQualityReport,
  getAdminSettings,
  saveAdminSettings,
  getSystemHealth,
  CompliancePolicy,
  PolicyAcknowledgement,
  DocumentRegistry,
  OperationalChecklist,
  ChecklistRun,
  Incident,
  SystemChangeLog,
  BackupHistory,
  DataQualityReport,
  AdminSettings,
  SystemHealth
} from '../../services/complianceService';
import { getCurrentUser, getRole } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';

export default function Compliance() {
  const { notify } = useNotification();
  const currentUser = getCurrentUser();
  const currentRole = getRole();
  const userEmail = currentUser?.email || 'admin@srichaitanya.com';
  const userName = currentUser?.name || 'Administrator';

  // State Management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'policies' | 'documents' | 'checklists' | 'incidents' | 'dataquality' | 'backups' | 'changelog' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data States
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [acks, setAcks] = useState<PolicyAcknowledgement[]>([]);
  const [documents, setDocuments] = useState<DocumentRegistry[]>([]);
  const [checklists, setChecklists] = useState<OperationalChecklist[]>([]);
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [changeLogs, setChangeLogs] = useState<SystemChangeLog[]>([]);
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [qualityReports, setQualityReports] = useState<DataQualityReport[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Search and Filter States
  const [policySearch, setPolicySearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');

  // Interactive Form States
  const [selectedPolicy, setSelectedPolicy] = useState<CompliancePolicy | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    name: '',
    type: 'doctor_registration' as DocumentRegistry['type'],
    owner_or_entity: '',
    document_number: '',
    issue_date: '',
    expiry_date: ''
  });

  const [selectedChecklist, setSelectedChecklist] = useState<OperationalChecklist | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<{ [task: string]: boolean }>({});

  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    type: 'patient_complaint' as Incident['type'],
    severity: 'medium' as Incident['severity'],
    description: '',
    owner_name: '',
    root_cause: '',
    corrective_actions: ''
  });

  const [showEditIncidentModal, setShowEditIncidentModal] = useState<Incident | null>(null);
  const [editIncidentStatus, setEditIncidentStatus] = useState<Incident['status']>('investigating');
  const [editIncidentResolution, setEditIncidentResolution] = useState('');
  const [editIncidentRootCause, setEditIncidentRootCause] = useState('');
  const [editIncidentCorrective, setEditIncidentCorrective] = useState('');

  // Settings Forms
  const [settingsForm, setSettingsForm] = useState<AdminSettings | null>(null);
  const [newHoliday, setNewHoliday] = useState({ date: '', label: '' });

  // System Logs simulator state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[SYSTEM] Compliance & Continuity engine initialized v1.5',
    '[HEALTH] Connected to high-performance secure database node',
    '[BACKUP] Automated checksum integrity verification: 100% OK'
  ]);

  // Load All Data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        pData, aData, dData, cData, crData, iData, clData, bData, qData, sData, hData
      ] = await Promise.all([
        getPolicies(),
        getAcknowledgements(),
        getDocuments(),
        getChecklists(),
        getChecklistRuns(),
        getIncidents(),
        getChangeLogs(),
        getBackupHistory(),
        getDataQualityReports(),
        getAdminSettings(),
        getSystemHealth()
      ]);

      setPolicies(pData);
      setAcks(aData);
      setDocuments(dData);
      setChecklists(cData);
      setChecklistRuns(crData);
      setIncidents(iData);
      setChangeLogs(clData);
      setBackups(bData);
      setQualityReports(qData);
      setAdminSettings(sData);
      setSettingsForm(sData);
      setSystemHealth(hData);
    } catch (err) {
      console.error('Error loading compliance data:', err);
      notify('error', 'Data Retrieval Failed', 'Could not load enterprise compliance parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Refresh system health periodically
    const interval = setInterval(async () => {
      const hData = await getSystemHealth();
      setSystemHealth(hData);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const addConsoleLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [`[${timestamp}] ${text}`, ...prev.slice(0, 49)]);
  };

  // MODULE 1 Handlers: Policy center
  const handleAcknowledge = async (policy: CompliancePolicy) => {
    try {
      const exists = acks.some(a => a.policy_id === policy.id && a.user_email === userEmail);
      if (exists) {
        notify('info', 'Already Acknowledged', `You have already signed acknowledgment for this SOP.`);
        return;
      }
      await acknowledgePolicy(policy.id, policy.title, userEmail, userName);
      notify('success', 'SOP Signed', `You have successfully acknowledged: ${policy.title}`);
      addConsoleLog(`User ${userName} signed acknowledgment for policy ${policy.version}`);
      loadAllData();
    } catch {
      notify('error', 'Signature Error', 'Could not save policy signature.');
    }
  };

  // MODULE 2 Handlers: Document Registration
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.name || !newDocForm.expiry_date) {
      notify('warning', 'Missing Details', 'Please complete the document name and expiration date.');
      return;
    }

    const expiryDateObj = new Date(newDocForm.expiry_date);
    const today = new Date();
    const daysDiff = Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let status: DocumentRegistry['status'] = 'active';
    if (daysDiff <= 0) {
      status = 'expired';
    } else if (daysDiff <= 30) {
      status = 'warning';
    }

    const doc: DocumentRegistry = {
      id: `doc-reg-${Date.now()}`,
      name: newDocForm.name,
      type: newDocForm.type,
      owner_or_entity: newDocForm.owner_or_entity || 'N/A',
      document_number: newDocForm.document_number || 'N/A',
      issue_date: newDocForm.issue_date || new Date().toISOString().split('T')[0],
      expiry_date: newDocForm.expiry_date,
      status,
      notified_admin: status !== 'active'
    };

    try {
      await saveDocument(doc);
      notify('success', 'Document Registered', `Successfully added "${doc.name}"`);
      addConsoleLog(`Registered document ${doc.document_number} with status: ${doc.status}`);
      await logSystemChange('system_settings', `Registered new official document/license: ${doc.name}`, userEmail, userName);
      setShowAddDocModal(false);
      setNewDocForm({
        name: '',
        type: 'doctor_registration',
        owner_or_entity: '',
        document_number: '',
        issue_date: '',
        expiry_date: ''
      });
      loadAllData();
    } catch {
      notify('error', 'Save Failed', 'Could not save new document.');
    }
  };

  // MODULE 3 Handlers: Checklist Execution
  const handleStartChecklist = (checklist: OperationalChecklist) => {
    setSelectedChecklist(checklist);
    const initialProgress: { [task: string]: boolean } = {};
    checklist.items.forEach(task => {
      initialProgress[task] = false;
    });
    setChecklistProgress(initialProgress);
  };

  const toggleChecklistItem = (task: string) => {
    setChecklistProgress(prev => ({
      ...prev,
      [task]: !prev[task]
    }));
  };

  const handleSaveChecklistRun = async () => {
    if (!selectedChecklist) return;

    const itemsCompleted = selectedChecklist.items.map(task => ({
      task,
      completed: !!checklistProgress[task]
    }));

    const allDone = itemsCompleted.every(i => i.completed);
    const run: ChecklistRun = {
      id: `run-${Date.now()}`,
      checklist_id: selectedChecklist.id,
      checklist_name: selectedChecklist.name,
      frequency: selectedChecklist.frequency,
      completed_at: new Date().toISOString(),
      completed_by: userName,
      items_completed: itemsCompleted
    };

    try {
      await saveChecklistRun(run);
      notify(
        allDone ? 'success' : 'warning',
        'Checklist Saved',
        allDone ? 'Checklist fully completed!' : 'Checklist partially saved.'
      );
      addConsoleLog(`Checklist ${selectedChecklist.name} filed by ${userName}`);
      await logSystemChange('template_change', `Completed operational checklist: ${selectedChecklist.name}`, userEmail, userName);
      setSelectedChecklist(null);
      loadAllData();
    } catch {
      notify('error', 'Submission Failed', 'Could not file checklist completion run.');
    }
  };

  // MODULE 4 Handlers: Incidents
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentForm.title || !newIncidentForm.description) {
      notify('warning', 'Missing Content', 'Please state the incident title and detailed description.');
      return;
    }

    const incident: Incident = {
      id: `inc-${Date.now()}`,
      title: newIncidentForm.title,
      type: newIncidentForm.type,
      description: newIncidentForm.description,
      reported_at: new Date().toISOString(),
      reported_by: userName,
      severity: newIncidentForm.severity,
      status: 'reported',
      owner_name: newIncidentForm.owner_name || 'Clinic Administrator',
      root_cause: newIncidentForm.root_cause || '',
      corrective_actions: newIncidentForm.corrective_actions || ''
    };

    try {
      await saveIncident(incident);
      notify('success', 'Incident Reported', `Incident #${incident.id} logged successfully in register.`);
      addConsoleLog(`Incident #${incident.id} reported. Severity: ${incident.severity}`);
      await logSystemChange('configuration', `Reported clinic incident: ${incident.title}`, userEmail, userName);
      setShowAddIncidentModal(false);
      setNewIncidentForm({
        title: '',
        type: 'patient_complaint',
        severity: 'medium',
        description: '',
        owner_name: '',
        root_cause: '',
        corrective_actions: ''
      });
      loadAllData();
    } catch {
      notify('error', 'Report Failed', 'Could not record incident to the database register.');
    }
  };

  const handleUpdateIncidentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditIncidentModal) return;

    const updated: Incident = {
      ...showEditIncidentModal,
      status: editIncidentStatus,
      resolution_details: editIncidentResolution,
      root_cause: editIncidentRootCause,
      corrective_actions: editIncidentCorrective
    };

    try {
      await saveIncident(updated);
      notify('success', 'Incident Updated', `Incident #${updated.id} status set to ${updated.status}.`);
      addConsoleLog(`Incident #${updated.id} updated to ${updated.status}`);
      await logSystemChange('configuration', `Modified clinic incident status: ${updated.title} (${updated.status})`, userEmail, userName);
      setShowEditIncidentModal(null);
      loadAllData();
    } catch {
      notify('error', 'Update Failed', 'Could not write incident status update.');
    }
  };

  // MODULE 6: Backup Monitor Manual Trigger
  const handleTriggerBackup = async () => {
    try {
      notify('info', 'Initiating Backup', 'Serializing database tables and verifying binary parity checksum...');
      const bk = await triggerManualBackup(userEmail, userName);
      notify('success', 'Backup Finalized', `Checkpoint backup ${bk.id} finalized successfully (${bk.backup_size_mb} MB).`);
      addConsoleLog(`Manual database snapshot backup compiled: ${bk.id}`);
      loadAllData();
    } catch {
      notify('error', 'Backup Critical Fail', 'An error occurred during database compression stream.');
    }
  };

  // MODULE 7: Data Quality Resolve
  const handleResolveQualityAnomaly = async (id: string) => {
    try {
      await resolveQualityReport(id, userEmail, userName);
      notify('success', 'Anomaly Rectified', 'Actionable clean-up has been cataloged as resolved.');
      addConsoleLog(`Data Quality anomaly resolved: ID ${id}`);
      loadAllData();
    } catch {
      notify('error', 'Action Failed', 'Could not resolve data anomaly.');
    }
  };

  // MODULE 9: Admin settings handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;

    try {
      await saveAdminSettings(settingsForm, userEmail, userName);
      notify('success', 'Settings Updated', 'Clinical governance policies applied to workspace.');
      addConsoleLog('Operational administrative parameters updated');
      loadAllData();
    } catch {
      notify('error', 'Save Failed', 'Could not apply clinic settings.');
    }
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.label || !settingsForm) return;
    const updatedHolidays = [...settingsForm.holidays, newHoliday];
    setSettingsForm({
      ...settingsForm,
      holidays: updatedHolidays
    });
    setNewHoliday({ date: '', label: '' });
  };

  const handleRemoveHoliday = (idx: number) => {
    if (!settingsForm) return;
    const updatedHolidays = settingsForm.holidays.filter((_, i) => i !== idx);
    setSettingsForm({
      ...settingsForm,
      holidays: updatedHolidays
    });
  };

  // Operational metrics calculators for Report Dashboards
  const pendingPoliciesCount = policies.filter(p => !acks.some(a => a.policy_id === p.id && a.user_email === userEmail)).length;
  const criticalExpiriesCount = documents.filter(d => d.status === 'expired' || d.status === 'warning').length;
  const unresolvedIncidentsCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const unresolvedDataQualityCount = qualityReports.filter(q => !q.resolved).length;

  const totalChecklistsFiled = checklistRuns.length;
  const checklistCompletionPercentage = totalChecklistsFiled > 0
    ? Math.round((checklistRuns.filter(r => r.items_completed.every(i => i.completed)).length / totalChecklistsFiled) * 100)
    : 100;

  // Render Page
  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800" id="compliance-module-container">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 mb-6" id="compliance-header">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
            Version 1.5 Suite
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 font-sans tracking-tight">
            Compliance, Governance & Continuity
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sri Chaitanya Multispeciality Dental ERP corporate assurance, policy matrix, and recovery center.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={loadAllData}
            className="flex items-center gap-2 text-sm bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg shadow-sm transition-all"
            id="btn-sync-compliance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-500' : ''}`} />
            Sync Database
          </button>
          <button
            onClick={handleTriggerBackup}
            className="flex items-center gap-2 text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
            id="btn-quick-backup"
          >
            <Database className="w-4 h-4" />
            Checkpoint Backup
          </button>
        </div>
      </div>

      {/* Main Grid: Nav Sidebar & Tabs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="compliance-grid">
        {/* Navigation Tabs (Left Sidebar on Desktop) */}
        <div className="lg:col-span-3 space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm self-start" id="compliance-sidebar">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">OPERATIONAL CONTROL</p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Governance Center
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'policies' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-4 h-4" />
              <span>Policy Center</span>
            </div>
            {pendingPoliciesCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingPoliciesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'documents' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>Document Registry</span>
            </div>
            {criticalExpiriesCount > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {criticalExpiriesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'checklists' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Checklists & SOPs
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'incidents' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-4 h-4" />
              <span>Incident Register</span>
            </div>
            {unresolvedIncidentsCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unresolvedIncidentsCount}
              </span>
            )}
          </button>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 mb-2">INTEGRITY & CONTINUITY</p>
          <button
            onClick={() => setActiveTab('dataquality')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'dataquality' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4" />
              <span>Data Quality</span>
            </div>
            {unresolvedDataQualityCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {unresolvedDataQualityCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'backups' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            Backup & Systems
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'changelog' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Governance Change Log
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Compliance Settings
          </button>

          {/* Quick status box */}
          <div className="mt-4 pt-4 border-t border-slate-100" id="sidebar-status-box">
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Database Node:</span>
                <span className="font-semibold text-emerald-600">Secure TLS</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>API Health:</span>
                <span className="font-semibold text-slate-800">100% Online</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Session Expiry:</span>
                <span className="font-semibold text-slate-800">30 min rolling</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Pane */}
        <div className="lg:col-span-9" id="compliance-main-content">
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Synchronizing clinic governance catalog...</p>
              <p className="text-slate-400 text-xs mt-1">Downloading tables and running biological threshold audits.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              key={activeTab}
            >
              {/* TAB 1: GOVERNANCE CENTER (DASHBOARD & OPERATIONAL REPORTS) */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6" id="gov-center-tab">
                  {/* Bento Grid Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="gov-bento-grid">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SOP Compliance</span>
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                          <FileCheck className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">
                        {policies.length - pendingPoliciesCount}/{policies.length}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">SOPs acknowledged by you</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Critical Licenses</span>
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                          <Calendar className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">{criticalExpiriesCount}</h3>
                      <p className="text-xs text-slate-500 mt-1">Expiring within 30 days</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incident Pipeline</span>
                        <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                          <AlertOctagon className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">{unresolvedIncidentsCount}</h3>
                      <p className="text-xs text-slate-500 mt-1">Active investigations in log</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Integrity Score</span>
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Activity className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">
                        {100 - unresolvedDataQualityCount * 5}%
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Database health score</p>
                    </div>
                  </div>

                  {/* Operational Metrics Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts-row">
                    {/* Compliance Completion Rate Area */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-teal-600" />
                        Monthly Operational Checklist Completion Rates
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { month: 'Feb', complete: 88, failed: 12 },
                              { month: 'Mar', complete: 90, failed: 10 },
                              { month: 'Apr', complete: 92, failed: 8 },
                              { month: 'May', complete: 94, failed: 6 },
                              { month: 'Jun', complete: 97, failed: 3 },
                              { month: 'Jul', complete: checklistCompletionPercentage, failed: 100 - checklistCompletionPercentage }
                            ]}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorComplete" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="complete" name="Completed SOPs %" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorComplete)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Incidents by Severity Pie Chart */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-500" />
                        Reported Clinical Incidents by Severity
                      </h4>
                      <div className="h-64 flex flex-col items-center justify-center">
                        {incidents.length > 0 ? (
                          <div className="w-full h-full flex flex-row items-center">
                            <div className="w-1/2 h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Critical', value: incidents.filter(i => i.severity === 'critical').length, color: '#f43f5e' },
                                      { name: 'High', value: incidents.filter(i => i.severity === 'high').length, color: '#f97316' },
                                      { name: 'Medium', value: incidents.filter(i => i.severity === 'medium').length, color: '#eab308' },
                                      { name: 'Low', value: incidents.filter(i => i.severity === 'low').length, color: '#3b82f6' }
                                    ].filter(item => item.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {incidents.map((entry, index) => {
                                      const severityColors: { [key: string]: string } = {
                                        critical: '#f43f5e',
                                        high: '#f97316',
                                        medium: '#eab308',
                                        low: '#3b82f6'
                                      };
                                      return <Cell key={`cell-${index}`} fill={severityColors[entry.severity] || '#94a3b8'} />;
                                    })}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="w-1/2 space-y-2 pl-4 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-3 py-1 bg-red-500 rounded"></span>
                                <span className="font-semibold text-slate-700">Critical: {incidents.filter(i => i.severity === 'critical').length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-3 py-1 bg-orange-500 rounded"></span>
                                <span className="font-semibold text-slate-700">High: {incidents.filter(i => i.severity === 'high').length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-3 py-1 bg-yellow-500 rounded"></span>
                                <span className="font-semibold text-slate-700">Medium: {incidents.filter(i => i.severity === 'medium').length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-3 py-1 bg-blue-500 rounded"></span>
                                <span className="font-semibold text-slate-700">Low: {incidents.filter(i => i.severity === 'low').length}</span>
                              </div>
                              <div className="pt-2 border-t border-slate-100 text-slate-400">
                                Total logged incidents: {incidents.length}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No incidents registered. Clinic runs cleanly.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modules Quick Status List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="dashboard-action-items">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-base">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Priority Actionable Cleanup Tasks
                    </h3>
                    <div className="space-y-4">
                      {/* Document Expiries warning */}
                      {documents.some(d => d.status === 'warning' || d.status === 'expired') && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-amber-900 text-sm">Action Needed: License Renewals Pending</h4>
                            <p className="text-xs text-amber-700 mt-1">
                              {documents.filter(d => d.status === 'warning' || d.status === 'expired').map(d => d.name).join(', ')} require administrative extension action to prevent clinical operational disruption.
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('documents')}
                            className="text-xs font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Manage
                          </button>
                        </div>
                      )}

                      {/* Data Quality Anomaly warning */}
                      {qualityReports.some(q => !q.resolved) && (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 text-sm">Data Quality Anomaly Action Triggered</h4>
                            <p className="text-xs text-blue-700 mt-1">
                              Detected {unresolvedDataQualityCount} database structural anomalies (duplicate profiles, missing treatment parameters, or missing informed consents).
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('dataquality')}
                            className="text-xs font-semibold bg-blue-100 text-blue-900 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Audit
                          </button>
                        </div>
                      )}

                      {/* No warning state */}
                      {!documents.some(d => d.status === 'warning' || d.status === 'expired') && !qualityReports.some(q => !q.resolved) && (
                        <div className="text-center py-6">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="text-slate-600 font-medium text-sm">All operational systems clear</p>
                          <p className="text-slate-400 text-xs mt-1">License, checklist, and clinical data structures are 100% compliant.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: POLICY CENTER (SOP LIST & STAFF ACKNOWLEDGEMENT) */}
              {activeTab === 'policies' && (
                <div className="space-y-6" id="policy-center-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">Clinical Standard Operating Procedures (SOP)</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Read, verify, and acknowledge mandatory infection control, waste discard and patient confidentiality guidelines.
                      </p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search Policies..."
                        value={policySearch}
                        onChange={(e) => setPolicySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Policy List */}
                    <div className="space-y-4">
                      {policies
                        .filter(p => p.title.toLowerCase().includes(policySearch.toLowerCase()) || p.content.toLowerCase().includes(policySearch.toLowerCase()))
                        .map(policy => {
                          const acknowledged = acks.some(a => a.policy_id === policy.id && a.user_email === userEmail);
                          return (
                            <div
                              key={policy.id}
                              onClick={() => setSelectedPolicy(policy)}
                              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white hover:border-teal-400 hover:shadow-md ${
                                selectedPolicy?.id === policy.id ? 'border-teal-500 ring-1 ring-teal-500 shadow' : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs uppercase px-2 py-0.5 rounded-full font-bold tracking-wider ${
                                  policy.category === 'sterilization' ? 'bg-purple-100 text-purple-800' :
                                  policy.category === 'infection_control' ? 'bg-red-100 text-red-800' :
                                  policy.category === 'waste_disposal' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {policy.category.replace('_', ' ')}
                                </span>
                                <span className="text-xs font-mono text-slate-400">v{policy.version}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm">{policy.title}</h4>
                              <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{policy.content}</p>

                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{policy.acknowledgements_count} signatures filed</span>
                                </div>

                                {acknowledged ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> Signed
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                                    Pending Signature
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Right: Detailed Viewer */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-6">
                      {selectedPolicy ? (
                        <div className="space-y-6">
                          <div>
                            <span className="text-xs uppercase bg-teal-50 text-teal-700 font-bold px-2.5 py-1 rounded-full">
                              SOP Document Matrix
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 mt-3">{selectedPolicy.title}</h3>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span>Author: <b>{selectedPolicy.author}</b></span>
                              <span>•</span>
                              <span>Updated: <b>{new Date(selectedPolicy.updated_at).toLocaleDateString()}</b></span>
                              <span>•</span>
                              <span>Version: <b>v{selectedPolicy.version}</b></span>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                            {selectedPolicy.content}
                          </div>

                          <div className="border-t border-slate-100 pt-5 space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signatures for this Version</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                              {acks
                                .filter(a => a.policy_id === selectedPolicy.id)
                                .map((a, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="font-medium text-slate-700">{a.user_name}</span>
                                      <span className="text-slate-400">({a.user_email})</span>
                                    </div>
                                    <span className="text-slate-400 font-mono">{new Date(a.acknowledged_at).toLocaleDateString()}</span>
                                  </div>
                                ))}

                              {acks.filter(a => a.policy_id === selectedPolicy.id).length === 0 && (
                                <p className="text-xs text-slate-400 italic">No signatures recorded yet.</p>
                              )}
                            </div>

                            {acks.some(a => a.policy_id === selectedPolicy.id && a.user_email === userEmail) ? (
                              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <div>
                                  <p className="font-bold">Acknowledge Completed</p>
                                  <p className="text-emerald-600">Your digital signature is logged and legally secured.</p>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAcknowledge(selectedPolicy)}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm shadow transition-all flex items-center justify-center gap-2"
                              >
                                <UserCheck className="w-4 h-4" />
                                Sign and Acknowledge SOP
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-slate-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No policy selected</p>
                          <p className="text-xs">Click a policy from the sidebar list to inspect details and file acknowledgment.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENT EXPIRY TRACKER */}
              {activeTab === 'documents' && (
                <div className="space-y-6" id="documents-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">Official Clinic Licenses & Doctor Registrations</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Prevent compliance lockouts. Review registrations, rental/BMW covenants, and AMC contracts.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddDocModal(true)}
                      className="flex items-center gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg font-medium shadow-sm transition-all"
                      id="btn-register-new-doc"
                    >
                      <Plus className="w-4 h-4" />
                      Register New Document
                    </button>
                  </div>

                  {/* Document Warning Callouts */}
                  {documents.some(d => d.status === 'warning' || d.status === 'expired') && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-rose-900 text-sm">Action Required: Compliance Expiries Approaching</h4>
                        <p className="text-xs text-rose-700 mt-1">
                          Our automatic tracking daemon has notified clinic admin chaitubolla09@gmail.com about expiring/expired health block licenses below. Ensure files are physically scanned and updated to maintain regulatory validity.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="documents-grid">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 relative overflow-hidden">
                        {/* Expiry Badge Line */}
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200" style={{
                          backgroundColor: doc.status === 'expired' ? '#ef4444' : doc.status === 'warning' ? '#f59e0b' : '#10b981'
                        }}></div>

                        <div className="pl-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                              {doc.type.replace('_', ' ')}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              doc.status === 'expired' ? 'bg-rose-100 text-rose-800' :
                              doc.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {doc.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{doc.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Entity: <b>{doc.owner_or_entity}</b></p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-50">
                            <div>
                              <p className="text-slate-400 uppercase font-bold tracking-wider">Doc Number</p>
                              <p className="text-slate-700 font-mono mt-0.5">{doc.document_number}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 uppercase font-bold tracking-wider">Expiration</p>
                              <p className="text-slate-900 font-semibold mt-0.5" style={{
                                color: doc.status === 'expired' ? '#ef4444' : doc.status === 'warning' ? '#d97706' : '#0f766e'
                              }}>{doc.expiry_date}</p>
                            </div>
                          </div>

                          {doc.notified_admin && (
                            <div className="bg-amber-50/50 p-2 rounded text-[10px] text-amber-800 flex items-center gap-1">
                              <Bell className="w-3 h-3 text-amber-600" />
                              <span>Admin notified at {userEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Document Modal Overlay */}
                  {showAddDocModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-900 text-base">Register Corporate Document</h4>
                          <button onClick={() => setShowAddDocModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleAddDocument} className="space-y-4 text-xs">
                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Document/Certificate Title *</label>
                            <input
                              type="text"
                              required
                              value={newDocForm.name}
                              onChange={e => setNewDocForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. Fire Safety Clearance Block A"
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Category Type</label>
                              <select
                                value={newDocForm.type}
                                onChange={e => setNewDocForm(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                              >
                                <option value="doctor_registration">Doctor Registration</option>
                                <option value="clinic_license">Clinic License</option>
                                <option value="biomedical_waste">Biomedical Waste Agreement</option>
                                <option value="fire_safety">Fire Safety Certificate</option>
                                <option value="equipment_amc">Equipment AMC</option>
                                <option value="insurance">Insurance Policy</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Owner/Assigned Entity</label>
                              <input
                                type="text"
                                value={newDocForm.owner_or_entity}
                                onChange={e => setNewDocForm(prev => ({ ...prev, owner_or_entity: e.target.value }))}
                                placeholder="e.g. Srichaitanya Block 1"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Document / License ID Number</label>
                            <input
                              type="text"
                              value={newDocForm.document_number}
                              onChange={e => setNewDocForm(prev => ({ ...prev, document_number: e.target.value }))}
                              placeholder="e.g. HYD-BMW-88921"
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Date of Issue</label>
                              <input
                                type="date"
                                value={newDocForm.issue_date}
                                onChange={e => setNewDocForm(prev => ({ ...prev, issue_date: e.target.value }))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Expiry Date *</label>
                              <input
                                type="date"
                                required
                                value={newDocForm.expiry_date}
                                onChange={e => setNewDocForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowAddDocModal(false)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Add Document
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TASK & COMPLIANCE CHECKLISTS */}
              {activeTab === 'checklists' && (
                <div className="space-y-6" id="checklists-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 text-lg">Daily & Periodical Operational Checklists</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Enforce strict hygiene protocols, chemical indicators, backup testing, and inventory reviews.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Available Checklists */}
                    <div className="lg:col-span-1 space-y-4">
                      {checklists.map(chk => (
                        <div
                          key={chk.id}
                          onClick={() => handleStartChecklist(chk)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer bg-white hover:border-slate-300 ${
                            selectedChecklist?.id === chk.id ? 'border-teal-500 ring-1 ring-teal-500 shadow-md' : 'border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {chk.frequency}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{chk.items.length} checklist items</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{chk.name}</h4>
                          <p className="text-slate-500 text-xs mt-1.5">Click to verify or execute this protocol run sheet.</p>
                        </div>
                      ))}
                    </div>

                    {/* Right: Selected Checklist Execution */}
                    <div className="lg:col-span-2 space-y-6">
                      {selectedChecklist ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div>
                              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 tracking-wider">
                                Checklist Run
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 mt-2">{selectedChecklist.name}</h3>
                              <p className="text-xs text-slate-400 mt-1">
                                Roster Representative: <b>{userName}</b> (Signed as operator)
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedChecklist(null)}
                              className="text-slate-400 hover:text-slate-600 text-sm"
                            >
                              ✕ Close
                            </button>
                          </div>

                          <div className="space-y-3.5">
                            {selectedChecklist.items.map((task, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleChecklistItem(task)}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                  checklistProgress[task]
                                    ? 'bg-teal-50/50 border-teal-200'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!checklistProgress[task]}
                                  onChange={() => {}} // toggled on container click
                                  className="mt-0.5 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                />
                                <span className={`text-xs ${checklistProgress[task] ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                  {task}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                              onClick={handleSaveChecklistRun}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-5 rounded-lg text-xs shadow transition-all flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Save & Record Completion
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
                          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No checklist active</p>
                          <p className="text-xs">Select an operational checklist from the sidebar to complete current morning, closing or hygiene SOP verification runs.</p>
                        </div>
                      )}

                      {/* Previous completions logs */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                        <h4 className="font-bold text-slate-950 text-sm">Completed Operations Logs</h4>
                        <div className="space-y-3">
                          {checklistRuns.map(run => {
                            const completedCount = run.items_completed.filter(i => i.completed).length;
                            const totalCount = run.items_completed.length;
                            const pct = Math.round((completedCount / totalCount) * 100);

                            return (
                              <div key={run.id} className="text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{run.checklist_name}</span>
                                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-600">
                                      {run.frequency}
                                    </span>
                                  </div>
                                  <span className="text-slate-400 font-mono">{new Date(run.completed_at).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                  <span>Completed By: <b>{run.completed_by}</b></span>
                                  <span>•</span>
                                  <span className="font-semibold text-teal-700">{completedCount}/{totalCount} tasks OK ({pct}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: INCIDENT REGISTER */}
              {activeTab === 'incidents' && (
                <div className="space-y-6" id="incidents-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">Clinical & Patient Incident Register</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Legally compliant near-miss tracking, equipment failure diagnosis and resolution auditing.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <select
                        value={incidentFilter}
                        onChange={e => setIncidentFilter(e.target.value)}
                        className="p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
                      >
                        <option value="all">All Incidents</option>
                        <option value="reported">Reported</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        onClick={() => setShowAddIncidentModal(true)}
                        className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap transition-all"
                        id="btn-report-new-incident"
                      >
                        <Plus className="w-4 h-4" />
                        Report Incident
                      </button>
                    </div>
                  </div>

                  {/* Incident Cards / List */}
                  <div className="space-y-4" id="incidents-list">
                    {incidents
                      .filter(i => incidentFilter === 'all' || i.status === incidentFilter)
                      .map(incident => (
                        <div key={incident.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                          <div className="flex flex-col md:flex-row justify-between gap-2 border-b border-slate-50 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                  incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {incident.severity} severity
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                                  {incident.type.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">#{incident.id}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm mt-1.5">{incident.title}</h4>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                                incident.status === 'closed' ? 'bg-slate-100 text-slate-500' :
                                incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                                incident.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {incident.status}
                              </span>

                              <button
                                onClick={() => {
                                  setShowEditIncidentModal(incident);
                                  setEditIncidentStatus(incident.status);
                                  setEditIncidentResolution(incident.resolution_details || '');
                                  setEditIncidentRootCause(incident.root_cause || '');
                                  setEditIncidentCorrective(incident.corrective_actions || '');
                                }}
                                className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 border border-slate-200 rounded-lg transition-all"
                              >
                                Edit / Resolve
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Description</p>
                              <p className="text-slate-700 font-mono leading-relaxed">{incident.description}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Root Cause Diagnosis</p>
                              <p className="text-slate-700 font-mono leading-relaxed">{incident.root_cause || <span className="italic text-slate-400">Diagnosis pending...</span>}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Corrective Action Plan</p>
                              <p className="text-slate-700 font-mono leading-relaxed">{incident.corrective_actions || <span className="italic text-slate-400">Not drafted...</span>}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50">
                            <div>
                              <span>Reported By: <b>{incident.reported_by}</b></span>
                              <span className="mx-2">•</span>
                              <span>Date: <b>{new Date(incident.reported_at).toLocaleString()}</b></span>
                            </div>
                            <div>
                              <span>Responsible Owner: <b>{incident.owner_name}</b></span>
                              {incident.resolution_details && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-emerald-700 font-semibold">Resolution: {incident.resolution_details}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {incidents.length === 0 && (
                      <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm text-slate-400">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">Clean Register</p>
                        <p className="text-xs">No incidents have been reported matching current filters.</p>
                      </div>
                    )}
                  </div>

                  {/* Add Incident Modal */}
                  {showAddIncidentModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-900 text-base">Report New Incident</h4>
                          <button onClick={() => setShowAddIncidentModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleReportIncident} className="space-y-4 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2">
                              <label className="font-medium text-slate-700">Incident Header / Title *</label>
                              <input
                                type="text"
                                required
                                value={newIncidentForm.title}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g. Compressor failure causing high speed handpiece stop"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Type</label>
                              <select
                                value={newIncidentForm.type}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              >
                                <option value="patient_complaint">Patient Complaint</option>
                                <option value="near_miss">Near Miss Event</option>
                                <option value="equipment_failure">Equipment Failure</option>
                                <option value="medication_error">Medication Error</option>
                                <option value="appointment_issue">Appointment Issue</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Severity</label>
                              <select
                                value={newIncidentForm.severity}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, severity: e.target.value as any }))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Investigator / Owner</label>
                              <input
                                type="text"
                                value={newIncidentForm.owner_name}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, owner_name: e.target.value }))}
                                placeholder="e.g. Dr. Prasad Bolla"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Detailed Description of Event *</label>
                            <textarea
                              required
                              rows={3}
                              value={newIncidentForm.description}
                              onChange={e => setNewIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Please detail facts, patient chart references if any, and immediate steps taken..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Root Cause (Optional)</label>
                              <input
                                type="text"
                                value={newIncidentForm.root_cause}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, root_cause: e.target.value }))}
                                placeholder="Root Cause"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-medium text-slate-700">Corrective Action Taken</label>
                              <input
                                type="text"
                                value={newIncidentForm.corrective_actions}
                                onChange={e => setNewIncidentForm(prev => ({ ...prev, corrective_actions: e.target.value }))}
                                placeholder="Corrective Action taken"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowAddIncidentModal(false)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Save Incident
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Edit/Resolve Incident Modal */}
                  {showEditIncidentModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">Update & Resolve Incident</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Incident #{showEditIncidentModal.id}</p>
                          </div>
                          <button onClick={() => setShowEditIncidentModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleUpdateIncidentStatus} className="space-y-4 text-xs">
                          <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-900 text-sm">{showEditIncidentModal.title}</p>
                            <p className="text-slate-500 font-mono mt-1">{showEditIncidentModal.description}</p>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Investigation Status</label>
                            <select
                              value={editIncidentStatus}
                              onChange={e => setEditIncidentStatus(e.target.value as any)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                            >
                              <option value="reported">Reported</option>
                              <option value="investigating">Investigating</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Root Cause Analysis</label>
                            <textarea
                              rows={2}
                              value={editIncidentRootCause}
                              onChange={e => setEditIncidentRootCause(e.target.value)}
                              placeholder="Describe why the error occurred..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Corrective / Preventive Actions Drafted</label>
                            <textarea
                              rows={2}
                              value={editIncidentCorrective}
                              onChange={e => setEditIncidentCorrective(e.target.value)}
                              placeholder="Specify actions taken to prevent reoccurrence..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-medium text-slate-700">Resolution Sign-off Notes</label>
                            <input
                              type="text"
                              value={editIncidentResolution}
                              onChange={e => setEditIncidentResolution(e.target.value)}
                              placeholder="Specify concrete outcome or engineering repair completed..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowEditIncidentModal(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                              Apply Update
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: DATA QUALITY DASHBOARD */}
              {activeTab === 'dataquality' && (
                <div className="space-y-6" id="data-quality-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">Electronic Medical Record (EMR) Data Quality Auditor</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Run proactive background validation to spot missing consent slips, duplicate profiles, and unbilled treatments.
                      </p>
                    </div>

                    <select
                      value={qualityFilter}
                      onChange={e => setQualityFilter(e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white self-start"
                    >
                      <option value="all">All Issues</option>
                      <option value="high">High Severity</option>
                      <option value="medium">Medium Severity</option>
                      <option value="low">Low Severity</option>
                    </select>
                  </div>

                  {/* Anomalies List */}
                  <div className="space-y-4" id="quality-anomalies-list">
                    {qualityReports
                      .filter(q => {
                        if (qualityFilter === 'all') return true;
                        return q.severity === qualityFilter;
                      })
                      .map(report => (
                        <div key={report.id} className={`p-5 rounded-xl border bg-white shadow-sm transition-all ${
                          report.resolved ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-blue-400'
                        }`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                                  report.severity === 'high' ? 'bg-rose-100 text-rose-800' :
                                  report.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {report.severity} Priority
                                </span>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  {report.category.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-950 text-sm mt-1">{report.description}</h4>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded font-semibold">
                                {report.affected_records_count} rows affected
                              </span>

                              {report.resolved ? (
                                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Resolved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleResolveQualityAnomaly(report.id)}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-1.5 rounded-lg transition-all"
                                >
                                  Mark Cleared
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 bg-slate-50 p-2.5 rounded text-xs text-slate-600">
                            <Sliders className="w-4 h-4 text-slate-500 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-700">Suggested Action Steps:</span>{' '}
                              <span className="font-mono">{report.action_cleanup_task}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 7: BACKUPS & SYSTEM HEALTH */}
              {activeTab === 'backups' && (
                <div className="space-y-6" id="continuity-tab">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Health and Diagnostics */}
                    <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-6">
                      <h4 className="font-bold text-slate-950 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Activity className="w-5 h-5 text-teal-600" />
                        System Diagnostics
                      </h4>

                      {systemHealth && (
                        <div className="space-y-4 text-xs">
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold">Database Link:</span>
                            <span className={`font-bold uppercase ${systemHealth.database_connected ? 'text-emerald-600' : 'text-red-600'}`}>
                              {systemHealth.database_connected ? 'Connected (TLS)' : 'Offline'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold">Realtime Engine:</span>
                            <span className="font-bold uppercase text-emerald-600">
                              {systemHealth.realtime_status}
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-slate-500 font-semibold">
                              <span>Binary Storage Used:</span>
                              <span className="text-slate-900 font-bold">{systemHealth.storage_used_gb} / {systemHealth.storage_max_gb} GB</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-teal-600 h-full"
                                style={{ width: `${(systemHealth.storage_used_gb / systemHealth.storage_max_gb) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold">Active Roster Sessions:</span>
                            <span className="font-bold text-slate-900">{systemHealth.active_users} users active</span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold">API Performance Latency:</span>
                            <span className="font-mono text-teal-700 font-semibold">{systemHealth.api_response_time_ms} ms</span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold">Task Queue Status:</span>
                            <span className="font-bold uppercase text-slate-700">{systemHealth.queue_status}</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleTriggerBackup}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm shadow transition-all flex items-center justify-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        Trigger Binary Snapshot Backup
                      </button>
                    </div>

                    {/* Right: Backup history and terminal logs */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Terminal logger */}
                      <div className="bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-[10px] space-y-1.5 shadow-md border border-slate-800">
                        <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2 mb-2">
                          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
                            <Terminal className="w-3.5 h-3.5 text-teal-400" />
                            Live Recovery & Cryptographic Logging Trace
                          </span>
                          <span className="bg-teal-950 text-teal-400 px-2 py-0.5 rounded font-semibold text-[8px]">
                            DAEMON ACTIVE
                          </span>
                        </div>
                        <div className="h-28 overflow-y-auto space-y-1 pr-1">
                          {consoleLogs.map((log, i) => (
                            <div key={i} className="leading-relaxed">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Backup list history */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h4 className="font-bold text-slate-950 text-sm">Disaster Recovery & Redundancy Checkpoints</h4>
                        <div className="space-y-3.5">
                          {backups.map(bk => (
                            <div key={bk.id} className="text-xs border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">Checkpoint #{bk.id}</span>
                                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                                    bk.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {bk.status}
                                  </span>
                                </div>
                                <span className="text-slate-400 font-mono">{new Date(bk.timestamp).toLocaleString()}</span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 pt-1.5">
                                <div>
                                  <span>Archive Volume:</span>
                                  <span className="block font-bold text-slate-700 mt-0.5">{bk.backup_size_mb} MB</span>
                                </div>
                                <div>
                                  <span>Type:</span>
                                  <span className="block font-bold text-slate-700 mt-0.5 uppercase">{bk.type}</span>
                                </div>
                                <div>
                                  <span>Sandbox Recovery:</span>
                                  <span className={`block font-bold mt-0.5 uppercase ${
                                    bk.recovery_status === 'verified' ? 'text-emerald-700' : 'text-rose-700'
                                  }`}>{bk.recovery_status}</span>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-400 font-mono bg-white p-2 border border-slate-100 rounded leading-relaxed">
                                {bk.logs}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: CHANGE AUDIT LOG */}
              {activeTab === 'changelog' && (
                <div className="space-y-6" id="changelog-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 text-lg">Operational Governance Audit Trail</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Chronological log of role permission elevation, template configuration alterations, and security variable resets.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="changelog-timeline-container">
                    <div className="relative border-l border-slate-200 pl-6 space-y-6">
                      {changeLogs.map((log, index) => (
                        <div key={log.id || index} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[31px] top-1.5 bg-slate-900 border-4 border-white w-4.5 h-4.5 rounded-full flex items-center justify-center"></div>

                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded tracking-wider text-[10px]">
                                  {log.category.replace('_', ' ')}
                                </span>
                                <span className="text-slate-400 font-mono">ID {log.id}</span>
                              </div>
                              <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>

                            <p className="text-slate-800 text-xs leading-relaxed font-mono">
                              {log.description}
                            </p>

                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>Responsible Identity:</span>
                              <span className="font-bold text-slate-700">{log.user_name}</span>
                              <span className="text-slate-500">({log.user_email})</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: COMPLIANCE SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-6" id="settings-tab">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 text-lg">Central Compliance Parameters</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Manage clinic work hour protocols, default invoice prefix formats, and recall timers.
                    </p>
                  </div>

                  {settingsForm && (
                    <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="font-medium text-slate-700">Official Clinic Branding Name</label>
                          <input
                            type="text"
                            value={settingsForm.clinic_name}
                            onChange={e => setSettingsForm({ ...settingsForm, clinic_name: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-medium text-slate-700">Default Recall Prophylaxis Interval (Months)</label>
                          <input
                            type="number"
                            value={settingsForm.default_recall_months}
                            onChange={e => setSettingsForm({ ...settingsForm, default_recall_months: parseInt(e.target.value) || 6 })}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-medium text-slate-700">Business Operational Hours Threshold</label>
                          <input
                            type="text"
                            value={settingsForm.business_hours}
                            onChange={e => setSettingsForm({ ...settingsForm, business_hours: e.target.value })}
                            placeholder="e.g. 09:00 - 20:00"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-medium text-slate-700">Billing Invoice Numeric Prefix</label>
                          <input
                            type="text"
                            value={settingsForm.invoice_prefix}
                            onChange={e => setSettingsForm({ ...settingsForm, invoice_prefix: e.target.value })}
                            placeholder="e.g. SC-INV-"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="font-medium text-slate-700">Primary Compliance Alert Email Endpoint</label>
                          <input
                            type="email"
                            value={settingsForm.notification_email}
                            onChange={e => setSettingsForm({ ...settingsForm, notification_email: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Holiday Calendar sub-module */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h4 className="font-bold text-slate-900 text-sm">Corporate Holiday Calendar Protocol</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1 col-span-1 md:col-span-2">
                            <input
                              type="text"
                              placeholder="Holiday Label (e.g. Independence Day)"
                              value={newHoliday.label}
                              onChange={e => setNewHoliday({ ...newHoliday, label: e.target.value })}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={newHoliday.date}
                              onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleAddHoliday}
                              className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg transition-all flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {settingsForm.holidays.map((hol, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                              <div>
                                <span className="font-bold text-slate-800">{hol.label}</span>
                                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{hol.date}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveHoliday(i)}
                                className="text-slate-400 hover:text-rose-600 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          type="submit"
                          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
                        >
                          Apply central protocols
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
