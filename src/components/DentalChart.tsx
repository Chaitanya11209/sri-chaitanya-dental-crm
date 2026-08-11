import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Heart, Info, Sparkles, ClipboardList, PenTool, 
  Trash2, Plus, FileText, Image as ImageIcon, FileCheck, 
  DollarSign, Calendar, Clock, RefreshCw, X, ArrowRight,
  TrendingUp, Activity, User, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export type ToothStatus = 
  | 'Healthy' 
  | 'Missing' 
  | 'Implant' 
  | 'RCT' 
  | 'Crown' 
  | 'Bridge' 
  | 'Filling' 
  | 'Extraction' 
  | 'Fracture' 
  | 'Mobility' 
  | 'Caries' 
  | 'Impacted';

export interface DentalChartProps {
  patient: any;
  chartData: Record<string, ToothStatus>;
  onChange: (tooth: string, status: ToothStatus) => void;
  onAddTreatment: (tooth: string, status: ToothStatus) => void;
  patientTreatments?: any[];
  onUpdateMetadata?: (updatedFields: Partial<any>) => Promise<void>;
  onAddTreatmentDirect?: (treatmentData: any) => Promise<void>;
  canWriteClinical?: () => boolean;
}

const TOOTH_STATUSES: { id: ToothStatus; label: string; color: string; border: string; desc: string; iconColor: string }[] = [
  { id: 'Healthy', label: 'Healthy', color: 'bg-emerald-500', border: 'border-emerald-600', desc: 'No clinical issues detected', iconColor: 'text-emerald-500' },
  { id: 'Caries', label: 'Caries (Decay)', color: 'bg-rose-500', border: 'border-rose-600', desc: 'Active tooth decay / cavities', iconColor: 'text-rose-500' },
  { id: 'Filling', label: 'Filling', color: 'bg-sky-500', border: 'border-sky-600', desc: 'Composite or dental filling applied', iconColor: 'text-sky-500' },
  { id: 'Crown', label: 'Crown', color: 'bg-amber-500', border: 'border-amber-600', desc: 'Protective cap or crown installed', iconColor: 'text-amber-500' },
  { id: 'RCT', label: 'RCT (Root Canal)', color: 'bg-violet-500', border: 'border-violet-600', desc: 'Root canal treatment performed/needed', iconColor: 'text-violet-500' },
  { id: 'Missing', label: 'Missing', color: 'bg-slate-300', border: 'border-slate-400', desc: 'Absent or extracted tooth space', iconColor: 'text-slate-400' },
  { id: 'Extraction', label: 'Extraction', color: 'bg-orange-500', border: 'border-orange-600', desc: 'Extraction scheduled or performed', iconColor: 'text-orange-500' },
  { id: 'Implant', label: 'Implant', color: 'bg-teal-600', border: 'border-teal-700', desc: 'Titanium root fixture & crown', iconColor: 'text-teal-600' },
  { id: 'Bridge', label: 'Bridge', color: 'bg-fuchsia-500', border: 'border-fuchsia-600', desc: 'Fixed bridge replacement', iconColor: 'text-fuchsia-500' },
  { id: 'Fracture', label: 'Fracture', color: 'bg-red-600', border: 'border-red-700', desc: 'Fractured tooth structure or crown', iconColor: 'text-red-600' },
  { id: 'Mobility', label: 'Mobility', color: 'bg-yellow-500', border: 'border-yellow-600', desc: 'Periodontal laxity or loosening', iconColor: 'text-yellow-500' },
  { id: 'Impacted', label: 'Impacted', color: 'bg-indigo-500', border: 'border-indigo-600', desc: 'Unerupted or bone-locked position', iconColor: 'text-indigo-500' },
];

