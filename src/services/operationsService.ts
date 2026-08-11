import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface Chair {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  assigned_doctor_id?: string;
  assigned_doctor_name?: string;
  last_cleaned_at?: string;
  notes?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'consultation' | 'surgery' | 'xray' | 'sterilization' | 'waiting';
  capacity: number;
  current_occupancy: number;
  status: 'active' | 'cleaning' | 'maintenance';
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  doctor_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  is_on_leave: boolean;
  leave_reason?: string;
  leave_type?: 'vacation' | 'emergency' | 'sick' | 'regular';
  lunch_break_start?: string;
  lunch_break_end?: string;
}

export interface StaffRoster {
  id: string;
  name: string;
  role: 'receptionist' | 'assistant' | 'hygienist' | 'lab_technician' | 'manager';
  shift_date: string; // YYYY-MM-DD
  shift_start: string;
  shift_end: string;
  attendance_status: 'present' | 'absent' | 'late' | 'on_leave';
  assigned_chair_id?: string;
}

export interface SterilizationCycle {
  id: string;
  instrument_set_name: string;
  autoclave_unit_id: string;
  cycle_number: string;
  start_time: string;
  end_time?: string;
  status: 'pending' | 'sterilizing' | 'completed' | 'failed';
  expiry_date?: string;
  operator_name: string;
  assigned_procedure_id?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'dental_unit' | 'rvg_sensor' | 'intraoral_camera' | 'compressor' | 'autoclave' | 'scaler' | 'handpiece';
  serial_number: string;
  manufacturer: string;
  purchase_date: string;
  warranty_expiry: string;
  amc_expiry?: string;
  last_service_date: string;
  next_service_date: string;
  status: 'active' | 'under_repair' | 'out_of_service' | 'maintenance_due';
  vendor_name: string;
  vendor_contact: string;
}

export interface MaintenanceTicket {
  id: string;
  equipment_id: string;
  equipment_name: string;
  issue_description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_engineer: string;
  engineer_contact?: string;
  status: 'reported' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost: number;
  created_at: string;
  resolved_at?: string;
}

// Helper: load default mock data to ensure out of box operation
const DEFAULT_CHAIRS: Chair[] = [
  { id: 'ch-1', name: 'Dental Chair 1 (Orthodontic)', status: 'available', last_cleaned_at: '2026-07-16T15:30:00Z', notes: 'Prime unit' },
  { id: 'ch-2', name: 'Dental Chair 2 (Pediatric)', status: 'occupied', assigned_doctor_id: 'doc-1', assigned_doctor_name: 'Dr. Durga Bhavani Jupalli', last_cleaned_at: '2026-07-16T18:00:00Z', notes: 'Features child console' },
  { id: 'ch-3', name: 'Dental Chair 3 (Implant Suite)', status: 'cleaning', last_cleaned_at: '2026-07-16T19:15:00Z', notes: 'Post-surgery disinfection cycle' },
  { id: 'ch-4', name: 'Dental Chair 4 (General Practice)', status: 'maintenance', last_cleaned_at: '2026-07-15T12:00:00Z', notes: 'Awaiting handpiece repair' },
  { id: 'ch-5', name: 'Dental Chair 5 (Aesthetic Suite)', status: 'available', last_cleaned_at: '2026-07-16T16:45:00Z', notes: 'Smile design workspace' }
];

const DEFAULT_ROOMS: Room[] = [
  { id: 'rm-1', name: 'Consultation Room A', type: 'consultation', capacity: 4, current_occupancy: 2, status: 'active' },
  { id: 'rm-2', name: 'Implant OT (Room 1)', type: 'surgery', capacity: 6, current_occupancy: 3, status: 'active' },
  { id: 'rm-3', name: 'X-Ray & CBCT Scanner', type: 'xray', capacity: 2, current_occupancy: 1, status: 'active' },
  { id: 'rm-4', name: 'Sterilization Lab', type: 'sterilization', capacity: 3, current_occupancy: 1, status: 'active' },
  { id: 'rm-5', name: 'Reception & Waiting Lounge', type: 'waiting', capacity: 30, current_occupancy: 12, status: 'active' }
];

