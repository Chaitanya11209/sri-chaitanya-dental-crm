import { FolderOpen, Download, FileText, Image as ImageIcon, ShieldCheck, Heart } from 'lucide-react';

interface DocumentsTabProps {
  triggerDocDownload: (filename: string, docType: string) => void;
  patientData: any;
}

export default function DocumentsTab({
  triggerDocDownload,
  patientData
}: DocumentsTabProps) {
  const documentsList = [
    {
      id: 'case_sheet',
      name: 'Orthodontic Diagnostic Case Sheet (Rev 2)',
      type: 'Clinical Case PDF',
      size: '2.4 MB',
      updated: 'June 18, 2026',
      icon: FileText,
      color: 'text-teal-600 bg-teal-50 border-teal-100'
    },
    {
      id: 'opg_xray',
      name: 'Digital Panoramic OPG Mandible X-Ray Radiograph',
      type: 'High-Res Radiograph (PNG/DICOM)',
      size: '14.8 MB',
      updated: 'June 15, 2026',
      icon: ImageIcon,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
    },
    {
      id: 'pre_op_photo',
      name: 'Pre-Operative High-Resolution Intraoral Dental Photo Map',
      type: 'Intraoral Photograph',
      size: '4.1 MB',
      updated: 'June 15, 2026',
      icon: ImageIcon,
      color: 'text-sky-600 bg-sky-50 border-sky-100'
    },
    {
      id: 'informed_consent',
      name: 'Informed Surgical Consent for Root Canal obturation & crown placement',
      type: 'Signed Legal E-Consent PDF',
      size: '1.1 MB',
      updated: 'June 15, 2026',
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FolderOpen size={14} className="text-teal-600" /> Secure Clinical Documents & Imaging Vault
          </span>
          <span className="text-[10px] font-mono text-emerald-600 font-extrabold uppercase">
            SHA-256 Verified EMR
          </span>
        </div>

        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Access your high-definition panoramic X-rays, treatment consent forms, orthodontic photographs, and primary Case Sheets. All files are encrypted end-to-end to ensure compliance with global healthcare privacy regulations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {documentsList.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <div key={doc.id} className="border border-slate-150 bg-slate-50 p-4 rounded-2xl flex items-start gap-3.5 hover:border-slate-350 hover:bg-slate-100/50 transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${doc.color}`}>
                  <IconComponent size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-850 truncate">{doc.name}</h4>
                  <p className="text-[10px] text-slate-455 font-bold mt-0.5">{doc.type} · <span className="font-mono">{doc.size}</span></p>
                  <p className="text-[9px] text-slate-400 font-mono font-semibold mt-1">Uploaded: {doc.updated}</p>
                  
                  <button
                    type="button"
                    onClick={() => triggerDocDownload(doc.id, doc.type)}
                    className="mt-3 inline-flex items-center gap-1 bg-white hover:bg-slate-150 border border-slate-300 text-slate-700 font-extrabold text-[9.5px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition shadow-3xs cursor-pointer"
                  >
                    <Download size={10} /> Download Source File
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic E-Consent form block */}
        <div className="mt-4 border border-dashed border-teal-500/30 p-4 rounded-2xl bg-teal-500/[0.02] space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal-600" />
            <h4 className="text-xs font-black text-teal-950 uppercase tracking-wider">Patient Consent Toggles & Declarations</h4>
          </div>
          <p className="text-[11px] text-teal-900 leading-relaxed font-semibold">
            By keeping the informed treatment consent form signed, you authorize Sri Chaitanya Multispeciality Dental Care practitioners to proceed with necessary diagnostic pulp vitality tests, local anaesthesia blocks, and standard obturation treatments.
          </p>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-350 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
              <Heart size={10} className="fill-emerald-800" /> Signed & Approved digitally
            </span>
            <span className="text-[9.5px] text-slate-400 font-mono font-bold">IP Hash: {patientData.phone ? `157.45.2.${patientData.phone.slice(-3)}` : '157.45.2.103'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