function ToothVisual({ tooth, status, isUpper }: { tooth: string; status: ToothStatus; isUpper: boolean }) {
  const rootColor = status === 'Implant' ? '#78716c' : '#f8fafc';
  const crownColor = status === 'Crown' ? '#f59e0b' : 
                     status === 'Filling' ? '#38bdf8' : 
                     status === 'Healthy' ? '#ffffff' : '#ffffff';
  
  return (
    <svg viewBox="0 0 40 60" className="w-8 h-12 select-none mx-auto drop-shadow-2xs">
      <g>
        {status === 'Missing' ? (
          <path
            d={isUpper ? "M 10,20 C 10,10 30,10 30,20 C 30,30 25,35 25,50 C 25,55 15,55 15,50 C 15,35 10,30 10,20 Z" : "M 10,40 C 10,50 30,50 30,40 C 30,30 25,25 25,10 C 25,5 15,5 15,10 C 15,25 10,30 10,40 Z"}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2,2"
            opacity="0.4"
          />
        ) : (
          <>
            {status === 'Implant' ? (
              <g transform={isUpper ? "translate(0, 15)" : "translate(0, -15)"}>
                <line x1="20" y1="15" x2="20" y2="45" stroke="#475569" strokeWidth="4.5" />
                <line x1="15" y1="20" x2="25" y2="20" stroke="#64748b" strokeWidth="2" />
                <line x1="15" y1="26" x2="25" y2="26" stroke="#64748b" strokeWidth="2" />
                <line x1="15" y1="32" x2="25" y2="32" stroke="#64748b" strokeWidth="2" />
                <line x1="16" y1="38" x2="24" y2="38" stroke="#64748b" strokeWidth="2" />
                <line x1="17" y1="44" x2="23" y2="44" stroke="#64748b" strokeWidth="2" />
              </g>
            ) : (
              <path
                d={isUpper 
                  ? "M 13,25 C 13,35 17,45 17,55 C 17,57 23,57 23,55 C 23,45 27,35 27,25 Z"
                  : "M 13,35 C 13,25 17,15 17,5 C 17,3 23,3 23,5 C 23,15 27,25 27,35 Z"
                }
                fill={rootColor}
                stroke={status === 'RCT' ? '#a78bfa' : '#cbd5e1'}
                strokeWidth="1.5"
              />
            )}

            {status === 'RCT' && (
              <path
                d={isUpper ? "M 20,25 L 20,52" : "M 20,35 L 20,8"}
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.9"
              />
            )}

            <path
              d={isUpper
                ? "M 10,25 C 10,14 13,11 20,11 C 27,11 30,14 30,25 C 30,28 27,30 20,30 C 13,30 10,28 10,25 Z"
                : "M 10,35 C 10,46 13,49 20,49 C 27,49 30,46 30,35 C 30,32 27,30 20,30 C 13,30 10,32 10,35 Z"
              }
              fill={crownColor}
              stroke={status === 'Crown' ? '#d97706' : status === 'Filling' ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.5"
            />

            {status === 'Caries' && (
              <circle cx="20" cy={isUpper ? "21" : "39"} r="4.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            )}

            {status === 'Bridge' && (
              <g>
                <rect x="0" y="27" width="40" height="6" fill="#f472b6" opacity="0.8" rx="2" />
                <line x1="0" y1="30" x2="40" y2="30" stroke="#db2777" strokeWidth="1.5" />
              </g>
            )}

            {status === 'Fracture' && (
              <path
                d={isUpper ? "M 13,15 L 20,24 L 23,18 L 30,26" : "M 13,45 L 20,36 L 23,42 L 30,34"}
                stroke="#dc2626"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {status === 'Mobility' && (
              <g transform={isUpper ? "translate(0, -2)" : "translate(0, 2)"}>
                <path d="M 6,30 L 12,27 M 6,30 L 12,33 M 6,30 L 34,30 M 34,30 L 28,27 M 34,30 L 28,33" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}

            {status === 'Impacted' && (
              <g transform="rotate(15 20 30)">
                <rect x="18" y="26" width="4" height="8" fill="#6366f1" rx="1" />
              </g>
            )}

            {status === 'Extraction' && (
              <g>
                <line x1="8" y1="12" x2="32" y2="48" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <line x1="32" y1="12" x2="8" y2="48" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}
          </>
        )}
      </g>
    </svg>
  );
}

export default function DentalChart({ 
  patient, 
  chartData, 
  onChange, 
  onAddTreatment,
  patientTreatments = [],
  onUpdateMetadata,
  onAddTreatmentDirect,
  canWriteClinical = () => true
}: DentalChartProps) {
  const [chartType, setChartType] = useState<'adult' | 'child'>('adult');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'treatments' | 'documents' | 'timeline'>('diagnostics');
  const [showDirectLog, setShowDirectLog] = useState(false);

  // Metadata retrieval helpers
  const getPatientMeta = () => {
    if (!patient) return {} as any;
    try {
      if (patient.notes && patient.notes.startsWith('{') && patient.notes.endsWith('}')) {
        return JSON.parse(patient.notes);
      }
    } catch (e) {
      // Ignore
    }
    return {} as any;
  };

  const patientMeta = getPatientMeta();
  const toothDetailsMap = patientMeta.dental_chart_details || {} as Record<string, any>;
  const currentToothDetails = selectedTooth ? (toothDetailsMap[selectedTooth] || {
    diagnosis: '',
    clinical_notes: '',
    doctor_notes: '',
    treatment_status: 'Planned',
    prescriptions: [] as string[],
    images: [] as any[],
    x_rays: [] as any[],
    consent_forms: [] as string[],
    case_sheets: [] as string[],
    timeline: [] as any[]
  }) : null;

  // Form states for diagnostics edits
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [treatmentStatus, setTreatmentStatus] = useState<'Planned' | 'In Progress' | 'Completed' | 'Deferred'>('Planned');

  // Load selected tooth metadata on tooth click
  useEffect(() => {
    if (currentToothDetails) {
      setDiagnosis(currentToothDetails.diagnosis || '');
      setClinicalNotes(currentToothDetails.clinical_notes || '');
      setDoctorNotes(currentToothDetails.doctor_notes || '');
      setTreatmentStatus(currentToothDetails.treatment_status || 'Planned');
    }
  }, [selectedTooth, patient]);

  // Form states for direct treatment logging
  const getDefaultTreatmentType = (status: ToothStatus) => {
    switch (status) {
      case 'Caries': return 'Fillings';
      case 'RCT': return 'Root Canal';
      case 'Crown': return 'Crowns & Bridges';
      case 'Implant': return 'Dental Implants';
      case 'Extraction': return 'Surgical Extractions';
      case 'Mobility': return 'Periodontal Therapy';
      default: return 'Clinical Consultation';
    }
  };

  const [directForm, setDirectForm] = useState({
    treatment_type: 'Clinical Consultation',
    stage: 'Assessment',
    estimated_cost: '2000',
    paid_amount: '0',
    total_sessions: '1',
    sessions_done: '0',
    treatment_notes: '',
    doctor_name: 'Dr. Durga Bhavani Jupalli'
  });

  useEffect(() => {
    if (selectedTooth) {
      const currentStatus = chartData[selectedTooth] || 'Healthy';
      setDirectForm(prev => ({
        ...prev,
        treatment_type: getDefaultTreatmentType(currentStatus),
        treatment_notes: `Clinically scheduled direct therapy session targeting Tooth #${selectedTooth} marked with pathology: ${currentStatus}.`
      }));
    }
  }, [selectedTooth]);

  // Form states for new prescription & documents
  const [newPrescription, setNewPrescription] = useState('');
  const [linkDocForm, setLinkDocForm] = useState({
    name: '',
    category: 'X-Ray / OPG',
    url: ''
  });

  // Adult/Child tooth collections
  const adultTeethUpper = Array.from({ length: 16 }, (_, i) => String(i + 1));      // 1 to 16
  const adultTeethLower = Array.from({ length: 16 }, (_, i) => String(32 - i));     // 17 to 32
  
  const childTeethUpper = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const childTeethLower = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K'];

  const handleToothClick = (tooth: string) => {
    setSelectedTooth(selectedTooth === tooth ? null : tooth);
    setActiveTab('diagnostics');
    setShowDirectLog(false);
  };

  const handleStatusUpdate = async (status: ToothStatus) => {
    if (!selectedTooth) return;
    if (!canWriteClinical()) {
      alert("Access Denied: You do not have permission to modify clinical records.");
      return;
    }
    
    // Update master chartData
    onChange(selectedTooth, status);

    // Save status log in specific tooth details timeline
    const timelineLog = [...(currentToothDetails?.timeline || [])];
    timelineLog.push({
      date: new Date().toLocaleString(),
      event: 'Status Diagnostic Updated',
      notes: `Anatomical clinical parameter marked as "${status}"`,
      status
    });

    const updatedDetails = {
      ...currentToothDetails,
      treatment_status: status === 'Healthy' ? 'Completed' : 'In Progress',
      timeline: timelineLog
    };

    if (onUpdateMetadata) {
      await onUpdateMetadata({
        dental_chart_details: {
          ...toothDetailsMap,
          [selectedTooth]: updatedDetails
        }
      });
    }
  };

  const handleSaveClinicalFindings = async () => {
    if (!selectedTooth || !onUpdateMetadata) return;
    if (!canWriteClinical()) {
      alert("Access Denied: Restricted to clinical specialists.");
      return;
    }

    const timelineLog = [...(currentToothDetails?.timeline || [])];
    const dateStr = new Date().toLocaleString();
    
    if (diagnosis !== currentToothDetails.diagnosis) {
      timelineLog.push({ date: dateStr, event: 'Diagnosis Documented', notes: diagnosis });
    }
    if (clinicalNotes !== currentToothDetails.clinical_notes) {
      timelineLog.push({ date: dateStr, event: 'Clinical Observation Appended', notes: clinicalNotes });
    }
    if (doctorNotes !== currentToothDetails.doctor_notes) {
      timelineLog.push({ date: dateStr, event: 'Private Doctor Remark Saved' });
    }
    if (treatmentStatus !== currentToothDetails.treatment_status) {
      timelineLog.push({ date: dateStr, event: 'Treatment Target Adjusted', notes: `Target status: ${treatmentStatus}` });
    }

    const updatedDetails = {
      ...currentToothDetails,
      diagnosis,
      clinical_notes: clinicalNotes,
      doctor_notes: doctorNotes,
      treatment_status: treatmentStatus,
      timeline: timelineLog
    };

    await onUpdateMetadata({
      dental_chart_details: {
        ...toothDetailsMap,
        [selectedTooth]: updatedDetails
      }
    });

    alert(`Tooth #${selectedTooth} clinical findings archived successfully.`);
  };

  const handleDirectTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTooth || !onAddTreatmentDirect) {
      alert("Parent application treatment engine is unavailable. Using standard form.");
      onAddTreatment(selectedTooth!, chartData[selectedTooth!] || 'Healthy');
      return;
    }
    if (!canWriteClinical()) {
      alert("Access Denied: Restricted to doctors and admins.");
      return;
    }

    const cost = Number(directForm.estimated_cost) || 0;
    const paid = Number(directForm.paid_amount) || 0;
    const balance = Math.max(0, cost - paid);

    // Call database insert callback
    await onAddTreatmentDirect({
      treatment_type: directForm.treatment_type,
      stage: directForm.stage,
      start_date: new Date().toISOString().split('T')[0],
      total_sessions: Number(directForm.total_sessions) || 1,
      sessions_done: Number(directForm.sessions_done) || 0,
      treatment_notes: directForm.treatment_notes || `Direct clinical care on Tooth #${selectedTooth}`,
      status: directForm.stage === 'Completed' ? 'Completed' : 'In Progress',
      tooth_no: String(selectedTooth),
      doctor_name: directForm.doctor_name,
      estimated_cost: cost,
      paid_amount: paid,
      balance_amount: balance
    });

    // Add treatment milestone to localized timeline
    const timelineLog = [...(currentToothDetails?.timeline || [])];
    timelineLog.push({
      date: new Date().toLocaleString(),
      event: 'Direct Treatment Executed',
      notes: `${directForm.treatment_type} (Stage: ${directForm.stage}). Cost: ₹${cost}, Paid: ₹${paid}`,
      doctor: directForm.doctor_name,
      status: 'Completed'
    });

    const updatedDetails = {
      ...currentToothDetails,
      timeline: timelineLog
    };

    if (onUpdateMetadata) {
      await onUpdateMetadata({
        dental_chart_details: {
          ...toothDetailsMap,
          [selectedTooth]: updatedDetails
        }
      });
    }

    setShowDirectLog(false);
    setDirectForm(prev => ({
      ...prev,
      estimated_cost: '2000',
      paid_amount: '0',
      total_sessions: '1',
      sessions_done: '0',
      treatment_notes: ''
    }));
  };

  const handleAddPrescription = async () => {
    if (!selectedTooth || !newPrescription.trim() || !onUpdateMetadata) return;
    
    // Add to localized tooth prescriptions list
    const toothRxList = [...(currentToothDetails?.prescriptions || [])];
    toothRxList.push(newPrescription.trim());

    // Also link to master patient prescriptions list
    const masterRxList = [...(patientMeta.prescriptions || [])];
    masterRxList.push({
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      p_type: 'Direct Tooth Rx',
      notes: `Prescribed for Tooth #${selectedTooth}: ${newPrescription.trim()}`,
      medicines: [{ name: newPrescription.trim(), dosage: 'As directed', duration: '5 days' }],
      tooth_no: String(selectedTooth)
    });

    const timelineLog = [...(currentToothDetails?.timeline || [])];
    timelineLog.push({
      date: new Date().toLocaleString(),
      event: 'Prescription Written',
      notes: newPrescription.trim()
    });

    const updatedDetails = {
      ...currentToothDetails,
      prescriptions: toothRxList,
      timeline: timelineLog
    };

    await onUpdateMetadata({
      prescriptions: masterRxList,
      dental_chart_details: {
        ...toothDetailsMap,
        [selectedTooth]: updatedDetails
      }
    });

    setNewPrescription('');
  };

  const handleLinkImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTooth || !linkDocForm.name || !linkDocForm.url || !onUpdateMetadata) return;

    // Build the clinical radiograph attachment
    const newDoc = {
      id: `img-${Date.now()}`,
      url: linkDocForm.url,
      name: linkDocForm.name,
      category: linkDocForm.category,
      notes: `Anatomically linked to Tooth #${selectedTooth} in interactive workspace`,
      date: new Date().toISOString(),
      tooth_no: String(selectedTooth)
    };

    // Add to master patient image attachments
    const masterImages = [...(patientMeta.images || [])];
    masterImages.push(newDoc);

    // Save in local tooth history
    const timelineLog = [...(currentToothDetails?.timeline || [])];
    timelineLog.push({
      date: new Date().toLocaleString(),
      event: `${linkDocForm.category} Attached`,
      notes: linkDocForm.name
    });

    const updatedDetails = {
      ...currentToothDetails,
      timeline: timelineLog
    };

    await onUpdateMetadata({
      images: masterImages,
      dental_chart_details: {
        ...toothDetailsMap,
        [selectedTooth]: updatedDetails
      }
    });

    setLinkDocForm({
      name: '',
      category: 'X-Ray / OPG',
      url: ''
    });
  };

  // Extract linked clinical documents
  const getLinkedTreatments = () => {
    if (!selectedTooth) return [];
    return patientTreatments.filter(t => String(t.tooth_no) === String(selectedTooth));
  };

  const getLinkedImages = () => {
    if (!selectedTooth) return [];
    const masterImages = patientMeta.images || [];
    return masterImages.filter((img: any) => String(img.tooth_no) === String(selectedTooth));
  };

  const getLinkedPrescriptions = () => {
    if (!selectedTooth) return [];
    const masterRx = patientMeta.prescriptions || [];
    return masterRx.filter((rx: any) => String(rx.tooth_no) === String(selectedTooth));
  };

  const getLinkedCaseSheets = () => {
    if (!selectedTooth) return [];
    const masterSheets = patientMeta.case_sheets || [];
    return masterSheets.filter((cs: any) => 
      cs.toothNumbers && cs.toothNumbers.split(',').map((t: string) => t.trim()).includes(selectedTooth)
    );
  };

  const getToothStyle = (tooth: string) => {
    const status = chartData[tooth] || 'Healthy';
    const cellClass = TOOTH_STATUSES.find(s => s.id === status);
    return cellClass ? `${cellClass.color} text-white` : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div id="dental-chart-2-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white/75 backdrop-blur-md rounded-2xl border border-slate-150 p-6 shadow-xs min-h-[680px]">
      
      {/* LEFT COLUMN: INTERACTIVE ARCH MAP (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Heart size={18} className="text-teal-600 fill-teal-50" />
                Sri Chaitanya Clinical Dental Chart 2.0
              </h3>
              <p className="text-xs text-slate-500">Interactive anatomically scaled clinical chart. Click a tooth to launch diagnostic panel.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => { setChartType('adult'); setSelectedTooth(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartType === 'adult' ? 'bg-white shadow-xs text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Adult Arch (1-32)
              </button>
              <button
                onClick={() => { setChartType('child'); setSelectedTooth(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartType === 'child' ? 'bg-white shadow-xs text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pediatric (A-T)
              </button>
            </div>
          </div>
        </div>

        {/* Anatomical Display Jaw */}
        <div className="bg-slate-50/60 rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center space-y-6 overflow-x-auto">
          <div className="min-w-[620px] text-center space-y-6">
            
            {/* UPPER JAW (MAXILLARY ARCH) */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-2">Maxillary Arch (Upper)</div>
              <div className="flex justify-center gap-1.5">
                {(chartType === 'adult' ? adultTeethUpper : childTeethUpper).map(tooth => {
                  const status = chartData[tooth] || 'Healthy';
                  const isSelected = selectedTooth === tooth;
                  return (
                    <button
                      key={tooth}
                      onClick={() => handleToothClick(tooth)}
                      className={`w-9 h-16 rounded-t-xl rounded-b-md border transition-all flex flex-col items-center justify-between py-1.5 shadow-sm hover:scale-105 hover:bg-slate-100 active:scale-95 cursor-pointer ${
                        isSelected 
                          ? 'ring-3 ring-teal-500 border-teal-500 z-10 bg-teal-50/30' 
                          : 'border-slate-200'
                      }`}
                      title={`Tooth ${tooth} - ${status}`}
                    >
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100/80 px-1 rounded-sm">{tooth}</span>
                      <ToothVisual tooth={tooth} status={status} isUpper={true} />
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${TOOTH_STATUSES.find(s => s.id === status)?.color || 'bg-slate-300'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Midline Spacer */}
            <div className="relative h-2 bg-gradient-to-r from-transparent via-slate-200 to-transparent flex items-center justify-center">
              <span className="absolute px-3 py-0.5 bg-white border border-slate-100 text-[8px] font-black tracking-widest text-slate-400 rounded-full uppercase">MIDLINE</span>
            </div>

            {/* LOWER JAW (MANDIBULAR ARCH) */}
            <div className="space-y-1">
              <div className="flex justify-center gap-1.5">
                {(chartType === 'adult' ? adultTeethLower : childTeethLower).map(tooth => {
                  const status = chartData[tooth] || 'Healthy';
                  const isSelected = selectedTooth === tooth;
                  return (
                    <button
                      key={tooth}
                      onClick={() => handleToothClick(tooth)}
                      className={`w-9 h-16 rounded-b-xl rounded-t-md border transition-all flex flex-col items-center justify-between py-1.5 shadow-sm hover:scale-105 hover:bg-slate-100 active:scale-95 cursor-pointer ${
                        isSelected 
                          ? 'ring-3 ring-teal-500 border-teal-500 z-10 bg-teal-50/30' 
                          : 'border-slate-200'
                      }`}
                      title={`Tooth ${tooth} - ${status}`}
                    >
                      <div className="flex items-center gap-0.5 justify-center mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${TOOTH_STATUSES.find(s => s.id === status)?.color || 'bg-slate-300'}`} />
                      </div>
                      <ToothVisual tooth={tooth} status={status} isUpper={false} />
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100/80 px-1 rounded-sm">{tooth}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase mt-2">Mandibular Arch (Lower)</div>
            </div>

          </div>
        </div>

        {/* Legend Panel */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-150">
          <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-2">Diagnostic Legend</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TOOTH_STATUSES.map(({ id, label, color, desc }) => (
              <div key={id} className="flex items-start gap-1.5 p-1 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-100">
                <span className={`w-2.5 h-2.5 rounded-full ${color} mt-0.5 flex-shrink-0 shadow-xs`} />
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold text-slate-700 leading-none">{label}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 leading-tight truncate" title={desc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PREMIUM CLINICAL WORKSPACE (5/12 cols) */}
      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-150 lg:pl-6 pt-6 lg:pt-0">
        
        {selectedTooth ? (
          <div className="space-y-5">
            
            {/* Tooth Header Card */}
            <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl p-4 shadow-3xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center shadow-md">
                  #{selectedTooth}
                </div>
                <div>
                  <h4 className="text-sm font-black text-teal-900 uppercase">Tooth Workspace</h4>
                  <p className="text-[11px] text-teal-700">
                    Primary diagnosis: <span className="font-bold underline">{chartData[selectedTooth] || 'Healthy'}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTooth(null)}
                className="p-1.5 hover:bg-teal-100 rounded-full text-teal-800 transition"
                title="Close Tooth Workspace"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Status Setter Grid */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Set Anatomical Status</label>
              <div className="grid grid-cols-4 gap-1">
                {TOOTH_STATUSES.map(ts => {
                  const isActive = (chartData[selectedTooth] || 'Healthy') === ts.id;
                  return (
                    <button
                      key={ts.id}
                      onClick={() => handleStatusUpdate(ts.id)}
                      className={`px-1.5 py-1.5 rounded-md border text-[9px] font-bold text-center transition-all cursor-pointer ${
                        isActive 
                          ? `${ts.color} text-white border-transparent shadow-xs scale-102` 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title={ts.desc}
                    >
                      {ts.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Controllers */}
            <div className="flex border-b border-slate-100">
              {(['diagnostics', 'treatments', 'documents', 'timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 pb-2 text-[10px] font-black uppercase tracking-wider text-center transition border-b-2 cursor-pointer ${
                    activeTab === tab 
                      ? 'border-teal-600 text-teal-700' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTAINER CONTENT */}
            <div className="min-h-[300px] overflow-y-auto max-h-[460px] pr-1">
              
              {/* TAB 1: DIAGNOSTICS & PRIVATE FINDINGS */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Clinical Diagnosis</label>
                    <input 
                      type="text" 
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      placeholder="e.g. Grade 2 coronal caries with dentinal involvement"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Treatment target</label>
                      <select
                        value={treatmentStatus}
                        onChange={e => setTreatmentStatus(e.target.value as any)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="Planned">Planned / Scheduled</option>
                        <option value="In Progress">In Progress / Ongoing</option>
                        <option value="Completed">Completed / Cleared</option>
                        <option value="Deferred">Deferred / Postponed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Clinical Urgency</label>
                      <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-700 flex items-center gap-1.5">
                        <AlertCircle size={12} /> Needs Restoration
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Clinical Case Notes</label>
                    <textarea
                      rows={2}
                      value={clinicalNotes}
                      onChange={e => setClinicalNotes(e.target.value)}
                      placeholder="Enter patient-visible notes or session feedback..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Doctor Notes (Private & Internal)</label>
                    <textarea
                      rows={2}
                      value={doctorNotes}
                      onChange={e => setDoctorNotes(e.target.value)}
                      placeholder="Add private logs (e.g. bone density, pulp exposure, apex length)..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50"
                    />
                  </div>

                  <button
                    onClick={handleSaveClinicalFindings}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PenTool size={13} /> Save Tooth Clinical Records
                  </button>
                </div>
              )}

              {/* TAB 2: TREATMENTS & BILLING */}
              {activeTab === 'treatments' && (
                <div className="space-y-4 pt-1">
                  
                  {/* Active/Completed treatments lists */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tooth Treatment Ledger</h5>
                    {getLinkedTreatments().length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                        No previous treatments registered for Tooth #{selectedTooth}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getLinkedTreatments().map((t, idx) => (
                          <div key={t.id || idx} className="p-3 bg-white border border-slate-150 rounded-xl space-y-1.5 hover:shadow-2xs transition">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">{t.treatment_type}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                t.stage === 'Completed' || t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {t.stage || t.status || 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Session: {t.sessions_done || 1} / {t.total_sessions || 1}</span>
                              <span className="font-sans font-bold text-teal-700">₹{t.estimated_cost || 0}</span>
                            </div>
                            {t.treatment_notes && <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 leading-tight">{t.treatment_notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Direct logs section toggle */}
                  {!showDirectLog ? (
                    <button
                      onClick={() => setShowDirectLog(true)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Log Direct Treatment Session
                    </button>
                  ) : (
                    <form onSubmit={handleDirectTreatmentSubmit} className="bg-slate-50/80 p-4 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="text-[11px] font-black text-slate-700 uppercase">Log Direct Therapy</span>
                        <button type="button" onClick={() => setShowDirectLog(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Treatment type</label>
                          <select
                            value={directForm.treatment_type}
                            onChange={e => setDirectForm({...directForm, treatment_type: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          >
                            <option value="Fillings">Fillings & Restorations</option>
                            <option value="Root Canal">Root Canal Treatment (RCT)</option>
                            <option value="Crowns & Bridges">Crowns & Bridges</option>
                            <option value="Dental Implants">Dental Implants</option>
                            <option value="Surgical Extractions">Tooth Extraction</option>
                            <option value="Periodontal Therapy">Gum Therapy</option>
                            <option value="Clinical Consultation">General Consultation</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Treatment stage</label>
                          <select
                            value={directForm.stage}
                            onChange={e => setDirectForm({...directForm, stage: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          >
                            <option value="Assessment">Assessment</option>
                            <option value="Biomechanical Preparation">Preparation / WL</option>
                            <option value="Obturation">Obturation</option>
                            <option value="Completed">Completed / Cemented</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Est Cost (₹)</label>
                          <input 
                            type="number" 
                            value={directForm.estimated_cost}
                            onChange={e => setDirectForm({...directForm, estimated_cost: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Paid Amount (₹)</label>
                          <input 
                            type="number" 
                            value={directForm.paid_amount}
                            onChange={e => setDirectForm({...directForm, paid_amount: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Sessions Done</label>
                          <input 
                            type="number" 
                            value={directForm.sessions_done}
                            onChange={e => setDirectForm({...directForm, sessions_done: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Total Sessions</label>
                          <input 
                            type="number" 
                            value={directForm.total_sessions}
                            onChange={e => setDirectForm({...directForm, total_sessions: e.target.value})}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Care notes & feedback</label>
                        <textarea 
                          rows={2}
                          value={directForm.treatment_notes}
                          onChange={e => setDirectForm({...directForm, treatment_notes: e.target.value})}
                          className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <DollarSign size={13} /> Commit Treatment & Billing
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: ANCILLARY CLINICAL DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-5 pt-1">
                  
                  {/* Prescriptions Sub-section */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><ClipboardList size={11} /> Tooth Meds (Rx)</h5>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newPrescription}
                        onChange={e => setNewPrescription(e.target.value)}
                        placeholder="e.g. Tab Amoxicillin 500mg (1-0-1) x 5 days"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        onClick={handleAddPrescription}
                        className="px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-extrabold flex items-center justify-center cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {getLinkedPrescriptions().length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No specific prescriptions linked to this tooth.</p>
                    ) : (
                      <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl space-y-1">
                        {getLinkedPrescriptions().map((rx: any, i: number) => (
                          <div key={rx.id || i} className="text-xs font-medium text-slate-700 flex items-start gap-1.5 border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                            <span className="text-[9px] bg-teal-50 text-teal-800 px-1 rounded-xs font-mono">{rx.date}</span>
                            <span>{rx.notes}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Radiographs & Photo Attachments */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><ImageIcon size={11} /> Radiographs & Photos</h5>
                    
                    {getLinkedImages().length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No imaging or dental photos linked yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {getLinkedImages().map((img: any, i: number) => (
                          <div key={img.id || i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <img referrerPolicy="no-referrer" src={img.url} alt={img.name} className="w-full h-16 object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-1">
                              <span className="text-[8px] font-bold text-white line-clamp-2">{img.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attach image simulated loader */}
                    <form onSubmit={handleLinkImage} className="bg-slate-50 p-3 border border-slate-200 rounded-xl space-y-2.5">
                      <p className="text-[9px] font-black text-slate-600 uppercase">Link New Clinical Attachment</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={linkDocForm.name}
                          onChange={e => setLinkDocForm({...linkDocForm, name: e.target.value})}
                          placeholder="Doc Name (e.g. Apex Radiograph)"
                          className="px-2 py-1 border border-slate-200 rounded-md text-[10px] font-medium bg-white"
                          required
                        />
                        <select
                          value={linkDocForm.category}
                          onChange={e => setLinkDocForm({...linkDocForm, category: e.target.value})}
                          className="px-2 py-1 border border-slate-200 rounded-md text-[10px] font-medium bg-white"
                        >
                          <option value="X-Ray / OPG">X-Ray / OPG</option>
                          <option value="Clinical Photo">Clinical Photo</option>
                          <option value="Before / After">Before / After</option>
                        </select>
                      </div>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={linkDocForm.url}
                          onChange={e => setLinkDocForm({...linkDocForm, url: e.target.value})}
                          placeholder="Image URL (or paste clinical source URL)"
                          className="flex-1 px-2 py-1 border border-slate-200 rounded-md text-[10px] bg-white"
                          required
                        />
                        <button type="submit" className="px-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-[10px] font-bold cursor-pointer">
                          Link
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Case Sheets and Consents */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileText size={11} /> Case Sheets & Signed Consents</h5>
                    {getLinkedCaseSheets().length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No case sheet templates explicitly matching this tooth.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {getLinkedCaseSheets().map((cs: any, i: number) => (
                          <div key={cs.id || i} className="p-2 bg-slate-50 border border-slate-150 rounded-lg text-[10px]">
                            <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                              <span>{cs.template || 'Case Sheet'}</span>
                              <span>{cs.date}</span>
                            </div>
                            <p className="text-slate-500 line-clamp-1">{cs.chiefComplaint || cs.clinicalFindings}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: CHRONOLOGICAL CLINICAL TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4 pt-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tooth-Specific Progress Timeline</h5>
                  
                  {!(currentToothDetails?.timeline) || currentToothDetails.timeline.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                      No chronological audit logs yet for Tooth #{selectedTooth}
                    </div>
                  ) : (
                    <div className="relative border-l border-teal-200 ml-2.5 pl-4 space-y-4 pt-1">
                      {currentToothDetails.timeline.map((evt: any, idx: number) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow-xs" />
                          <div className="text-[10px] font-mono text-slate-400 font-bold">{evt.date}</div>
                          <div className="text-xs font-extrabold text-slate-800 leading-none mt-0.5">{evt.event}</div>
                          {evt.notes && <p className="text-[10px] text-slate-500 leading-tight mt-1 bg-slate-50 p-1.5 rounded-md border border-slate-100">{evt.notes}</p>}
                          {evt.doctor && <p className="text-[9px] text-teal-600 font-bold mt-0.5">By: {evt.doctor}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Activity size={28} />
            </div>
            <div className="max-w-[280px]">
              <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Clinical Workspace</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Click on any tooth in the anatomical system to view historical treatments, record localized diagnostics, write prescriptions, and log bills instantly.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
