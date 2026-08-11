import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../components/NotificationProvider';
import { canWriteClinical, getCurrentUser } from '../../lib/auth';
import DentalChart, { type ToothStatus } from '../../components/DentalChart';
import { 
  getPatientImages, 
  addPatientImage, 
  getRadiologyRecords, 
  addRadiologyRecord,
  PatientImage,
  RadiologyRecord
} from '../../services/imagingDocumentsService';
import { motion } from 'motion/react';
import { 
  Activity, Calendar, Clock, Play, Pause, RotateCcw, CheckCircle2, 
  AlertCircle, HeartPulse, Plus, Search, FileText, Stethoscope, 
  X, ChevronRight, Sparkles, Upload, Image as ImageIcon, DollarSign, 
  Award, ShieldAlert, Printer, Trash2, User, MapPin, Phone, Mail, 
  Info, Layers, ClipboardList, Check, CreditCard, ChevronDown, CheckSquare, RefreshCw
} from 'lucide-react';

// Interfaces based on database schemas and version requirements
interface Patient {
  id: number;
  patient_code: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  age: string;
  gender: string;
  notes: string; // Stored as JSON string metadata
  patient_status: string;
  last_visit_date: string | null;
  next_visit_date: string | null;
  treatment_summary: string | null;
  created_at: string;
  blood_group?: string;
  occupation?: string;
  date_of_birth?: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  name: string;
  phone: string;
  email: string;
  treatment: string;
  next_visit: string;
  appointment_time: string;
  location: string;
  notes: string;
  status: string;
  visit_count: number;
  visit_type: string;
  amount_paid: number;
  balance_amount: number;
  payment_mode: string;
  payment_notes?: string;
  doctor_id?: number;
  doctor_name?: string;
  consultation_fee: number;
  treatment_fee: number;
  lab_charges: number;
  x_ray_charges: number;
  discount_amount: number;
  gst_amount: number;
  advance_payment: number;
  final_balance: number;
  invoice_no?: string;
}

interface Treatment {
  id: number;
  patient_id: number;
  patient_name: string;
  phone: string;
  treatment_type: string;
  stage: string;
  start_date: string;
  expected_end_date?: string;
  total_sessions: number;
  sessions_done: number;
  treatment_notes: string;
  doctor_notes?: string;
  status: string;
  tooth_no?: string;
  doctor_name?: string;
  estimated_cost: number;
  paid_amount: number;
  balance_amount: number;
}

// Preset Checklist Templates for common procedures (Module 3)
const PROCEDURE_CHECKLISTS: Record<string, string[]> = {
  'RCT': [
    'Obtain preoperative radiograph (IOPA/RVG)',
    'Administer Local Anesthesia & check profound numbness',
    'Rubber Dam isolation of the target tooth',
    'Access cavity preparation & locate all pulp canals',
    'Working length determination using Apex Locator',
    'Biomechanical cleaning and rotary shaping (BMP)',
    'Intracanal medicament placement (Calcium Hydroxide)',
    'Obturation of root canals using Gutta Percha & sealer',
    'Post-obturation permanent composite core build-up',
    'Verify occlusion and take postoperative radiograph'
  ],
  'Scaling': [
    'Pre-procedural antimicrobial mouth rinse',
    'Full mouth periodontal probing and charting',
    'Supragingival ultrasonic scaling (remove heavy calculus)',
    'Subgingival scaling and deep root planing',
    'Interproximal stain removal with hand scalers',
    'Rotary cup polishing with fluoride prophylaxis paste',
    'Gingival irrigation with Chlorhexidine gluconate',
    'Post-scaling oral hygiene instruction & demonstration'
  ],
  'Composite': [
    'Anesthetic block or infiltration (if deep dentinal caries)',
    'Tooth shade selection under natural/operatory light',
    'Caries excavation & mechanical preparation',
    'Total-etch phosphoric acid application (15s dentin, 30s enamel)',
    'Rinse thoroughly & apply bonding agent (light cure 20s)',
    'Incremental layering of composite resin (max 2mm per layer)',
    'Halogen/LED light curing (20-40s per layer)',
    'Finishing with fine-grit diamond burs & polishing discs',
    'Check high-points with articulating paper and adjust occlusion'
  ],
  'Extraction': [
    'Review medical histories, bleeding risks, and dental records',
    'Administer profound nerve block or infiltration anesthesia',
    'Separate periodontal ligament fibers using dental syndesmotome',
    'Luxate tooth using progressive elevators to expand bone sockets',
    'Engage and deliver tooth cleanly with forceps',
    'Debride the empty socket and inspect root apexes for fractures',
    'Suture socket using 3-0 silk if flap was reflected or bleeding high',
    'Place sterile gauze compress & instruct patient to bite firmly for 45 mins'
  ],
  'Implant': [
    'Administer sterile surgical scrub and drape patient/operatory',
    'Inject local anesthesia & reflect mucoperiosteal flap',
    'Sequence sequential osteotomy drills with sterile saline irrigation',
    'Verify drilling depth, angulation, and parallel pin placement',
    'Insert titanium implant fixture under monitored torque (35-45 Ncm)',
    'Affix cover screw or healing abutment to the fixture',
    'Secure tension-free primary closure with non-resorbable sutures',
    'Take immediate post-operative panoramic OPG/CBCT for verification'
  ],
  'Crown': [
    'Administer local anesthetic & record shade matching details',
    'Prepare target tooth structure (circumferential axial reduction)',
    'Perform gingival retraction with saline/epinephrine cord',
    'Take high-precision dual-phase elastomeric or digital impression',
    'Fabricate and lute a custom-shaped temporary acrylic crown',
    'Transmit physical impressions or digital scans to lab with detailed specs'
  ],
  'Bridge': [
    'Prepare mesial and distal abutment teeth carefully',
    'Incorporate gingival retraction strings into sulcus',
    'Record precise inter-arch bite registration with wax or paste',
    'Take ultimate final impression for multi-unit lab bridge prosthesis',
    'Cement protective multi-unit provisional temporary bridge',
    'Select exact cosmetic ceramic shades to match natural adjacent dentition'
  ],
  'Whitening': [
    'Record baseline pre-treatment shade with dental shade guide',
    'Apply protective liquid dam barrier to gingiva and light cure',
    'Dispense professional-grade 35% Hydrogen Peroxide whitening gel',
    'Activate whitening gel with cool-blue LED light (15-minute cycles)',
    'Suction gel, rinse, and apply second cycle (typically 3 iterations)',
    'Remove isolation barrier & apply neutral desensitizing paste'
  ]
};

// Preset Material Selections (Module 5)
const CONSUMABLE_OPTIONS = {
  shades: ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'C2', 'Universal Bleach'],
  bonding: ['3M Single Bond Universal', 'GC G-Premio BOND', 'Tokuyama Bond Force', 'None'],
  implants: ['Osstem TSIII Active (4.0x10mm)', 'Straumann BLT (4.1x10mm)', 'Noble Biocare CC (3.5x11.5mm)', 'Astra Tech EV', 'None'],
  cement: ['Glass Ionomer (GC Fuji I)', 'Resin Cement (RelyX U200)', 'Zinc Oxide TempBond', 'Fuji Plus Luting', 'None'],
  files: ['Rotary Protaper Gold', 'Hyflex EDM', 'WaveOne Gold Reciprocating', 'Manual K-Files #15-#40', 'None'],
  gp: ['Protaper Gold GP F1/F2/F3', 'GP Points #25 4%', 'GP Points #30 4%', 'GP Points #25 6%', 'None'],
  anesthetic: ['Lignocaine 2% with Adrenaline 1:80k000', 'Articaine 4% (Septanest) with Adrenaline 1:100k', 'Mepivacaine 3% plain', 'None'],
  other: ['Rubber Dam kit', 'PTFE Tape', 'Suture Silk 3-0', 'Suture Vicryl 4-0', 'Hemostatic Sponge', 'Cotton Rolls & saliva ejector']
};

