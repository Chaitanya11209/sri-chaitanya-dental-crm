import React, { useState, useEffect } from 'react';
import {
  FileDown, Send, Clock, CheckCircle2, AlertTriangle, Play,
  Plus, ClipboardList, Trash2, Calendar, MessageSquare, PlusCircle, UserCheck
} from 'lucide-react';
import {
  getTreatmentPlans,
  getTreatmentPlanItems,
  getTreatmentFollowups,
  getTreatmentEstimates,
  createTreatmentPlan,
  updateTreatmentPlanStatus,
  createTreatmentFollowup,
  createTreatmentEstimate,
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentFollowup,
  TreatmentEstimate
} from '../services/treatmentCoordinatorService';
import { openWhatsApp } from '../utils/whatsapp';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PatientTreatmentCoordinatorProps {
  patient: {
    id: number;
    name: string;
    phone: string;
    patient_code: string;
  };
}

export default function PatientTreatmentCoordinator({ patient }: PatientTreatmentCoordinatorProps) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TreatmentPlan | null>(null);
  const [activePlanItems, setActivePlanItems] = useState<TreatmentPlanItem[]>([]);
  const [followups, setFollowups] = useState<TreatmentFollowup[]>([]);
  const [estimates, setEstimates] = useState<TreatmentEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Note States
  const [newNote, setNewNote] = useState('');
  const [appendingNote, setAppendingNote] = useState(false);

  // Quick Plan States (for empty state)
  const [showQuickBuilder, setShowQuickBuilder] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [cost, setCost] = useState(15000);
  const [procName, setProcName] = useState('Root Canal Treatment + Crown');

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const fetchedPlans = await getTreatmentPlans(patient.id);
      const fetchedFollowups = await getTreatmentFollowups(patient.id);
      const fetchedEstimates = await getTreatmentEstimates(patient.id);

      setPlans(fetchedPlans);
      setFollowups(fetchedFollowups);
      setEstimates(fetchedEstimates);

      // Set active/first plan
      if (fetchedPlans.length > 0) {
        setActivePlan(fetchedPlans[0]);
        const items = await getTreatmentPlanItems(fetchedPlans[0].id);
        setActivePlanItems(items);
      } else {
        setActivePlan(null);
        setActivePlanItems([]);
      }
    } catch (err) {
      console.error('[PatientTreatmentCoordinator] Failed to fetch', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patient.id]);

  // Handle Note Appending
  const handleAppendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activePlan) return;

    setAppendingNote(true);
    try {
      const updatedNotes = activePlan.notes 
        ? `${activePlan.notes}\n\n[Note Added ${new Date().toLocaleDateString('en-IN')}]: ${newNote}`
        : `[Note Added ${new Date().toLocaleDateString('en-IN')}]: ${newNote}`;

      await updateTreatmentPlanStatus(activePlan.id, activePlan.status);
      
      // Update locally
      const updatedPlans = plans.map(p => {
        if (p.id === activePlan.id) {
          return { ...p, notes: updatedNotes };
        }
        return p;
      });
      setPlans(updatedPlans);
      setActivePlan({ ...activePlan, notes: updatedNotes });
      setNewNote('');
    } catch (err) {
      console.error('Failed to append coordinator notes:', err);
    } finally {
      setAppendingNote(false);
    }
  };

  // Build a Quick Plan from Empty State
  const handleCreateQuickPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) return;

    try {
      const planPayload = {
        patient_id: patient.id,
        patient_name: patient.name,
        patient_phone: patient.phone,
        diagnosis,
        priority,
        status: 'Treatment Planned' as const,
        estimated_cost: cost,
        estimated_duration: '2 Weeks',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        coordinator_name: 'Bhavani',
        notes: 'Quick clinical estimate prepared.'
      };

      const itemsPayload = [{
        treatment_name: procName,
        tooth_no: 'All',
        cost: Number(cost),
        status: 'Proposed' as const,
        notes: ''
      }];

      const created = await createTreatmentPlan(planPayload, itemsPayload);

      // Create Estimations too
      await createTreatmentEstimate({
        plan_id: created.id,
        patient_id: patient.id,
        patient_name: patient.name,
        valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        terms: '1. Valid for 30 days.\n2. Clinic terms apply.',
        share_status: 'Draft'
      });

      setShowQuickBuilder(false);
      fetchPatientData();
    } catch (err) {
      console.error('Failed to quick create plan:', err);
    }
  };

  // Export Estimate PDF
  const handleDownloadPDF = () => {
    if (!activePlan) return;
    const doc = new jsPDF() as any;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 118, 110);
    doc.text('SRI CHAITANYA MULTISPECIALITY DENTAL CARE', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Vijayawada, Andhra Pradesh | Phone: +91 98480 22338', 14, 25);
    doc.line(14, 28, 196, 28);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`TREATMENT ESTIMATE - SC-EST-${activePlan.id.slice(0, 5).toUpperCase()}`, 14, 38);

    // Patient and Clinical info
    doc.setFontSize(10);
    doc.text('PATIENT DEMOGRAPHICS', 14, 48);
    doc.text('DIAGNOSTIC METADATA', 110, 48);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${patient.name}`, 14, 54);
    doc.text(`ID: ${patient.patient_code || `PAT-${patient.id}`}`, 14, 60);
    doc.text(`Phone: +91 ${patient.phone}`, 14, 66);

    doc.text(`Diagnosis: ${activePlan.diagnosis}`, 110, 54);
    doc.text(`Priority Level: ${activePlan.priority}`, 110, 60);
    doc.text(`Coordinator: ${activePlan.coordinator_name || 'Bhavani'}`, 110, 66);

    const headers = [['S.No', 'Treatment Name', 'Tooth Number', 'Estimated cost (INR)']];
    const rows = activePlanItems.map((item, index) => [
      index + 1,
      item.treatment_name,
      item.tooth_no || 'All',
      `Rs. ${Number(item.cost).toLocaleString('en-IN')}`
    ]);

    doc.autoTable({
      startY: 74,
      head: headers,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 100 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND TOTAL: Rs. ${Number(activePlan.estimated_cost).toLocaleString('en-IN')}`, 130, finalY);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an authorized electronic estimate produced by Sri Chaitanya Multispeciality Dental CRM.', 14, finalY + 15);

    doc.save(`Estimate_${patient.name.replace(/\s+/g, '_')}.pdf`);
  };

  // WhatsApp Outreach trigger
  const handleWhatsAppShare = () => {
    if (!activePlan) return;
    const msg = `Hi ${patient.name}, this is Bhavani from Sri Chaitanya Dental Care. I am sharing the digital treatment summary and estimate for *${activePlan.diagnosis}* totaling *Rs. ${Number(activePlan.estimated_cost).toLocaleString('en-IN')}*. Please check your email or let us know if you would like to proceed with booking.`;
    openWhatsApp(patient.phone, msg);
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500 italic text-xs">Loading coordinator workspace...</div>;
  }

  // EMPTY STATE
  if (!activePlan && !showQuickBuilder) {
    return (
      <div className="bg-white rounded-3xl border p-8 shadow-sm flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 my-6">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
          <ClipboardList size={28} />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">No Treatment Plans Logged</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
            There are no formal dental treatment coordinator plans logged for {patient.name}. Launch the builder to create pricing estimates.
          </p>
        </div>
        <button
          onClick={() => setShowQuickBuilder(true)}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          <Plus size={14} /> Quick Build Estimate
        </button>
      </div>
    );
  }

  // QUICK BUILDER FORM
  if (showQuickBuilder) {
    return (
      <form onSubmit={handleCreateQuickPlan} className="bg-white rounded-3xl border p-6 shadow-sm space-y-5 max-w-lg mx-auto my-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quick Estimate Creator</h4>
          <button type="button" onClick={() => setShowQuickBuilder(false)} className="text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-extrabold uppercase">Primary Diagnosis *</label>
            <input
              type="text"
              required
              placeholder="e.g. Deep dental decay, caries #16..."
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              className="w-full text-xs font-bold p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 font-extrabold uppercase">Treatment / Procedure Name *</label>
            <input
              type="text"
              required
              value={procName}
              onChange={e => setProcName(e.target.value)}
              className="w-full text-xs font-bold p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-extrabold uppercase">Estimated Cost (INR) *</label>
              <input
                type="number"
                required
                value={cost}
                onChange={e => setCost(Number(e.target.value))}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 font-extrabold uppercase">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border rounded-xl"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md uppercase tracking-wider"
        >
          Commit Treatment Estimate
        </button>
      </form>
    );
  }

  // DECISION TIMELINE METADATA Calculation
  const isEstimateSent = activePlan ? ['Estimate Shared', 'Patient Thinking', 'Accepted', 'Scheduled', 'Treatment Started', 'Completed'].includes(activePlan.status) : false;
  const isDiscussed = followups.some(f => f.status === 'Completed') || isEstimateSent;
  const isDecisionMade = activePlan ? ['Accepted', 'Rejected', 'Scheduled', 'Treatment Started', 'Completed'].includes(activePlan.status) : false;
  const isAccepted = activePlan ? ['Accepted', 'Scheduled', 'Treatment Started', 'Completed'].includes(activePlan.status) : false;
  const isInitiated = activePlan ? ['Treatment Started', 'Completed'].includes(activePlan.status) : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-700 text-xs">
      
      {/* COLUMN 1 & 2: TREATMENT PLAN & FINANCIAL ESTIMATES */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Active Plan Card */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[9.5px] px-2 py-0.5 font-bold uppercase rounded-lg text-teal-700 bg-teal-50 border border-teal-100">
                Current Active Treatment Plan
              </span>
              <h3 className="text-sm font-black text-slate-800 mt-2 leading-tight">
                {activePlan?.diagnosis}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Duration: {activePlan?.estimated_duration} | Doctor: {activePlan?.doctor_name}</p>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-slate-400 font-extrabold uppercase">Total Cost</div>
              <div className="text-base font-black text-slate-800">
                Rs. {Number(activePlan?.estimated_cost).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-150 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase">
                  <th className="p-2.5">Tooth</th>
                  <th className="p-2.5">Recommended Procedure</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activePlanItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/40">
                    <td className="p-2.5 font-bold font-mono text-slate-500">{item.tooth_no || 'All'}</td>
                    <td className="p-2.5 text-slate-800 font-bold">{item.treatment_name}</td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                        item.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'Completed' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-extrabold text-slate-700">
                      Rs. {Number(item.cost).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl cursor-pointer"
            >
              <Send size={13} /> Send WhatsApp Estimate
            </button>
          </div>
        </div>

        {/* DECISION TIMELINE WIDGET (Module 5) */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Estimate Decision Timeline</h4>
            <p className="text-[9.5px] text-slate-400 font-medium">A clinical pipeline tracking the patient decision progress.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 relative">
            {/* Steps */}
            {[
              { id: 'sent', label: '1. Estimate Shared', checked: isEstimateSent },
              { id: 'discuss', label: '2. Case Callback', checked: isDiscussed },
              { id: 'decision', label: '3. Decision Logged', checked: isDecisionMade },
              { id: 'schedule', label: '4. Slot Scheduled', checked: isAccepted },
              { id: 'start', label: '5. Treatment Started', checked: isInitiated }
            ].map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center text-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mb-1.5 ${
                  step.checked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {step.checked ? '✓' : idx + 1}
                </div>
                <span className="text-[9px] font-extrabold tracking-tight text-slate-700">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMN 3: SIDEBAR DETAILS (FOLLOWUPS, DECISION, NOTES) */}
      <div className="space-y-6">
        
        {/* Active Follow-ups list */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Scheduled Touchpoints</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {followups.length === 0 ? (
              <p className="text-slate-400 italic text-[10.5px] text-center py-6">No followups scheduled.</p>
            ) : (
              followups.map(f => (
                <div key={f.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#2F63E0]">{f.task_type}</span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">{f.due_date}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-500 italic">"{f.notes}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coordinator Notes Logging Workspace */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Internal Coordinator Notes</h4>
          
          <div className="bg-slate-50 border rounded-xl p-3 text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-mono">
            {activePlan?.notes || 'No coordinator logs present. Append one below!'}
          </div>

          <form onSubmit={handleAppendNote} className="space-y-2">
            <textarea
              required
              rows={2}
              placeholder="Type call outcome, family constraint, payment barriers..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="w-full p-2 text-[10.5px] bg-slate-50 border rounded-lg"
            />
            <button
              type="submit"
              disabled={appendingNote}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
            >
              {appendingNote ? 'Logging...' : 'Append Log Note'}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
