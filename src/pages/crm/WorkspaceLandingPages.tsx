import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Users, Calendar, Clock, Sparkles, Award, Plus, FolderOpen,
  ArrowRight, Stethoscope, HeartPulse, Layers, Briefcase, Activity,
  CreditCard, DollarSign, Wallet, ClipboardList, CheckCircle2, Zap,
  FileText, Package, Microscope, Building2, Shield, Settings, UserCircle,
  TrendingUp, Bell, CalendarPlus
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNotification } from '../../components/NotificationProvider';
import { canViewFinancials, getRole } from '../../lib/auth';

// Helper for live stats
function useLiveStats() {
  const [stats, setStats] = useState({
    patientsCount: 0,
    appointmentsCount: 0,
    activeTreatments: 0,
    totalPaid: 0,
    totalBalance: 0,
    inventoryCount: 0,
    pendingTasks: 0,
    labWorkCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!isSupabaseConfigured) {
        setStats({
          patientsCount: 450,
          appointmentsCount: 28,
          activeTreatments: 12,
          totalPaid: 124500,
          totalBalance: 32000,
          inventoryCount: 84,
          pendingTasks: 5,
          labWorkCount: 3
        });
        setLoading(false);
        return;
      }

      try {
        const [
          { count: pts },
          { data: appts },
          { data: trts },
          { count: inv },
          { data: tasks }
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('appointments').select('amount_paid, balance_amount, status'),
          supabase.from('treatments').select('status'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('status')
        ]);

        const totalPaid = appts?.reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0) || 0;
        const totalBalance = appts?.reduce((sum, a) => sum + (Number(a.balance_amount) || 0), 0) || 0;
        const pendingTasks = tasks?.filter(t => t.status !== 'Completed').length || 0;

        setStats({
          patientsCount: pts || 0,
          appointmentsCount: appts?.length || 0,
          activeTreatments: trts?.filter(t => t.status !== 'Completed').length || 0,
          totalPaid,
          totalBalance,
          inventoryCount: inv || 0,
          pendingTasks,
          labWorkCount: 3 // Fallback or static lab work count
        });
      } catch (err) {
        console.warn('Error loading workspace stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return { stats, loading };
}

interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
  badgeColor?: string;
}

function ShortcutCard({ title, description, icon: Icon, path, badge, badgeColor }: WorkspaceCardProps) {
  return (
    <Link href={path}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl hover:shadow-md hover:border-teal-500/50 dark:hover:border-teal-500/50 transition cursor-pointer flex flex-col h-full group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor || 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-400'}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
          <span>{title}</span>
          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 flex-1">
          {description}
        </p>
      </div>
    </Link>
  );
}

// Global Quick Action Panel shared on Landing Pages
interface QuickActionItem {
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
}

export function QuickActionRow() {
  const { notify } = useNotification();
  const [, setLocation] = useLocation();

  const actions: QuickActionItem[] = [
    {
      label: 'New Patient',
      icon: Plus,
      action: () => setLocation('/crm/patients?action=new'),
      color: 'bg-teal-600 hover:bg-teal-700 text-white'
    },
    {
      label: 'Book Appointment',
      icon: CalendarPlus,
      action: () => setLocation('/crm/appointments?action=book'),
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    },
    {
      label: 'Create Invoice',
      icon: CreditCard,
      action: () => setLocation('/crm/billing?action=invoice'),
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    {
      label: 'Add Treatment',
      icon: Stethoscope,
      action: () => setLocation('/crm/patients?action=add_treatment'),
      color: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    {
      label: 'Open Dental Chart',
      icon: Award,
      action: () => setLocation('/crm/patients?view=chart'),
      color: 'bg-cyan-600 hover:bg-cyan-700 text-white'
    },
    {
      label: 'Upload X-ray',
      icon: FolderOpen,
      action: () => setLocation('/crm/imaging?action=upload'),
      color: 'bg-purple-600 hover:bg-purple-700 text-white'
    },
    {
      label: 'Record Payment',
      icon: DollarSign,
      action: () => setLocation('/crm/billing?action=payment'),
      color: 'bg-sky-600 hover:bg-sky-700 text-white'
    },
    {
      label: 'Create Follow-up',
      icon: Clock,
      action: () => setLocation('/crm/followups?action=create'),
      color: 'bg-rose-600 hover:bg-rose-700 text-white'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
        <Zap size={13} className="text-amber-500" />
        Persistent Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={act.action}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-center group cursor-pointer ${act.color} shadow-xs`}
          >
            <act.icon size={16} className="mb-1.5 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold tracking-tight leading-tight select-none">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 1. PATIENT CARE LANDING
export function PatientCareLanding() {
  const { stats, loading } = useLiveStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Patient Care Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage patient records, appointment books, recalls, and coordinate treatment cycles.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-teal-50/45 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{loading ? '...' : stats.patientsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Registered members active</p>
          </div>
        </div>

        <div className="bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Visits</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{loading ? '...' : stats.appointmentsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Scheduled appointments</p>
          </div>
        </div>

        <div className="bg-rose-50/45 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Recalls</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">14</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Follow-ups due this week</p>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <QuickActionRow />

      {/* Main Grid: Shortcuts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shortcuts Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider">Workspace Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortcutCard 
              title="Patients Directory" 
              description="Access patient records, register family members, update clinical timelines, and view documents."
              icon={Users}
              path="/crm/patients"
              badge="Standard"
            />
            <ShortcutCard 
              title="Appointments Calendar" 
              description="Visual daily calendar, dental chair scheduling, check-ins, and automated SMS alerts."
              icon={Calendar}
              path="/crm/appointments"
              badge="v3.8"
              badgeColor="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50"
            />
            <ShortcutCard 
              title="Follow-ups & Recalls" 
              description="Automated recall logs, patient return stats, and smart outreach campaigns."
              icon={Clock}
              path="/crm/followups"
              badge="Due Logs"
            />
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Recent Activity</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-md">Live Updates</span>
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Patient registered successfully</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Devender Rawat was added to Vijayawada Branch HQ</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Appointment confirmed via SMS</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Devender Rawat - 10:30 AM RCT Treatment Session</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Outreach follow-up scheduled</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Post-operative review call for Shalini Murthy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. CLINICAL LANDING
export function ClinicalLanding() {
  const { stats, loading } = useLiveStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Clinical Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Conduct dental charting, execute daily treatment, manage DICOM PACS, and clinical records.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-teal-50/45 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Stethoscope size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Treatment Plans</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{loading ? '...' : stats.activeTreatments}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Procedures currently in progress</p>
          </div>
        </div>

        <div className="bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PACS Documents / X-Rays</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">38</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Clinical images logged</p>
          </div>
        </div>

        <div className="bg-rose-50/45 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Cases</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">4</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Restorative & endodontic blocks</p>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <QuickActionRow />

      {/* Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider">Clinical Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortcutCard 
              title="Interactive Dental Chart" 
              description="Visual 32-tooth mapping, state selection (restored, decaying, missing), and tooth history tracking."
              icon={Award}
              path="/crm/patients?view=chart"
              badge="Core Module"
            />
            <ShortcutCard 
              title="Clinical PACS System" 
              description="Upload radiographs, crop X-rays, adjust brightness/contrast, and organize diagnostic photos."
              icon={Layers}
              path="/crm/imaging"
              badge="PACS"
              badgeColor="bg-purple-100 text-purple-800 dark:bg-purple-950/50"
            />
            <ShortcutCard 
              title="Today's Treatment Center" 
              description="Real-time chair queue dashboard, treatment execution notes, and doctor checks."
              icon={Activity}
              path="/crm/execution"
              badge="v3.8"
            />
            <ShortcutCard 
              title="Case Management" 
              description="Plan and structure comprehensive orthodontics, implant, and dental rehabilitation pathways."
              icon={Briefcase}
              path="/crm/cases"
              badge="Plans"
            />
            <ShortcutCard 
              title="Endodontic Center" 
              description="Comprehensive specialized endodontic diagnostics, apex locator logs, and treatment sheets."
              icon={HeartPulse}
              path="/crm/endodontics"
              badge="Endo Special"
              badgeColor="bg-rose-100 text-rose-800 dark:bg-rose-950/50"
            />
            <ShortcutCard 
              title="3D Patient Arch Model" 
              description="Interactive three-dimensional arch visualizer to demonstrate post-op aligner results."
              icon={Layers}
              path="/crm/3d-model"
              badge="3D Mesh"
            />
          </div>
        </div>

        {/* Clinical logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Recent Clinical Logs</span>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md">Real-time</span>
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Dental Chart Updated</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tooth #14 noted as decaying for Devender Rawat</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">PACS Radiograph Uploaded</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Bicuspid RVG file uploaded for Devender Rawat</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Endodontic Sheet Generated</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Obturation details logged by Dr. Jupalli Durga Bhavani</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. FINANCE LANDING
export function FinanceLanding() {
  const { stats, loading } = useLiveStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Finance Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate professional receipts, manage outstanding payments, view revenue dashboards, and log clinic expenses.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/45 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received (Billing)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {canViewFinancials(getRole() as any) ? (loading ? '...' : `₹${stats.totalPaid.toLocaleString('en-IN')}`) : '🔐 Restricted'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Processed receipts</p>
          </div>
        </div>

        <div className="bg-rose-50/45 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center font-bold">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {canViewFinancials(getRole() as any) ? (loading ? '...' : `₹${stats.totalBalance.toLocaleString('en-IN')}`) : '🔐 Restricted'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Uncollected payments due</p>
          </div>
        </div>

        <div className="bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Collections Rate</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">84.5%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Target: 90% collection threshold</p>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <QuickActionRow />

      {/* Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider">Finance Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortcutCard 
              title="Billing & Invoices" 
              description="Generate treatment bills, print invoices, calculate dynamic GST, and record partial/full payments."
              icon={CreditCard}
              path="/crm/billing"
              badge="Transactions"
            />
            <ShortcutCard 
              title="Revenue Dashboard" 
              description="Analytics charts of clinic earnings, billing summaries, and outstanding metrics."
              icon={TrendingUp}
              path="/crm/revenue"
              badge="Analytics"
              badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50"
            />
            <ShortcutCard 
              title="Expenses Log" 
              description="Track dental materials purchased, lab fees, utility payments, and staff payroll."
              icon={DollarSign}
              path="/crm/expenses"
              badge="Outflow"
            />
          </div>
        </div>

        {/* Recent receipts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col">
          <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Recent Collections</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md">Live Logs</span>
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">₹250 Consultation Fee Received</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Paid via Cash for Devender Rawat</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">₹5,500 Aligner Deposit Received</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Paid via UPI for Shalini Murthy</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-normal">
              <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">₹250 Consultation Bill Generated</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Devender Rawat bill SDC-BILL-250 created</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. OPERATIONS LANDING
export function OperationsLanding() {
  const { stats, loading } = useLiveStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Operations Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage dental inventory stock, coordinate team tasks, access automated workflows, templates, and SOPs.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-teal-50/45 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 text-white rounded-lg flex items-center justify-center font-bold">
            <Package size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inventory Items</p>
            <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">{loading ? '...' : stats.inventoryCount}</p>
            <p className="text-[9px] text-slate-500">Materials tracked</p>
          </div>
        </div>

        <div className="bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-bold">
            <ClipboardList size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Open Tasks</p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{loading ? '...' : stats.pendingTasks}</p>
            <p className="text-[9px] text-slate-500">Assigned to team</p>
          </div>
        </div>

        <div className="bg-amber-50/45 dark:bg-amber-950/20 border border-amber-100/70 dark:border-amber-900/40 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold">
            <Microscope size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lab Cases Active</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{loading ? '...' : stats.labWorkCount}</p>
            <p className="text-[9px] text-slate-500">Crowns/dentures in lab</p>
          </div>
        </div>

        <div className="bg-emerald-50/45 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-bold">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Triggers</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">8</p>
            <p className="text-[9px] text-slate-500">Automations running</p>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <QuickActionRow />

      {/* Shortcuts Grid */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider">Operations Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ShortcutCard 
            title="Inventory Management" 
            description="Track dental composites, dental burs, surgical gloves, with minimum stock alerts and vendor lists."
            icon={Package}
            path="/crm/inventory"
            badge="v3.8 Store"
          />
          <ShortcutCard 
            title="Lab Work Tracking" 
            description="Log prosthodontics/orthodontic orders, technician notes, design stages, and delivery dates."
            icon={Microscope}
            path="/crm/labwork"
            badge="Lab Work"
            badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-950/50"
          />
          <ShortcutCard 
            title="Task & Team Center" 
            description="Create task blocks, assign duty lists to clinic staff, track status, and tag specific patients."
            icon={ClipboardList}
            path="/crm/tasks"
            badge="Collab"
          />
          <ShortcutCard 
            title="Workflow Automation" 
            description="Configure auto-SMS alerts, automated WhatsApp confirmations, and state triggers."
            icon={Zap}
            path="/crm/automation"
            badge="Engine"
            badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50"
          />
          <ShortcutCard 
            title="Document Studio" 
            description="Generate customized dental care guidelines, pre-op instructions, and dynamic medical certificate sheets."
            icon={FileText}
            path="/crm/document-studio"
            badge="v3.2 Docs"
          />
          <ShortcutCard 
            title="Knowledge Base & SOPs" 
            description="Review clinical protocols, clinic operation checklists, and standard dental operating procedures."
            icon={FileText}
            path="/crm/knowledge"
            badge="SOPs"
          />
          <ShortcutCard 
            title="Compliance & Audit" 
            description="Review critical clinic compliance logs, waste disposal schedules, and HIPAA-friendly checks."
            icon={Shield}
            path="/crm/compliance"
            badge="Auditing"
          />
          <ShortcutCard 
            title="CRM Copilot AI" 
            description="Talk to the advanced local dental assistant to query patient files, auto-draft letters, or summarize notes."
            icon={Sparkles}
            path="/crm/copilot"
            badge="AI Assist"
            badgeColor="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50"
          />
          <ShortcutCard 
            title="Operations Overview" 
            description="General overview of branches and active operational parameters."
            icon={Building2}
            path="/crm/operations"
            badge="Center"
          />
        </div>
      </div>
    </div>
  );
}

// 5. ADMINISTRATION LANDING
export function AdministrationLanding() {
  const { stats, loading } = useLiveStats();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Administration & Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure clinic variables, adjust staff roles/permissions, manage master doctor directory, and view security audit logs.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-teal-50/45 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Branch Offices</p>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-0.5">2</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Vijayawada HQ & Guntur branch</p>
          </div>
        </div>

        <div className="bg-indigo-50/45 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Security Log count</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">140</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Critical operations logged today</p>
          </div>
        </div>

        <div className="bg-rose-50/45 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center font-bold">
            <Settings size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feature Toggles Active</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">12 / 12</p>
            <p className="text-[10px] text-slate-500 mt-0.5">All modules unlocked</p>
          </div>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350 uppercase tracking-wider">System Administration Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ShortcutCard 
            title="Clinic Settings" 
            description="Modify branch addresses, local contact info, GST preferences, numbering rules, and currency settings."
            icon={Settings}
            path="/crm/setup"
            badge="Settings"
          />
          <ShortcutCard 
            title="Roles & Permissions" 
            description="Configure role-based access control (RBAC), view active users, reset credentials, and assign branches."
            icon={Shield}
            path="/crm/users"
            badge="RBAC Security"
            badgeColor="bg-rose-100 text-rose-800 dark:bg-rose-950/50"
          />
          <ShortcutCard 
            title="Audit Security Logs" 
            description="View clinical records updates, billing log mutations, and staff login audit footprints."
            icon={FileText}
            path="/crm/audit"
            badge="Audit Logs"
          />
          <ShortcutCard 
            title="Doctors Directory" 
            description="Log credentials, MDS specialties, reg numbers, and calendar slots for all consulting doctors."
            icon={HeartPulse}
            path="/crm/doctors"
            badge="Staff Doctors"
          />
          <ShortcutCard 
            title="User Profile Profile" 
            description="Adjust your personal workspace theme, set idle lock triggers, and update signature text."
            icon={UserCircle}
            path="/crm/profile"
            badge="Personal"
          />
        </div>
      </div>
    </div>
  );
}
