import { Calendar, Clock, CreditCard, IndianRupee, Activity, Plus, AlertTriangle } from 'lucide-react';

interface DashboardTabProps {
  patientData: any;
  appointments: any[];
  isCancelRequested: (notes: string) => boolean;
  triggerRescheduleFlow: (id: any) => void;
  handleRequestCancellation: (id: any, notes: string) => void;
  triggerPaymentFlow: (id: any, amount: number) => void;
  setActiveTab: (tab: any) => void;
}

export default function DashboardTab({
  patientData,
  appointments,
  isCancelRequested,
  triggerRescheduleFlow,
  handleRequestCancellation,
  triggerPaymentFlow,
  setActiveTab
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Message Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👋</span>
          <div>
            <h3 className="text-lg font-black text-slate-800">Hello, {patientData.name}!</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Welcome to your Sri Chaitanya Secure Digital Patient Portal. Easily manage appointments, trace treatment progress, pay balances, and download clinical files.</p>
          </div>
        </div>
      </div>

      {/* Grid for Next Appointment and Outstanding Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Appointment Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-teal-600" /> Next Appointment
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider border border-emerald-200">
                Scheduled
              </span>
            </div>

            {appointments.filter(a => a.status === 'Confirmed' || a.status === 'In Treatment').length > 0 ? (
              (() => {
                const nextApp = appointments.find(a => a.status === 'Confirmed' || a.status === 'In Treatment') || appointments[0];
                const cancelRequested = isCancelRequested(nextApp.notes || '');
                return (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{nextApp.treatment}</h4>
                      <p className="text-xs text-slate-450 mt-0.5">Surgeon: {nextApp.doctor_name || 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)'}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold bg-slate-50 p-3 rounded-2xl border">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock size={13} className="text-teal-600" />
                        <span>{nextApp.appointment_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar size={13} className="text-teal-600" />
                        <span className="font-mono text-[11.5px]">{nextApp.next_visit}</span>
                      </div>
                    </div>
                    {cancelRequested && (
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] font-bold">
                        <AlertTriangle size={13} />
                        <span>Cancellation request has been submitted to reception.</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => triggerRescheduleFlow(nextApp.id)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border border-slate-200 shadow-xs"
                      >
                        Reschedule
                      </button>
                      {!cancelRequested && (
                        <button
                          type="button"
                          onClick={() => handleRequestCancellation(nextApp.id, nextApp.notes)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border border-red-100"
                        >
                          Request Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 font-bold">No active scheduled appointments.</p>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Book Appointment <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Financial Balance Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={14} className="text-teal-600" /> Outstanding Ledger
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9.5px] font-black uppercase tracking-wider border border-amber-200">
                Active balance
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                <p className="text-[9.5px] uppercase font-bold text-slate-400 tracking-widest font-mono">Paid Amount</p>
                <p className="text-xl font-mono font-black text-emerald-600 mt-1">₹{appointments.reduce((acc, val) => acc + Number(val.amount_paid || 0), 0) + (patientData.id === 99182 ? 15000 : 0)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                <p className="text-[9.5px] uppercase font-bold text-slate-400 tracking-widest font-mono">Balance Due</p>
                <p className="text-xl font-mono font-black text-red-600 mt-1">₹{patientData.total_balance || 0}</p>
              </div>
            </div>
          </div>
          {patientData.total_balance > 0 && (
            <div className="pt-4 border-t mt-4">
              <button
                type="button"
                onClick={() => triggerPaymentFlow(appointments[0]?.id || 401, patientData.total_balance)}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <IndianRupee size={12} /> Settle Due ₹{patientData.total_balance} via UPI
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Treatment Tracker visual progress component */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} className="text-teal-600 animate-pulse" /> Interactive Treatment Tracker
          </span>
          <span className="text-[10px] text-slate-450 font-mono font-bold uppercase tracking-widest">
            Live EMR Sync
          </span>
        </div>

        <div className="space-y-6">
          {/* Visual Track 1: Root Canal */}
          <div className="border p-4 rounded-2xl bg-slate-50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-800">Root Canal Restoration Course (Tooth #36)</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Lead surgeon: Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)</p>
              </div>
              <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-850 font-mono font-bold text-[10.5px] rounded-lg">
                Completion: 67%
              </span>
            </div>
            
            {/* Progress Line */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full animate-pulse" style={{ width: '67%' }} />
            </div>

            {/* Detailed Checkpoint List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1.5">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10.5px] font-black mt-0.5">✓</span>
                <div>
                  <p className="text-[11px] font-black text-slate-800">Visit 1: Pulpectomy</p>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">June 15, 2026 · Done</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-[10.5px] font-black mt-0.5">✓</span>
                <div>
                  <p className="text-[11px] font-black text-slate-800">Visit 2: Obturation</p>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">July 01, 2026 · Done</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-dashed border-slate-300">
                <span className="w-5 h-5 bg-slate-100 border border-slate-300 text-slate-450 rounded-full flex items-center justify-center text-[10.5px] font-black mt-0.5">3</span>
                <div>
                  <p className="text-[11px] font-black text-slate-500">Visit 3: Crown Placement</p>
                  <p className="text-[10px] text-teal-600 font-bold font-sans">July 17, 2026 · Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Track 2: Orthodontic wire adjustment */}
          <div className="border p-4 rounded-2xl bg-slate-50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-800">Aesthetic Bracket Realignment (Full Arch)</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Monthly archwire replacements, brackets check, and jawline tracking</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-850 font-mono font-bold text-[10.5px] rounded-lg">
                Completion: 50%
              </span>
            </div>
            
            {/* Progress Line */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: '50%' }} />
            </div>

            {/* Detailed Checkpoint List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1.5">
              <div className="flex items-center gap-1.5 bg-white py-1.5 px-2 rounded-xl border">
                <span className="text-emerald-500 text-xs font-black">✓</span>
                <span className="text-[10.5px] font-bold text-slate-700">Months 1-3 done</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white py-1.5 px-2 rounded-xl border">
                <span className="text-emerald-500 text-xs font-black">✓</span>
                <span className="text-[10.5px] font-bold text-slate-700">Months 4-6 done</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white py-1.5 px-2 rounded-xl border border-dashed border-slate-300">
                <span className="text-teal-600 text-[10px] font-black">●</span>
                <span className="text-[10.5px] font-bold text-slate-700">Month 7 (Upcoming)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white py-1.5 px-2 rounded-xl border border-dashed border-slate-200 opacity-50">
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-[10.5px] font-semibold text-slate-500">Months 8-12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
