import { User, ShieldCheck, Save } from 'lucide-react';
import LocationSelect from '../LocationSelect';

interface ProfileTabProps {
  patientData: any;
  setPatientData: (v: any) => void;
  handleUpdateProfile: (e: any) => void;
  loading: boolean;
}

export default function ProfileTab({
  patientData,
  setPatientData,
  handleUpdateProfile,
  loading
}: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. SECURE CLINICAL IDENTITY PASSPORT CARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-xl font-bold border border-teal-150">
              👤
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Verified Clinical Health Identity</h4>
              <p className="text-[10px] text-slate-450 font-mono">Issued under standard SCDC security protocol</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl text-[10px] font-extrabold flex items-center gap-1">
            <ShieldCheck size={12} /> SSL Secure EMR
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-wider">MRN Reference ID</p>
            <p className="text-xs font-black text-slate-800 mt-1 font-mono">{patientData.patient_code || `P-${patientData.id}`}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-wider">Contact Phone</p>
            <p className="text-xs font-black text-slate-800 mt-1 font-mono">+91 {patientData.phone}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-wider">Registered Email</p>
            <p className="text-xs font-black text-slate-800 mt-1 font-mono truncate">{patientData.email || 'Not Provided'}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[9.5px] uppercase font-bold text-slate-400 font-mono tracking-wider">Personal Demographics</p>
            <p className="text-xs font-black text-slate-800 mt-1">{patientData.age || '34'} Yrs · {patientData.gender || 'Male'}</p>
          </div>
        </div>
      </div>

      {/* 2. DEMOGRAPHY UPDATE FORM */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <User size={14} className="text-teal-600" /> Update Demography & Health Records
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
            Secure Save
          </span>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Full Patient Name</label>
              <input
                type="text"
                required
                value={patientData.name || ''}
                onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Contact Email Address</label>
              <input
                type="email"
                required
                value={patientData.email || ''}
                onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Gender Designation</label>
              <select
                value={patientData.gender || 'Male'}
                onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Age (Years)</label>
              <input
                type="number"
                required
                value={patientData.age || ''}
                onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Blood Group (Optional)</label>
              <input
                type="text"
                placeholder="e.g. O+, A-, B+"
                value={patientData.blood_group || ''}
                onChange={(e) => setPatientData({ ...patientData, blood_group: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <LocationSelect
                value={patientData.location || ''}
                onChange={(val) => setPatientData({ ...patientData, location: val })}
                label="Location / Area"
                placeholder="Search area or location"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Primary Chronic Conditions</label>
              <input
                type="text"
                placeholder="e.g. Diabetes, None, Hypertension"
                value={patientData.medical_conditions || ''}
                onChange={(e) => setPatientData({ ...patientData, medical_conditions: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <Save size={14} /> {loading ? 'Saving Profile...' : 'Save Demography Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
