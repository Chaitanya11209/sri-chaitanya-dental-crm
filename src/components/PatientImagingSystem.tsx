import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Image as ImageIcon, FileText, Activity, Trash2, Download,
  ZoomIn, ZoomOut, Maximize2, Search, ShieldAlert, Sparkles, Layers,
  Lock, Unlock, Clock, Eye, CheckCircle2, ChevronRight, HelpCircle,
  AlertCircle, RefreshCw, RefreshCcw, Check, Info, FileDown
} from 'lucide-react';
import {
  PatientImage, PatientDocument, RadiologyRecord, SecurityAuditLog,
  getPatientImages, addPatientImage, deletePatientImage,
  getPatientDocuments, addPatientDocument, deletePatientDocument,
  getRadiologyRecords, addRadiologyRecord, deleteRadiologyRecord,
  addAuditLog, getStorageStats
} from '../services/imagingDocumentsService';
import { getRole, getCurrentUser } from '../lib/auth';

interface PatientImagingSystemProps {
  patient: {
    id: number;
    name: string;
    phone: string;
    patient_code: string;
  };
  onUpdateMetadataImages?: (newImages: any[]) => Promise<void>;
  existingMetadataImages?: any[];
}

export default function PatientImagingSystem({
  patient,
  onUpdateMetadataImages,
  existingMetadataImages = []
}: PatientImagingSystemProps) {
  const currentRole = getRole();
  const currentUser = getCurrentUser();
  const userEmail = currentUser?.email || 'receptionist@srichaitanya.com';

  // State arrays
  const [images, setImages] = useState<PatientImage[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [radiology, setRadiology] = useState<RadiologyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active subtab
  const [activeSubTab, setActiveSubTab] = useState<'images' | 'radiology' | 'documents' | 'comparison' | 'gallery'>('images');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedTooth, setSelectedTooth] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Security Toggles
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [downloadRestricted, setDownloadRestricted] = useState(false);

  // Upload Modal/Form states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'radiology' | 'document'>('image');
  const [dragActive, setDragActive] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: '',
    notes: '',
    tooth_no: '',
    quadrant: '',
    mouth_view: 'Single Tooth' as 'Entire Mouth' | 'Quadrant' | 'Single Tooth',
    treatment_id: '',
    appointment_id: '',
    tempUrl: '',
    fileSize: 0
  });
  const [uploadError, setUploadError] = useState('');

  // Before / After Comparison state
  const [beforeImage, setBeforeImage] = useState<PatientImage | null>(null);
  const [afterImage, setAfterImage] = useState<PatientImage | null>(null);
  const [compareZoom, setCompareZoom] = useState(1);
  const [compareRotation, setCompareRotation] = useState(0);

  // Lightbox view state
  const [lightboxItem, setLightboxItem] = useState<{
    id: string;
    url: string;
    name: string;
    category: string;
    notes?: string;
    date: string;
    watermarked?: boolean;
    type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY';
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  // Doctors list for mapping
  const DOCTORS_LIST = ['Dr. Durga Bhavani Jupalli'];

  // Load patient specific files
  const loadPatientData = async () => {
    setLoading(true);
    try {
      const fetchedImages = await getPatientImages(patient.id);
      const fetchedDocs = await getPatientDocuments(patient.id);
      const fetchedRads = await getRadiologyRecords(patient.id);

      setImages(fetchedImages);
      setDocuments(fetchedDocs);
      setRadiology(fetchedRads);
    } catch (e) {
      console.error('Failed to load patient imaging documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('File size exceeds the 8MB limit.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadForm(prev => ({
        ...prev,
        tempUrl: reader.result as string,
        name: prev.name || file.name.split('.')[0],
        fileSize: file.size
      }));
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload Form
  const handleUploadSubmit = async () => {
    if (!uploadForm.tempUrl || !uploadForm.name || !uploadForm.category) {
      setUploadError('Please select a file, name, and category.');
      return;
    }

    try {
      if (uploadType === 'image') {
        const payload = {
          patient_id: patient.id,
          patient_name: patient.name,
          url: uploadForm.tempUrl,
          name: uploadForm.name,
          category: uploadForm.category as any,
          notes: uploadForm.notes,
          tooth_no: uploadForm.tooth_no || undefined,
          quadrant: uploadForm.quadrant || undefined,
          mouth_view: uploadForm.mouth_view,
          treatment_id: uploadForm.treatment_id || undefined,
          appointment_id: uploadForm.appointment_id || undefined,
          doctor_name: currentUser?.name || 'Dr. Durga Bhavani Jupalli',
          file_size: uploadForm.fileSize,
          watermarked: watermarkEnabled,
          created_by: userEmail
        };

        const res = await addPatientImage(payload);
        setImages(prev => [res, ...prev]);

        // Integrate with existing patient timeline
        if (onUpdateMetadataImages) {
          const syncImage = {
            id: res.id,
            url: res.url,
            name: res.name,
            category: res.category,
            notes: res.notes,
            date: res.created_at
          };
          await onUpdateMetadataImages([...existingMetadataImages, syncImage]);
        }

      } else if (uploadType === 'radiology') {
        const payload = {
          patient_id: patient.id,
          patient_name: patient.name,
          url: uploadForm.tempUrl,
          name: uploadForm.name,
          scan_type: uploadForm.category as any,
          notes: uploadForm.notes,
          tooth_no: uploadForm.tooth_no || undefined,
          quadrant: uploadForm.quadrant || undefined,
          treatment_id: uploadForm.treatment_id || undefined,
          doctor_name: currentUser?.name || 'Dr. Durga Bhavani Jupalli',
          file_size: uploadForm.fileSize,
          watermarked: watermarkEnabled,
          created_by: userEmail
        };

        const res = await addRadiologyRecord(payload);
        setRadiology(prev => [res, ...prev]);

        // Sync OPG/CT into timeline images too
        if (onUpdateMetadataImages) {
          const syncImage = {
            id: res.id,
            url: res.url,
            name: res.name,
            category: res.scan_type,
            notes: res.notes,
            date: res.created_at
          };
          await onUpdateMetadataImages([...existingMetadataImages, syncImage]);
        }

      } else {
        const payload = {
          patient_id: patient.id,
          patient_name: patient.name,
          url: uploadForm.tempUrl,
          name: uploadForm.name,
          category: uploadForm.category as any,
          notes: uploadForm.notes,
          treatment_id: uploadForm.treatment_id || undefined,
          appointment_id: uploadForm.appointment_id || undefined,
          doctor_name: currentUser?.name || 'Dr. Durga Bhavani Jupalli',
          file_size: uploadForm.fileSize,
          created_by: userEmail
        };

        const res = await addPatientDocument(payload);
        setDocuments(prev => [res, ...prev]);
      }

      // Reset Form
      setUploadForm({
        name: '',
        category: '',
        notes: '',
        tooth_no: '',
        quadrant: '',
        mouth_view: 'Single Tooth',
        treatment_id: '',
        appointment_id: '',
        tempUrl: '',
        fileSize: 0
      });
      setIsUploading(false);
      loadPatientData();
    } catch (e) {
      console.error(e);
      setUploadError('Failed to upload file.');
    }
  };

  // View Lightbox
  const openLightbox = async (item: any, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    setLightboxItem({
      id: item.id,
      url: item.url,
      name: item.name,
      category: item.category || item.scan_type,
      notes: item.notes,
      date: item.created_at,
      watermarked: item.watermarked,
      type
    });
    setLightboxZoom(1);
    setLightboxRotation(0);

    // Audit view log
    await addAuditLog({
      action: 'VIEW',
      resource_type: type,
      resource_id: item.id,
      resource_name: item.name,
      patient_id: patient.id,
      patient_name: patient.name,
      performed_by: userEmail,
      role: currentRole
    });
  };

  // Download File with restriction checks
  const downloadFile = async (item: any, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    if (downloadRestricted && currentRole !== 'admin' && currentRole !== 'doctor') {
      alert('Security Protocol Violation: Downloads are restricted for your role. Contact admin.');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `${patient.name}_${item.name.replace(/\s+/g, '_')}_${type.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Audit download log
      await addAuditLog({
        action: 'DOWNLOAD',
        resource_type: type,
        resource_id: item.id,
        resource_name: item.name,
        patient_id: patient.id,
        patient_name: patient.name,
        performed_by: userEmail,
        role: currentRole
      });
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  // Delete File
  const deleteFile = async (id: string, type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY') => {
    if (currentRole !== 'admin' && currentRole !== 'doctor') {
      alert('Access Denied: Only Doctors or Administrators can permanently delete clinical data.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this clinical record? This action will write to the security audit logs.')) {
      return;
    }

    try {
      if (type === 'IMAGE') {
        await deletePatientImage(id, userEmail);
        setImages(prev => prev.filter(img => img.id !== id));
        if (onUpdateMetadataImages) {
          await onUpdateMetadataImages(existingMetadataImages.filter(img => img.id !== id));
        }
      } else if (type === 'RADIOLOGY') {
        await deleteRadiologyRecord(id, userEmail);
        setRadiology(prev => prev.filter(rad => rad.id !== id));
        if (onUpdateMetadataImages) {
          await onUpdateMetadataImages(existingMetadataImages.filter(img => img.id !== id));
        }
      } else {
        await deletePatientDocument(id, userEmail);
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      }

      setLightboxItem(null);
      loadPatientData();
    } catch (e) {
      console.error(e);
      alert('Deletion failed.');
    }
  };

  // Filters application
  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (img.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTooth = selectedTooth === 'all' || img.tooth_no === selectedTooth;
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    return matchesSearch && matchesTooth && matchesCategory;
  });

  const filteredRadiology = radiology.filter(rad => {
    const matchesSearch = rad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (rad.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTooth = selectedTooth === 'all' || rad.tooth_no === selectedTooth;
    const matchesCategory = selectedCategory === 'all' || rad.scan_type === selectedCategory;
    return matchesSearch && matchesTooth && matchesCategory;
  });

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      {/* PACS & Imaging Header */}
      <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-teal-600" size={20} />
            <span className="text-xs font-black bg-teal-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">PACS SECURE</span>
            <span className="text-[10px] text-teal-600 font-bold bg-teal-100/60 px-2 py-0.5 rounded-md">V1.3 DIGITAL CARRIER</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800 mt-1.5 uppercase tracking-tight">Digital Imaging & PACS Portal</h3>
          <p className="text-xs text-slate-500">
            Centralized radiograph scans, full-mouth OPGs, clinical gallery, and diagnostic consent forms for <strong className="text-teal-700">{patient.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Security Banner control */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 shadow-sm">
            <Lock size={12} className="text-teal-600" />
            <span>Watermark:</span>
            <button
              onClick={() => setWatermarkEnabled(!watermarkEnabled)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-black transition ${watermarkEnabled ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {watermarkEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 shadow-sm">
            <ShieldAlert size={12} className="text-indigo-600" />
            <span>Restrictions:</span>
            <button
              onClick={() => setDownloadRestricted(!downloadRestricted)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-black transition ${downloadRestricted ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {downloadRestricted ? 'RESTRICTED' : 'OPEN'}
            </button>
          </div>

          <button
            onClick={() => {
              setUploadType('image');
              setIsUploading(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <UploadCloud size={14} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Grid Subtabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'images', label: 'Clinical Photos', icon: ImageIcon, count: images.length },
            { id: 'radiology', label: 'Radiology / PACS', icon: Activity, count: radiology.length },
            { id: 'documents', label: 'Documents / PDFs', icon: FileText, count: documents.length },
            { id: 'comparison', label: 'Before & After Slider', icon: Layers, count: null },
            { id: 'gallery', label: 'Central Gallery Filters', icon: Sparkles, count: null }
          ].map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-lg transition border-b-2 -mb-[5px] ${
                  isActive
                    ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={14} className={isActive ? 'text-teal-600' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Filter Bar */}
      {activeSubTab !== 'comparison' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by diagnosis or filename..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <select
              value={selectedTooth}
              onChange={e => setSelectedTooth(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
            >
              <option value="all">🦷 All Tooth Codes</option>
              {Array.from({ length: 32 }, (_, i) => i + 1).map(num => (
                <option key={num} value={String(num)}>Tooth #{num}</option>
              ))}
              <option value="UR">Quadrant UR (Upper Right)</option>
              <option value="UL">Quadrant UL (Upper Left)</option>
              <option value="LL">Quadrant LL (Lower Left)</option>
              <option value="LR">Quadrant LR (Lower Right)</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
            >
              <option value="all">📁 All Categories / Scans</option>
              {activeSubTab === 'images' && (
                <>
                  <option value="Before Treatment">Before Treatment</option>
                  <option value="After Treatment">After Treatment</option>
                  <option value="Smile Photo">Smile Photo</option>
                  <option value="Intra Oral Photo">Intra Oral Photo</option>
                  <option value="Extra Oral Photo">Extra Oral Photo</option>
                  <option value="Treatment Progress Photo">Treatment Progress</option>
                </>
              )}
              {activeSubTab === 'radiology' && (
                <>
                  <option value="IOPA">IOPA Scan</option>
                  <option value="RVG">RVG Digital</option>
                  <option value="OPG">OPG Full Panoramic</option>
                  <option value="CBCT">CBCT 3D Maxilla</option>
                  <option value="Lateral Ceph">Lateral Ceph</option>
                  <option value="PA Skull">PA Skull</option>
                </>
              )}
              {activeSubTab === 'documents' && (
                <>
                  <option value="Consent Form">Consent Form</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Receipt">Receipt</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Case Sheet">Case Sheet</option>
                  <option value="Referral Letter">Referral Letter</option>
                  <option value="Insurance Document">Insurance Document</option>
                  <option value="Medical Report">Medical Report</option>
                </>
              )}
            </select>
          </div>
        </div>
      )}

      {/* Subtab Contents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <RefreshCw className="animate-spin mb-2 text-teal-600" size={24} />
          <p className="text-xs font-bold uppercase tracking-wider">Synchronizing Pacs PACS storage...</p>
        </div>
      ) : (
        <>
          {/* Subtab 1: Images */}
          {activeSubTab === 'images' && (
            filteredImages.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">No clinical photos match the current selection.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use "Upload File" above to attach clinical photographs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredImages.map(img => (
                  <div
                    key={img.id}
                    onClick={() => openLightbox(img, 'IMAGE')}
                    className="group bg-white rounded-xl border border-slate-150 overflow-hidden cursor-pointer hover:shadow-lg hover:border-teal-300 transition-all duration-300 relative"
                  >
                    <div className="aspect-square bg-slate-50 relative overflow-hidden">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {img.watermarked && watermarkEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none select-none">
                          <span className="text-[10px] font-black tracking-widest text-slate-700 bg-white/80 px-2 py-1 rotate-12 border border-slate-300 uppercase">SRI CHAITANYA PACS</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <Eye size={12} /> Preview File
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-teal-600 text-white shadow">
                        {img.category}
                      </span>
                      {img.tooth_no && (
                        <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900/80 text-teal-300 border border-teal-500/30">
                          T#{img.tooth_no}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-extrabold text-slate-700 truncate">{img.name}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {new Date(img.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Subtab 2: Radiology */}
          {activeSubTab === 'radiology' && (
            filteredRadiology.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">No radiographic OPG scans match current filters.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Upload File" to attach IOPA, CBCT, or RVG scan assets.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredRadiology.map(rad => (
                  <div
                    key={rad.id}
                    onClick={() => openLightbox(rad, 'RADIOLOGY')}
                    className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg hover:border-teal-400 transition-all duration-300 relative"
                  >
                    <div className="aspect-square bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
                      <img src={rad.url} alt={rad.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                      {rad.watermarked && watermarkEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none select-none">
                          <span className="text-[9px] font-black tracking-widest text-white border border-teal-500 bg-slate-950/80 px-2 py-1 uppercase rotate-12">SRI CHAITANYA PACS</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
                          <Eye size={12} /> View Radiograph
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white shadow">
                        {rad.scan_type}
                      </span>
                      {rad.tooth_no && (
                        <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500 text-slate-950 border border-teal-200">
                          T#{rad.tooth_no}
                        </span>
                      )}
                    </div>
                    <div className="p-3 bg-slate-950 border-t border-slate-800">
                      <h4 className="text-xs font-extrabold text-slate-300 truncate">{rad.name}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {new Date(rad.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Subtab 3: Documents */}
          {activeSubTab === 'documents' && (
            filteredDocs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">No regulatory clinical documents found.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Attach Consent Forms, invoices, prescriptions, or referrals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => openLightbox(doc, 'DOCUMENT')}
                    className="group bg-white rounded-xl border border-slate-150 overflow-hidden cursor-pointer hover:shadow-lg hover:border-teal-300 transition-all duration-300 relative"
                  >
                    <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center p-4 border-b border-slate-100">
                      <img src={doc.url} alt={doc.name} className="w-full h-full object-contain filter group-hover:brightness-95 transition" />
                      <div className="absolute inset-0 bg-slate-950/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-[10px] font-black bg-white/90 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow uppercase tracking-wide flex items-center gap-1">
                          <Eye size={12} /> Open Document
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-white shadow">
                        {doc.category}
                      </span>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</h4>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={10} />{new Date(doc.created_at).toLocaleDateString('en-IN')}</span>
                        <span className="font-semibold text-slate-500">{(doc.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Subtab 4: Before/After Comparison */}
          {activeSubTab === 'comparison' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image A Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">Select BEFORE Image</label>
                  <select
                    value={beforeImage?.id || ''}
                    onChange={e => {
                      const found = images.find(img => img.id === e.target.value);
                      setBeforeImage(found || null);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="">-- Choose Clinical Photo --</option>
                    {images.map(img => (
                      <option key={img.id} value={img.id}>[{img.category}] {img.name}</option>
                    ))}
                  </select>
                </div>

                {/* Image B Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">Select AFTER Image</label>
                  <select
                    value={afterImage?.id || ''}
                    onChange={e => {
                      const found = images.find(img => img.id === e.target.value);
                      setAfterImage(found || null);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value="">-- Choose Clinical Photo --</option>
                    {images.map(img => (
                      <option key={img.id} value={img.id}>[{img.category}] {img.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slider View Area */}
              {beforeImage && afterImage ? (
                <div className="border border-slate-200 bg-slate-900 rounded-2xl overflow-hidden p-6 space-y-4">
                  <div className="flex items-center justify-between bg-slate-800 p-2 px-4 rounded-xl">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-teal-400" />
                      Side-By-Side Interactive Comparer
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCompareZoom(prev => Math.min(prev + 0.25, 3))}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition"
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        onClick={() => setCompareZoom(prev => Math.max(prev - 0.25, 0.75))}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition"
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <button
                        onClick={() => setCompareRotation(prev => (prev + 90) % 360)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition"
                        title="Rotate 90°"
                      >
                        <RefreshCcw size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setCompareZoom(1);
                          setCompareRotation(0);
                        }}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition"
                        title="Reset"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Before frame */}
                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-black relative flex flex-col items-center justify-center min-h-[300px]">
                      <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-amber-600 text-white text-[10px] font-black tracking-widest uppercase">BEFORE</span>
                      <div
                        style={{
                          transform: `scale(${compareZoom}) rotate(${compareRotation}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="w-full h-[320px] overflow-hidden flex items-center justify-center p-2"
                      >
                        <img src={beforeImage.url} alt="Before" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center border-t border-slate-800">
                        <p className="text-xs text-slate-300 font-bold truncate">{beforeImage.name}</p>
                        <p className="text-[10px] text-slate-500">Linked to Tooth {beforeImage.tooth_no || 'None'}</p>
                      </div>
                    </div>

                    {/* After frame */}
                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-black relative flex flex-col items-center justify-center min-h-[300px]">
                      <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-emerald-600 text-white text-[10px] font-black tracking-widest uppercase">AFTER</span>
                      <div
                        style={{
                          transform: `scale(${compareZoom}) rotate(${compareRotation}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="w-full h-[320px] overflow-hidden flex items-center justify-center p-2"
                      >
                        <img src={afterImage.url} alt="After" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center border-t border-slate-800">
                        <p className="text-xs text-slate-300 font-bold truncate">{afterImage.name}</p>
                        <p className="text-[10px] text-slate-500">Linked to Tooth {afterImage.tooth_no || 'None'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                  <Layers size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600">Comparison Engine Standby</p>
                  <p className="text-xs text-slate-400 mt-1">Please select both a BEFORE photo and an AFTER photo from the dropdown selectors to load side-by-side diagnostic comparisons.</p>
                </div>
              )}
            </div>
          )}

          {/* Subtab 5: Gallery Search Filters */}
          {activeSubTab === 'gallery' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Unified PACS & Imaging Database</h4>
                  <p className="text-[11px] text-slate-500">Full clinical repository for {patient.name} including OPGs, RVGs, consent approvals, and invoices.</p>
                </div>
                <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
                  Total Attachments: {images.length + documents.length + radiology.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Photos */}
                <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-600"><ImageIcon size={18} /></div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Clinical Photos</h5>
                    <p className="text-lg font-black text-slate-700">{images.length}</p>
                    <p className="text-[9px] text-slate-400">Before / After, smile views</p>
                  </div>
                </div>

                {/* Card 2: PACS scans */}
                <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity size={18} /></div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Radiographic Scans</h5>
                    <p className="text-lg font-black text-slate-700">{radiology.length}</p>
                    <p className="text-[9px] text-slate-400">OPG, CBCT, IOPA digital X-Rays</p>
                  </div>
                </div>

                {/* Card 3: Documents */}
                <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-600"><FileText size={18} /></div>
                  <div>
                    <h5 className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Documents Attached</h5>
                    <p className="text-lg font-black text-slate-700">{documents.length}</p>
                    <p className="text-[9px] text-slate-400">Invoices, consent sheets, rx</p>
                  </div>
                </div>
              </div>

              {/* Combined Grid of everything */}
              <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Consolidated File Inventory</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] tracking-wider border-b border-slate-200 font-extrabold">
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Linked Tooth</th>
                        <th className="p-2.5">Uploaded On</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...images.map(x => ({ ...x, fileType: 'IMAGE', displayCat: x.category })),
                        ...radiology.map(x => ({ ...x, fileType: 'RADIOLOGY', displayCat: x.scan_type })),
                        ...documents.map(x => ({ ...x, fileType: 'DOCUMENT', displayCat: x.category }))
                      ].map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-700 max-w-[180px] truncate">{item.name}</td>
                          <td className="p-2.5 text-slate-500 font-semibold">{item.displayCat}</td>
                          <td className="p-2.5 text-slate-500 font-bold">{item.tooth_no ? `Tooth ${item.tooth_no}` : '-'}</td>
                          <td className="p-2.5 text-slate-400 font-semibold">{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="p-2.5 text-slate-500 font-bold">{((item.file_size || 0) / 1024).toFixed(1)} KB</td>
                          <td className="p-2.5 text-right space-x-1.5">
                            <button
                              onClick={() => openLightbox(item, item.fileType as any)}
                              className="text-teal-600 hover:text-teal-700 font-bold"
                            >
                              View
                            </button>
                            <button
                              onClick={() => downloadFile(item, item.fileType as any)}
                              className="text-indigo-600 hover:text-indigo-700 font-bold"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload File Panel / Dialog */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="text-teal-600" size={16} />
                <span>Upload Clinical Asset</span>
              </h4>
              <button onClick={() => setIsUploading(false)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                <Trash2 size={14} className="rotate-45" /> {/* Close button replacement or just raw text */}
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Selector Type */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1.5">Asset Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image', label: 'Clinical Photo', icon: ImageIcon },
                    { id: 'radiology', label: 'OPG / PACS Scan', icon: Activity },
                    { id: 'document', label: 'Document PDF', icon: FileText }
                  ].map(item => {
                    const active = uploadType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setUploadType(item.id as any);
                          setUploadForm(prev => ({ ...prev, category: '' })); // clear category on flip
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon size={16} className={active ? 'text-teal-600' : 'text-slate-400'} />
                        <span className="text-[10px] mt-1.5 leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid forms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1">Asset Name *</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. OPG Full Mouth Scan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1">Category *</label>
                  <select
                    value={uploadForm.category}
                    onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="">-- Choose Category --</option>
                    {uploadType === 'image' && (
                      <>
                        <option value="Clinical Photo">Clinical Photo</option>
                        <option value="Before Treatment">Before Treatment (Pre-Op)</option>
                        <option value="After Treatment">After Treatment (Post-Op)</option>
                        <option value="Smile Photo">Smile Photo</option>
                        <option value="Intra Oral Photo">Intra Oral Photo</option>
                        <option value="Extra Oral Photo">Extra Oral Photo</option>
                        <option value="Treatment Progress Photo">Treatment Progress Photo</option>
                      </>
                    )}
                    {uploadType === 'radiology' && (
                      <>
                        <option value="IOPA">IOPA Scan (Single Tooth)</option>
                        <option value="RVG">RVG Digital X-Ray</option>
                        <option value="OPG">OPG Panoramic Scan</option>
                        <option value="CBCT">CBCT Maxilla 3D Reconstruction</option>
                        <option value="Lateral Ceph">Lateral Cephalometric Scan</option>
                        <option value="PA Skull">PA Skull Scan</option>
                        <option value="Other Scans">Other Radiographs</option>
                      </>
                    )}
                    {uploadType === 'document' && (
                      <>
                        <option value="Consent Form">Dental Treatment Consent Form</option>
                        <option value="Invoice">Invoice / Quotation</option>
                        <option value="Receipt">Financial Receipt</option>
                        <option value="Prescription">Doctors Prescription</option>
                        <option value="Case Sheet">Clinical Case Sheet</option>
                        <option value="Referral Letter">Referral Letter</option>
                        <option value="Insurance Document">Insurance Pre-Auth / Claim</option>
                        <option value="Medical Report">General Medical Report</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Tooth Mapping & Quadrant (Only if Image or Radiology) */}
              {(uploadType === 'image' || uploadType === 'radiology') && (
                <div className="border border-slate-100 p-3 bg-slate-50/60 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Activity size={12} className="text-teal-600" />
                    Tooth Mapping & Localization
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Tooth Number (1 - 32)</label>
                      <input
                        type="text"
                        value={uploadForm.tooth_no}
                        onChange={e => setUploadForm(p => ({ ...p, tooth_no: e.target.value }))}
                        placeholder="e.g. 16, 24"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Quadrant Mapping</label>
                      <select
                        value={uploadForm.quadrant}
                        onChange={e => setUploadForm(p => ({ ...p, quadrant: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600"
                      >
                        <option value="">-- Quad --</option>
                        <option value="UR">UR (Upper Right)</option>
                        <option value="UL">UL (Upper Left)</option>
                        <option value="LL">LL (Lower Left)</option>
                        <option value="LR">LR (Lower Right)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1">Clinical Remarks / Remarks</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Apex visible on tooth #16 showing secondary infection."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 h-16 resize-none"
                />
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                  dragActive ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                }`}
              >
                <UploadCloud size={24} className="text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-600">Drag & drop clinical file here</p>
                <p className="text-[10px] text-slate-400 mt-1">or click to browse your workspace storage (Max 8MB)</p>
                <input
                  type="file"
                  accept={uploadType === 'document' ? 'image/*,application/pdf' : 'image/*'}
                  onChange={handleFileInput}
                  className="hidden"
                  id="clinical-file-selector"
                />
                <label htmlFor="clinical-file-selector" className="mt-3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black text-teal-600 shadow-xs cursor-pointer hover:bg-slate-50 transition">
                  Browse Files
                </label>

                {uploadForm.tempUrl && (
                  <div className="mt-4 flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg w-full max-w-[280px]">
                    <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden border">
                      <img src={uploadForm.tempUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate">{uploadForm.name || 'Image Preview'}</p>
                      <p className="text-[9px] text-slate-400">Ready to commit</p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {uploadError}
                </p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!uploadForm.tempUrl}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Commit Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / PACS Viewer Modal with zoom, watermark and security */}
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
                    {new Date(lightboxItem.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                  onClick={() => downloadFile(lightboxItem, lightboxItem.type)}
                  className="p-1.5 bg-slate-800 hover:bg-teal-600 rounded text-slate-300 hover:text-white transition"
                  title="Download File"
                >
                  <Download size={14} />
                </button>

                {(currentRole === 'admin' || currentRole === 'doctor') && (
                  <button
                    onClick={() => deleteFile(lightboxItem.id, lightboxItem.type)}
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
              {lightboxItem.watermarked && watermarkEnabled && (
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
