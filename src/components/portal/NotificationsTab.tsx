import { Bell, Shield, MessageSquare, Mail, MessageCircle, CheckCircle } from 'lucide-react';

interface NotificationsTabProps {
  prefWhatsApp: boolean;
  setPrefWhatsApp: (v: boolean) => void;
  prefSMS: boolean;
  setPrefSMS: (v: boolean) => void;
  prefEmail: boolean;
  setPrefEmail: (v: boolean) => void;
  handleSavePreferences: () => void;
  savingPrefs: boolean;
}

export default function NotificationsTab({
  prefWhatsApp,
  setPrefWhatsApp,
  prefSMS,
  setPrefSMS,
  prefEmail,
  setPrefEmail,
  handleSavePreferences,
  savingPrefs
}: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={14} className="text-teal-600 animate-bounce" /> Communication Channels & Consent Toggles
          </span>
          <span className="text-[10px] text-slate-450 font-mono font-bold uppercase tracking-widest">
            Privacy Preferences
          </span>
        </div>

        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Manage how you receive digital prescription alerts, booking reminders, GST invoices, and medical follow-ups. Select your preferred secure pipelines below.
        </p>

        <div className="space-y-4 pt-2">
          {/* WhatsApp Pipeline */}
          <div className="border border-slate-150 p-4 rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center shrink-0">
                <MessageCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-850">WhatsApp Delivery Service</h4>
                <p className="text-[10.5px] text-slate-455 mt-0.5">Receive high-speed digital e-prescriptions and PDF invoice receipts directly on your registered WhatsApp chat.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={prefWhatsApp}
                onChange={(e) => setPrefWhatsApp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* SMS Reminders */}
          <div className="border border-slate-150 p-4 rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-150 flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-850">Direct Cellular SMS Channel</h4>
                <p className="text-[10.5px] text-slate-455 mt-0.5">Receive standard booking codes, checkup timings, queue status alerts, and cancellation triggers.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={prefSMS}
                onChange={(e) => setPrefSMS(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
            </label>
          </div>

          {/* Email Reports */}
          <div className="border border-slate-150 p-4 rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-150 flex items-center justify-center shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-850">Encrypted Email Delivery</h4>
                <p className="text-[10.5px] text-slate-455 mt-0.5">Receive monthly statement ledgers, active orthodontic treatment diagnostic plans, and case photos.</p>
              </div>
            </div>
            <label className="relative inline-flex inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={prefEmail}
                onChange={(e) => setPrefEmail(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>

        <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-450 font-semibold">
            <Shield size={14} className="text-teal-600" />
            <span>GDPR & HIPAA Indian Healthcare Privacy standards applied.</span>
          </div>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="w-full sm:w-auto h-10 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
          >
            <CheckCircle size={13} /> {savingPrefs ? 'Updating Preferences...' : 'Apply Preference Matrix'}
          </button>
        </div>
      </div>
    </div>
  );
}