// Post-Operative Instructions (Module 9)
const POST_OP_PRESETS: Record<string, string[]> = {
  'Extraction': [
    'Bite firmly on the gauze pack placed over the socket for 45-60 minutes. Spit it out gently after.',
    'Do not spit, rinse, gargle, or use a straw for the next 24 hours to prevent dislodging the blood clot.',
    'Apply an ice pack to the face outer side for 15 minutes on/off to minimize swelling during the first 12 hours.',
    'Eat soft, cool foods (curd rice, ice cream, milkshakes) once the anesthesia wears off. Avoid hot, spicy, or crunchy foods.',
    'Do not smoke, consume alcohol, or engage in strenuous exercise for at least 48 hours.',
    'Take prescribed medications exactly as instructed. If pain or severe bleeding persists, contact the clinic immediately.'
  ],
  'RCT': [
    'Avoid chewing on the treated tooth until the final permanent filling or crown is permanently cemented.',
    'Some tenderness, throbbing, or soreness is completely normal for 2-3 days while tissues heal. Use analgesics.',
    'Maintain standard brushing and flossing routines, but be extremely gentle around the temporary filling area.',
    'If the temporary filling falls out completely, contact us immediately to prevent saliva from re-infecting the canals.',
    'Schedule your dental crown placement within 1-2 weeks to reinforce and protect the weakened tooth structure.'
  ],
  'Implant': [
    'Do not disturb the surgical site. Avoid touching the sutures or implant with your tongue or fingers.',
    'Maintain a liquid or very soft diet for the first week to allow undisturbed bone healing.',
    'Rinse extremely gently with lukewarm saltwater (1/2 tsp salt in warm water) starting tomorrow morning, 4-5 times a day.',
    'Do not brush directly over the surgical site or sutures for the first 4-5 days. Clean other areas thoroughly.',
    'Slight oozing of blood and mild swelling of the cheek are normal. Keep your head elevated with 2 pillows while sleeping.'
  ],
  'Scaling': [
    'Some mild tooth sensitivity to hot and cold liquids is normal for 24-48 hours. Use desensitizing toothpaste.',
    'Slight gingival bleeding may occur during brushing for 1-2 days. Continue brushing gently with a soft-bristle brush.',
    'Avoid consuming highly colored foods or beverages (turmeric, coffee, tea, red wine, berries) for 24 hours to prevent immediate staining.',
    'Warm saline rinses twice daily for 3 days will significantly accelerate gingival healing and soothe raw gum tissues.'
  ],
  'Crown': [
    'Wait at least 1 hour after crown cementation before eating or drinking to allow the dental cement to fully set.',
    'If a temporary crown dislodges, keep it safe and call us to have it re-luted. Exposed teeth can shift or become sensitive.',
    'When flossing near temporary/permanent crowns, pull the floss out horizontally from the side rather than popping it upwards.',
    'Report any bite imbalance or "high spot" immediately. A misaligned crown can cause severe throbbing pain or fractures.'
  ],
  'Denture': [
    'Keep dentures in a glass of clean water or denture solution overnight. Never let them dry out or put them in hot water.',
    'Clean your dentures daily with a soft denture brush and non-abrasive soap. Do not use regular abrasive toothpaste.',
    'Practice speaking out loud and reading to help your tongue and facial muscles adjust to the new prosthesis.',
    'Sore spots are common initially. Schedule adjustment appointments so we can trim the pressure zones for optimal fit.'
  ]
};

