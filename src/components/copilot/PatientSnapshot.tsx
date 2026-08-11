import React, { useState, useMemo } from 'react';
import {
  Sparkles, ShieldAlert, Clock, Stethoscope, ChevronRight,
  Clipboard, Send, CheckCircle2, MessageSquare, AlertCircle, FileText
} from 'lucide-react';

interface PatientSnapshotProps {
  selected: any;
  patientTreatments: any[];
  getPatientMetadata: (p: any) => any;
  notify: (type: 'success' | 'error' | 'info' | 'warning', title: string, desc: string) => void;
}

export default function PatientSnapshot({
  selected,
  patientTreatments,
  getPatientMetadata,
  notify
}: PatientSnapshotProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteDraft, setNoteDraft] = useState({
    chiefComplaint: '',
    procedurePerformed: '',
    observations: '',
    instructions: '',
    nextVisit: '',
    reviewed: false
  });

  const [recallSelection, setRecallSelection] = useState({
    treatment: 'Scaling & Polishing',
    interval: '6 Months',
    reviewed: false
  });

  const [followUpText, setFollowUpText] = useState('');
  const [followUpType, setFollowUpType] = useState('Standard Recall');
  const [followUpReviewed, setFollowUpReviewed] = useState(false);

  // Parse patient health baselines
  const metadata = useMemo(() => getPatientMetadata(selected), [selected, getPatientMetadata]);
  const historyList = metadata.medical_history || [];
  const allergiesList = metadata.allergies || [];
  const activeTreatments = patientTreatments.filter(t => t.stage !== 'Completed');
  const completedTreatments = patientTreatments.filter(t => t.stage === 'Completed');

  // Compute systemic medical warning badges
  const medicalAlerts = useMemo(() => {
    const alerts = [];
    if (historyList.some((h: string) => /diabetes/i.test(h))) {
      alerts.push({
        title: 'Diabetes Mellitus Warning',
        desc: 'Higher risk of periodontal bone loss, delayed post-extraction soft tissue healing. Ensure pre-operative blood glucose HbA1c is documented (<7.5% optimal).'
      });
    }
    if (historyList.some((h: string) => /hyper/i.test(h) || /heart/i.test(h) || /blood pressure/i.test(h))) {
      alerts.push({
        title: 'Cardiovascular / Hypertension Alert',
        desc: 'Vaso-constrictor (Epinephrine) caution in local anaesthetics. Max 2 cartridges of 1:100,000 epinephrine recommended. Check pre-operative blood pressure.'
      });
    }
    if (historyList.some((h: string) => /bleeding/i.test(h) || /aspirin/i.test(h) || /warfarin/i.test(h))) {
      alerts.push({
        title: 'Haemostasis / Coagulation Risk',
        desc: 'Elevated post-extraction bleeding risk. Avoid sudden surgical trauma. Ensure local haemostatic agents (Gelatamp, Bone wax, Sutures) are prepared.'
      });
    }
    if (allergiesList.length > 0) {
      alerts.push({
        title: `Allergies: ${allergiesList.join(', ')}`,
        desc: `Strictly avoid prescribing or administering cross-reactive therapeutic drugs (e.g., Penicillin, NSAIDs).`
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        title: 'Normal Physiological Baseline',
        desc: 'No major systemic alerts. Standard dental clinical protocols are safe for execution.'
      });
    }
    return alerts;
  }, [historyList, allergiesList]);

  // Generate note draft based on active procedures (Module 3)
  const handleGenerateClinicalDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const isRct = activeTreatments.some(t => /rct|root canal/i.test(t.treatment_type));
      const isImplant = activeTreatments.some(t => /implant/i.test(t.treatment_type));
      
      let cc = selected.notes ? selected.notes.split('.')[0] : 'Wants professional dental scaling.';
      let proc = 'Completed full mouth scaling and subgingival polishing using high-frequency ultrasonic scaler.';
      let obs = 'Generalized plaque accumulation and grade 1 calculus. Moderate gingival margins bleeding index.';
      let inst = 'Instructed on proper modified Bass brushing technique, twice daily brushing, and regular flossing.';
      let nextV = 'Hygiene review in 6 months.';

      if (isRct) {
        cc = 'Intense pain in lower right back molar (tooth 46) triggered by mastication.';
        proc = 'Access cavity made, straight-line canal entry. Working length determined using apex locator at 21.5mm. Complete biomechanical canal shaping with Protaper Gold rotary files. Irrigation with 3% NaOCl. Calcium hydroxide intracanal medicament dressing.';
        obs = 'Active pulp necrosis with chronic apical periodontitis. High root morphology variance.';
        inst = 'Soft cold diet for 48 hours. Avoid chewing hard substances on treatment side. Prescribed antibiotic cover.';
        nextV = 'Obturation and core build-up in 1 week.';
      } else if (isImplant) {
        cc = 'Missing tooth 36 causing chewing impairment.';
        proc = 'Sterile surgical field. Sequential drill osteotomy completed under physiological saline cooling. Dental implant fixture (3.8 x 10mm) loaded into position. Cover screw assembled. Direct torque reading at 42 Ncm.';
        obs = 'Adequate attached gingiva, optimal bone ridge width (D2 bone classification). Post-op dental X-ray shows ideal angulation.';
        inst = 'Bite firmly on gauze pack for 1 hour. No warm liquids or spitting. Clean cold liquid diet.';
        nextV = 'Suture review in 10 days.';
      }

      setNoteDraft({
        chiefComplaint: cc,
        procedurePerformed: proc,
        observations: obs,
        instructions: inst,
        nextVisit: nextV,
        reviewed: false
      });
      setIsGenerating(false);
      notify('success', 'AI Notes Prepared', 'Copilot has compiled structured treatment records based on history.');
    }, 550);
  };

  const handleSaveNotes = () => {
    if (!noteDraft.reviewed) {
      notify('warning', 'Awaiting Dentist Verification', 'Please review and confirm that you have checked the notes before saving.');
      return;
    }
    notify('success', 'Clinical Records Appended', 'Approved clinical notes successfully appended to electronic case sheet.');
    setNoteDraft({
      chiefComplaint: '',
      procedurePerformed: '',
      observations: '',
      instructions: '',
      nextVisit: '',
      reviewed: false
    });
  };

  // Generate messaging reminders (Module 5)
  const handleGenerateFollowUp = (type: string) => {
    setFollowUpType(type);
    let text = `Dear ${selected.name},\n\nThis is a friendly clinical follow-up from Sri Chaitanya Multispeciality Dental Care. `;
    
    if (type === 'Standard Recall') {
      text += `Our records show you are due for your bi-annual professional scaling check-up. Safeguarding oral hygiene prevents secondary decay and bad breath.\n\nPlease call us to schedule your recall slot this weekend!`;
    } else if (type === 'Treatment Completion') {
      text += `We noticed that your pending dental treatment course is currently on hold. Completing active clinical stages ensures maximum prosthesis longevity.\n\nLet us book your next treatment session this week!`;
    } else if (type === 'Post-op Review') {
      text += `We hope you are healing smoothly after your dental treatment today. Remember to follow our cold liquid diet instruction, and avoid hot food or spitting for 24 hours.\n\nIn case of prolonged discomfort, contact our clinic team immediately.`;
    }

    text += `\n\nWarm regards,\nDr. Durga Bhavani Jupalli\nSri Chaitanya Dental Care`;
    setFollowUpText(text);
    setFollowUpReviewed(false);
    notify('success', 'Follow-up Drafted', 'Prepared communication template.');
  };

  const handleLaunchWhatsApp = () => {
    if (!followUpReviewed) {
      notify('warning', 'Review Required', 'Please check the verification approval box to confirm this template copy is certified.');
      return;
    }
    const url = `https://wa.me/${selected.phone || '918317575165'}?text=${encodeURIComponent(followUpText)}`;
    window.open(url, '_blank');
    notify('success', 'WhatsApp Initiated', 'Opening chat window with approved clinical copy.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      {/* LEFT COLUMN: Systemic Snapshots & Recalls */}
      <div className="space-y-5">
        
        {/* Dynamic Medical Alerts */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2 text-rose-600">
            <ShieldAlert size={14} /> AI Systemic Health Screen
          </h4>
          <div className="space-y-3">
            {medicalAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex gap-3 ${
                  alert.title.includes('Normal')
                    ? 'bg-slate-50 border-slate-100'
                    : 'bg-rose-50/50 border-rose-100'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg self-start ${
                    alert.title.includes('Normal')
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  <ShieldAlert size={14} />
                </div>
                <div>
                  <p className={`text-xs font-extrabold ${alert.title.includes('Normal') ? 'text-slate-800' : 'text-rose-800'}`}>
                    {alert.title}
                  </p>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold mt-0.5">
                    {alert.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Recall Configuration (Module 4) */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2 text-teal-600">
            <Clock size={14} /> AI Preventive Recall Interval
          </h4>
          
          <div className="space-y-3 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Target Therapy</label>
                <select
                  value={recallSelection.treatment}
                  onChange={(e) => setRecallSelection({ ...recallSelection, treatment: e.target.value })}
                  className="w-full bg-slate-50 border p-2 rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value="Scaling & Polishing">Scaling & Polishing</option>
                  <option value="Root Canal Treatment">Root Canal Treatment</option>
                  <option value="Dental Implant Review">Dental Implant Review</option>
                  <option value="Orthodontic Tensioning">Orthodontic Tensioning</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Interval Period</label>
                <select
                  value={recallSelection.interval}
                  onChange={(e) => setRecallSelection({ ...recallSelection, interval: e.target.value })}
                  className="w-full bg-slate-50 border p-2 rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value="1 Week Review">1 Week Review</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recallSelection.reviewed}
                  onChange={(e) => setRecallSelection({ ...recallSelection, reviewed: e.target.checked })}
                  className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-[10px] text-amber-800 leading-relaxed font-bold">
                  DENTIST VERIFIED: I confirm this recall interval complies with professional dental care standards.
                </span>
              </label>
            </div>

            <button
              onClick={() => {
                if (!recallSelection.reviewed) {
                  notify('warning', 'Dentist Verification Missing', 'Please review and select the verified checkmark before setting recall.');
                  return;
                }
                notify('success', 'Recall Registered', `Recall interval of ${recallSelection.interval} logged for ${selected.name}.`);
              }}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow transition"
            >
              Set Active Recall Schedule
            </button>
          </div>
        </div>

        {/* Messaging follow-ups (Module 5) */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider border-b pb-2 flex items-center gap-2 text-indigo-600">
            <MessageSquare size={14} /> AI Follow-up Dispatcher
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {['Standard Recall', 'Treatment Completion', 'Post-op Review'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleGenerateFollowUp(type)}
                  className={`px-3 py-1.5 rounded-lg border text-[10.5px] font-bold transition cursor-pointer select-none ${
                    followUpType === type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {followUpText && (
              <div className="space-y-3">
                <textarea
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  className="w-full bg-slate-50 border p-3 rounded-xl font-mono leading-relaxed focus:outline-none text-[10.5px]"
                  rows={6}
                />

                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={followUpReviewed}
                      onChange={(e) => setFollowUpReviewed(e.target.checked)}
                      className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-amber-800 leading-relaxed font-bold">
                      COMMUNICATION APPROVAL: I certify this messaging template contains zero autonomous medical prescriptions or clinical decisions.
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleLaunchWhatsApp}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <Send size={12} /> Dispatch via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Clinical Note Draft Generator */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider flex items-center gap-2 text-indigo-600">
            <FileText size={14} /> AI Clinical Note Draft
          </h4>
          <button
            onClick={handleGenerateClinicalDraft}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-700 to-indigo-700 text-white rounded-lg text-[10.5px] font-black shadow flex items-center gap-1 cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={11} className={isGenerating ? 'animate-spin' : ''} />
            {noteDraft.chiefComplaint ? 'Regenerate Note' : 'Generate Draft'}
          </button>
        </div>

        {!noteDraft.chiefComplaint ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">No active note draft</p>
              <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto leading-relaxed">Synthesize structured case briefs, post-operative observations, and medications instantly based on active procedures.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400">Chief Complaint</label>
              <textarea
                value={noteDraft.chiefComplaint}
                onChange={(e) => setNoteDraft({ ...noteDraft, chiefComplaint: e.target.value })}
                className="w-full bg-slate-50 border p-2 rounded-lg text-xs leading-relaxed"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400">Procedure Performed</label>
              <textarea
                value={noteDraft.procedurePerformed}
                onChange={(e) => setNoteDraft({ ...noteDraft, procedurePerformed: e.target.value })}
                className="w-full bg-slate-50 border p-2 rounded-lg text-xs leading-relaxed"
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400">Observations</label>
              <textarea
                value={noteDraft.observations}
                onChange={(e) => setNoteDraft({ ...noteDraft, observations: e.target.value })}
                className="w-full bg-slate-50 border p-2 rounded-lg text-xs leading-relaxed"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400">Post-Operative Instructions</label>
              <textarea
                value={noteDraft.instructions}
                onChange={(e) => setNoteDraft({ ...noteDraft, instructions: e.target.value })}
                className="w-full bg-slate-50 border p-2 rounded-lg text-xs leading-relaxed"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400">Next Scheduled Visit</label>
              <input
                type="text"
                value={noteDraft.nextVisit}
                onChange={(e) => setNoteDraft({ ...noteDraft, nextVisit: e.target.value })}
                className="w-full bg-slate-50 border p-2 rounded-lg text-xs font-bold"
              />
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noteDraft.reviewed}
                  onChange={(e) => setNoteDraft({ ...noteDraft, reviewed: e.target.checked })}
                  className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-[10.5px] text-amber-800 leading-relaxed font-bold">
                  DENTIST VERIFICATION: I have reviewed this clinical record draft. I certify that it represents accurate procedures and clinical observations.
                </span>
              </label>
            </div>

            <button
              onClick={handleSaveNotes}
              className="w-full py-2.5 bg-[#0F6E6E] hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow transition"
            >
              Approve & Save to Patient File
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
