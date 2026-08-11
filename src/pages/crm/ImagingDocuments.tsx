import React, { useState, useEffect } from 'react';
import {
  Layers, Search, Image as ImageIcon, FileText, Activity, ShieldAlert,
  Database, HardDrive, Download, Eye, ZoomIn, ZoomOut, RefreshCw,
  Clock, Trash2, Shield, Filter, Users, User, ArrowUpRight, HelpCircle,
  FileDown, RefreshCcw
} from 'lucide-react';
import {
  PatientImage, PatientDocument, RadiologyRecord, SecurityAuditLog, StorageStats,
  getPatientImages, getPatientDocuments, getRadiologyRecords,
  getAuditLogs, getStorageStats, getLargestFiles, getRecentlyUploaded,
  deletePatientImage, deletePatientDocument, deleteRadiologyRecord, addAuditLog
} from '../../services/imagingDocumentsService';
import { getPatients } from '../../services/patientService';
import { getRole, getCurrentUser } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';

interface PatientOption {
  id: number;
  name: string;
  patient_code: string;
}

export default function ImagingDocuments() {
  const { notify } = useNotification();
  const currentRole = getRole();
  const currentUser = getCurrentUser();
  const userEmail = currentUser?.email || 'admin@srichaitanya.com';

  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'compare' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);

  // Database elements
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [allImages, setAllImages] = useState<PatientImage[]>([]);
  const [allDocs, setAllDocs] = useState<PatientDocument[]>([]);
  const [allRads, setAllRads] = useState<RadiologyRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // Telemetry
  const [storageStats, setStorageStats] = useState<StorageStats>({
    used_bytes: 0,
    images_count: 0,
    documents_count: 0,
    radiology_count: 0,
    limit_bytes: 52428800
  });
  const [largestFiles, setLargestFiles] = useState<any[]>([]);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);

  // Search & Filter state
  const [filterPatient, setFilterPatient] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterTooth, setFilterTooth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Comparer state
  const [comparePatientId, setComparePatientId] = useState<string>('');
  const [compBefore, setCompBefore] = useState<PatientImage | null>(null);
  const [compAfter, setCompAfter] = useState<PatientImage | null>(null);
  const [compZoom, setCompZoom] = useState(1);
  const [compRotation, setCompRotation] = useState(0);

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState<{
    id: string;
    url: string;
    name: string;
    category: string;
    notes?: string;
    date: string;
    patient_id: number;
    patient_name: string;
    watermarked?: boolean;
    type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY';
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      // Patients list
      const patientList = await getPatients();
      setPatients(patientList || []);

      // Load all archives
      const imgs = await getPatientImages();
      const docs = await getPatientDocuments();
      const rads = await getRadiologyRecords();
      const logs = await getAuditLogs();

      setAllImages(imgs);
      setAllDocs(docs);
      setAllRads(rads);
      setAuditLogs(logs);

      // Telemetry
      const stats = await getStorageStats();
      setStorageStats(stats);

      const largest = await getLargestFiles();
      setLargestFiles(largest);

      const recent = await getRecentlyUploaded();
      setRecentUploads(recent);

    } catch (e) {
      console.error(e);
      notify('error', 'Sync Failed', 'Failed to read centralized PACS registries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const openLightbox = async (item: any, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    setLightboxItem({
      id: item.id,
      url: item.url,
      name: item.name,
      category: item.category || item.scan_type,
      notes: item.notes,
      date: item.created_at,
      patient_id: item.patient_id,
      patient_name: item.patient_name || 'Patient',
      watermarked: item.watermarked,
      type
    });
    setLightboxZoom(1);
    setLightboxRotation(0);

    // Write audit log
    await addAuditLog({
      action: 'VIEW',
      resource_type: type,
      resource_id: item.id,
      resource_name: item.name,
      patient_id: item.patient_id,
      patient_name: item.patient_name || 'Patient',
      performed_by: userEmail,
      role: currentRole
    });

    const logs = await getAuditLogs();
    setAuditLogs(logs);
  };

  const triggerDownload = async (item: any, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    try {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `${item.patient_name || 'Patient'}_${item.name.replace(/\s+/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await addAuditLog({
        action: 'DOWNLOAD',
        resource_type: type,
        resource_id: item.id,
        resource_name: item.name,
        patient_id: item.patient_id,
        patient_name: item.patient_name || 'Patient',
        performed_by: userEmail,
        role: currentRole
      });

      const logs = await getAuditLogs();
      setAuditLogs(logs);
      notify('success', 'File Downloaded', `Successfully extracted ${item.name} from cloud PACS.`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFileGlobally = async (id: string, patientId: number, name: string, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    if (currentRole !== 'admin' && currentRole !== 'doctor') {
      notify('error', 'Access Denied', 'Only Doctors or Administrators can permanently purge PACS elements.');
      return;
    }

    if (!confirm(`Permanently purge ${name} across the clinic database? This operation is irreversible and audited.`)) {
      return;
    }

    try {
      if (type === 'IMAGE') {
        await deletePatientImage(id, userEmail);
      } else if (type === 'RADIOLOGY') {
        await deleteRadiologyRecord(id, userEmail);
      } else {
        await deletePatientDocument(id, userEmail);
      }

      setLightboxItem(null);
      loadGlobalData();
      notify('success', 'Asset Purged', 'File successfully removed from server vaults.');
    } catch (e) {
      console.error(e);
      notify('error', 'Purge Failed', 'Failed to remove asset.');
    }
  };

  // Filter lists helper
  const getFilteredCombined = () => {
    const combined: any[] = [
      ...allImages.map(img => ({ ...img, fileType: 'IMAGE', displayCategory: img.category })),
      ...allRads.map(rad => ({ ...rad, fileType: 'RADIOLOGY', displayCategory: rad.scan_type })),
      ...allDocs.map(doc => ({ ...doc, fileType: 'DOCUMENT', displayCategory: doc.category }))
    ];

    return combined.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPatient = filterPatient === 'all' || String(item.patient_id) === filterPatient;
      const matchesCategory = filterCategory === 'all' || item.displayCategory === filterCategory || item.fileType === filterCategory;
      const matchesDoctor = filterDoctor === 'all' || item.doctor_name === filterDoctor;
      const matchesTooth = filterTooth === 'all' || item.tooth_no === filterTooth;

      return matchesSearch && matchesPatient && matchesCategory && matchesDoctor && matchesTooth;
    });
  };

  const filteredCombined = getFilteredCombined();

  // Storage Utilized Visual calculation
  const storagePercentage = Math.min((storageStats.used_bytes / storageStats.limit_bytes) * 100, 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-600 rounded-lg text-white">
              <Layers size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-teal-100 text-teal-800 px-2 py-0.5 rounded">PAC-MGR</span>
            <span className="text-[10px] font-semibold text-slate-400">HIPAA Compliant Secure Storage</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-2 uppercase tracking-tight">Sri Chaitanya Clinical PACS & Document Vaults</h2>
          <p className="text-xs text-slate-500">Centralized repository for high-resolution CBCT scans, IOPA radiographs, before/after dental cosmetic comparison, and clinical consent paperwork.</p>
        </div>

        <button
          onClick={loadGlobalData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Synchronize Vaults</span>
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-px">
        {[
          { id: 'overview', label: 'Storage & Analytics', icon: HardDrive },
          { id: 'gallery', label: 'Central Clinical Gallery', icon: ImageIcon },
          { id: 'compare', label: 'Cosmetic Comparison Studio', icon: Layers },
          { id: 'audit', label: 'Security Audit Ledger', icon: Shield }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 -mb-[2px] ${
                isActive
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <tab.icon size={14} className={isActive ? 'text-teal-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="animate-spin text-teal-600 mb-2" size={28} />
          <p className="text-xs font-bold uppercase tracking-wider">Retrieving centralized hospital databases...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cloud Storage Utilization</span>
                    <Database size={16} className="text-teal-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">{(storageStats.used_bytes / (1024 * 1024)).toFixed(2)} MB</h3>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div style={{ width: `${storagePercentage}%` }} className="bg-teal-600 h-2 rounded-full"></div>
                  </div>
                  <p className="text-[9px] text-slate-400">Secure allocation limit of {(storageStats.limit_bytes / (1024 * 1024)).toFixed(0)} MB</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clinical Photographs</span>
                    <h3 className="text-xl font-black text-slate-800 mt-1">{storageStats.images_count}</h3>
                    <p className="text-[9px] text-slate-400 mt-1">Cosmetic, intra-oral, Smile photos</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-600"><ImageIcon size={20} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">IOPA / OPG Scans</span>
                    <h3 className="text-xl font-black text-slate-800 mt-1">{storageStats.radiology_count}</h3>
                    <p className="text-[9px] text-slate-400 mt-1">Radiography digital PACS elements</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity size={20} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compliance Documents</span>
                    <h3 className="text-xl font-black text-slate-800 mt-1">{storageStats.documents_count}</h3>
                    <p className="text-[9px] text-slate-400 mt-1">Signed consent, referrals, invoices</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-600"><FileText size={20} /></div>
                </div>
              </div>

              {/* Central section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Largest Files Table */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 lg:col-span-2 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">PACS Large Asset Analysis</h3>
                    <p className="text-[11px] text-slate-400">High-resolution radiographs and PDFs consuming maximum server bandwidth.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                          <th className="p-2.5">Asset Name</th>
                          <th className="p-2.5">Patient</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">File Size</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {largestFiles.map(file => (
                          <tr key={file.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-700 truncate max-w-[180px]">{file.name}</td>
                            <td className="p-2.5 text-slate-500 font-bold">{file.patient_name || 'Anonymous'}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase">
                                {file.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-teal-600 font-extrabold">{(file.file_size / (1024 * 1024)).toFixed(2)} MB</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => openLightbox(file, file.type === 'Clinical Photo' ? 'IMAGE' : file.type === 'Radiology Scan' ? 'RADIOLOGY' : 'DOCUMENT')}
                                className="text-teal-600 hover:underline font-bold"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recently Uploaded sidebar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recently Uploaded</h3>
                    <p className="text-[11px] text-slate-400">Real-time uploads on hospital clinical PACS.</p>
                  </div>

                  <div className="space-y-3">
                    {recentUploads.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                            {file.type === 'Clinical Photo' ? <ImageIcon size={14} /> : file.type === 'Radiology Scan' ? <Activity size={14} /> : <FileText size={14} />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-700 truncate">{file.name}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{file.patient_name} • {new Date(file.created_at).toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="text-slate-400 cursor-pointer hover:text-teal-600 shrink-0"
                          onClick={() => openLightbox(file, file.type === 'Clinical Photo' ? 'IMAGE' : file.type === 'Radiology Scan' ? 'RADIOLOGY' : 'DOCUMENT')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CENTRAL CLINICAL GALLERY */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Gallery Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Select Patient</label>
                  <select
                    value={filterPatient}
                    onChange={e => setFilterPatient(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="all">👥 All Patients</option>
                    {patients.map(p => (
                      <option key={p.id} value={String(p.id)}>[{p.patient_code}] {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">File Category</label>
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="all">📁 All Archive Types</option>
                    <option value="IMAGE">Clinical Photos (Only)</option>
                    <option value="RADIOLOGY">Radiology PACS (Only)</option>
                    <option value="DOCUMENT">Documents & forms (Only)</option>
                    <option value="Before Treatment">Before Treatment Photos</option>
                    <option value="After Treatment">After Treatment Photos</option>
                    <option value="Consent Form">Consent Sheets</option>
                    <option value="OPG">OPG Full Panoramic</option>
                    <option value="CBCT">CBCT Maxilla 3D</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Diagnosing Doctor</label>
                  <select
                    value={filterDoctor}
                    onChange={e => setFilterDoctor(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="all">👨‍⚕️ All Attendants</option>
                    <option value="Dr. Durga Bhavani Jupalli">Dr. Durga Bhavani Jupalli</option>
                    <option value="Dr. Durga Bhavani Jupalli">Dr. Durga Bhavani Jupalli</option>
                    <option value="Dr. Radhika">Dr. Radhika</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Teeth localization</label>
                  <select
                    value={filterTooth}
                    onChange={e => setFilterTooth(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="all">🦷 Any Tooth</option>
                    {Array.from({ length: 32 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={String(num)}>Tooth #{num}</option>
                    ))}
                    <option value="UR">Quadrant UR</option>
                    <option value="UL">Quadrant UL</option>
                    <option value="LL">Quadrant LL</option>
                    <option value="LR">Quadrant LR</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Key Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Diagnosis/name..."
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              {filteredCombined.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-200 bg-white rounded-2xl">
                  <ImageIcon size={44} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">No matching archives found</p>
                  <p className="text-xs text-slate-400 mt-1">Refine your search parameters or check clear filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCombined.map(item => {
                    const isRad = item.fileType === 'RADIOLOGY';
                    const isDoc = item.fileType === 'DOCUMENT';

                    return (
                      <div
                        key={item.id}
                        onClick={() => openLightbox(item, item.fileType)}
                        className={`group rounded-xl border overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative ${
                          isRad ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-150'
                        }`}
                      >
                        <div className="aspect-square relative overflow-hidden flex items-center justify-center p-2 bg-slate-50">
                          <img
                            src={item.url}
                            alt={item.name}
                            className={`max-h-full max-w-full object-cover group-hover:scale-105 transition duration-500 ${
                              isRad ? 'object-contain filter brightness-110' : ''
                            }`}
                          />
                          <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow ${
                            isRad ? 'bg-indigo-600 text-white' : isDoc ? 'bg-slate-700 text-white' : 'bg-teal-600 text-white'
                          }`}>
                            {item.displayCategory}
                          </span>
                          {item.tooth_no && (
                            <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900/80 text-teal-300 border border-teal-500/30">
                              T#{item.tooth_no}
                            </span>
                          )}
                        </div>

                        <div className={`p-3 border-t ${isRad ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'}`}>
                          <h4 className={`text-xs font-black truncate ${isRad ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</h4>
                          <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                            <span className="font-bold text-teal-600 truncate max-w-[80px]">{item.patient_name}</span>
                            <span>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMAGE COMPARISON STUDIO */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">Select Patient</label>
                  <select
                    value={comparePatientId}
                    onChange={e => {
                      setComparePatientId(e.target.value);
                      setCompBefore(null);
                      setCompAfter(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={String(p.id)}>[{p.patient_code}] {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">BEFORE Cosmetic Frame</label>
                  <select
                    value={compBefore?.id || ''}
                    disabled={!comparePatientId}
                    onChange={e => {
                      const found = allImages.find(img => img.id === e.target.value);
                      setCompBefore(found || null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    <option value="">-- Select Pre-Op Photo --</option>
                    {allImages
                      .filter(img => String(img.patient_id) === comparePatientId)
                      .map(img => (
                        <option key={img.id} value={img.id}>[{img.category}] {img.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">AFTER Cosmetic Frame</label>
                  <select
                    value={compAfter?.id || ''}
                    disabled={!comparePatientId}
                    onChange={e => {
                      const found = allImages.find(img => img.id === e.target.value);
                      setCompAfter(found || null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    <option value="">-- Select Post-Op Photo --</option>
                    {allImages
                      .filter(img => String(img.patient_id) === comparePatientId)
                      .map(img => (
                        <option key={img.id} value={img.id}>[{img.category}] {img.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {compBefore && compAfter ? (
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between bg-slate-800 p-2.5 px-4 rounded-xl">
                    <span className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={14} className="text-teal-400" />
                      COSMETIC BEFORE/AFTER VIEWER
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setCompZoom(p => Math.min(p + 0.25, 3.5))} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white" title="Zoom In"><ZoomIn size={14} /></button>
                      <button onClick={() => setCompZoom(p => Math.max(p - 0.25, 0.75))} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white" title="Zoom Out"><ZoomOut size={14} /></button>
                      <button onClick={() => setCompRotation(p => (p + 90) % 360)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white" title="Rotate"><RefreshCcw size={14} /></button>
                      <button
                        onClick={() => {
                          setCompZoom(1);
                          setCompRotation(0);
                        }}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white"
                        title="Reset"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-800 rounded-xl bg-black overflow-hidden relative flex flex-col items-center justify-center min-h-[300px]">
                      <span className="absolute top-3 left-3 z-10 bg-amber-600 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded">BEFORE TREATMENT</span>
                      <div
                        style={{
                          transform: `scale(${compZoom}) rotate(${compRotation}deg)`,
                          transition: 'transform 0.15s ease-out'
                        }}
                        className="w-full h-[320px] flex items-center justify-center p-4"
                      >
                        <img src={compBefore.url} alt="Before" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>

                    <div className="border border-slate-800 rounded-xl bg-black overflow-hidden relative flex flex-col items-center justify-center min-h-[300px]">
                      <span className="absolute top-3 left-3 z-10 bg-emerald-600 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded">AFTER TREATMENT</span>
                      <div
                        style={{
                          transform: `scale(${compZoom}) rotate(${compRotation}deg)`,
                          transition: 'transform 0.15s ease-out'
                        }}
                        className="w-full h-[320px] flex items-center justify-center p-4"
                      >
                        <img src={compAfter.url} alt="After" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-slate-200 bg-white rounded-2xl">
                  <Layers size={44} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">Cosmetic Slider Idle</p>
                  <p className="text-xs text-slate-400 mt-1">Please select a Patient, then designate Pre-Op and Post-Op photos to initialize the comparison deck.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HIPAA SECURITY AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="text-indigo-600" size={16} />
                    Secured PACS Audit Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400">HIPAA compliant tracking ledger. Every single upload, download, review, and purge action is signed permanently here.</p>
                </div>

                <div className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                  <ShieldAlert size={12} />
                  <span>CRYPTO-AUDIT ACTIVE</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                      <th className="p-2.5">User</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Action Code</th>
                      <th className="p-2.5">Target Patient</th>
                      <th className="p-2.5">PACS Asset Reference</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => {
                      const isPurge = log.action === 'DELETE';
                      const isView = log.action === 'VIEW';
                      const isDownload = log.action === 'DOWNLOAD';

                      return (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-700">{log.performed_by}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                              {log.role}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isPurge ? 'bg-red-100 text-red-700' : isDownload ? 'bg-indigo-100 text-indigo-700' : isView ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-700">{log.patient_name}</td>
                          <td className="p-2.5 text-slate-500 font-semibold">{log.resource_name}</td>
                          <td className="p-2.5 text-slate-400 font-semibold">
                            {new Date(log.timestamp).toLocaleString('en-IN', { hour12: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-teal-600 text-white">
                    {lightboxItem.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {lightboxItem.patient_name} • {new Date(lightboxItem.date).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-100 mt-1">{lightboxItem.name}</h4>
              </div>

              {/* Action bars */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLightboxZoom(p => Math.min(p + 0.25, 4))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setLightboxZoom(p => Math.max(p - 0.25, 0.75))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setLightboxRotation(p => (p + 90) % 360)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
                  title="Rotate Right"
                >
                  <RefreshCw size={14} />
                </button>

                <div className="w-px h-5 bg-slate-800 mx-1"></div>

                <button
                  onClick={() => triggerDownload(lightboxItem, lightboxItem.type)}
                  className="p-1.5 bg-slate-800 hover:bg-teal-600 rounded text-slate-300 hover:text-white transition"
                  title="Download File"
                >
                  <Download size={14} />
                </button>

                {(currentRole === 'admin' || currentRole === 'doctor') && (
                  <button
                    onClick={() => deleteFileGlobally(lightboxItem.id, lightboxItem.patient_id, lightboxItem.name, lightboxItem.type)}
                    className="p-1.5 bg-slate-800 hover:bg-red-600 rounded text-slate-300 hover:text-white transition"
                    title="Permanently Delete Clinical File"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  onClick={() => setLightboxItem(null)}
                  className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 transition ml-2"
                >
                  <Trash2 size={16} className="rotate-45" /> {/* Close */}
                </button>
              </div>
            </div>

            {/* Viewer Stage */}
            <div className="flex-1 bg-black flex items-center justify-center p-6 overflow-hidden relative min-h-[380px]">
              <div
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[60vh] max-w-full flex items-center justify-center"
              >
                <img
                  src={lightboxItem.url}
                  alt={lightboxItem.name}
                  className="max-h-[58vh] max-w-full object-contain rounded-lg border border-slate-800"
                />
              </div>

              {/* Watermark Banner */}
              {lightboxItem.watermarked && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 select-none">
                  <span className="text-xl font-black tracking-widest text-white border-2 border-dashed border-teal-500 bg-slate-950/90 px-6 py-2.5 rotate-12 uppercase">SRI CHAITANYA PACS PREVIEW SECURE</span>
                </div>
              )}
            </div>

            {/* Footer Notes */}
            {lightboxItem.notes && (
              <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 text-xs">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-1">Clinical Assessment Notes</span>
                <p className="text-slate-400 leading-relaxed font-semibold">{lightboxItem.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