export default function TreatmentExecution() {
  const { notify } = useNotification();
  const [, setLocation] = useLocation();

  // Unified State Engine
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<Treatment[]>([]);

  // Search variables
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // PACS images state (Module 7)
  const [patientImages, setPatientImages] = useState<PatientImage[]>([]);
  const [radiologyRecords, setRadiologyRecords] = useState<RadiologyRecord[]>([]);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Clinical Photo');
  const [uploadType, setUploadType] = useState<'image' | 'radiology'>('image');
  const [uploadToothNo, setUploadToothNo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Procedure Timer states (Module 4)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Checklist states (Module 3)
  const [activeChecklistType, setActiveChecklistType] = useState<string>('RCT');
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});

  // Materials Usage states (Module 5)
  const [materialsForm, setMaterialsForm] = useState({
    shade: 'A2',
    bonding: '3M Single Bond Universal',
    implant: 'None',
    cement: 'None',
    files: 'None',
    gp: 'None',
    anesthetic: 'Lignocaine 2% with Adrenaline 1:80k000',
    otherCustom: ''
  });
  const [addedConsumables, setAddedConsumables] = useState<string[]>([]);

  // Live Clinical Notes states (Module 6)
  const [clinicalNotesForm, setClinicalNotesForm] = useState({
    diagnosis: '',
    treatmentPerformed: '',
    observations: '',
    instructionsGiven: ''
  });

  // Prescriptions state
  const [selectedRxTemplate, setSelectedRxTemplate] = useState('RCT');
  const [prescriptionList, setPrescriptionList] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([]);
  const [customMedicine, setCustomMedicine] = useState({ name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days' });

  // Billing calculation states
  const [billingForm, setBillingForm] = useState({
    consultationFee: 500,
    treatmentFee: 3500,
    labCharges: 0,
    xrayCharges: 300,
    discountAmount: 0,
    gstPercent: 18,
    advancePayment: 0,
    amountPaid: 0,
    paymentMode: 'UPI'
  });

  // Post-Op instructions viewer (Module 9)
  const [postOpSelection, setPostOpSelection] = useState('Extraction');

  // Next Visit Planner (Module 10)
  const [nextVisitForm, setNextVisitForm] = useState({
    visitType: 'Review', // Continue Treatment, Review, Maintenance, Emergency Visit, Completed
    intervalValue: '1 week', // 3 days, 1 week, 2 weeks, 1 month, custom
    customDate: '',
    time: '10:00 AM',
    notes: 'Follow-up checking post-procedure.'
  });

  // Interactive warnings list (Module 11)
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  const [warningsList, setWarningsList] = useState<string[]>([]);

  // Exit summary modal state (Module 12)
  const [showExitSummaryModal, setShowExitSummaryModal] = useState(false);
  const [savedExitData, setSavedExitData] = useState<any | null>(null);

  // Load today's lineup and default settings on component boot
  useEffect(() => {
    fetchTodayLineup();
  }, []);

  // Handle active procedures automatically setting the template checklist & Rx
  useEffect(() => {
    if (selectedAppointment) {
      const treatmentName = selectedAppointment.treatment || '';
      let matchedType = 'RCT';
      if (treatmentName.toLowerCase().includes('rct') || treatmentName.toLowerCase().includes('canal')) matchedType = 'RCT';
      else if (treatmentName.toLowerCase().includes('scale') || treatmentName.toLowerCase().includes('cleaning') || treatmentName.toLowerCase().includes('polish')) matchedType = 'Scaling';
      else if (treatmentName.toLowerCase().includes('fill') || treatmentName.toLowerCase().includes('composite')) matchedType = 'Composite';
      else if (treatmentName.toLowerCase().includes('extract') || treatmentName.toLowerCase().includes('tooth removal')) matchedType = 'Extraction';
      else if (treatmentName.toLowerCase().includes('implant')) matchedType = 'Implant';
      else if (treatmentName.toLowerCase().includes('crown') || treatmentName.toLowerCase().includes('cap')) matchedType = 'Crown';
      else if (treatmentName.toLowerCase().includes('bridge')) matchedType = 'Bridge';
      else if (treatmentName.toLowerCase().includes('white')) matchedType = 'Whitening';

      setActiveChecklistType(matchedType);
      setSelectedRxTemplate(matchedType === 'Filling' ? 'Scaling' : matchedType); // Map to available rx templates
      setPostOpSelection(matchedType);

      // Populate default clinical notes
      setClinicalNotesForm({
        diagnosis: `Diagnosed symptomatic irreversible pulpitis/caries/periodontitis associated with planned ${treatmentName}.`,
        treatmentPerformed: `Initiated standard modern clinical protocols for ${treatmentName}.`,
        observations: `No minor or major clinical abnormalities observed during access. Normal pulp/tissue responses.`,
        instructionsGiven: `Patient instructed on proper homecare practices. Highlighted essential safety cautions.`
      });

      // Reset checklist progress
      const defaultChecklistObj: Record<string, boolean> = {};
      const items = PROCEDURE_CHECKLISTS[matchedType] || PROCEDURE_CHECKLISTS['RCT'];
      items.forEach(item => {
        defaultChecklistObj[item] = false;
      });
      setChecklistProgress(defaultChecklistObj);

      // Autofill treatment cost estimates
      let estCost = 3500;
      if (matchedType === 'RCT') estCost = 4500;
      if (matchedType === 'Scaling') estCost = 1500;
      if (matchedType === 'Implant') estCost = 25000;
      if (matchedType === 'Crown') estCost = 6500;
      if (matchedType === 'Extraction') estCost = 2000;

      setBillingForm(prev => ({
        ...prev,
        treatmentFee: estCost,
        advancePayment: selectedAppointment.amount_paid || 0,
        amountPaid: estCost + prev.consultationFee + prev.xrayCharges - prev.discountAmount
      }));
    }
  }, [selectedAppointment]);

  // Load prescription lists when template selection updates
  useEffect(() => {
    const rxTemplates: Record<string, any[]> = {
      RCT: [
        { name: 'Amoxicillin 500mg', dosage: '1 tablet', frequency: 'Three times daily (after meals)', duration: '5 days' },
        { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'When pain occurs (sos)', duration: '3 days' },
        { name: 'Chlorhexidine 0.2% Mouthwash', dosage: '10 ml', frequency: 'Twice daily after meals', duration: '7 days' },
      ],
      Extraction: [
        { name: 'Ketorolac DT 10mg', dosage: '1 tablet', frequency: 'Twice daily dissolved in water', duration: '3 days' },
        { name: 'Amoxicillin 500mg', dosage: '1 tablet', frequency: 'Three times daily', duration: '5 days' },
        { name: 'Pantoprazole 40mg', dosage: '1 tablet', frequency: 'Once daily before breakfast', duration: '5 days' }
      ],
      Implant: [
        { name: 'Amoxicillin + Clavulanic Acid 625mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days' },
        { name: 'Ibuprofen 400mg + Paracetamol 325mg', dosage: '1 tablet', frequency: 'Three times daily', duration: '3 days' },
        { name: 'Povidone-Iodine Mouthwash', dosage: '10 ml', frequency: 'Twice daily gargle', duration: '7 days' }
      ],
      Scaling: [
        { name: 'Hexidine Mouthwash', dosage: '10 ml', frequency: 'Twice daily gargle', duration: '14 days' },
        { name: 'Thermodent Sensitive Toothpaste', dosage: 'Pea-sized amount', frequency: 'Massage gently twice daily', duration: 'Ongoing' }
      ],
      Crown: [
        { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'If discomfort arises (sos)', duration: '2 days' }
      ],
      Bridge: [
        { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'If discomfort arises (sos)', duration: '2 days' }
      ],
      Whitening: [
        { name: 'Sensodyne Rapid Relief Toothpaste', dosage: 'Pea-sized', frequency: 'Brush gently twice daily', duration: '30 days' }
      ],
    };
    const selectedList = rxTemplates[selectedRxTemplate] || rxTemplates['RCT'];
    setPrescriptionList(selectedList);
  }, [selectedRxTemplate]);

  // Procedure Timer interval watcher (Module 4)
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  const getFormattedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fetch Patient Metadata
  const getPatientMetadata = (p: Patient | null) => {
    if (!p) return {
      notes: '',
      blood_group: '',
      occupation: '',
      medical_history: [] as string[],
      allergies: [] as string[],
      current_medications: '',
      dental_chart: {} as Record<string, string>,
      case_sheets: [] as any[],
      prescriptions: [] as any[]
    };
    try {
      if (p.notes && p.notes.startsWith('{') && p.notes.endsWith('}')) {
        return JSON.parse(p.notes);
      }
    } catch (e) {
      // Return fallback below
    }
    return {
      notes: p.notes || '',
      blood_group: p.blood_group || '',
      occupation: p.occupation || '',
      medical_history: [] as string[],
      allergies: [] as string[],
      current_medications: '',
      dental_chart: {} as Record<string, string>,
      case_sheets: [] as any[],
      prescriptions: [] as any[]
    };
  };

  // Retrieve today's line-up
  const fetchTodayLineup = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('next_visit', todayStr)
        .neq('status', 'Deleted')
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setTodayAppointments(data || []);

      // Autoload the first appointment if available
      if (data && data.length > 0) {
        handleSelectAppointment(data[0]);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching today lineup:', err);
      notify('error', 'Fetch Failed', 'Failed to retrieve today\'s appointments.');
      setLoading(false);
    }
  };

  // Load a patient details
  const handleSelectAppointment = async (appt: Appointment) => {
    setLoading(true);
    setSelectedAppointment(appt);
    resetTimer();
    try {
      // 1. Fetch patient
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', appt.patient_id)
        .single();

      if (patientError) throw patientError;
      setSelectedPatient(patient);

      // 2. Fetch all appointments of patient for history metrics
      const { data: allAppts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .neq('status', 'Deleted')
        .order('next_visit', { ascending: false });

      setPatientAppointments(allAppts || []);

      // 3. Fetch treatments of patient
      const { data: allTreats } = await supabase
        .from('treatments')
        .select('*')
        .eq('patient_id', patient.id);

      setPatientTreatments(allTreats || []);

      // 4. Fetch PACS photos and radiology files (Module 7)
      const images = await getPatientImages(patient.id);
      const rads = await getRadiologyRecords(patient.id);
      setPatientImages(images);
      setRadiologyRecords(rads);

      // Complete loading state
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading patient details:', err);
      notify('error', 'Selection Error', 'Failed to fetch clinical records.');
      setLoading(false);
    }
  };

  // Handle patient roster search
  const handlePatientSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.*${val}*,phone.ilike.*${val}*,patient_code.ilike.*${val}*`)
        .limit(8);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load an unscheduled patient directly for treatment execution
  const loadSearchedPatient = async (patient: Patient) => {
    setLoading(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(patient);
    resetTimer();

    try {
      // Check if patient has any appointment today, otherwise create a draft session
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('next_visit', todayStr)
        .neq('status', 'Deleted')
        .limit(1);

      if (appts && appts.length > 0) {
        setSelectedAppointment(appts[0]);
      } else {
        // Create an on-the-spot clinical session/appointment placeholder
        const draftAppt: Appointment = {
          id: Math.floor(Math.random() * -100000), // Draft indicator
          patient_id: patient.id,
          name: patient.name,
          phone: patient.phone,
          email: patient.email || '',
          treatment: 'General Consultation & Diagnostics',
          next_visit: todayStr,
          appointment_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: patient.location || 'Main Clinic',
          notes: 'Emergency walk-in session',
          status: 'In Progress',
          visit_count: 1,
          visit_type: 'Walk-in',
          amount_paid: 0,
          balance_amount: 0,
          payment_mode: 'Cash',
          consultation_fee: 500,
          treatment_fee: 0,
          lab_charges: 0,
          x_ray_charges: 0,
          discount_amount: 0,
          gst_amount: 0,
          advance_payment: 0,
          final_balance: 500
        };
        setSelectedAppointment(draftAppt);
      }

      const allAppts = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .neq('status', 'Deleted')
        .order('next_visit', { ascending: false });

      setPatientAppointments(allAppts.data || []);

      const allTreats = await supabase
        .from('treatments')
        .select('*')
        .eq('patient_id', patient.id);

      setPatientTreatments(allTreats.data || []);

      const images = await getPatientImages(patient.id);
      const rads = await getRadiologyRecords(patient.id);
      setPatientImages(images);
      setRadiologyRecords(rads);

    } catch (e: any) {
      notify('error', 'Roster Error', e.message || 'Failed to initialize roster patient.');
    } finally {
      setLoading(false);
    }
  };

  // Materials usage list operations
  const handleAddConsumable = () => {
    let text = '';
    if (materialsForm.shade !== 'None' && activeChecklistType === 'Composite') text += `Composite Shade: ${materialsForm.shade}; `;
    if (materialsForm.bonding !== 'None') text += `Bonding Agent: ${materialsForm.bonding}; `;
    if (materialsForm.implant !== 'None') text += `Implant component: ${materialsForm.implant}; `;
    if (materialsForm.cement !== 'None') text += `Dental cement: ${materialsForm.cement}; `;
    if (materialsForm.files !== 'None') text += `Files: ${materialsForm.files}; `;
    if (materialsForm.gp !== 'None') text += `Gutta Percha: ${materialsForm.gp}; `;
    if (materialsForm.anesthetic !== 'None') text += `Anesthetic: ${materialsForm.anesthetic}; `;
    
    if (materialsForm.otherCustom.trim() !== '') {
      text += `${materialsForm.otherCustom.trim()}`;
    }

    if (text === '') {
      notify('warning', 'Empty Selection', 'Please select or type a material first.');
      return;
    }

    setAddedConsumables([...addedConsumables, text]);
    setMaterialsForm(prev => ({ ...prev, otherCustom: '' }));
    notify('success', 'Material Added', 'Consumable added to today\'s clinical list.');
  };

  const handleRemoveConsumable = (idx: number) => {
    setAddedConsumables(addedConsumables.filter((_, i) => i !== idx));
  };

  // Medical alerts list calculations
  const parsedMetadata = useMemo(() => getPatientMetadata(selectedPatient), [selectedPatient]);

  // Outstanding Balance calculations across past visits
  const outstandingBalance = useMemo(() => {
    if (!patientAppointments.length) return 0;
    return patientAppointments.reduce((sum, appt) => {
      if (appt.status === 'Cancelled' || appt.status === 'Deleted') return sum;
      return sum + (appt.balance_amount || 0);
    }, 0);
  }, [patientAppointments]);

  // Handle file uploads during session (Module 7)
  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Since it's a browser sandbox, convert standard uploaded image to base64 or SVG data mockup
      const randomType = uploadCategory.toLowerCase().includes('before') ? 'before' : 
                         uploadCategory.toLowerCase().includes('after') ? 'after' : 'iopa';

      // We read file size
      const fileSize = file.size;

      if (uploadType === 'image') {
        const payload: Omit<PatientImage, 'id' | 'created_at'> = {
          patient_id: selectedPatient.id,
          patient_name: selectedPatient.name,
          url: `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#1e293b"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">${file.name.toUpperCase()}</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#94a3b8">${uploadCategory} - Tooth #${uploadToothNo || 'All'}</text></svg>`
          )}`,
          name: `${uploadCategory}: Tooth #${uploadToothNo || 'N/A'}`,
          category: uploadCategory as any,
          notes: uploadNotes || 'Uploaded dynamically during treatment workspace session.',
          tooth_no: uploadToothNo || undefined,
          file_size: fileSize,
          watermarked: true,
          created_by: 'doctor@srichaitanya.com'
        };
        const response = await addPatientImage(payload);
        setPatientImages(prev => [response, ...prev]);
      } else {
        const scanTypeMap: Record<string, any> = {
          IOPA: 'IOPA',
          RVG: 'RVG',
          OPG: 'OPG',
          CBCT: 'CBCT'
        };
        const payload: Omit<RadiologyRecord, 'id' | 'created_at'> = {
          patient_id: selectedPatient.id,
          patient_name: selectedPatient.name,
          url: `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#090d16"/><circle cx="200" cy="150" r="70" fill="none" stroke="#38bdf8" stroke-width="2"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">X-RAY: ${file.name.toUpperCase()}</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#0284c7">${uploadCategory} - Tooth #${uploadToothNo || 'All'}</text></svg>`
          )}`,
          name: `${uploadCategory} x-ray: Tooth #${uploadToothNo || 'N/A'}`,
          scan_type: (scanTypeMap[uploadCategory] || 'IOPA') as any,
          notes: uploadNotes || 'Uploaded dynamically during treatment workspace session.',
          tooth_no: uploadToothNo || undefined,
          file_size: fileSize,
          watermarked: true,
          created_by: 'doctor@srichaitanya.com'
        };
        const response = await addRadiologyRecord(payload);
        setRadiologyRecords(prev => [response, ...prev]);
      }

      notify('success', 'PACS Upload Completed', 'Clinical image registered in patient history PACS.');
      setUploadNotes('');
      setUploadToothNo('');
    } catch (e: any) {
      console.error(e);
      notify('error', 'Upload Failed', 'Failed to save clinic document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Modify Dental Chart directly from Workspace (Module 2)
  const handleUpdateTooth = async (tooth: string, status: ToothStatus) => {
    if (!selectedPatient) return;
    try {
      const currentMeta = getPatientMetadata(selectedPatient);
      const updatedChart = {
        ...(currentMeta.dental_chart || {}),
        [tooth]: status
      };
      const updatedMeta = {
        ...currentMeta,
        dental_chart: updatedChart
      };
      
      const notesStr = JSON.stringify(updatedMeta);
      const { error } = await supabase
        .from('patients')
        .update({ notes: notesStr })
        .eq('id', selectedPatient.id);

      if (error) throw error;
      setSelectedPatient({ ...selectedPatient, notes: notesStr });
      notify('success', 'Dental Chart Synced', `Tooth #${tooth} set to ${status}.`);
    } catch (e: any) {
      notify('error', 'Chart Sync Error', e.message);
    }
  };

  // Interactive formula to calculate real-time financials (Module 2)
  const billingSummary = useMemo(() => {
    const { consultationFee, treatmentFee, labCharges, xrayCharges, discountAmount, gstPercent } = billingForm;
    const subtotal = Number(consultationFee) + Number(treatmentFee) + Number(labCharges) + Number(xrayCharges) - Number(discountAmount);
    const gstValue = Math.round(subtotal * (Number(gstPercent) / 100));
    const totalCharges = Math.max(0, subtotal + gstValue);
    const finalBalance = Math.max(0, totalCharges - Number(billingForm.advancePayment));
    return {
      subtotal,
      gstValue,
      totalCharges,
      finalBalance
    };
  }, [billingForm]);

  // Add prescription item manually
  const handleAddMedicine = () => {
    if (!customMedicine.name) return;
    setPrescriptionList([...prescriptionList, { ...customMedicine }]);
    setCustomMedicine({ name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days' });
  };

  const handleRemoveMedicine = (idx: number) => {
    setPrescriptionList(prescriptionList.filter((_, i) => i !== idx));
  };

  // Pre-complete Quality checking modal (Module 11)
  const triggerQualityCheck = () => {
    if (!selectedPatient || !selectedAppointment) return;

    const list: string[] = [];
    if (!clinicalNotesForm.diagnosis.trim() || !clinicalNotesForm.treatmentPerformed.trim()) {
      list.push('Clinical Notes details are incomplete or empty.');
    }
    if (prescriptionList.length === 0) {
      list.push('No prescription medicines have been added for this procedure.');
    }
    if (addedConsumables.length === 0) {
      list.push('No clinical consumables or material shades recorded.');
    }
    if (billingForm.amountPaid <= 0 && billingSummary.totalCharges > 0) {
      list.push('Outstanding billing payment collection remains unrecorded.');
    }

    setWarningsList(list);

    if (list.length > 0) {
      setShowWarningsModal(true);
    } else {
      executeCompletionWorkflow();
    }
  };

  // Automation & Patient Database sync (Module 8 & 14)
  const executeCompletionWorkflow = async () => {
    if (!selectedPatient || !selectedAppointment) return;
    setShowWarningsModal(false);
    setLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const elapsedMinutes = Math.round(timerSeconds / 60);
      const timerStr = elapsedMinutes > 0 ? `${elapsedMinutes} mins duration` : `${timerSeconds} secs duration`;

      // 1. Prepare Case Sheet structure
      const currentMeta = getPatientMetadata(selectedPatient);
      const newCaseSheet = {
        id: `cs-${Date.now()}`,
        date: todayStr,
        doctorName: selectedAppointment.doctor_name || 'Dr. Durga Bhavani Jupalli',
        chiefComplaint: selectedAppointment.notes || 'Routine consult',
        diagnosis: clinicalNotesForm.diagnosis,
        treatmentPerformed: clinicalNotesForm.treatmentPerformed,
        observations: clinicalNotesForm.observations,
        instructionsGiven: clinicalNotesForm.instructionsGiven,
        materialsUsed: addedConsumables.join(', '),
        elapsedTime: timerStr,
        checklistCompleted: Object.keys(checklistProgress).filter(k => checklistProgress[k]).join(', '),
        prescription: prescriptionList
      };

      // 2. Save Updated Patient Profile Notes/Metadata
      const updatedMeta = {
        ...currentMeta,
        case_sheets: [...(currentMeta.case_sheets || []), newCaseSheet],
        prescriptions: [...(currentMeta.prescriptions || []), {
          date: todayStr,
          medicines: prescriptionList,
          doctorName: selectedAppointment.doctor_name || 'Dr. Durga Bhavani Jupalli'
        }]
      };

      const { error: patientErr } = await supabase
        .from('patients')
        .update({
          notes: JSON.stringify(updatedMeta),
          last_visit_date: todayStr,
          next_visit_date: nextVisitForm.customDate || nextVisitForm.intervalValue !== 'Completed' ? getNextVisitDateCalculated() : null,
          patient_status: 'Completed',
          treatment_summary: selectedAppointment.treatment
        })
        .eq('id', selectedPatient.id);

      if (patientErr) throw patientErr;

      // 3. Update Appointment Billing & Status
      const updatedApptPayload = {
        status: 'Completed',
        consultation_fee: billingForm.consultationFee,
        treatment_fee: billingForm.treatmentFee,
        lab_charges: billingForm.labCharges,
        x_ray_charges: billingForm.xrayCharges,
        discount_amount: billingForm.discountAmount,
        gst_amount: billingSummary.gstValue,
        advance_payment: billingForm.advancePayment,
        amount_paid: billingForm.amountPaid,
        balance_amount: billingSummary.finalBalance,
        payment_mode: billingForm.paymentMode,
        payment_notes: `Completed on ${todayStr} (${timerStr}). Materials: ${addedConsumables.slice(0,3).join(', ')}`,
        invoice_no: `INV-SDC-${Date.now().toString().slice(-6)}`
      };

      if (selectedAppointment.id > 0) {
        const { error: apptErr } = await supabase
          .from('appointments')
          .update(updatedApptPayload)
          .eq('id', selectedAppointment.id);

        if (apptErr) throw apptErr;
      }

      // 4. Record/Insert into Treatments history
      const { error: treatErr } = await supabase
        .from('treatments')
        .insert([{
          patient_id: selectedPatient.id,
          patient_name: selectedPatient.name,
          phone: selectedPatient.phone,
          treatment_type: selectedAppointment.treatment,
          stage: 'Completed',
          start_date: todayStr,
          total_sessions: 1,
          sessions_done: 1,
          treatment_notes: `Procedure executed successfully. Duration: ${timerStr}. Diagnosis: ${clinicalNotesForm.diagnosis}. Checklist steps done: ${Object.keys(checklistProgress).filter(k => checklistProgress[k]).length}/${Object.keys(checklistProgress).length}`,
          doctor_notes: clinicalNotesForm.observations,
          status: 'Completed',
          doctor_name: selectedAppointment.doctor_name || 'Dr. Durga Bhavani Jupalli',
          estimated_cost: billingSummary.totalCharges,
          paid_amount: billingForm.amountPaid,
          balance_amount: billingSummary.finalBalance
        }]);

      if (treatErr) throw treatErr;

      // 5. Automated Next Visit follow-up scheduling (Module 10 & 14)
      if (nextVisitForm.visitType !== 'Completed') {
        const calculatedNextDate = getNextVisitDateCalculated();
        const nextApptPayload = {
          patient_id: selectedPatient.id,
          name: selectedPatient.name,
          phone: selectedPatient.phone,
          email: selectedPatient.email,
          treatment: `Followup: ${nextVisitForm.visitType} (${selectedAppointment.treatment})`,
          next_visit: calculatedNextDate,
          appointment_time: nextVisitForm.time,
          location: selectedPatient.location || 'Main Clinic',
          notes: `Auto-scheduled follow-up review. ${nextVisitForm.notes}`,
          status: 'Pending',
          visit_count: (patientAppointments.length || 0) + 1,
          visit_type: 'Returning',
          doctor_id: selectedAppointment.doctor_id || null,
          doctor_name: selectedAppointment.doctor_name || 'Dr. Durga Bhavani Jupalli'
        };

        await supabase.from('appointments').insert([nextApptPayload]);
      }

      // 6. Generate Exit summary payload
      const exitDataSummary = {
        patientName: selectedPatient.name,
        patientCode: selectedPatient.patient_code,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        treatment: selectedAppointment.treatment,
        doctor: selectedAppointment.doctor_name || 'Dr. Durga Bhavani Jupalli',
        notes: clinicalNotesForm.treatmentPerformed,
        medicines: prescriptionList,
        totalCost: billingSummary.totalCharges,
        paid: billingForm.amountPaid,
        balance: billingSummary.finalBalance,
        nextVisitDate: nextVisitForm.visitType !== 'Completed' ? getNextVisitDateCalculated() : 'N/A',
        nextVisitTime: nextVisitForm.visitType !== 'Completed' ? nextVisitForm.time : '',
        instructions: POST_OP_PRESETS[postOpSelection] || []
      };

      setSavedExitData(exitDataSummary);
      setShowExitSummaryModal(true);

      notify('success', 'Treatment Executed Successfully', 'All electronic health records, billing parameters, and recall charts updated.');
      resetTimer();
      fetchTodayLineup();

    } catch (err: any) {
      console.error(err);
      notify('error', 'Workflow Error', err.message || 'Could not complete automation tasks.');
    } finally {
      setLoading(false);
    }
  };

  // Helper date adder
  const getNextVisitDateCalculated = () => {
    if (nextVisitForm.customDate) return nextVisitForm.customDate;
    const d = new Date();
    const val = nextVisitForm.intervalValue;
    if (val === '3 days') d.setDate(d.getDate() + 3);
    else if (val === '1 week') d.setDate(d.getDate() + 7);
    else if (val === '2 weeks') d.setDate(d.getDate() + 14);
    else if (val === '1 month') d.setMonth(d.getMonth() + 1);
    else if (val === '3 months') d.setMonth(d.getMonth() + 3);
    else if (val === '6 months') d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  };

  // Print clinical post-op card (Module 9)
  const printInstructionsCard = () => {
    const list = POST_OP_PRESETS[postOpSelection] || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Post-Operative Instructions - Sri Chaitanya Dental</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; color: #0284c7; }
            .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 5px; }
            h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
            ul { line-height: 1.8; padding-left: 20px; }
            li { margin-bottom: 12px; }
            .footer { border-top: 1px solid #e2e8f0; margin-top: 40px; padding-top: 15px; font-size: 12px; text-align: center; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SRI CHAITANYA DENTAL CARE</div>
            <div class="subtitle">Clinical Post-Operative Patient Care Guide</div>
          </div>
          <h2>Specialized Instructions for: ${postOpSelection.toUpperCase()}</h2>
          <ul>
            ${list.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <div class="footer">
            This is an official clinic guideline card. For clinical emergencies call +91-8317575165 immediately.
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print unified exit receipt and summary (Module 12)
  const printUnifiedExitSummary = () => {
    if (!savedExitData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Exit Summary - Sri Chaitanya Dental</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .brand { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .brand h1 { margin: 0; font-size: 26px; color: #0f172a; letter-spacing: 0.5px; }
            .brand p { margin: 5px 0 0 0; font-size: 13px; color: #64748b; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 15px; font-weight: bold; background: #f1f5f9; padding: 6px 12px; border-left: 4px solid #0284c7; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .kv { margin-bottom: 8px; font-size: 14px; }
            .kv span { font-weight: bold; }
            .med-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .med-table th, .med-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            .med-table th { background: #f8fafc; }
            .instructions { font-size: 13px; line-height: 1.6; }
            .instructions li { margin-bottom: 6px; }
            .finance { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
            .footer { border-top: 1px solid #cbd5e1; margin-top: 50px; padding-top: 20px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="brand">
            <h1>SRI CHAITANYA MULTISPECIALITY DENTAL CARE</h1>
            <p>Today's Treatment Session & Exit Discharge Summary</p>
          </div>
          
          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="grid-2">
              <div>
                <div class="kv"><span>Patient Name:</span> ${savedExitData.patientName}</div>
                <div class="kv"><span>Age / Gender:</span> ${savedExitData.age} / ${savedExitData.gender}</div>
              </div>
              <div>
                <div class="kv"><span>Patient ID Code:</span> ${savedExitData.patientCode}</div>
                <div class="kv"><span>Attending Doctor:</span> ${savedExitData.doctor}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Treatment Performed Today</div>
            <p style="font-size: 14px; margin-top: 5px;"><strong>Procedure:</strong> ${savedExitData.treatment}</p>
            <p style="font-size: 14px; margin-top: 5px;"><strong>Clinical Findings & Work Done:</strong> ${savedExitData.notes}</p>
          </div>

          ${savedExitData.medicines && savedExitData.medicines.length > 0 ? `
          <div class="section">
            <div class="section-title">Prescribed Medications (Rx)</div>
            <table class="med-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${savedExitData.medicines.map((m: any) => `
                  <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.dosage}</td>
                    <td>${m.frequency}</td>
                    <td>${m.duration}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="grid-2" style="margin-top: 30px;">
            <div class="finance">
              <div class="section-title" style="background: none; border: none; padding: 0; margin-bottom: 8px;">Billing Receipt</div>
              <div class="kv"><span>Total Bill:</span> ₹${savedExitData.totalCost}</div>
              <div class="kv"><span>Amount Paid:</span> ₹${savedExitData.paid}</div>
              <div class="kv" style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px;"><span>Outstanding Balance:</span> ₹${savedExitData.balance}</div>
            </div>

            <div class="finance">
              <div class="section-title" style="background: none; border: none; padding: 0; margin-bottom: 8px;">Recall & Scheduling</div>
              <div class="kv"><span>Next Recall Appointment:</span> ${savedExitData.nextVisitDate}</div>
              ${savedExitData.nextVisitTime ? `<div class="kv"><span>Recall Time:</span> ${savedExitData.nextVisitTime}</div>` : ''}
            </div>
          </div>

          ${savedExitData.instructions && savedExitData.instructions.length > 0 ? `
          <div class="section" style="margin-top: 30px;">
            <div class="section-title">Essential Home Care Guidelines</div>
            <ul class="instructions">
              ${savedExitData.instructions.map((inst: string) => `<li>${inst}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div class="footer">
            Thank you for choosing Sri Chaitanya Dental Care. Brush twice daily and floss regularly.<br>
            Emergency Clinic Hotline: +91-8317575165
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="treatment-execution-workspace">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 font-sans" id="workspace-title">
              Treatment Execution Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Clinical dashboard for today's dental procedure execution
          </p>
        </div>

        {/* Dynamic Live Roster Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            placeholder="Search roster (name or phone)..."
            value={searchQuery}
            onChange={(e) => handlePatientSearch(e.target.value)}
            id="roster-search-input"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5">
              <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => loadSearchedPatient(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex justify-between items-center text-sm border-b border-slate-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.phone}</div>
                  </div>
                  <span className="text-2xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {p.patient_code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* THREE SECTION WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMN 1: LINEUP SIDEBAR (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Today's Clinical Lineup
            </h2>
            
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto stroke-1 mb-2" />
                <p className="text-xs">No treatments scheduled today</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {todayAppointments.map(appt => {
                  const isSel = selectedAppointment?.id === appt.id;
                  return (
                    <button
                      key={appt.id}
                      onClick={() => handleSelectAppointment(appt)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                        isSel 
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-slate-900 text-sm truncate max-w-[130px]">{appt.name}</span>
                        <span className="text-2xs font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appt.appointment_time}
                        </span>
                      </div>
                      <span className="text-xs text-indigo-600 font-medium truncate">{appt.treatment}</span>
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100/60">
                        <span className="text-3xs text-slate-400 font-mono">ID: {(appt as any).patient_code || `PAT-${appt.patient_id}`}</span>
                        <span className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                          appt.status === 'Completed' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PATIENT HISTORIC VISITS LIST */}
          {selectedPatient && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex justify-between items-center">
                <span>Treatment History</span>
                <span className="text-2xs font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                  {patientAppointments.length} Sessions
                </span>
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {patientAppointments.map(pa => (
                  <div key={pa.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 text-xs flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-slate-500">{pa.next_visit}</span>
                      <span className="font-medium text-emerald-600">₹{pa.amount_paid} Paid</span>
                    </div>
                    <div className="text-slate-800 font-medium truncate">{pa.treatment}</div>
                    {pa.payment_notes && <div className="text-3xs text-slate-400 italic truncate">{pa.payment_notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2 & 3: MAIN TREATMENT WORKSPACE & DETAILS PANEL (lg:col-span-9) */}
        <div className="lg:col-span-9 space-y-6">

          {/* LOADING STATE GUARD */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-sm">Synchronizing clinic data chart files...</p>
            </div>
          ) : !selectedPatient ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <HeartPulse className="w-12 h-12 text-indigo-400 mx-auto stroke-1 mb-4" />
              <h2 className="text-lg font-medium text-slate-900">Select a patient to execute treatment</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                Click a patient from today's schedule lineup or use the top right search bar to pull up any patient's clinical file.
              </p>
            </div>
          ) : (
            <>
              {/* MODULE 1: TODAY'S PATIENT WORKSPACE / CLINICAL DETAILS */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-medium text-indigo-700">
                      {selectedPatient.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{selectedPatient.name}</h2>
                        <span className="text-3xs font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                          {selectedPatient.patient_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedPatient.gender} • {selectedPatient.age} years old • {selectedPatient.location || 'No location'}
                      </p>
                    </div>
                  </div>

                  {/* PROCEDURE TIMER WIDGET (Module 4) */}
                  <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-inner font-mono">
                    <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <div>
                      <div className="text-3xs text-indigo-400 font-bold uppercase tracking-wider">PROCEDURE TIMER</div>
                      <div className="text-lg font-semibold tracking-wider">{getFormattedTime(timerSeconds)}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-3">
                      <button 
                        onClick={toggleTimer}
                        className="p-1 rounded-full hover:bg-slate-800 transition-colors text-indigo-400"
                        title={timerRunning ? 'Pause Timer' : 'Start Timer'}
                      >
                        {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={resetTimer}
                        className="p-1 rounded-full hover:bg-slate-800 transition-colors text-slate-400"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Patient summary indices metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100 bg-white">
                  <div className="p-4 border-r border-slate-100">
                    <div className="text-3xs text-slate-400 font-bold uppercase">Planned Treatment</div>
                    <div className="text-xs font-semibold text-slate-900 mt-1 truncate" title={selectedAppointment?.treatment}>
                      {selectedAppointment?.treatment}
                    </div>
                  </div>
                  <div className="p-4 border-r border-slate-100">
                    <div className="text-3xs text-slate-400 font-bold uppercase">Outstanding Balance</div>
                    <div className="text-xs font-semibold text-rose-600 mt-1">
                      ₹{outstandingBalance}
                    </div>
                  </div>
                  <div className="p-4 border-r border-slate-100">
                    <div className="text-3xs text-slate-400 font-bold uppercase">Last Visit Date</div>
                    <div className="text-xs font-semibold text-slate-900 mt-1">
                      {selectedPatient.last_visit_date || 'None'}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-3xs text-slate-400 font-bold uppercase">Next Planned Recall</div>
                    <div className="text-xs font-semibold text-slate-900 mt-1">
                      {selectedPatient.next_visit_date || 'No schedule'}
                    </div>
                  </div>
                </div>

                {/* MEDICAL ALERTS BANNER (Module 1 - Red Alert Highlight) */}
                {(parsedMetadata.medical_history?.length > 0 || parsedMetadata.allergies?.length > 0 || parsedMetadata.current_medications) && (
                  <div className="p-3 bg-red-50 border-b border-red-100 flex items-start gap-2.5 text-xs text-red-900 font-sans">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold mr-1 uppercase">Medical Alert:</span>
                      {parsedMetadata.medical_history?.length > 0 && `History of: ${parsedMetadata.medical_history.join(', ')}. `}
                      {parsedMetadata.allergies?.length > 0 && `ALLERGIES reported: ${parsedMetadata.allergies.join(', ')}. `}
                      {parsedMetadata.current_medications && `Current Medication: ${parsedMetadata.current_medications}.`}
                    </div>
                  </div>
                )}
              </div>

              {/* TWO PANEL CLINICAL CONSOLE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT CONSOLE: INTERACTIVE DENTAL CHART & PACS PANEL (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-6">

                  {/* INTERACTIVE DENTAL CHART */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-500" />
                        Interactive Odontogram Chart
                      </h3>
                      <span className="text-3xs text-slate-400 font-mono">Select a tooth to modify status</span>
                    </div>
                    
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                      <DentalChart
                        patient={selectedPatient}
                        chartData={parsedMetadata.dental_chart || {}}
                        onChange={handleUpdateTooth}
                        onAddTreatment={() => {}}
                        patientTreatments={patientTreatments}
                      />
                    </div>
                  </div>

                  {/* MODULE 7: PHOTO & X-RAY PANEL */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        Clinical PACS Imaging Panel
                      </h3>
                      <span className="text-3xs text-slate-400 font-mono">X-Rays & Progress Photos</span>
                    </div>

                    {/* Uploader section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Imaging Type</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setUploadType('image'); setUploadCategory('Clinical Photo'); }}
                              className={`flex-1 py-1 px-2 rounded font-medium text-center ${
                                uploadType === 'image' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              Camera Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => { setUploadType('radiology'); setUploadCategory('IOPA'); }}
                              className={`flex-1 py-1 px-2 rounded font-medium text-center ${
                                uploadType === 'radiology' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                              }`}
                            >
                              Radiology Scan
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Category Label</label>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-1.5 rounded"
                          >
                            {uploadType === 'image' ? (
                              <>
                                <option value="Before Treatment">Before Photo</option>
                                <option value="After Treatment">After Photo</option>
                                <option value="Smile Photo">Smile Photo</option>
                                <option value="Intra Oral Photo">Intra Oral</option>
                              </>
                            ) : (
                              <>
                                <option value="IOPA">IOPA X-Ray</option>
                                <option value="RVG">RVG Digital</option>
                                <option value="OPG">OPG Panoramic</option>
                                <option value="CBCT">CBCT 3D Scan</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Tooth No</label>
                            <input
                              type="text"
                              value={uploadToothNo}
                              onChange={(e) => setUploadToothNo(e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded"
                              placeholder="16, 46 etc."
                            />
                          </div>
                          <div>
                            <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Caption</label>
                            <input
                              type="text"
                              value={uploadNotes}
                              onChange={(e) => setUploadNotes(e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded"
                              placeholder="Notes..."
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-slate-500 uppercase mb-1">Select File</label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLocalImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              id="pacs-file-upload"
                              disabled={isUploading}
                            />
                            <div className="w-full bg-white border border-slate-200 hover:border-indigo-400 p-2 rounded text-center text-slate-500 flex items-center justify-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              {isUploading ? 'Registering PACS...' : 'Click or Drag File'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image thumbnails catalog */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Photos Map */}
                      {patientImages.map(img => (
                        <div 
                          key={img.id} 
                          onClick={() => setZoomedImage(img.url)}
                          className="group relative aspect-4/3 rounded-lg border border-slate-100 overflow-hidden bg-slate-100 cursor-pointer"
                        >
                          <img src={img.url} alt={img.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                            <span className="font-semibold text-2xs truncate">{img.name}</span>
                            <span className="text-3xs text-slate-300 font-mono mt-0.5">{img.category}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Radiograph Scans Map */}
                      {radiologyRecords.map(rad => (
                        <div 
                          key={rad.id} 
                          onClick={() => setZoomedImage(rad.url)}
                          className="group relative aspect-4/3 rounded-lg border border-slate-100 overflow-hidden bg-slate-950 cursor-pointer"
                        >
                          <img src={rad.url} alt={rad.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                            <span className="font-semibold text-2xs truncate">{rad.name}</span>
                            <span className="text-3xs text-slate-300 font-mono mt-0.5">{rad.scan_type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT CONSOLE: CHECKLIST, MATERIALS, NOTES, BILLING (lg:col-span-5) */}
                <div className="lg:col-span-5 space-y-6">

                  {/* MODULE 3: INTERACTIVE PROCEDURE CHECKLIST */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-indigo-500" />
                        Clinical Procedure Steps
                      </h3>
                      <select
                        value={activeChecklistType}
                        onChange={(e) => setActiveChecklistType(e.target.value)}
                        className="text-2xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded focus:outline-none"
                      >
                        <option value="RCT">RCT Checklist</option>
                        <option value="Scaling">Scaling Checklist</option>
                        <option value="Composite">Composite Checklist</option>
                        <option value="Extraction">Extraction Checklist</option>
                        <option value="Implant">Implant Checklist</option>
                        <option value="Crown">Crown Checklist</option>
                        <option value="Bridge">Bridge Checklist</option>
                        <option value="Whitening">Whitening Checklist</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(PROCEDURE_CHECKLISTS[activeChecklistType] || PROCEDURE_CHECKLISTS['RCT']).map((step, idx) => {
                        const isDone = !!checklistProgress[step];
                        return (
                          <label 
                            key={idx}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-xs ${
                              isDone ? 'bg-slate-50/70 border-slate-150 text-slate-500 line-through' : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={(e) => setChecklistProgress({ ...checklistProgress, [step]: e.target.checked })}
                              className="mt-0.5 shrink-0 accent-indigo-600 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{step}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* MODULE 5: MATERIAL USAGE RECORDER */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-700 border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        Clinical Consumables
                      </span>
                      <button
                        onClick={handleAddConsumable}
                        className="text-3xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Record
                      </button>
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {activeChecklistType === 'Composite' && (
                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Composite Shade</label>
                          <select
                            value={materialsForm.shade}
                            onChange={(e) => setMaterialsForm({ ...materialsForm, shade: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          >
                            {CONSUMABLE_OPTIONS.shades.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}

                      {activeChecklistType === 'RCT' && (
                        <>
                          <div>
                            <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Files Used</label>
                            <select
                              value={materialsForm.files}
                              onChange={(e) => setMaterialsForm({ ...materialsForm, files: e.target.value })}
                              className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                            >
                              {CONSUMABLE_OPTIONS.files.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Gutta Percha</label>
                            <select
                              value={materialsForm.gp}
                              onChange={(e) => setMaterialsForm({ ...materialsForm, gp: e.target.value })}
                              className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                            >
                              {CONSUMABLE_OPTIONS.gp.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {activeChecklistType === 'Implant' && (
                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Implant Fixture</label>
                          <select
                            value={materialsForm.implant}
                            onChange={(e) => setMaterialsForm({ ...materialsForm, implant: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          >
                            {CONSUMABLE_OPTIONS.implants.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Anesthetic</label>
                        <select
                          value={materialsForm.anesthetic}
                          onChange={(e) => setMaterialsForm({ ...materialsForm, anesthetic: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        >
                          {CONSUMABLE_OPTIONS.anesthetic.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Other custom consumables</label>
                        <input
                          type="text"
                          value={materialsForm.otherCustom}
                          onChange={(e) => setMaterialsForm({ ...materialsForm, otherCustom: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded placeholder-slate-400"
                          placeholder="e.g. Suture silk, PTFE Tape..."
                        />
                      </div>
                    </div>

                    {addedConsumables.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {addedConsumables.map((c, i) => (
                          <div key={i} className="flex items-center gap-1 text-3xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            <span>{c}</span>
                            <button onClick={() => handleRemoveConsumable(i)} className="text-slate-400 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MODULE 6: LIVE CLINICAL NOTES */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Live Case Record Notes
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Diagnosis / Findings</label>
                        <textarea
                          rows={2}
                          value={clinicalNotesForm.diagnosis}
                          onChange={(e) => setClinicalNotesForm({ ...clinicalNotesForm, diagnosis: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Treatment Performed</label>
                        <textarea
                          rows={2}
                          value={clinicalNotesForm.treatmentPerformed}
                          onChange={(e) => setClinicalNotesForm({ ...clinicalNotesForm, treatmentPerformed: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MODULE 9: POST-OPERATIVE INSTRUCTIONS CARD */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-indigo-500" />
                        Patient Post-Op Guidelines
                      </h3>
                      <div className="flex items-center gap-1">
                        <select
                          value={postOpSelection}
                          onChange={(e) => setPostOpSelection(e.target.value)}
                          className="text-2xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded focus:outline-none"
                        >
                          <option value="Extraction">Extraction</option>
                          <option value="RCT">RCT</option>
                          <option value="Implant">Implant</option>
                          <option value="Scaling">Scaling</option>
                          <option value="Crown">Crown</option>
                          <option value="Denture">Denture</option>
                        </select>
                        <button
                          onClick={printInstructionsCard}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500"
                          title="Print Care Card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <ul className="text-xs space-y-1.5 text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
                      {(POST_OP_PRESETS[postOpSelection] || []).map((p, i) => (
                        <li key={i} className="flex gap-1.5 items-start">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* MODULE 2: PRESCRIPTION PANEL */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-500" />
                        Prescription (Rx)
                      </h3>
                      <select
                        value={selectedRxTemplate}
                        onChange={(e) => setSelectedRxTemplate(e.target.value)}
                        className="text-2xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded focus:outline-none"
                      >
                        <option value="RCT">RCT Presc.</option>
                        <option value="Extraction">Extraction Presc.</option>
                        <option value="Implant">Implant Presc.</option>
                        <option value="Scaling">Scaling Presc.</option>
                      </select>
                    </div>

                    {/* Drugs list */}
                    <div className="space-y-1.5">
                      {prescriptionList.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50/30 text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{med.name}</span>
                            <div className="text-3xs text-slate-500 mt-0.5">{med.dosage} • {med.frequency} • {med.duration}</div>
                          </div>
                          <button onClick={() => handleRemoveMedicine(idx)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Drug Manual Form */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={customMedicine.name}
                          onChange={(e) => setCustomMedicine({ ...customMedicine, name: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          placeholder="Medicine name (e.g. Paracetamol)..."
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={customMedicine.dosage}
                          onChange={(e) => setCustomMedicine({ ...customMedicine, dosage: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          placeholder="Dosage (e.g. 1 tablet)..."
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={customMedicine.frequency}
                          onChange={(e) => setCustomMedicine({ ...customMedicine, frequency: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          placeholder="Frequency..."
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddMedicine}
                          className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded hover:bg-indigo-100 font-semibold"
                        >
                          + Add Medicine
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MODULE 2: INTEGRATED SESSION BILLING */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      Immediate Session Billing
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Consult Fee (₹)</label>
                        <input
                          type="number"
                          value={billingForm.consultationFee}
                          onChange={(e) => setBillingForm({ ...billingForm, consultationFee: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Treatment Fee (₹)</label>
                        <input
                          type="number"
                          value={billingForm.treatmentFee}
                          onChange={(e) => setBillingForm({ ...billingForm, treatmentFee: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">X-Ray Fee (₹)</label>
                        <input
                          type="number"
                          value={billingForm.xrayCharges}
                          onChange={(e) => setBillingForm({ ...billingForm, xrayCharges: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Discount Allowed (₹)</label>
                        <input
                          type="number"
                          value={billingForm.discountAmount}
                          onChange={(e) => setBillingForm({ ...billingForm, discountAmount: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-emerald-600 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Treatment Subtotal:</span>
                        <span>₹{billingSummary.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST Tax ({billingForm.gstPercent}%):</span>
                        <span>₹{billingSummary.gstValue}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-950 border-t border-indigo-100 pt-1.5 text-sm">
                        <span>Today's Total:</span>
                        <span>₹{billingSummary.totalCharges}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Amount Collected (₹)</label>
                        <input
                          type="number"
                          value={billingForm.amountPaid}
                          onChange={(e) => setBillingForm({ ...billingForm, amountPaid: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded font-bold text-indigo-700"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Payment Method</label>
                        <select
                          value={billingForm.paymentMode}
                          onChange={(e) => setBillingForm({ ...billingForm, paymentMode: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        >
                          <option value="UPI">UPI (GPay/PhonePe)</option>
                          <option value="Cash">Cash Handover</option>
                          <option value="Card">Credit/Debit Card</option>
                          <option value="NetBanking">Net Banking</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex justify-between font-bold text-rose-600 text-3xs px-1">
                        <span>REMAINING BALANCE PAYMENT DUE:</span>
                        <span>₹{billingSummary.finalBalance}</span>
                      </div>
                    </div>
                  </div>

                  {/* MODULE 10: NEXT VISIT PLANNER */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      Next Recall Visit Planner
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Recall Goal</label>
                        <select
                          value={nextVisitForm.visitType}
                          onChange={(e) => setNextVisitForm({ ...nextVisitForm, visitType: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                        >
                          <option value="Review">Clinical Review Check</option>
                          <option value="Continue Treatment">Continue Treatment (Next Session)</option>
                          <option value="Maintenance">Scaling/Regular Maintenance</option>
                          <option value="Emergency Visit">Symptomatic Emergency Check</option>
                          <option value="Completed">Completed (No recall scheduled)</option>
                        </select>
                      </div>

                      {nextVisitForm.visitType !== 'Completed' && (
                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Schedule In</label>
                          <select
                            value={nextVisitForm.intervalValue}
                            onChange={(e) => setNextVisitForm({ ...nextVisitForm, intervalValue: e.target.value, customDate: '' })}
                            className="w-full bg-white border border-slate-200 px-2 py-1 rounded"
                          >
                            <option value="3 days">3 Days Time</option>
                            <option value="1 week">1 Week Time</option>
                            <option value="2 weeks">2 Weeks Time</option>
                            <option value="1 month">1 Month Time</option>
                            <option value="3 months">3 Months Time</option>
                            <option value="6 months">6 Months Time</option>
                            <option value="custom">Select Custom Date</option>
                          </select>
                        </div>
                      )}

                      {nextVisitForm.intervalValue === 'custom' && nextVisitForm.visitType !== 'Completed' && (
                        <div className="col-span-2">
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-0.5">Custom Date</label>
                          <input
                            type="date"
                            value={nextVisitForm.customDate}
                            onChange={(e) => setNextVisitForm({ ...nextVisitForm, customDate: e.target.value })}
                            className="w-full bg-white border border-slate-200 px-2 py-1 rounded font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UNIFIED SESSION COMPLETION TRIGGERS */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2.5">
                    <button
                      type="button"
                      onClick={triggerQualityCheck}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                      id="complete-treatment-btn"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      COMPLETE TREATMENT & SAVE SESSION
                    </button>
                  </div>

                </div>

              </div>
            </>
          )}

        </div>

      </div>

      {/* MODULE 11: QUALITY CHECK WARNINGS DIALOG DRAWER */}
      {showWarningsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-150 shadow-xl"
          >
            <div className="flex items-center gap-2.5 text-rose-600 mb-3.5">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Clinical Quality Audit Warnings</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              We completed a real-time clinical check-list of today's treatment details. Please review the missing parameters before committing:
            </p>
            <div className="space-y-2 bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 mb-5">
              {warningsList.map((warn, i) => (
                <div key={i} className="flex gap-2 text-xs text-rose-950 font-medium">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarningsModal(false)}
                className="flex-1 py-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-600"
              >
                Go Back & Fix Details
              </button>
              <button
                onClick={executeCompletionWorkflow}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-100"
                id="bypass-warnings-btn"
              >
                Override Warnings & Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODULE 12: PATIENT EXIT SUMMARY REPORT MODAL */}
      {showExitSummaryModal && savedExitData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 shadow-xl my-8"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                Electronic Patient Discharge Exit Summary
              </h3>
              <button 
                onClick={() => setShowExitSummaryModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Area Preview */}
            <div className="border border-slate-150 p-5 rounded-xl bg-slate-50/50 text-xs space-y-4 max-h-[400px] overflow-y-auto">
              <div className="text-center border-b border-slate-200 pb-3">
                <h4 className="font-bold text-slate-950 text-sm">SRI CHAITANYA MULTISPECIALITY DENTAL CARE</h4>
                <p className="text-3xs text-slate-400 font-mono mt-0.5">Today's Discharge Sheet & Receipt Summary</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-3xs font-bold text-slate-400 uppercase">Patient Name</span>
                  <span className="font-semibold text-slate-800 text-sm">{savedExitData.patientName} ({savedExitData.patientCode})</span>
                </div>
                <div>
                  <span className="block text-3xs font-bold text-slate-400 uppercase">Consulting Doctor</span>
                  <span className="font-semibold text-slate-800">{savedExitData.doctor}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <span className="block text-3xs font-bold text-slate-400 uppercase">Procedure Conducted Today</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{savedExitData.treatment}</span>
                <p className="text-slate-600 mt-1">{savedExitData.notes}</p>
              </div>

              {savedExitData.medicines && savedExitData.medicines.length > 0 && (
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="block text-3xs font-bold text-slate-400 uppercase mb-1.5">Prescribed Medications (Rx)</span>
                  <div className="space-y-1">
                    {savedExitData.medicines.map((m: any, i: number) => (
                      <div key={i} className="flex justify-between bg-white border border-slate-100 p-2 rounded">
                        <div>
                          <strong className="text-slate-800">{m.name}</strong>
                          <div className="text-3xs text-slate-500">{m.dosage}</div>
                        </div>
                        <div className="text-right text-3xs text-slate-500">
                          <div>{m.frequency}</div>
                          <div>{m.duration}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <span className="block text-3xs font-bold text-slate-400 uppercase mb-1">Financial summary</span>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-semibold">₹{savedExitData.totalCost}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold mt-0.5">
                    <span>Paid Today:</span>
                    <span>₹{savedExitData.paid}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold border-t border-slate-100 pt-1 mt-1">
                    <span>Remaining Due:</span>
                    <span>₹{savedExitData.balance}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="block text-3xs font-bold text-slate-400 uppercase">Next Recall Schedule</span>
                    <span className="font-semibold text-slate-800 mt-1 block">{savedExitData.nextVisitDate}</span>
                  </div>
                  {savedExitData.nextVisitTime && (
                    <span className="text-3xs text-slate-500 font-mono">Preferred Time: {savedExitData.nextVisitTime}</span>
                  )}
                </div>
              </div>

              {savedExitData.instructions && savedExitData.instructions.length > 0 && (
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="block text-3xs font-bold text-slate-400 uppercase mb-1">Home Care Guidelines</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {savedExitData.instructions.map((inst: string, i: number) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowExitSummaryModal(false)}
                className="flex-1 py-2 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-600"
              >
                Close Summary
              </button>
              <button
                onClick={printUnifiedExitSummary}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
                id="print-exit-summary-btn"
              >
                <Printer className="w-4 h-4" />
                Print Exit Care Summary
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* FULLSCREEN IMAGE MODAL ZOOM */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
            <img src={zoomedImage} alt="PACS Zoom" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
