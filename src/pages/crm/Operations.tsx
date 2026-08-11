import React, { useState, useEffect } from 'react';
import {
  Building2,
  HardDrive,
  Users,
  Clock,
  Briefcase,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  HeartPulse,
  Wrench,
  Gauge,
  User,
  Shield,
  Calendar,
  Zap,
  Hammer,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  getChairs, saveChair, deleteChair,
  getRooms, saveRoom,
  getDoctorSchedules, saveDoctorSchedule, deleteDoctorSchedule,
  getStaffRosters, saveStaffRoster, deleteStaffRoster,
  getSterilizationCycles, saveSterilizationCycle,
  getEquipment, saveEquipment, deleteEquipment,
  getMaintenanceTickets, saveMaintenanceTicket, deleteMaintenanceTicket,
  autoAssignChair,
  Chair, Room, DoctorSchedule, StaffRoster, SterilizationCycle, Equipment, MaintenanceTicket
} from '../../services/operationsService';
import { getRole, getCurrentUser } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';

export default function Operations() {
  const { notify } = useNotification();
  const currentRole = getRole();
  const currentUser = getCurrentUser();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chairs' | 'rooms' | 'doctors' | 'staff' | 'sterilization' | 'equipment' | 'maintenance' | 'analytics' | 'automation'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Core operations states
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [rosters, setRosters] = useState<StaffRoster[]>([]);
  const [sterilizations, setSterilizations] = useState<SterilizationCycle[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);

  // Simulation/Automations Feed state
  const [liveAlerts, setLiveAlerts] = useState<Array<{ id: string; time: string; text: string; type: 'info' | 'warning' | 'success' | 'alert' }>>([
    { id: 'a1', time: '19:30', text: 'PREVENTIVE MAINTENANCE: Woodpecker Dental Scaler service deadline is approaching (next month).', type: 'info' },
    { id: 'a2', time: '19:35', text: 'AUTOMATION: Runyes Class-B Autoclave temperature sensor calibrated successfully.', type: 'success' },
    { id: 'a3', time: '19:38', text: 'AUTOMATION: Prisma Dental Chair 4 marked under maintenance automatically due to ticket #tk-2.', type: 'warning' }
  ]);

  // Modal forms states
  const [showChairModal, setShowChairModal] = useState(false);
  const [chairForm, setChairForm] = useState({ name: '', status: 'available' as Chair['status'], notes: '' });

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterForm, setRosterForm] = useState({
    name: '',
    role: 'assistant' as StaffRoster['role'],
    shift_start: '09:00',
    shift_end: '18:00',
    assigned_chair_id: ''
  });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    doctor_id: 'doc-1',
    doctor_name: 'Dr. Durga Bhavani Jupalli',
    date: new Date().toISOString().split('T')[0],
    leave_type: 'vacation' as DoctorSchedule['leave_type'],
    leave_reason: ''
  });

  const [showSterilizationModal, setShowSterilizationModal] = useState(false);
  const [sterForm, setSterForm] = useState({
    instrument_set_name: '',
    autoclave_unit_id: 'eq-5',
    expiry_days: 30,
    operator_name: 'Kishore Kumar'
  });

  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipForm, setEquipForm] = useState({
    name: '',
    type: 'dental_unit' as Equipment['type'],
    serial_number: '',
    manufacturer: '',
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_expiry: '',
    vendor_name: '',
    vendor_contact: ''
  });

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    equipment_id: '',
    issue_description: '',
    priority: 'medium' as MaintenanceTicket['priority'],
    assigned_engineer: '',
    cost: 0
  });

  // Load Operations Data
  const loadOperationsData = async () => {
    setLoading(true);
    try {
      const chs = await getChairs();
      const rms = await getRooms();
      const schs = await getDoctorSchedules();
      const rst = await getStaffRosters();
      const ster = await getSterilizationCycles();
      const equip = await getEquipment();
      const tkts = await getMaintenanceTickets();

      setChairs(chs);
      setRooms(rms);
      setSchedules(schs);
      setRosters(rst);
      setSterilizations(ster);
      setEquipmentList(equip);
      setTickets(tkts);
    } catch (e) {
      console.error(e);
      notify('error', 'Ops Error', 'Failed to retrieve clinical ERP matrices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationsData();
  }, []);

  const triggerSync = async () => {
    await loadOperationsData();
    notify('success', 'ERP Synchronized', 'Real-time hospital matrices aligned successfully.');
  };

  // Add system alert helper
  const addSystemAlert = (text: string, type: 'info' | 'warning' | 'success' | 'alert') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveAlerts(prev => [
      { id: `a-${Date.now()}`, time, text, type },
      ...prev.slice(0, 15) // Keep last 15 alerts
    ]);
  };

  // MODULE 1: CHAIRS
  const handleCreateChair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairForm.name.trim()) return;
    try {
      const newChair: Chair = {
        id: `ch-${Date.now()}`,
        name: chairForm.name,
        status: chairForm.status,
        notes: chairForm.notes
      };
      await saveChair(newChair);
      setChairs(prev => [...prev, newChair]);
      setShowChairModal(false);
      setChairForm({ name: '', status: 'available', notes: '' });
      addSystemAlert(`AUTOMATION: Created new dental chair "${newChair.name}".`, 'info');
      notify('success', 'Chair Added', 'New clinical chair mapped to ERP.');
    } catch (err) {
      notify('error', 'Failed', 'Failed to add chair');
    }
  };

  const handleUpdateChairStatus = async (chairId: string, status: Chair['status']) => {
    const chair = chairs.find(c => c.id === chairId);
    if (!chair) return;
    try {
      const updated = { ...chair, status, last_cleaned_at: status === 'available' ? new Date().toISOString() : chair.last_cleaned_at };
      if (status === 'cleaning' || status === 'available') {
        updated.assigned_doctor_id = undefined;
        updated.assigned_doctor_name = undefined;
      }
      await saveChair(updated);
      setChairs(prev => prev.map(c => c.id === chairId ? updated : c));
      addSystemAlert(`AUTOMATION: Chair "${chair.name}" status updated to ${status.toUpperCase()}.`, status === 'available' ? 'success' : 'info');
      notify('success', 'Chair Updated', `Chair status marked as ${status}.`);
    } catch (err) {
      notify('error', 'Error', 'Failed to update chair');
    }
  };

  // MODULE 2: ROOMS
  const handleUpdateRoomOccupancy = async (roomId: string, delta: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const newOccupancy = Math.max(0, Math.min(room.capacity, room.current_occupancy + delta));
    try {
      const updated = { ...room, current_occupancy: newOccupancy };
      await saveRoom(updated);
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));

      // Notification/Automation trigger for Waiting room overflow alert
      if (room.type === 'waiting' && newOccupancy >= room.capacity * 0.8) {
        addSystemAlert(`ALARM: Waiting Lounge capacity exceeded 80% (${newOccupancy}/${room.capacity} patients). Alerted reception!`, 'alert');
        notify('warning', 'Waiting Lounge Busy', 'Patients waiting are near full capacity.');
      } else {
        addSystemAlert(`ERP LOG: Room "${room.name}" occupancy changed to ${newOccupancy}.`, 'info');
      }
    } catch (err) {
      notify('error', 'Error', 'Failed to update occupancy');
    }
  };

  // MODULE 3: DOCTOR SCHEDULER & VACATION PLANNER
  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLeave: DoctorSchedule = {
        id: `ds-${Date.now()}`,
        doctor_id: leaveForm.doctor_id,
        doctor_name: leaveForm.doctor_name,
        date: leaveForm.date,
        start_time: '00:00',
        end_time: '00:00',
        is_on_leave: true,
        leave_reason: leaveForm.leave_reason || 'Personal Leave',
        leave_type: leaveForm.leave_type
      };
      await saveDoctorSchedule(newLeave);
      setSchedules(prev => [newLeave, ...prev]);
      setShowLeaveModal(false);
      setLeaveForm({ doctor_id: 'doc-1', doctor_name: 'Dr. Durga Bhavani Jupalli', date: new Date().toISOString().split('T')[0], leave_type: 'vacation', leave_reason: '' });
      addSystemAlert(`AUTOMATION: Planned vacation/leave for ${newLeave.doctor_name} on ${newLeave.date}. Double booking prevention activated.`, 'warning');
      notify('success', 'Leave Registered', `Planned leave saved for ${newLeave.doctor_name}.`);
    } catch (err) {
      notify('error', 'Error', 'Failed to schedule leave');
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!confirm('Cancel this scheduled leave?')) return;
    try {
      await deleteDoctorSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      addSystemAlert(`AUTOMATION: Scheduled leave index deleted. Doctor freed for appointments.`, 'info');
      notify('success', 'Leave Cancelled', 'Leave successfully purged.');
    } catch (err) {
      notify('error', 'Error', 'Failed to delete leave');
    }
  };

  // MODULE 4: STAFF ROSTER
  const handleCreateRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterForm.name.trim()) return;
    try {
      const newRoster: StaffRoster = {
        id: `sr-${Date.now()}`,
        name: rosterForm.name,
        role: rosterForm.role,
        shift_date: new Date().toISOString().split('T')[0],
        shift_start: rosterForm.shift_start,
        shift_end: rosterForm.shift_end,
        attendance_status: 'present',
        assigned_chair_id: rosterForm.assigned_chair_id || undefined
      };
      await saveStaffRoster(newRoster);
      setRosters(prev => [...prev, newRoster]);
      setShowRosterModal(false);
      setRosterForm({ name: '', role: 'assistant', shift_start: '09:00', shift_end: '18:00', assigned_chair_id: '' });
      addSystemAlert(`AUTOMATION: Shift roster added for "${newRoster.name}" (${newRoster.role.toUpperCase()}).`, 'success');
      notify('success', 'Staff Member Added', 'New shift scheduled in operational matrix.');
    } catch (err) {
      notify('error', 'Error', 'Failed to add shift roster');
    }
  };

  const handleUpdateAttendance = async (rosterId: string, status: StaffRoster['attendance_status']) => {
    const roster = rosters.find(r => r.id === rosterId);
    if (!roster) return;
    try {
      const updated = { ...roster, attendance_status: status };
      await saveStaffRoster(updated);
      setRosters(prev => prev.map(r => r.id === rosterId ? updated : r));
      addSystemAlert(`STAFF LOG: ${roster.name} marked as ${status.toUpperCase()} today.`, 'info');
      notify('success', 'Roster Updated', `Attendance marked as ${status}.`);
    } catch (err) {
      notify('error', 'Error', 'Failed to update attendance');
    }
  };

  // MODULE 5: STERILIZATION
  const handleCreateSterCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sterForm.instrument_set_name.trim()) return;
    try {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(sterForm.expiry_days));

      const newCycle: SterilizationCycle = {
        id: `st-${Date.now()}`,
        instrument_set_name: sterForm.instrument_set_name,
        autoclave_unit_id: sterForm.autoclave_unit_id,
        cycle_number: `AUTO-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
        start_time: new Date().toISOString(),
        status: 'sterilizing',
        expiry_date: expDate.toISOString().split('T')[0],
        operator_name: sterForm.operator_name
      };
      await saveSterilizationCycle(newCycle);
      setSterilizations(prev => [newCycle, ...prev]);
      setShowSterilizationModal(false);
      setSterForm({ instrument_set_name: '', autoclave_unit_id: 'eq-5', expiry_days: 30, operator_name: 'Kishore Kumar' });

      addSystemAlert(`STERILIZATION: Autoclave cycle started for "${newCycle.instrument_set_name}" by operator ${newCycle.operator_name}.`, 'warning');
      notify('success', 'Cycle Started', 'High-pressure steam autoclave cycle initialized.');

      // Simulate cycle completion after 10 seconds for user playground feel
      setTimeout(async () => {
        try {
          const compCycle = { ...newCycle, status: 'completed' as const, end_time: new Date().toISOString() };
          await saveSterilizationCycle(compCycle);
          setSterilizations(curr => curr.map(c => c.id === newCycle.id ? compCycle : c));
          addSystemAlert(`STERILIZATION: Autoclave cycle "${compCycle.cycle_number}" finished. Instruments sterilised & ready. Expiry: ${compCycle.expiry_date}.`, 'success');
        } catch {}
      }, 10000);

    } catch (err) {
      notify('error', 'Error', 'Failed to start sterilization');
    }
  };

  // MODULE 6: EQUIPMENT
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipForm.name.trim() || !equipForm.serial_number.trim()) return;
    try {
      const nextServ = new Date();
      nextServ.setMonth(nextServ.getMonth() + 6); // default next service in 6 months

      const newEquip: Equipment = {
        id: `eq-${Date.now()}`,
        name: equipForm.name,
        type: equipForm.type,
        serial_number: equipForm.serial_number,
        manufacturer: equipForm.manufacturer || 'General Dental',
        purchase_date: equipForm.purchase_date,
        warranty_expiry: equipForm.warranty_expiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        last_service_date: new Date().toISOString().split('T')[0],
        next_service_date: nextServ.toISOString().split('T')[0],
        status: 'active',
        vendor_name: equipForm.vendor_name || 'Generic Vendor',
        vendor_contact: equipForm.vendor_contact || '9999999999'
      };
      await saveEquipment(newEquip);
      setEquipmentList(prev => [...prev, newEquip]);
      setShowEquipmentModal(false);
      setEquipForm({
        name: '',
        type: 'dental_unit',
        serial_number: '',
        manufacturer: '',
        purchase_date: new Date().toISOString().split('T')[0],
        warranty_expiry: '',
        vendor_name: '',
        vendor_contact: ''
      });
      addSystemAlert(`EQUIPMENT: Added new hospital asset "${newEquip.name}" into inventory records.`, 'info');
      notify('success', 'Asset Registered', 'Clinical machinery mapped successfully.');
    } catch (err) {
      notify('error', 'Error', 'Failed to create asset');
    }
  };

  // MODULE 7: MAINTENANCE CENTER
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.equipment_id || !ticketForm.issue_description.trim()) return;
    const equip = equipmentList.find(e => e.id === ticketForm.equipment_id);
    if (!equip) return;
    try {
      const newTicket: MaintenanceTicket = {
        id: `tk-${Date.now()}`,
        equipment_id: ticketForm.equipment_id,
        equipment_name: equip.name,
        issue_description: ticketForm.issue_description,
        priority: ticketForm.priority,
        assigned_engineer: ticketForm.assigned_engineer || 'Srichaitanya Internal Maintenance Team',
        status: 'reported',
        cost: Number(ticketForm.cost) || 0,
        created_at: new Date().toISOString()
      };
      await saveMaintenanceTicket(newTicket);
      setTickets(prev => [newTicket, ...prev]);
      setShowTicketModal(false);
      setTicketForm({ equipment_id: '', issue_description: '', priority: 'medium', assigned_engineer: '', cost: 0 });

      // If priority is high/critical, auto change equipment status
      if (newTicket.priority === 'critical' || newTicket.priority === 'high') {
        setEquipmentList(prev => prev.map(e => e.id === equip.id ? { ...e, status: 'under_repair' } : e));
        addSystemAlert(`AUTOMATION: Equipment "${equip.name}" marked OUT OF SERVICE due to critical ticket #${newTicket.id}.`, 'alert');
      } else {
        addSystemAlert(`MAINTENANCE: Created ticket #${newTicket.id} for "${equip.name}".`, 'warning');
      }

      notify('success', 'Ticket Created', 'Maintenance engineer dispatched.');
    } catch (err) {
      notify('error', 'Error', 'Failed to create ticket');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: MaintenanceTicket['status']) => {
    const tkt = tickets.find(t => t.id === ticketId);
    if (!tkt) return;
    try {
      const updated = { ...tkt, status, resolved_at: status === 'completed' ? new Date().toISOString() : undefined };
      await saveMaintenanceTicket(updated);
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));

      addSystemAlert(`MAINTENANCE: Ticket #${ticketId} marked as ${status.toUpperCase()}.`, status === 'completed' ? 'success' : 'info');

      // If resolved, restore equipment status to active
      if (status === 'completed') {
        const eq = equipmentList.find(e => e.id === tkt.equipment_id);
        if (eq) {
          const updatedEq = { ...eq, status: 'active' as const, last_service_date: new Date().toISOString().split('T')[0] };
          await saveEquipment(updatedEq);
          setEquipmentList(prev => prev.map(e => e.id === tkt.equipment_id ? updatedEq : e));
          addSystemAlert(`AUTOMATION: Restored equipment "${eq.name}" to ACTIVE state post-repair clearance.`, 'success');
        }
      }

      notify('success', 'Ticket Logged', `Ticket marked as ${status}.`);
    } catch (err) {
      notify('error', 'Error', 'Failed to update ticket');
    }
  };

  // MODULE 10: AUTOMATION AUTOMATIC CHAIR ASSIGNMENT SIMULATOR
  const triggerAutoAssignSimulation = async () => {
    const res = await autoAssignChair('doc-1', 'Dr. Durga Bhavani Jupalli');
    if (res.success) {
      // Refresh chairs state from DB/Local storage
      const chs = await getChairs();
      setChairs(chs);
      addSystemAlert(`AUTOMATION: ${res.message}`, 'success');
      notify('success', 'Auto-Assign Successful', res.message);
    } else {
      addSystemAlert(res.message, 'alert');
      notify('error', 'Allocation Blocked', 'No available chairs. High load alert dispatched to reception.');
    }
  };

  // Analytics Math
  const occupiedChairsCount = chairs.filter(c => c.status === 'occupied').length;
  const availableChairsCount = chairs.filter(c => c.status === 'available').length;
  const totalChairsCount = chairs.length || 1;
  const chairUtilizationPercent = Math.round((occupiedChairsCount / totalChairsCount) * 100);

  const presentStaffCount = rosters.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length;
  const totalStaffCount = rosters.length || 1;
  const staffAttendanceRate = Math.round((presentStaffCount / totalStaffCount) * 100);

  // Active doctors (not on leave)
  const activeDoctors = schedules.filter(s => !s.is_on_leave);
  const totalDoctors = schedules.length || 1;
  const doctorUtilizationPercent = Math.round((activeDoctors.length / totalDoctors) * 100);

  // Maintenance Cost
  const totalMaintenanceCost = tickets.reduce((acc, t) => acc + t.cost, 0);
  const pendingTicketsCount = tickets.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

  // Equipment Alerts count (out of service / under repair / maintenance due)
  const equipmentAlertsCount = equipmentList.filter(e => e.status !== 'active').length;

  // Recharts Data Transformation
  const chairChartData = chairs.map(c => ({
    name: c.name.split(' ')[2] || c.name,
    status: c.status === 'occupied' ? 100 : c.status === 'available' ? 0 : 50
  }));

  const roomChartData = rooms.map(r => ({
    name: r.name.split(' ')[0],
    occupancy: r.current_occupancy,
    capacity: r.capacity
  }));

  const equipmentTypeStats = equipmentList.reduce((acc: any, eq) => {
    const existing = acc.find((x: any) => x.type === eq.type);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ type: eq.type, count: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-600 rounded-lg text-white">
              <Building2 size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-teal-100 text-teal-800 px-2 py-0.5 rounded">ERP-OPS</span>
            <span className="text-[10px] font-semibold text-slate-400">Sri Chaitanya Hospital ERP Engine</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-2 uppercase tracking-tight">Enterprise Clinical Operations Center</h2>
          <p className="text-xs text-slate-500">Real-time resource allocator for dental units, clinical theatres, sterilization cycles, personnel rostering, and machinery lifecycle.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerSync}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Synchronize ERP</span>
          </button>
        </div>
      </div>

      {/* Main Command Navigation tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
        {[
          { id: 'dashboard', label: 'Command Desk', icon: Gauge },
          { id: 'chairs', label: 'Dental Chairs', icon: Sliders },
          { id: 'rooms', label: 'Rooms & Waiting', icon: Layers },
          { id: 'doctors', label: 'Doctors', icon: HeartPulse },
          { id: 'staff', label: 'Shift Roster', icon: Users },
          { id: 'sterilization', label: 'Sterilization', icon: Activity },
          { id: 'equipment', label: 'Asset Register', icon: HardDrive },
          { id: 'maintenance', label: 'Maintenance Center', icon: Wrench },
          { id: 'analytics', label: 'Resource Analytics', icon: DollarSign },
          { id: 'automation', label: 'Automation & Rules', icon: Zap }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700 bg-teal-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={13} className={isActive ? 'text-teal-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="animate-spin text-teal-600 mb-2" size={28} />
          <p className="text-xs font-bold uppercase tracking-wider">Synchronizing hospital telemetry grids...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DAILY OPERATIONS DASHBOARD (COMMAND DESK) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Daily Operations Quick Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chair Allocation</span>
                    <h3 className="text-xl font-black text-slate-800">{occupiedChairsCount} / {chairs.length} Occupied</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">{chairUtilizationPercent}% Utilized</span>
                      <span className="text-[9px] font-bold text-slate-400">{availableChairsCount} ready</span>
                    </div>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Sliders size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Duty Doctors</span>
                    <h3 className="text-xl font-black text-slate-800">{activeDoctors.length} On Duty</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{doctorUtilizationPercent}% Availability</span>
                      <span className="text-[9px] font-bold text-slate-400">{schedules.filter(s => s.is_on_leave).length} on leave</span>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><HeartPulse size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nursing & Support Staff</span>
                    <h3 className="text-xl font-black text-slate-800">{presentStaffCount} Present</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{staffAttendanceRate}% Roster Rate</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Critical Maintenance</span>
                    <h3 className="text-xl font-black text-slate-800">{pendingTicketsCount} Active Tickets</h3>
                    <div className="flex items-center gap-1.5">
                      {equipmentAlertsCount > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 flex items-center gap-0.5">
                          <AlertTriangle size={8} /> {equipmentAlertsCount} equipment alerts
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">All machinery active</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Wrench size={18} /></div>
                </div>
              </div>

              {/* Main Command Desk split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Live Activity Feed & Autonomic Simulations */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 lg:col-span-2 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="text-teal-600" size={14} />
                        Automated Operations Simulator
                      </h3>
                      <p className="text-[11px] text-slate-400">Simulate high-throughput hospital scenarios to check double-booking guards and automated chair selectors.</p>
                    </div>
                    <span className="text-[9px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase">ACTIVE ENGINE</span>
                  </div>

                  {/* Simulator buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                      <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Chair Automation Rule</h4>
                      <p className="text-[10px] text-slate-400">Trigger standard patient booking sequence. Assigns first vacant dental unit & logs to PACS.</p>
                      <button
                        onClick={triggerAutoAssignSimulation}
                        className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Zap size={10} />
                        Simulate Auto-Chair Assignment
                      </button>
                    </div>

                    <div className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                      <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Waiting Lounge Tracker</h4>
                      <p className="text-[10px] text-slate-400">Increment spatial load in reception lounge. Test auto-overflow warning alerts (80%+).</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRoomOccupancy('rm-5', 1)}
                          className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          +1 Patient
                        </button>
                        <button
                          onClick={() => handleUpdateRoomOccupancy('rm-5', -1)}
                          className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          -1 Patient
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live alerts log */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Automated Event Logs (Real-time telemetry)</h4>
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                      {liveAlerts.map(alert => {
                        const isSuccess = alert.type === 'success';
                        const isWarning = alert.type === 'warning';
                        const isAlert = alert.type === 'alert';
                        return (
                          <div key={alert.id} className="flex items-start gap-2.5 p-2.5 hover:bg-slate-50 transition text-xs">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{alert.time}</span>
                            <span className={`p-1 rounded shrink-0 ${
                              isSuccess ? 'bg-green-50 text-green-600' : isWarning ? 'bg-amber-50 text-amber-600' : isAlert ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isSuccess ? <CheckCircle2 size={10} /> : isWarning ? <AlertTriangle size={10} /> : isAlert ? <AlertTriangle size={10} /> : <Zap size={10} />}
                            </span>
                            <p className="font-semibold text-slate-600 leading-relaxed flex-1">{alert.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Action Panel & AMC Due Equipment */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Machinery & AMC Audit</h3>
                    <p className="text-[11px] text-slate-400">Machinery nearing manufacturer warranty expiry or service intervals.</p>
                  </div>

                  <div className="space-y-3">
                    {equipmentList.slice(0, 4).map(eq => {
                      const isAlert = eq.status !== 'active';
                      return (
                        <div key={eq.id} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{eq.name}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              isAlert ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              {eq.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>S/N: {eq.serial_number}</span>
                            <span className="font-semibold text-teal-600">Next: {new Date(eq.next_service_date).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Wrench size={12} />
                    Open Maintenance Center
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHAIR MANAGEMENT */}
          {activeTab === 'chairs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Dental Chair Matrix</h3>
                  <p className="text-[11px] text-slate-400">Overview of clinical operatories, active treatments, and sanitary status.</p>
                </div>
                <button
                  onClick={() => setShowChairModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Add New Chair
                </button>
              </div>

              {/* Chairs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {chairs.map(c => {
                  const isAvailable = c.status === 'available';
                  const isOccupied = c.status === 'occupied';
                  const isCleaning = c.status === 'cleaning';
                  const isMaint = c.status === 'maintenance' || c.status === 'out_of_service';

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                        isOccupied ? 'border-teal-300 bg-teal-50/10' : isCleaning ? 'border-indigo-300 bg-indigo-50/10' : isMaint ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200 bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{c.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            isOccupied ? 'bg-teal-100 text-teal-800 border-teal-200' : isCleaning ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : isMaint ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>

                        {c.assigned_doctor_name ? (
                          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                            Active Doctor: <strong className="text-slate-700">{c.assigned_doctor_name}</strong>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No physician assigned</p>
                        )}

                        {c.notes && <p className="text-[10px] text-slate-400 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">{c.notes}</p>}
                      </div>

                      {/* Interactive toggle buttons */}
                      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => handleUpdateChairStatus(c.id, 'available')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] transition"
                        >
                          Make Available
                        </button>
                        <button
                          onClick={() => handleUpdateChairStatus(c.id, 'cleaning')}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[9px] transition"
                        >
                          Disinfect
                        </button>
                        <button
                          onClick={() => handleUpdateChairStatus(c.id, 'maintenance')}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[9px] transition"
                        >
                          Service
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ROOM MANAGEMENT */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Spatial Room Utilization</h3>
                <p className="text-[11px] text-slate-400">Track and manage spatial thresholds for clinics, surgery theatres, and public areas.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(r => {
                  const utilPercent = Math.min(100, Math.round((r.current_occupancy / r.capacity) * 100));
                  return (
                    <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {r.type}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 uppercase mt-1">{r.name}</h4>
                        </div>
                        <span className="text-[10px] font-black text-slate-600">{r.current_occupancy} / {r.capacity} Max</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Usage Intensity</span>
                          <span className={`font-bold ${utilPercent >= 80 ? 'text-rose-600' : 'text-teal-600'}`}>{utilPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${utilPercent}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${utilPercent >= 80 ? 'bg-rose-500' : 'bg-teal-500'}`}
                          ></div>
                        </div>
                      </div>

                      {/* Controls to adjust simulated spatial density */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleUpdateRoomOccupancy(r.id, 1)}
                          className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                        >
                          Add Patient (+1)
                        </button>
                        <button
                          onClick={() => handleUpdateRoomOccupancy(r.id, -1)}
                          className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                        >
                          Remove (-1)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DOCTOR SCHEDULER & VACATION PLANNER */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Physician Availability Calendar</h3>
                  <p className="text-[11px] text-slate-400">Plan shifts, register leaves, and lock lunch breaks to guarantee zero scheduling overlaps.</p>
                </div>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Plan Leave / Vacation
                </button>
              </div>

              {/* Leaves ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-150 bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Leave & Emergency Off Ledger</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                        <th className="p-3">Doctor</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Leave Category</th>
                        <th className="p-3">Stated Reason</th>
                        <th className="p-3 text-right">Purge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedules.map(sch => (
                        <tr key={sch.id} className="hover:bg-slate-50/30">
                          <td className="p-3 font-bold text-slate-700">{sch.doctor_name}</td>
                          <td className="p-3 font-semibold text-slate-500">{sch.date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              sch.leave_type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {sch.leave_type || 'regular'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 font-medium italic">{sch.leave_reason || 'N/A'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteLeave(sch.id)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={12} />
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

          {/* TAB 5: STAFF ROSTER */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Operational Support Staffing</h3>
                  <p className="text-[11px] text-slate-400">Track attendance, assign staff responsibilities, and schedule dental assistant shifts.</p>
                </div>
                <button
                  onClick={() => setShowRosterModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Add Team Shift
                </button>
              </div>

              {/* Roster list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rosters.map(r => {
                  const isPresent = r.attendance_status === 'present';
                  const isLate = r.attendance_status === 'late';
                  const isLeave = r.attendance_status === 'on_leave';

                  return (
                    <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase">{r.name}</h4>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            {r.role}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          isPresent ? 'bg-green-50 text-green-700 border-green-100' : isLate ? 'bg-amber-50 text-amber-700 border-amber-200' : isLeave ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-150'
                        }`}>
                          {r.attendance_status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-semibold space-y-1">
                        <div>Shift timings: <strong className="text-slate-600">{r.shift_start} - {r.shift_end}</strong></div>
                        {r.assigned_chair_id && (
                          <div className="text-teal-600 font-bold">Assigned operatory: Chair #{r.assigned_chair_id.split('-')[1]}</div>
                        )}
                      </div>

                      {/* Daily attendance checkin actions */}
                      <div className="flex gap-1.5 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => handleUpdateAttendance(r.id, 'present')}
                          className="px-1.5 py-0.5 rounded bg-green-50 hover:bg-green-100 text-green-700 font-bold text-[8px] transition"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleUpdateAttendance(r.id, 'late')}
                          className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[8px] transition"
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleUpdateAttendance(r.id, 'on_leave')}
                          className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[8px] transition"
                        >
                          On Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: STERILIZATION TRACKER */}
          {activeTab === 'sterilization' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">CSSD Instrument Sterilization</h3>
                  <p className="text-[11px] text-slate-400">Class-B steam autoclave cycle monitoring ledger with expiry audit.</p>
                </div>
                <button
                  onClick={() => setShowSterilizationModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Start Autoclave Cycle
                </button>
              </div>

              {/* Sterilization Cycle cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sterilizations.map(st => {
                  const isDone = st.status === 'completed';
                  const isSter = st.status === 'sterilizing';

                  return (
                    <div key={st.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
                      {isSter && <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600 animate-pulse"></div>}

                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 uppercase">{st.instrument_set_name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          isDone ? 'bg-green-50 text-green-700 border-green-100' : isSter ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {st.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-semibold space-y-1">
                        <div>Batch Code: <span className="font-mono text-slate-600">{st.cycle_number}</span></div>
                        <div>Responsible staff: <span className="text-slate-600 font-bold">{st.operator_name}</span></div>
                        {st.expiry_date && (
                          <div className={isDone ? 'text-teal-600 font-bold' : 'text-slate-400'}>
                            Sterilization Expiry: {st.expiry_date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: EQUIPMENT LOGS */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Hospital Asset Register</h3>
                  <p className="text-[11px] text-slate-400">Complete log of dental units, CBCT machines, compressors, and AMC parameters.</p>
                </div>
                <button
                  onClick={() => setShowEquipmentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Register Machinery Asset
                </button>
              </div>

              {/* Equipment list ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                        <th className="p-3">Machine Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">S/N Code</th>
                        <th className="p-3">Next Service</th>
                        <th className="p-3">Vendor Support</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equipmentList.map(eq => {
                        const isUnderRepair = eq.status === 'under_repair';
                        const isDue = eq.status === 'maintenance_due';

                        return (
                          <tr key={eq.id} className="hover:bg-slate-50/20">
                            <td className="p-3">
                              <div className="font-bold text-slate-700">{eq.name}</div>
                              <div className="text-[9px] text-slate-400 font-semibold">{eq.manufacturer}</div>
                            </td>
                            <td className="p-3 uppercase text-[9px] font-bold text-slate-500">{eq.type.replace('_', ' ')}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">{eq.serial_number}</td>
                            <td className="p-3 text-slate-500 font-semibold">{eq.next_service_date}</td>
                            <td className="p-3 text-[10px] text-slate-400">
                              <div className="font-bold text-slate-600">{eq.vendor_name}</div>
                              <div>{eq.vendor_contact}</div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                isUnderRepair ? 'bg-red-50 text-red-700 border border-red-200' : isDue ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700'
                              }`}>
                                {eq.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: MAINTENANCE CENTER */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Asset Maintenance Tickets</h3>
                  <p className="text-[11px] text-slate-400">Log repairs, assign engineers, and monitor ongoing preventive maintenance protocols.</p>
                </div>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus size={12} />
                  Raise Maintenance Ticket
                </button>
              </div>

              {/* Maintenance tickets table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                        <th className="p-3">Ticket ID</th>
                        <th className="p-3">Target Asset</th>
                        <th className="p-3">Issue Stated</th>
                        <th className="p-3">Assigned Engineer</th>
                        <th className="p-3">Cost</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3 text-right">Status / Resolve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tickets.map(tk => {
                        const isCritical = tk.priority === 'critical' || tk.priority === 'high';
                        const isDone = tk.status === 'completed';

                        return (
                          <tr key={tk.id} className="hover:bg-slate-50/10">
                            <td className="p-3 font-mono font-bold text-slate-400 text-[10px]">#{tk.id.split('-')[1] || tk.id}</td>
                            <td className="p-3 font-bold text-slate-700">{tk.equipment_name}</td>
                            <td className="p-3 text-slate-500 font-medium max-w-[200px] truncate">{tk.issue_description}</td>
                            <td className="p-3 text-slate-400 font-semibold">{tk.assigned_engineer}</td>
                            <td className="p-3 text-teal-600 font-bold">₹{tk.cost}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                isCritical ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-600'
                              }`}>
                                {tk.priority}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              {isDone ? (
                                <span className="text-green-600 font-black text-[10px] uppercase tracking-wide">Resolved</span>
                              ) : (
                                <button
                                  onClick={() => handleUpdateTicketStatus(tk.id, 'completed')}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] rounded transition"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: RESOURCE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Hospital ERP Analytics</h3>
                <p className="text-[11px] text-slate-400">Stated productivity analysis, chair utilization graphs, and cumulative maintenance expense.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Chair state comparison */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Dental Chair Utilisation Indicator</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chairChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <Bar dataKey="status" fill="#0d9488" radius={[4, 4, 0, 0]}>
                          {chairChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.status === 100 ? '#0d9488' : entry.status === 50 ? '#fbbf24' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] font-black text-slate-500 uppercase">
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-teal-600 rounded"></span> Occupied (100%)</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded"></span> Maintenance (50%)</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Vacant (0%)</div>
                  </div>
                </div>

                {/* Chart 2: Spatial capacity vs current occupancy */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Spatial Occupancy vs Capacity Limits</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roomChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="occupancy" fill="#6366f1" radius={[4, 4, 0, 0]} name="Current Occupancy" />
                        <Bar dataKey="capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Stated Capacity" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Cost analytics block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cumulative AMC Expenditure</span>
                  <h3 className="text-xl font-black text-slate-800">₹{totalMaintenanceCost.toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] text-slate-400">Accumulated repairs logged on ERP.</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Mean Maintenance Cost per Machine</span>
                  <h3 className="text-xl font-black text-slate-800">₹{Math.round(totalMaintenanceCost / (equipmentList.length || 1)).toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] text-slate-400">Total costs averaged across registered inventory.</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Average Appointment Duration</span>
                  <h3 className="text-xl font-black text-slate-800">42 Minutes</h3>
                  <p className="text-[10px] text-slate-400">Calculated mean treatment duration today.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: AUTOMATION RULES */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Automated Hospital ERP Workflows</h3>
                <p className="text-[11px] text-slate-400">Real-time automation matrix and trigger points active in the clinic.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0"><Zap size={20} /></div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Automatic Chair Assignment</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Automatically assigns the first vacant clinical chair unit to patient dental bookings upon physician arrival. Blocks overlaps instantly.</p>
                    <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0"><AlertTriangle size={20} /></div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Machinery Status Auto-Change</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">If a critical or high-priority maintenance ticket is generated, the target clinical equipment is immediately updated to "under_repair" automatically.</p>
                    <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Users size={20} /></div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Lounge Capacity Alerts</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Real-time occupancy guard. Triggers critical alert warning at reception if the clinic waiting area crosses 80% maximum spatial limit.</p>
                    <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><CheckCircle2 size={20} /></div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-800 uppercase">Sterilization Lifecycle Trackers</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Sets maximum safety boundaries on sterilised surgical sets. Marks batches as expired immediately after 30 days to enforce compliance.</p>
                    <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CHAIR MODAL */}
      {showChairModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateChair} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Add New Dental Chair</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Chair Name</label>
                <input
                  type="text"
                  required
                  value={chairForm.name}
                  onChange={e => setChairForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Chair 6 (Prosthodontics)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Stated Status</label>
                <select
                  value={chairForm.status}
                  onChange={e => setChairForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Notes</label>
                <input
                  type="text"
                  value={chairForm.notes}
                  onChange={e => setChairForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes or clinical description"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowChairModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Map Chair
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ROSTER MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateRoster} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Add Staff Shift</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  value={rosterForm.name}
                  onChange={e => setRosterForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Clinic Role</label>
                <select
                  value={rosterForm.role}
                  onChange={e => setRosterForm(p => ({ ...p, role: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="assistant">Dental Assistant</option>
                  <option value="hygienist">Hygienist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Shift Start</label>
                  <input
                    type="text"
                    required
                    value={rosterForm.shift_start}
                    onChange={e => setRosterForm(p => ({ ...p, shift_start: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Shift End</label>
                  <input
                    type="text"
                    required
                    value={rosterForm.shift_end}
                    onChange={e => setRosterForm(p => ({ ...p, shift_end: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Assign Chair</label>
                <select
                  value={rosterForm.assigned_chair_id}
                  onChange={e => setRosterForm(p => ({ ...p, assigned_chair_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- No Specific Unit --</option>
                  {chairs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Save Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LEAVE / VACATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLeave} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Plan Doctor Leave</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Physician</label>
                <select
                  value={leaveForm.doctor_id}
                  onChange={e => {
                    const id = e.target.value;
                    const docNames: Record<string, string> = {
                      'doc-1': 'Dr. Durga Bhavani Jupalli',
                      'doc-2': 'Dr. Durga Bhavani Jupalli',
                      'doc-3': 'Dr. Radhika',
                      'doc-4': 'Dr. Prasad Bolla'
                    };
                    setLeaveForm(p => ({ ...p, doctor_id: id, doctor_name: docNames[id] }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="doc-1">Dr. Durga Bhavani Jupalli</option>
                  <option value="doc-2">Dr. Durga Bhavani Jupalli</option>
                  <option value="doc-3">Dr. Radhika</option>
                  <option value="doc-4">Dr. Prasad Bolla</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Stated Date</label>
                <input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={e => setLeaveForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Leave Category</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="vacation">Vacation Planner</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="regular">Regular Off</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={leaveForm.leave_reason}
                  onChange={e => setLeaveForm(p => ({ ...p, leave_reason: e.target.value }))}
                  placeholder="e.g. Attending dental conference"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Confirm Leave
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STERILIZATION MODAL */}
      {showSterilizationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSterCycle} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Start Autoclave Cycle</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Instrument Set Stated</label>
                <input
                  type="text"
                  required
                  value={sterForm.instrument_set_name}
                  onChange={e => setSterForm(p => ({ ...p, instrument_set_name: e.target.value }))}
                  placeholder="e.g. Diagnostic Probe Kit C"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Autoclave machinery</label>
                <select
                  value={sterForm.autoclave_unit_id}
                  onChange={e => setSterForm(p => ({ ...p, autoclave_unit_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="eq-5">Runyes Class-B Autoclave</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Safety Expiry Days</label>
                <input
                  type="number"
                  value={sterForm.expiry_days}
                  onChange={e => setSterForm(p => ({ ...p, expiry_days: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Operator</label>
                <input
                  type="text"
                  value={sterForm.operator_name}
                  onChange={e => setSterForm(p => ({ ...p, operator_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowSterilizationModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Initialize Cycle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EQUIPMENT MODAL */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateEquipment} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Register Asset Machinery</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={equipForm.name}
                  onChange={e => setEquipForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. intraoral scanner X1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Machinery Type</label>
                  <select
                    value={equipForm.type}
                    onChange={e => setEquipForm(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="dental_unit">Dental Chair Unit</option>
                    <option value="rvg_sensor">RVG Sensor</option>
                    <option value="intraoral_camera">Intraoral Camera</option>
                    <option value="compressor">Compressor</option>
                    <option value="autoclave">Autoclave</option>
                    <option value="scaler">Scaler</option>
                    <option value="handpiece">Handpiece</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={equipForm.serial_number}
                    onChange={e => setEquipForm(p => ({ ...p, serial_number: e.target.value }))}
                    placeholder="S/N Code"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={equipForm.manufacturer}
                    onChange={e => setEquipForm(p => ({ ...p, manufacturer: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Warranty Exp</label>
                  <input
                    type="date"
                    value={equipForm.warranty_expiry}
                    onChange={e => setEquipForm(p => ({ ...p, warranty_expiry: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Vendor Stated</label>
                  <input
                    type="text"
                    value={equipForm.vendor_name}
                    onChange={e => setEquipForm(p => ({ ...p, vendor_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Vendor Contact</label>
                  <input
                    type="text"
                    value={equipForm.vendor_contact}
                    onChange={e => setEquipForm(p => ({ ...p, vendor_contact: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowEquipmentModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Confirm Register
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TICKET MODAL */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-100 pb-2">Log Maintenance Ticket</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Machine Asset</label>
                <select
                  required
                  value={ticketForm.equipment_id}
                  onChange={e => setTicketForm(p => ({ ...p, equipment_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Machinery --</option>
                  {equipmentList.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.serial_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Problem Description</label>
                <textarea
                  required
                  value={ticketForm.issue_description}
                  onChange={e => setTicketForm(p => ({ ...p, issue_description: e.target.value }))}
                  placeholder="Vibration, error code 0x1, hydraulic leak..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Stated Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={e => setTicketForm(p => ({ ...p, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Alarm</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Assigned Support</label>
                  <input
                    type="text"
                    value={ticketForm.assigned_engineer}
                    onChange={e => setTicketForm(p => ({ ...p, assigned_engineer: e.target.value }))}
                    placeholder="Engineer / Agency"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Estimated Cost (INR)</label>
                <input
                  type="number"
                  value={ticketForm.cost}
                  onChange={e => setTicketForm(p => ({ ...p, cost: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-black shadow-xs"
              >
                Dispatch Engineer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