const DEFAULT_DOCTOR_SCHEDULES: DoctorSchedule[] = [
  { id: 'ds-1', doctor_id: 'doc-1', doctor_name: 'Dr. Durga Bhavani Jupalli', date: '2026-07-16', start_time: '09:00', end_time: '18:00', is_on_leave: false, lunch_break_start: '13:00', lunch_break_end: '14:00' }
];

const DEFAULT_STAFF_ROSTERS: StaffRoster[] = [
  { id: 'sr-1', name: 'Pooja Reddy', role: 'receptionist', shift_date: '2026-07-16', shift_start: '08:30', shift_end: '17:30', attendance_status: 'present' },
  { id: 'sr-2', name: 'Kishore Kumar', role: 'assistant', shift_date: '2026-07-16', shift_start: '09:00', shift_end: '18:00', attendance_status: 'present', assigned_chair_id: 'ch-2' },
  { id: 'sr-3', name: 'Bhavani Prasad', role: 'receptionist', shift_date: '2026-07-16', shift_start: '11:00', shift_end: '20:00', attendance_status: 'present' },
  { id: 'sr-4', name: 'Ramya Sree', role: 'hygienist', shift_date: '2026-07-16', shift_start: '09:00', shift_end: '18:00', attendance_status: 'late' },
  { id: 'sr-5', name: 'Srinivas Rao', role: 'lab_technician', shift_date: '2026-07-16', shift_start: '09:00', shift_end: '18:00', attendance_status: 'present' },
  { id: 'sr-6', name: 'Durga Prasad', role: 'manager', shift_date: '2026-07-16', shift_start: '08:00', shift_end: '17:00', attendance_status: 'on_leave' }
];

const DEFAULT_STERILIZATION: SterilizationCycle[] = [
  { id: 'st-1', instrument_set_name: 'Implant Kit Alpha', autoclave_unit_id: 'eq-5', cycle_number: 'AUTO-2026-0714', start_time: '2026-07-16T08:30:00Z', end_time: '2026-07-16T09:15:00Z', status: 'completed', expiry_date: '2026-08-16', operator_name: 'Kishore Kumar' },
  { id: 'st-2', instrument_set_name: 'Extraction Set Bravo', autoclave_unit_id: 'eq-5', cycle_number: 'AUTO-2026-0715', start_time: '2026-07-16T11:00:00Z', end_time: '2026-07-16T11:45:00Z', status: 'completed', expiry_date: '2026-08-16', operator_name: 'Kishore Kumar', assigned_procedure_id: 'proc-x' },
  { id: 'st-3', instrument_set_name: 'Endodontic Files Combo C', autoclave_unit_id: 'eq-5', cycle_number: 'AUTO-2026-0716', start_time: '2026-07-16T19:00:00Z', status: 'sterilizing', operator_name: 'Ramya Sree' }
];

