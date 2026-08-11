import React from 'react';
import { AlertTriangle, UserCheck, UserPlus, X, Phone, Calendar, MapPin } from 'lucide-react';
import { getPatientAgeDisplay, formatDateDDMMYYYY, getPatientDOB } from '../utils/patientUtils';

interface DuplicatePatientWarningModalProps {
  isOpen: boolean;
  existingPatients: any[];
  onUseExisting: (patient: any) => void;
  onContinueAsNew: () => void;
  onClose: () => void;
  phoneNumber: string;
}

export const DuplicatePatientWarningModal: React.FC<DuplicatePatientWarningModalProps> = ({
  isOpen,
  existingPatients,
  onUseExisting,
  onContinueAsNew,
  onClose,
  phoneNumber
}) => {
  if (!isOpen || existingPatients.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-amber-200 dark:border-amber-900/40 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 border-b border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-200">
              Existing Patient(s) Found
            </h3>
            <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-0.5 leading-relaxed">
              Mobile number <span className="font-mono font-bold text-amber-900 dark:text-amber-100">+91 {phoneNumber}</span> is already registered to {existingPatients.length} patient record{existingPatients.length > 1 ? 's' : ''}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-500 hover:text-amber-800 dark:hover:text-amber-200 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing patients list */}
        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Matching Registered Patient Records:
          </p>

          {existingPatients.map((pt) => {
            const dob = getPatientDOB(pt);
            return (
              <div
                key={pt.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono">
                      {pt.patient_code || `SDC-${pt.id}`}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {pt.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {getPatientAgeDisplay(pt)} {dob ? `(${formatDateDDMMYYYY(dob)})` : ''}
                    </span>
                    {pt.gender && <span>• {pt.gender}</span>}
                    {pt.location && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin size={12} className="text-slate-400" />
                        {pt.location}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUseExisting(pt)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <UserCheck size={14} />
                  <span>Use Patient</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 dark:bg-slate-850/80 p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Is this a family member sharing the same phone number?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinueAsNew}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus size={14} />
              <span>Continue as New Patient</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
