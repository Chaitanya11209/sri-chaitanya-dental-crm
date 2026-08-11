import { CreditCard, IndianRupee, Printer, ArrowUpRight, Download } from 'lucide-react';

interface BillingTabProps {
  appointments: any[];
  patientData: any;
  triggerPaymentFlow: (id: any, amount: number) => void;
  calculateGSTComponents: (amt: number) => { cgst: number, sgst: number, base: number };
}

export default function BillingTab({
  appointments,
  patientData,
  triggerPaymentFlow,
  calculateGSTComponents
}: BillingTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL SUMMARY OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm text-center space-y-1">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Est. Treatment Cost</p>
          <p className="text-xl font-mono font-black text-slate-850">₹{appointments.reduce((acc, val) => acc + Number(val.amount_paid || 0) + Number(val.balance_amount || 0), 0) + (patientData.id === 99182 ? 15000 : 0)}</p>
        </div>
        <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100 shadow-sm text-center space-y-1">
          <p className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Paid Ledger Balance</p>
          <p className="text-xl font-mono font-black text-emerald-700">₹{appointments.reduce((acc, val) => acc + Number(val.amount_paid || 0), 0) + (patientData.id === 99182 ? 15000 : 0)}</p>
        </div>
        <div className="bg-red-50/30 rounded-3xl p-5 border border-red-105 shadow-sm text-center space-y-1">
          <p className="text-[10px] uppercase font-black text-red-800 tracking-wider">Total Outstanding Due</p>
          <p className="text-xl font-mono font-black text-red-600">₹{patientData.total_balance || 0}</p>
        </div>
      </div>

      {/* 2. INVOICES TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={14} className="text-teal-600" /> GST Tax Invoices & Receipt Ledger
          </span>
          <span className="text-[10px] font-mono text-slate-450 uppercase font-black">
            Secured Receipts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-2.5">Invoice #</th>
                <th className="py-2.5">Procedure/Treatment</th>
                <th className="py-2.5">Taxable Base</th>
                <th className="py-2.5">CGST (9%)</th>
                <th className="py-2.5">SGST (9%)</th>
                <th className="py-2.5">Gross Invoice</th>
                <th className="py-2.5">Balance status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-750 font-medium">
              {appointments.map((appt, i) => {
                const totalAmt = Number(appt.amount_paid || 0) + Number(appt.balance_amount || 0);
                const { cgst, sgst, base } = calculateGSTComponents(totalAmt);
                return (
                  <tr key={appt.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono font-black text-slate-900">SCDC-2026-00{appt.id || i}</td>
                    <td className="py-3 font-semibold">{appt.treatment || 'Dental Consultation'}</td>
                    <td className="py-3 font-mono text-slate-600">₹{base.toFixed(2)}</td>
                    <td className="py-3 font-mono text-slate-500">₹{cgst.toFixed(2)}</td>
                    <td className="py-3 font-mono text-slate-500">₹{sgst.toFixed(2)}</td>
                    <td className="py-3 font-mono font-bold text-slate-900">₹{totalAmt}</td>
                    <td className="py-3">
                      {appt.balance_amount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-150 font-mono text-[9px] font-bold">
                          ₹{appt.balance_amount} Due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 font-mono text-[9px] font-bold">
                          Fully Paid
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.balance_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => triggerPaymentFlow(appt.id, appt.balance_amount)}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-md transition cursor-pointer shadow-2xs"
                          >
                            Pay Due
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-md transition cursor-pointer flex items-center gap-0.5"
                        >
                          <Printer size={9.5} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