const DEFAULT_EQUIPMENT: Equipment[] = [
  { id: 'eq-1', name: 'Prisma Dental Chair Unit', type: 'dental_unit', serial_number: 'PR-901-2024', manufacturer: 'DentSply Sirona', purchase_date: '2024-03-12', warranty_expiry: '2027-03-12', amc_expiry: '2028-03-12', last_service_date: '2026-04-10', next_service_date: '2026-10-10', status: 'active', vendor_name: 'Apex Dental Distr.', vendor_contact: '9988776655' },
  { id: 'eq-2', name: 'Planmeca CBCT 3D X-Ray', type: 'dental_unit', serial_number: 'PM-CB-8821', manufacturer: 'Planmeca Oy', purchase_date: '2023-01-15', warranty_expiry: '2025-01-15', amc_expiry: '2027-01-15', last_service_date: '2026-06-15', next_service_date: '2026-09-15', status: 'active', vendor_name: 'Planmeca India Support', vendor_contact: '8877665544' },
  { id: 'eq-3', name: 'RVG Carestream Sensor #1', type: 'rvg_sensor', serial_number: 'CS-RVG-22', manufacturer: 'Carestream Dental', purchase_date: '2025-06-01', warranty_expiry: '2028-06-01', amc_expiry: '2029-06-01', last_service_date: '2026-06-01', next_service_date: '2026-12-01', status: 'active', vendor_name: 'Carestream Tech Hub', vendor_contact: '7766554433' },
  { id: 'eq-4', name: 'Woodpecker Dental Scaler', type: 'scaler', serial_number: 'WP-SC-4421', manufacturer: 'Woodpecker Inc.', purchase_date: '2024-08-10', warranty_expiry: '2025-08-10', amc_expiry: '2026-08-10', last_service_date: '2025-08-10', next_service_date: '2026-08-10', status: 'maintenance_due', vendor_name: 'Woodpecker Direct', vendor_contact: '6655443322' },
  { id: 'eq-5', name: 'Runyes Class-B Autoclave', type: 'autoclave', serial_number: 'RY-AU-18L', manufacturer: 'Runyes Corp', purchase_date: '2023-11-20', warranty_expiry: '2025-11-20', amc_expiry: '2026-11-20', last_service_date: '2026-05-20', next_service_date: '2026-11-20', status: 'active', vendor_name: 'SterilTech Corp', vendor_contact: '5544332211' },
  { id: 'eq-6', name: 'Atlas Copco Dental Compressor', type: 'compressor', serial_number: 'AC-DC-05', manufacturer: 'Atlas Copco', purchase_date: '2022-05-01', warranty_expiry: '2024-05-01', amc_expiry: '2027-05-01', last_service_date: '2026-02-15', next_service_date: '2026-08-15', status: 'active', vendor_name: 'Atlas Copco Sales', vendor_contact: '4433221100' }
];

const DEFAULT_TICKETS: MaintenanceTicket[] = [
  { id: 'tk-1', equipment_id: 'eq-4', equipment_name: 'Woodpecker Dental Scaler', issue_description: 'Vibration issue & low water pressure in spray tip.', priority: 'medium', assigned_engineer: 'Kumar Technics', engineer_contact: '9123456789', status: 'scheduled', cost: 1500, created_at: '2026-07-15T10:00:00Z' },
  { id: 'tk-2', equipment_id: 'eq-1', equipment_name: 'Prisma Dental Chair Unit', issue_description: 'Hydraulic leakage in base elevation piston.', priority: 'critical', assigned_engineer: 'Sirona Service India', engineer_contact: '9876543210', status: 'in_progress', cost: 12000, created_at: '2026-07-16T08:00:00Z' }
];

// LocalStorage Helper
const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const saveLocalData = <T>(key: string, data: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// INITIALIZE OFF-LINE DATABASES
export const initOperationsStorage = () => {
  getLocalData('ops_chairs', DEFAULT_CHAIRS);
  getLocalData('ops_rooms', DEFAULT_ROOMS);
  getLocalData('ops_doctor_schedules', DEFAULT_DOCTOR_SCHEDULES);
  getLocalData('ops_staff_rosters', DEFAULT_STAFF_ROSTERS);
  getLocalData('ops_sterilization', DEFAULT_STERILIZATION);
  getLocalData('ops_equipment', DEFAULT_EQUIPMENT);
  getLocalData('ops_tickets', DEFAULT_TICKETS);
};

initOperationsStorage();

// CHAIR METHODS
export const getChairs = async (): Promise<Chair[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('chairs').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_chairs', DEFAULT_CHAIRS);
};

export const saveChair = async (chair: Chair): Promise<Chair> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('chairs').upsert(chair);
      if (!error) return chair;
    } catch {}
  }
  const chairs = getLocalData('ops_chairs', DEFAULT_CHAIRS);
  const existingIndex = chairs.findIndex(c => c.id === chair.id);
  if (existingIndex > -1) {
    chairs[existingIndex] = chair;
  } else {
    chairs.push(chair);
  }
  saveLocalData('ops_chairs', chairs);
  return chair;
};

