import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Plus
} from 'lucide-react';
import {
  getEndodonticCasesByPatientId,
  getEndodonticVisitsByCaseId,
  getRadiographsByCaseId,
  getReviewsByCaseId,
  saveEndodonticCase,
  EndodonticCase,
  EndodonticVisit,
  EndodonticRadiograph,
  EndodonticReview,
  RCT_STAGES_ORDER
} from '../services/endodonticService';
import { useNotification } from './NotificationProvider';

interface PatientEndodonticCenterProps {
  patientId: number;
  patientName: string;
}

export default function PatientEndodonticCenter({ patientId, patientName }: PatientEndodonticCenterProps) {
  const { notify } = useNotification();
  const [cases, setCases] = useState<EndodonticCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<EndodonticCase | null>(null);

  // Sub-data for selected case
  const [visits, setVisits] = useState<EndodonticVisit[]>([]);
  const [radiographs, setRadiographs] = useState<EndodonticRadiograph[]>([]);
  const [reviews, setReviews] = useState<EndodonticReview[]>([]);

  // Form State for Quick Case Init
  const [showInitForm, setShowInitForm] = useState(false);
  const [initForm, setInitForm] = useState({
    tooth_number: '16',
    diagnosis: 'Symptomatic Irreversible Pulpitis',
    estimated_cost: 6500,
    clinical_notes: ''
  });

  const loadCases = async () => {
    try {
      setLoading(true);
      const patientCases = await getEndodonticCasesByPatientId(patientId);
      setCases(patientCases);
      if (patientCases.length > 0) {
        setSelectedCase(patientCases[0]);
      } else {
        setSelectedCase(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [patientId]);

  // Fetch sub-data for the active case
  useEffect(() => {
    if (selectedCase) {
      const fetchSubData = async () => {
        try {
          const [v, r, revs] = await Promise.all([
            getEndodonticVisitsByCaseId(selectedCase.id),
            getRadiographsByCaseId(selectedCase.id),
            getReviewsByCaseId(selectedCase.id)
          ]);
          setVisits(v);
          setRadiographs(r);
          setReviews(revs);
        } catch (e) {
          console.error(e);
        }
      };
      fetchSubData();
    } else {
      setVisits([]);
      setRadiographs([]);
      setReviews([]);
    }
  }, [selectedCase]);

  // Quick Initialize
  const handleQuickInit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: patientId,
        patient_name: patientName,
        doctor_id: 'doc-1',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        tooth_number: initForm.tooth_number,
        diagnosis: initForm.diagnosis,
        pulp_status: 'Irreversible Pulpitis',
        periapical_status: 'Symptomatic Apical Periodontitis',
        treatment_plan: 'Standard Root Canal Treatment',
        priority: 'High' as const,
        status: 'In Progress' as const,
        estimated_cost: Number(initForm.estimated_cost),
        clinical_notes: initForm.clinical_notes,
        current_stage: 'Consultation' as const,
        crown_status: 'None' as const
      };

      await saveEndodonticCase(payload);
      notify('success', 'RCT Case Launched', `Root canal therapy files created for tooth ${initForm.tooth_number}.`);
      setShowInitForm(false);
      loadCases();
    } catch (err: any) {
      notify('error', 'Failure', err.message);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-slate-500 text-xs">Loading patient endodontic files...</div>;
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Selector of cases if multiple exist */}
      {cases.length > 0 && (
        <div className="flex gap-2 items-center overflow-x-auto pb-1">
          <span className="text-slate-400 text-xs font-bold whitespace-nowrap">Select RCT Case:</span>
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                selectedCase?.id === c.id
                  ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Case {c.case_number} (Tooth {c.tooth_number})
            </button>
          ))}
          <button
            onClick={() => setShowInitForm(true)}
            className="px-2.5 py-1 text-xs font-black text-red-600 hover:text-white border border-red-200 hover:bg-red-600 rounded-lg flex items-center gap-1 transition ml-auto"
          >
            <Plus size={12} /> New RCT
          </button>
        </div>
      )}

      {/* Empty State / Initialize case */}
      {(cases.length === 0 || showInitForm) && (
        <div className="bg-slate-50 border rounded-2xl p-6 shadow-xs max-w-xl mx-auto">
          {!showInitForm ? (
            <div className="text-center space-y-4 py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                <Activity size={20} className="text-red-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">No Active Endodontic Cases Found</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  This patient does not have any active or completed root canal therapy cases registered in this branch.
                </p>
              </div>
              <button
                onClick={() => setShowInitForm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Initiate Root Canal Case
              </button>
            </div>
          ) : (
            <form onSubmit={handleQuickInit} className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Initialize Root Canal Therapy</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Tooth Number</label>
                  <input
                    type="text"
                    value={initForm.tooth_number}
                    onChange={(e) => setInitForm({ ...initForm, tooth_number: e.target.value })}
                    className="bg-white border px-3 py-1.5 w-full rounded text-xs focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. 16, 21, 46"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Estimated Cost (INR)</label>
                  <input
                    type="number"
                    value={initForm.estimated_cost}
                    onChange={(e) => setInitForm({ ...initForm, estimated_cost: Number(e.target.value) })}
                    className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Diagnostic Indication</label>
                  <input
                    type="text"
                    value={initForm.diagnosis}
                    onChange={(e) => setInitForm({ ...initForm, diagnosis: e.target.value })}
                    className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Diagnostic Symptoms / Case Notes</label>
                <textarea
                  rows={2}
                  value={initForm.clinical_notes}
                  onChange={(e) => setInitForm({ ...initForm, clinical_notes: e.target.value })}
                  className="bg-white border px-3 py-1.5 w-full rounded text-xs"
                  placeholder="e.g., severe localized throbbing, sensitive on percussion..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                {cases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInitForm(false)}
                    className="px-3 py-1.5 bg-white border text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                >
                  Create Case File
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Selected Case Dashboard */}
      {selectedCase && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Case Summary & Workflow */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-bl-xl border-l border-b border-red-100">
                Tooth {selectedCase.tooth_number}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sri Chaitanya Clinical Command</span>
                <h3 className="font-black text-slate-800 text-sm mt-0.5">Root Canal Treatment Plan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Diagnosis: <span className="font-semibold text-slate-700">{selectedCase.diagnosis}</span>
                </p>
                {selectedCase.clinical_notes && (
                  <p className="text-[11px] text-slate-400 italic mt-1.5 bg-slate-50 p-2.5 rounded border">
                    "{selectedCase.clinical_notes}"
                  </p>
                )}
              </div>

              {/* Workflow stage map */}
              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <span>Progression Map (Module 2)</span>
                  <span className="text-red-600 font-black animate-pulse">● Currently: {selectedCase.current_stage}</span>
                </div>
                
                <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                  {RCT_STAGES_ORDER.map((stage, idx) => {
                    const isCurrent = selectedCase.current_stage === stage;
                    const currentIdx = RCT_STAGES_ORDER.indexOf(selectedCase.current_stage);
                    const isPast = idx < currentIdx;

                    return (
                      <div
                        key={stage}
                        title={stage}
                        className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold border whitespace-nowrap ${
                          isCurrent ? 'bg-red-500 border-red-600 text-white' :
                          isPast ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          'bg-slate-50 border-slate-100 text-slate-400'
                        }`}
                      >
                        {stage}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visit Timeline (Module 5) */}
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Chronological Treatment Timeline</h4>
              
              {visits.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center bg-slate-50 border rounded-xl">No chronological visit logs on file.</p>
              ) : (
                <div className="space-y-3.5">
                  {visits.map((v) => (
                    <div key={v.id} className="relative pl-5 border-l border-slate-200 py-1.5">
                      <div className="absolute top-2 left-[-4.5px] w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-50"></div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Visit #{v.visit_number} · {v.date}</span>
                        <span className="text-slate-400">{v.time_taken} mins chair time</span>
                      </div>
                      <p className="text-xs text-slate-800 font-bold mt-1">Completed: {v.procedures_completed.join(', ')}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-100 mt-1.5">
                        {v.doctor_notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side Panels - Radiographs & Outstanding balance */}
          <div className="space-y-4">
            {/* Balance & Status Card */}
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Financials (Module 9)</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                  selectedCase.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {selectedCase.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px]">Outstanding Balance:</span>
                  <div className="text-2xl font-black text-red-600 mt-0.5">
                    ₹{(selectedCase.estimated_cost).toLocaleString()}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-full border border-red-100 text-red-600">
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Standard single-case estimate. Post & core or final ceramic crown deliverable billed separately.
              </p>
            </div>

            {/* Radiographs Mini PACS (Module 4) */}
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">PACS Radiographs Mini-Gallery</h4>
              
              {radiographs.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center bg-slate-50 border rounded-xl">No radiographs linked to this case.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {radiographs.map((r) => (
                    <div key={r.id} className="group relative border rounded-lg overflow-hidden bg-slate-50 h-24">
                      <img
                        src={r.url}
                        alt={r.type}
                        className="w-full h-full object-cover referrer-policy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1 text-[8px] text-white font-bold truncate text-center">
                        {r.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recalls Schedule List (Module 10) */}
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Automated Recalls List</h4>
              
              {reviews.length === 0 ? (
                <p className="text-slate-400 text-[10px] py-4 text-center bg-slate-50 border rounded-xl">Recall schedules populate on case completion.</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-xs border-b pb-2 last:border-none">
                      <div>
                        <p className="font-bold text-slate-800">{r.recall_type} Review</p>
                        <p className="text-[9px] text-slate-400">Date: {r.scheduled_at}</p>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
