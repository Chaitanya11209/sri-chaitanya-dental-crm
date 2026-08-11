import { useState } from 'react';
import { Calendar, Clock, AlertCircle, Sparkles, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { useNotification } from '../NotificationProvider';

interface FollowupsTabProps {
  patientData: any;
  appointments: any[];
}

export default function FollowupsTab({ patientData, appointments }: FollowupsTabProps) {
  const { notify } = useNotification();
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestedId, setRequestedId] = useState<number | null>(null);

  // States for request schedule form
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [selectedRecallId, setSelectedRecallId] = useState<number | null>(null);

  const activeRecalls = [
    {
      id: 1,
      type: '6-Month Routine Oral Examination & Prophylaxis Scale',
      dueDate: 'September 20, 2026',
      status: 'Due Soon',
      desc: 'Routine scaling is critical every 6 months to prevent calculus buildup under wires.',
      doctor: 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)',
    },
    {
      id: 2,
      type: 'Gingival Sulcus Tightening Follow-up check',
      dueDate: 'November 15, 2026',
      status: 'Scheduled Recall',
      desc: 'Checkup to verify gums tensioning and check if any wire irritations exist.',
      doctor: 'Dr. Ananya Sharma MDS',
    }
  ];

  const missedReviews = [
    {
      id: 3,
      type: 'Routine June Elastic Ring Replacement checkup',
      missedDate: 'June 10, 2026',
      status: 'Missed Session',
      actionNeeded: 'Reschedule Required',
    }
  ];

  const handleRequestSlot = (e: React.FormEvent, recallId: number) => {
    e.preventDefault();
    if (!preferredDate) {
      notify('error', 'Select Preferred Date', 'Please choose an action date for this recall booking.');
      return;
    }
    setRequestLoading(true);
    setTimeout(() => {
      setRequestLoading(false);
      setRequestedId(recallId);
      notify('success', 'Recall Appointment Requested', 'Your clinic receptionist will review this slot and send an confirmation SMS shortly!');
      setSelectedRecallId(null);
    }, 1000);
  };

  return (
    <div id="followups-tab-container" className="space-y-6">
      {/* 1. HEALTH ALERT RECALL BANNER */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 rounded-3xl p-6 text-white border border-teal-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="text-amber-300 w-5 h-5 animate-pulse" />
          <h4 className="text-sm font-black uppercase tracking-wider">Preventive Dental Recall Warning</h4>
        </div>
        <p className="text-xs text-teal-100 leading-relaxed font-semibold">
          Sri Chaitanya Multispeciality Dental Care prioritizes your smile preservation. Patients keeping active recalls and scaling routines show 85% reduced risk of enamel demineralization and white spot lesions during orthodontic treatments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Recalls Column */}
        <div className="space-y-4">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
            <Calendar size={14} className="text-teal-600" /> Active Recalls & Routine Cleaning ({activeRecalls.length})
          </span>

          <div className="space-y-4">
            {activeRecalls.map((recall) => {
              const isRequested = requestedId === recall.id;
              const isFormOpen = selectedRecallId === recall.id;

              return (
                <div key={recall.id} className="bg-white border rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start gap-2">
                    <h5 className="text-[12px] font-black text-slate-800 leading-snug">{recall.type}</h5>
                    <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border font-mono shrink-0 ${
                      recall.status === 'Due Soon'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-teal-50 text-teal-850 border-teal-200'
                    }`}>
                      {recall.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{recall.desc}</p>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-450 font-mono font-bold pt-2.5 border-t border-slate-100">
                    <span>Due: {recall.dueDate}</span>
                    <span>MD: {recall.doctor}</span>
                  </div>

                  <div className="pt-2">
                    {isRequested ? (
                      <span className="w-full h-9 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[11px] font-extrabold uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5">
                        <Check size={13} /> Request Under Review
                      </span>
                    ) : isFormOpen ? (
                      <form onSubmit={(e) => handleRequestSlot(e, recall.id)} className="p-3 bg-slate-50 border rounded-2xl space-y-3 mt-2">
                        <h6 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Select Preferred Booking Date</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={preferredDate}
                            onChange={(e) => setPreferredDate(e.target.value)}
                            className="h-9 px-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                          />
                          <select
                            value={preferredTime}
                            onChange={(e) => setPreferredTime(e.target.value)}
                            className="h-9 px-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                          >
                            <option>Morning (10 AM - 1 PM)</option>
                            <option>Afternoon (2 PM - 5 PM)</option>
                            <option>Evening (5 PM - 9 PM)</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={requestLoading}
                            className="h-8 flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            {requestLoading ? 'Requesting...' : 'Request Slot'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRecallId(null)}
                            className="h-8 px-3 bg-white border text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedRecallId(recall.id)}
                        className="w-full h-9 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        Schedule This Recall Session <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missed Reviews & Follow-Ups */}
        <div className="space-y-4">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
            <AlertCircle size={14} className="text-red-600 animate-pulse" /> Missed Clinical Visits ({missedReviews.length})
          </span>

          <div className="space-y-4">
            {missedReviews.map((missed) => {
              const isRequested = requestedId === missed.id;
              const isFormOpen = selectedRecallId === missed.id;

              return (
                <div key={missed.id} className="bg-red-500/[0.02] border-red-150 border-2 border-dashed rounded-3xl p-5 space-y-3 relative">
                  <div className="flex justify-between items-start gap-2">
                    <h5 className="text-[12px] font-black text-slate-800 leading-snug">{missed.type}</h5>
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[8.5px] font-extrabold rounded uppercase font-mono">
                      {missed.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Our logs show you missed this clinical review session on <strong>{missed.missedDate}</strong>. Missing elastic rings replacement delays your teeth adjustment plan by up to 2-3 months.
                  </p>

                  <div className="pt-2">
                    {isRequested ? (
                      <span className="w-full h-9 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[11px] font-extrabold uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5">
                        <Check size={13} /> Reschedule Under Review
                      </span>
                    ) : isFormOpen ? (
                      <form onSubmit={(e) => handleRequestSlot(e, missed.id)} className="p-3 bg-white border rounded-2xl space-y-3 mt-2">
                        <h6 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Select Preferred Reschedule Date</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={preferredDate}
                            onChange={(e) => setPreferredDate(e.target.value)}
                            className="h-9 px-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none"
                          />
                          <select
                            value={preferredTime}
                            onChange={(e) => setPreferredTime(e.target.value)}
                            className="h-9 px-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none"
                          >
                            <option>Morning (10 AM - 1 PM)</option>
                            <option>Afternoon (2 PM - 5 PM)</option>
                            <option>Evening (5 PM - 9 PM)</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={requestLoading}
                            className="h-8 flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            {requestLoading ? 'Requesting...' : 'Request Slot'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRecallId(null)}
                            className="h-8 px-3 bg-white border text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedRecallId(missed.id)}
                        className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                      >
                        Reschedule Missed Session <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