export const deleteChair = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('chairs').delete().eq('id', id);
    } catch {}
  }
  const chairs = getLocalData('ops_chairs', DEFAULT_CHAIRS);
  const filtered = chairs.filter(c => c.id !== id);
  saveLocalData('ops_chairs', filtered);
};

// ROOM METHODS
export const getRooms = async (): Promise<Room[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('rooms').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_rooms', DEFAULT_ROOMS);
};

export const saveRoom = async (room: Room): Promise<Room> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('rooms').upsert(room);
      if (!error) return room;
    } catch {}
  }
  const rooms = getLocalData('ops_rooms', DEFAULT_ROOMS);
  const existingIndex = rooms.findIndex(r => r.id === room.id);
  if (existingIndex > -1) {
    rooms[existingIndex] = room;
  } else {
    rooms.push(room);
  }
  saveLocalData('ops_rooms', rooms);
  return room;
};

// DOCTOR SCHEDULES
export const getDoctorSchedules = async (): Promise<DoctorSchedule[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('doctor_schedules').select('*').order('date', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_doctor_schedules', DEFAULT_DOCTOR_SCHEDULES);
};

export const saveDoctorSchedule = async (schedule: DoctorSchedule): Promise<DoctorSchedule> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('doctor_schedules').upsert(schedule);
      if (!error) return schedule;
    } catch {}
  }
  const schedules = getLocalData('ops_doctor_schedules', DEFAULT_DOCTOR_SCHEDULES);
  const existingIndex = schedules.findIndex(s => s.id === schedule.id);
  if (existingIndex > -1) {
    schedules[existingIndex] = schedule;
  } else {
    schedules.push(schedule);
  }
  saveLocalData('ops_doctor_schedules', schedules);
  return schedule;
};

export const deleteDoctorSchedule = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('doctor_schedules').delete().eq('id', id);
    } catch {}
  }
  const schedules = getLocalData('ops_doctor_schedules', DEFAULT_DOCTOR_SCHEDULES);
  const filtered = schedules.filter(s => s.id !== id);
  saveLocalData('ops_doctor_schedules', filtered);
};

// STAFF ROSTER
export const getStaffRosters = async (): Promise<StaffRoster[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('staff_rosters').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_staff_rosters', DEFAULT_STAFF_ROSTERS);
};

export const saveStaffRoster = async (roster: StaffRoster): Promise<StaffRoster> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('staff_rosters').upsert(roster);
      if (!error) return roster;
    } catch {}
  }
  const rosters = getLocalData('ops_staff_rosters', DEFAULT_STAFF_ROSTERS);
  const existingIndex = rosters.findIndex(r => r.id === roster.id);
  if (existingIndex > -1) {
    rosters[existingIndex] = roster;
  } else {
    rosters.push(roster);
  }
  saveLocalData('ops_staff_rosters', rosters);
  return roster;
};

export const deleteStaffRoster = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('staff_rosters').delete().eq('id', id);
    } catch {}
  }
  const rosters = getLocalData('ops_staff_rosters', DEFAULT_STAFF_ROSTERS);
  const filtered = rosters.filter(r => r.id !== id);
  saveLocalData('ops_staff_rosters', filtered);
};

// STERILIZATION CYCLE
export const getSterilizationCycles = async (): Promise<SterilizationCycle[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('sterilization_cycles').select('*').order('start_time', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_sterilization', DEFAULT_STERILIZATION);
};

export const saveSterilizationCycle = async (cycle: SterilizationCycle): Promise<SterilizationCycle> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('sterilization_cycles').upsert(cycle);
      if (!error) return cycle;
    } catch {}
  }
  const cycles = getLocalData('ops_sterilization', DEFAULT_STERILIZATION);
  const existingIndex = cycles.findIndex(c => c.id === cycle.id);
  if (existingIndex > -1) {
    cycles[existingIndex] = cycle;
  } else {
    cycles.push(cycle);
  }
  saveLocalData('ops_sterilization', cycles);
  return cycle;
};

