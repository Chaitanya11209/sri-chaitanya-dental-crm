import { FileText, Printer, ShieldAlert, HeartHandshake } from 'lucide-react';

interface PrescriptionsTabProps {
  appointments: any[];
  setPrintingRx: (v: any) => void;
}

export default function PrescriptionsTab({
  appointments,
  setPrintingRx
}: PrescriptionsTabProps) {
  // Extract completed appointments as prescription sources
  const rxRecords = appointments.filter(a => a.status === 'Completed' || a.treatment);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-teal-600" /> Active Rx E-Prescriptions & Dosages
          </span>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl text-[9px] font-extrabold flex items-center gap-1">
            <HeartHandshake size={11} /> Digitally Signed
          </span>
        </div>

        {rxRecords.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs italic">
            No dental e-prescriptions are currently active on this patient profile.
          </div>
        ) : (
          <div className="space-y-6">
            {rxRecords.map((rx, idx) => (
              <div key={rx.id || idx} className="border border-slate-150 rounded-2xl p-5 bg-slate-50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{rx.treatment || 'Consultation Checkup'}</h4>
                    <p className="text-xs text-slate-450 mt-0.5">Authorized by: <strong>{rx.doctor_name || 'Dr. Durga Bhavani Jupalli (BDS, Cosmetic Dental Surgeon)'}</strong> · Reg No: AP-8291-C</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2.5 py-1 rounded-md border">
                      Date: {rx.next_visit || rx.appointment_date || 'Past Record'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintingRx(rx)}
                      className="h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={11} /> Print Rx
                    </button>
                  </div>
                </div>

                {/* Medication Details Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="py-2">Medication Name & Strength</th>
                        <th className="py-2">Dosage Pattern</th>
                        <th className="py-2">Frequency</th>
                        <th className="py-2">Duration</th>
                        <th className="py-2">Instruction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 font-medium">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-900">Amoxicillin 500mg</td>
                        <td className="py-2.5 font-mono">1 - 0 - 1</td>
                        <td className="py-2.5">Twice Daily</td>
                        <td className="py-2.5 font-mono">5 Days</td>
                        <td className="py-2.5 text-slate-500 italic">Post Meals (Antibiotic)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-900">Ketorolac DT 10mg</td>
                        <td className="py-2.5 font-mono">1 - 0 - 1</td>
                        <td className="py-2.5">As Needed (Max 3/day)</td>
                        <td className="py-2.5 font-mono">3 Days</td>
                        <td className="py-2.5 text-slate-500 italic">Dissolve in water, post meals</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-900">Chlorhexidine 0.2% Mouthwash</td>
                        <td className="py-2.5 font-mono">10 ml</td>
                        <td className="py-2.5">Twice Daily</td>
                        <td className="py-2.5 font-mono">7 Days</td>
                        <td className="py-2.5 text-slate-500 italic">Rinse for 30s after brushing</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start gap-2.5 bg-amber-50/50 border border-amber-100 p-3 rounded-xl text-[10.5px] text-amber-900 leading-relaxed font-semibold">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Important Patient Compliance Note: Finish the entire antibiotic course (Amoxicillin) as directed by the clinical orthodontist to prevent localized microbial resistance. In case of heavy swelling, contact our urgent response team at 91000 00000 immediately.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
