import { Calendar, Clock, Plus, AlertTriangle, IndianRupee } from 'lucide-react';
import ReasonForVisitSelect from '../ReasonForVisitSelect';

interface AppointmentsTabProps {
  appointments: any[];
  isCancelRequested: (notes: string) => boolean;
  cleanNotes: (notes: string) => string;
  triggerRescheduleFlow: (id: any) => void;
  handleRequestCancellation: (id: any, notes: string) => void;
  bookBranch: string;
  setBookBranch: (v: string) => void;
  bookDentist: string;
  setBookDentist: (v: string) => void;
  bookProcedure: string;
  setBookProcedure: (v: string) => void;
  bookDate: string;
  setBookDate: (v: string) => void;
  bookTimeSlot: string;
  setBookTimeSlot: (v: string) => void;
  bookTime: string;
  setBookTime: (v: string) => void;
  bookJoinWaitingList: boolean;
  setBookJoinWaitingList: (v: boolean) => void;
  handleBookAppointment: (e: any) => void;
  loading: boolean;
}

export default function AppointmentsTab({
  appointments,
  isCancelRequested,
  cleanNotes,
  triggerRescheduleFlow,
  handleRequestCancellation,
  bookBranch,
  setBookBranch,
  bookDentist,
  setBookDentist,
  bookProcedure,
  setBookProcedure,
  bookDate,
  setBookDate,
  bookTimeSlot,
  setBookTimeSlot,
  bookTime,
  setBookTime,
  bookJoinWaitingList,
  setBookJoinWaitingList,
  handleBookAppointment,
  loading
}: AppointmentsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. BOOKING FORM CARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={14} className="text-teal-600" /> Book Dental Treatment Online
          </span>
          <span className="text-[10px] font-mono text-emerald-600 font-extrabold uppercase">
            Instant Confirmation
          </span>
        </div>

        <form onSubmit={handleBookAppointment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Preferred SCDC Branch</label>
            <select
              value={bookBranch}
              onChange={(e) => setBookBranch(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
            >
              <option>Vijayawada HQ (Benz Circle)</option>
              <option>Guntur Branch (Amaravathi Road)</option>
              <option>Nandigama General Clinic</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Dental Specialist</label>
            <select
              value={bookDentist}
              onChange={(e) => setBookDentist(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
            >
              <option>Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon) (Orthodontics Surgeon)</option>
              <option>Dr. Ananya Sharma MDS (Endodontist Care)</option>
              <option>Dr. K. Raghavan BDS (Cosmetic Restorations)</option>
            </select>
          </div>

          <ReasonForVisitSelect
            value={bookProcedure}
            onChange={(val) => setBookProcedure(val)}
            required
            label="Reason for Visit / Treatment *"
          />

          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Select Appointment Date</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={bookDate}
              onChange={(e) => setBookDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Time Slot preference</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['Morning', 'Afternoon', 'Evening'].map(slot => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => {
                    setBookTimeSlot(slot);
                    setBookTime(slot === 'Morning' ? '10:00 AM' : slot === 'Afternoon' ? '02:30 PM' : '06:00 PM');
                  }}
                  className={`py-2 text-center rounded-xl font-bold text-[10px] uppercase tracking-wider transition cursor-pointer ${
                    bookTimeSlot === slot
                      ? 'bg-teal-600 text-white border border-teal-600 shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-250'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Approximate Time Preference</label>
            <input
              type="text"
              placeholder="e.g. 10:30 AM, 05:15 PM"
              value={bookTime}
              onChange={(e) => setBookTime(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
            />
          </div>

          <div className="sm:col-span-2 bg-teal-50 border border-teal-100 p-3.5 rounded-2xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="waitlist"
              checked={bookJoinWaitingList}
              onChange={(e) => setBookJoinWaitingList(e.target.checked)}
              className="mt-0.5 text-teal-600 focus:ring-teal-500 rounded border-slate-350 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="waitlist" className="text-xs text-teal-900 leading-relaxed font-semibold cursor-pointer">
              🏥 <strong>Priority Waiting List Selection</strong>: If my selected slot or date is currently full, automatically place my profile onto the SCDC priority patient waitlist for last-minute cancellations or earlier clinical slots.
            </label>
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              Confirm Booking & Block Calendar Slot
            </button>
          </div>
        </form>
      </div>

      {/* 2. UPCOMING APPOINTMENTS LIST */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-teal-600" /> My Upcoming Appointments
          </span>
          <span className="text-[10px] text-slate-400 font-bold font-mono">
            {appointments.length} Records Found
          </span>
        </div>

        <div className="space-y-4">
          {appointments.map((appt) => {
            const isCancelRequestedFlag = isCancelRequested(appt.notes || '');
            const displayNotes = cleanNotes(appt.notes || '');
            
            return (
              <div key={appt.id} className="border rounded-2xl p-4 bg-slate-50 space-y-3 relative overflow-hidden">
                {isCancelRequestedFlag && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1">
                    <AlertTriangle size={9} /> Pending Cancel Approval
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{appt.treatment}</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Surgeon: {appt.doctor_name || 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                      appt.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : appt.status === 'Cancelled'
                        ? 'bg-red-50 text-red-850 border-red-200'
                        : 'bg-teal-50 text-teal-850 border-teal-200'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 font-semibold font-sans">
                  <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-400 font-mono" /> Date: <strong className="text-slate-850 font-mono">{appt.next_visit}</strong></span>
                  <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400 font-mono" /> Time Slot: <strong className="text-slate-850">{appt.appointment_time}</strong></span>
                  <span className="flex items-center gap-1"><IndianRupee size={13} className="text-slate-400 font-mono" /> Balance: <strong className={appt.balance_amount > 0 ? "text-red-600" : "text-emerald-600"}>₹{appt.balance_amount || 0}</strong></span>
                </div>

                {displayNotes && (
                  <p className="text-[11px] text-slate-450 leading-relaxed italic bg-white p-2 rounded-xl border border-slate-150">
                    Notes: "{displayNotes}"
                  </p>
                )}

                {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => triggerRescheduleFlow(appt.id)}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-750 font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border border-slate-250 shadow-xs"
                    >
                      Request Reschedule
                    </button>
                    {!isCancelRequestedFlag && (
                      <button
                        type="button"
                        onClick={() => handleRequestCancellation(appt.id, appt.notes)}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border border-red-100"
                      >
                        Request Cancellation
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