// EQUIPMENT
export const getEquipment = async (): Promise<Equipment[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('equipment').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_equipment', DEFAULT_EQUIPMENT);
};

export const saveEquipment = async (eq: Equipment): Promise<Equipment> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('equipment').upsert(eq);
      if (!error) return eq;
    } catch {}
  }
  const list = getLocalData('ops_equipment', DEFAULT_EQUIPMENT);
  const existingIndex = list.findIndex(e => e.id === eq.id);
  if (existingIndex > -1) {
    list[existingIndex] = eq;
  } else {
    list.push(eq);
  }
  saveLocalData('ops_equipment', list);
  return eq;
};

export const deleteEquipment = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('equipment').delete().eq('id', id);
    } catch {}
  }
  const list = getLocalData('ops_equipment', DEFAULT_EQUIPMENT);
  const filtered = list.filter(e => e.id !== id);
  saveLocalData('ops_equipment', filtered);
};

// MAINTENANCE TICKET
export const getMaintenanceTickets = async (): Promise<MaintenanceTicket[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('maintenance_tickets').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocalData('ops_tickets', DEFAULT_TICKETS);
};

export const saveMaintenanceTicket = async (ticket: MaintenanceTicket): Promise<MaintenanceTicket> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('maintenance_tickets').upsert(ticket);
      if (!error) return ticket;
    } catch {}
  }
  const list = getLocalData('ops_tickets', DEFAULT_TICKETS);
  const existingIndex = list.findIndex(t => t.id === ticket.id);
  if (existingIndex > -1) {
    list[existingIndex] = ticket;
  } else {
    list.push(ticket);
  }
  saveLocalData('ops_tickets', list);

  // Trigger automation: update equipment status to under_repair if priority is high or critical
  if (ticket.status !== 'completed' && ticket.status !== 'cancelled' && (ticket.priority === 'critical' || ticket.priority === 'high')) {
    const equipList = getLocalData('ops_equipment', DEFAULT_EQUIPMENT);
    const eqIdx = equipList.findIndex(e => e.id === ticket.equipment_id);
    if (eqIdx > -1) {
      equipList[eqIdx].status = 'under_repair';
      saveLocalData('ops_equipment', equipList);
    }
  }

  return ticket;
};

export const deleteMaintenanceTicket = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('maintenance_tickets').delete().eq('id', id);
    } catch {}
  }
  const list = getLocalData('ops_tickets', DEFAULT_TICKETS);
  const filtered = list.filter(t => t.id !== id);
  saveLocalData('ops_tickets', filtered);
};

// AUTOMATION FUNCTION
// Automatically assigns an available chair to an appointment.
export const autoAssignChair = async (doctorId: string, doctorName: string): Promise<{ chairId: string; chairName: string; success: boolean; message: string }> => {
  const chairs = await getChairs();
  const availableChairs = chairs.filter(c => c.status === 'available');

  if (availableChairs.length > 0) {
    // Select first available chair
    const selectedChair = availableChairs[0];
    selectedChair.status = 'occupied';
    selectedChair.assigned_doctor_id = doctorId;
    selectedChair.assigned_doctor_name = doctorName;
    await saveChair(selectedChair);
    return {
      chairId: selectedChair.id,
      chairName: selectedChair.name,
      success: true,
      message: `Automatically assigned ${selectedChair.name} to ${doctorName}.`
    };
  }

  // Fallback / Alert
  return {
    chairId: '',
    chairName: '',
    success: false,
    message: `ALERT: No dental chairs are currently available! All units are occupied, in cleaning, or out of service.`
  };
};
