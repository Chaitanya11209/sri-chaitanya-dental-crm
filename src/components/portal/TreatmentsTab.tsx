import { ShieldAlert, CheckCircle2, Circle, Clock, Activity, ArrowUpRight, IndianRupee } from 'lucide-react';

interface TreatmentsTabProps {
  patientData: any;
  appointments: any[];
}

export default function TreatmentsTab({ patientData, appointments }: TreatmentsTabProps) {
  // Mock detailed treatment data for Aditya Sharma or any patient
  const treatmentPlan = {
    name: 'Aesthetic Orthodontic Wire & Braces Realignment',
    doctor: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon) (Orthodontics Surgeon)',
    duration: '18 Months Course',
    startDate: 'March 15, 2026',
    estimatedCompletion: 'September 15, 2027',
    progressPercent: 65,
    estimatedRemainingCost: 25000,
    clinicalNotes: 'Minor skeletal Class I malocclusion with spacing in upper arch. Patient to wear elastics continuously.',
  };

  const completedProcedures = [
    { id: 1, name: 'Comprehensive Oral Examination & Photo Mapping', date: 'March 15, 2026', doc: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)', status: 'Completed' },
    { id: 2, name: 'Digital 3D Panoramic OPG Radiograph & Modeling', date: 'March 18, 2026', doc: 'SCDC Diagnostic Lab', status: 'Completed' },
    { id: 3, name: 'Intraoral Prophylaxis Scaling & Polishing', date: 'March 20, 2026', doc: 'Dr. K. Raghavan BDS', status: 'Completed' },
    { id: 4, name: 'Ceramic Bracket Placement (Upper and Lower)', date: 'April 05, 2026', doc: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)', status: 'Completed' },
    { id: 5, name: 'Archwire Insertion & Initial Elastic Tensioning', date: 'May 10, 2026', doc: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)', status: 'Completed' },
  ];

  const pendingProcedures = [
    { id: 6, name: 'Routine Archwire Tightening & Elastic Replacement', estDate: 'August 15, 2026', estDuration: '20 Mins', cost: 'Included in Plan' },
    { id: 7, name: 'Bilateral Canine Distalization Tracking', estDate: 'November 20, 2026', estDuration: '30 Mins', cost: 'Included in Plan' },
    { id: 8, name: 'Final Alignment De-bonding & Braces Removal', estDate: 'August 10, 2027', estDuration: '60 Mins', cost: '₹5,000 Retention charge' },
    { id: 9, name: 'Post-Treatment Fixed/Removable Retainer Fitting', estDate: 'September 15, 2027', estDuration: '45 Mins', cost: '₹20,000 Retention Plan' },
  ];

  const phases = [
    { name: 'Phase 1: Diagnostics', desc: 'OPG Imaging, Digital Impressions & Mockups', status: 'completed' },
    { name: 'Phase 2: Brackets Bonding', desc: 'Medical Ceramic brackets alignment & adhesion', status: 'completed' },
    { name: 'Phase 3: Wire Adjustment', desc: 'Periodic tightening, spacing correction & tracking', status: 'active' },
    { name: 'Phase 4: Retainers Fit', desc: 'Debonding brackets and stable retainers fixation', status: 'pending' },
  ];

  return (
    <div id="treatments-tab-container" className="space-y-6">
      {/* 1. OVERVIEW PROGRESS SUMMARY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-100 text-teal-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg">
              Active Care Plan
            </span>
            <h4 className="text-base font-black text-slate-850 tracking-tight">{treatmentPlan.name}</h4>
            <p className="text-xs text-slate-500 font-semibold">Treating Surgeon: <strong className="text-slate-800">{treatmentPlan.doctor}</strong></p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Remaining Balance</p>
            <p className="text-xl font-mono font-black text-red-600 flex items-center gap-0.5 sm:justify-end">
              <IndianRupee size={15} /> {treatmentPlan.estimatedRemainingCost.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* PROGRESS METRICS BAR */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1"><Activity size={14} className="text-teal-600" /> Overall Plan Completion</span>
            <span className="font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg font-black">{treatmentPlan.progressPercent}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
            <div 
              className="bg-teal-600 h-3.5 rounded-full transition-all duration-1000" 
              style={{ width: `${treatmentPlan.progressPercent}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-450 font-semibold font-mono">
            <span>Started: {treatmentPlan.startDate}</span>
            <span>Est. Delivery: {treatmentPlan.estimatedCompletion}</span>
          </div>
        </div>

        {/* CLINICAL SUMMARY STATEMENT */}
        <div className="bg-slate-50 border p-3.5 rounded-2xl flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-semibold">
            <strong>Clinical Orthodontic Note</strong>: {treatmentPlan.clinicalNotes}
          </p>
        </div>
      </div>

      {/* 2. DYNAMIC TIMELINE STEPPER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
          <Clock size={14} className="text-teal-600" /> Treatment Timeline Stepper
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          {phases.map((phase, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                phase.status === 'completed'
                  ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                  : phase.status === 'active'
                  ? 'bg-teal-50/60 border-teal-200 ring-2 ring-teal-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase font-extrabold">Step 0{i + 1}</span>
                {phase.status === 'completed' ? (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                ) : phase.status === 'active' ? (
                  <span className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-ping" />
                ) : (
                  <Circle size={15} className="text-slate-300" />
                )}
              </div>
              <h5 className="text-xs font-black tracking-tight">{phase.name}</h5>
              <p className="text-[10.5px] leading-relaxed mt-1 font-medium">{phase.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PROCEDURE LISTS - SPLIT COMPLETED VS PENDING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Completed Procedures */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Completed Procedures ({completedProcedures.length})
            </span>
          </div>

          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {completedProcedures.map((proc) => (
              <div key={proc.id} className="bg-slate-50 border rounded-2xl p-3.5 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-[11.5px] font-black text-slate-800 leading-snug">{proc.name}</h5>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[8.5px] font-black rounded uppercase shrink-0 font-mono">
                    {proc.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-450 font-semibold font-mono pt-1 border-t border-slate-100">
                  <span>Dr: {proc.doc}</span>
                  <span>Date: {proc.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending / Future Procedures */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-teal-600" /> Upcoming Steps & Procedures ({pendingProcedures.length})
            </span>
          </div>

          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {pendingProcedures.map((proc) => (
              <div key={proc.id} className="bg-slate-50 border rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-[11.5px] font-black text-slate-800 leading-snug">{proc.name}</h5>
                  <span className="px-2 py-0.5 bg-teal-50 border border-teal-150 text-teal-700 text-[8.5px] font-black rounded uppercase shrink-0 font-mono">
                    Pending
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-450 font-semibold font-mono pt-1 border-t border-slate-100">
                  <span>Est Date: {proc.estDate} ({proc.estDuration})</span>
                  <span className="text-teal-850 font-bold">{proc.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
