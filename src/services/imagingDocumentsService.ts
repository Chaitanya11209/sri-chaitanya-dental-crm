import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface StorageStats {
  used_bytes: number;
  images_count: number;
  documents_count: number;
  radiology_count: number;
  limit_bytes: number;
}

export interface PatientImage {
  id: string;
  patient_id: number;
  patient_name?: string;
  url: string;
  name: string;
  category: 'Clinical Photo' | 'Before Treatment' | 'After Treatment' | 'Smile Photo' | 'Intra Oral Photo' | 'Extra Oral Photo' | 'Treatment Progress Photo';
  notes?: string;
  tooth_no?: string;
  quadrant?: string;
  mouth_view?: 'Entire Mouth' | 'Quadrant' | 'Single Tooth';
  treatment_id?: string;
  appointment_id?: string;
  doctor_name?: string;
  file_size: number; // in bytes
  watermarked?: boolean;
  created_at: string;
  created_by?: string;
}

export interface PatientDocument {
  id: string;
  patient_id: number;
  patient_name?: string;
  url: string;
  name: string;
  category: 'Consent Form' | 'Invoice' | 'Receipt' | 'Prescription' | 'Case Sheet' | 'Referral Letter' | 'Insurance Document' | 'Medical Report';
  notes?: string;
  treatment_id?: string;
  appointment_id?: string;
  doctor_name?: string;
  file_size: number; // in bytes
  created_at: string;
  created_by?: string;
}

export interface RadiologyRecord {
  id: string;
  patient_id: number;
  patient_name?: string;
  url: string;
  name: string;
  scan_type: 'IOPA' | 'RVG' | 'OPG' | 'CBCT' | 'Lateral Ceph' | 'PA Skull' | 'Other Scans';
  notes?: string;
  tooth_no?: string;
  quadrant?: string;
  treatment_id?: string;
  doctor_name?: string;
  file_size: number; // in bytes
  watermarked?: boolean;
  created_at: string;
  created_by?: string;
}

export interface SecurityAuditLog {
  id: string;
  action: 'VIEW' | 'DOWNLOAD' | 'DELETE' | 'UPLOAD' | 'WATERMARK_TOGGLE';
  resource_type: 'IMAGE' | 'DOCUMENT' | 'RADIOLOGY';
  resource_id: string;
  resource_name: string;
  patient_id: number;
  patient_name: string;
  performed_by: string;
  role: string;
  ip_address?: string;
  timestamp: string;
}

// Inline SVGs to represent clinical imaging and documents without external network dependencies
const createSvgThumbnail = (type: 'before' | 'after' | 'iopa' | 'opg' | 'cbct' | 'consent' | 'invoice' | 'prescription' | 'report') => {
  let svgContent = '';
  if (type === 'before') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f8fafc"/><path d="M120 220 Q200 120 280 220" fill="none" stroke="#e2e8f0" stroke-width="8"/><rect x="180" y="160" width="40" height="50" rx="4" fill="#fbbf24" stroke="#d97706" stroke-width="3"/><path d="M190 175 Q200 185 210 175" stroke="#78350f" stroke-width="2" fill="none"/><circle cx="190" cy="190" r="4" fill="#dc2626"/><circle cx="210" cy="192" r="3" fill="#dc2626"/><text x="20" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748b">BEFORE TREATMENT: DECAY VIEW</text></svg>`;
  } else if (type === 'after') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f8fafc"/><path d="M120 220 Q200 120 280 220" fill="none" stroke="#e2e8f0" stroke-width="8"/><rect x="180" y="150" width="40" height="60" rx="6" fill="#f8fafc" stroke="#3b82f6" stroke-width="4"/><rect x="180" y="145" width="40" height="15" rx="2" fill="#3b82f6"/><path d="M190 175 Q200 165 210 175" stroke="#3b82f6" stroke-width="2" fill="none"/><text x="20" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="#059669">AFTER TREATMENT: PREMIUM CROWN</text></svg>`;
  } else if (type === 'iopa') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#1e293b"/><path d="M120 240 Q200 80 280 240" fill="none" stroke="#64748b" stroke-width="12" stroke-dasharray="4 4"/><path d="M180 230 Q200 130 220 230" fill="none" stroke="#cbd5e1" stroke-width="14"/><path d="M195 230 L195 280 M205 230 L205 280" stroke="#94a3b8" stroke-width="6"/><circle cx="200" cy="160" r="12" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3"/><text x="20" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="#94a3b8">IOPA X-RAY: APICAL INFECTED APEX</text></svg>`;
  } else if (type === 'opg') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#0f172a"/><path d="M60 180 Q200 280 340 180" fill="none" stroke="#475569" stroke-width="16"/><path d="M80 160 Q200 240 320 160" fill="none" stroke="#334155" stroke-width="8"/><rect x="140" y="160" width="16" height="30" rx="3" fill="#cbd5e1" opacity="0.8"/><rect x="165" y="170" width="16" height="30" rx="3" fill="#cbd5e1" opacity="0.8"/><rect x="190" y="172" width="16" height="30" rx="3" fill="#cbd5e1" opacity="0.8"/><rect x="215" y="170" width="16" height="30" rx="3" fill="#64748b" stroke="#ef4444" stroke-width="2"/><rect x="240" y="160" width="16" height="30" rx="3" fill="#cbd5e1" opacity="0.8"/><text x="20" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748b">PANORAMIC OPG FULL MOUTH SCAN</text></svg>`;
  } else if (type === 'cbct') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#090d16"/><circle cx="200" cy="150" r="80" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="200" cy="150" r="110" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="5 5"/><path d="M140 150 A60 60 0 0 0 260 150" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/><circle cx="200" cy="150" r="6" fill="#38bdf8"/><line x1="200" y1="50" x2="200" y2="250" stroke="#0284c7" stroke-width="1" stroke-dasharray="2 2"/><line x1="100" y1="150" x2="300" y2="150" stroke="#0284c7" stroke-width="1" stroke-dasharray="2 2"/><text x="20" y="40" font-family="sans-serif" font-size="12" font-weight="bold" fill="#38bdf8">CBCT 3D RECONSTRUCTION</text></svg>`;
  } else if (type === 'consent') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><rect x="40" y="30" width="320" height="240" rx="4" fill="#ffffff" stroke="#e2e8f0"/><line x1="60" y1="60" x2="160" y2="60" stroke="#475569" stroke-width="6"/><line x1="60" y1="90" x2="340" y2="90" stroke="#94a3b8" stroke-width="2"/><line x1="60" y1="110" x2="340" y2="110" stroke="#94a3b8" stroke-width="2"/><line x1="60" y1="130" x2="300" y2="130" stroke="#94a3b8" stroke-width="2"/><line x1="60" y1="150" x2="340" y2="150" stroke="#94a3b8" stroke-width="2"/><rect x="60" y="190" width="100" height="40" rx="3" fill="#f1f5f9" stroke="#cbd5e1"/><text x="65" y="214" font-family="sans-serif" font-size="10" fill="#64748b" font-weight="bold">SIGNED COMPLIANT</text><circle cx="310" cy="210" r="25" fill="none" stroke="#10b981" stroke-width="2"/><text x="295" y="214" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">PASSED</text></svg>`;
  } else if (type === 'invoice') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f8fafc"/><rect x="30" y="20" width="340" height="260" rx="6" fill="#ffffff" stroke="#e2e8f0"/><line x1="50" y1="50" x2="180" y2="50" stroke="#0f172a" stroke-width="6"/><circle cx="330" cy="50" r="15" fill="#fef08a"/><line x1="50" y1="100" x2="350" y2="100" stroke="#cbd5e1" stroke-width="2"/><line x1="50" y1="130" x2="250" y2="130" stroke="#64748b" stroke-width="3"/><line x1="300" y1="130" x2="350" y2="130" stroke="#0f172a" stroke-width="4"/><line x1="50" y1="160" x2="250" y2="160" stroke="#64748b" stroke-width="3"/><line x1="300" y1="160" x2="350" y2="160" stroke="#0f172a" stroke-width="4"/><line x1="50" y1="210" x2="350" y2="210" stroke="#e2e8f0" stroke-width="1"/><line x1="300" y1="240" x2="350" y2="240" stroke="#10b981" stroke-width="5"/><text x="50" y="245" font-family="sans-serif" font-size="12" font-weight="bold" fill="#10b981">PAID - INVOICE SECURE</text></svg>`;
  } else if (type === 'prescription') {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f8fafc"/><path d="M40 30 L65 30 M52 18 L52 42" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/><line x1="85" y1="30" x2="220" y2="30" stroke="#1e293b" stroke-width="5"/><line x1="40" y1="80" x2="360" y2="80" stroke="#cbd5e1" stroke-width="1"/><line x1="40" y1="110" x2="300" y2="110" stroke="#475569" stroke-width="3"/><line x1="60" y1="130" x2="360" y2="130" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3"/><line x1="40" y1="160" x2="280" y2="160" stroke="#475569" stroke-width="3"/><line x1="60" y1="180" x2="360" y2="180" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3"/><text x="40" y="240" font-family="sans-serif" font-size="11" font-weight="bold" fill="#94a3b8">SRI CHAITANYA CLINICAL RX</text></svg>`;
  } else {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><rect width="400" height="300" fill="#f1f5f9"/><rect x="40" y="30" width="320" height="240" rx="4" fill="#ffffff" stroke="#cbd5e1"/><line x1="60" y1="60" x2="200" y2="60" stroke="#0284c7" stroke-width="6"/><line x1="60" y1="100" x2="340" y2="100" stroke="#64748b" stroke-width="2"/><line x1="60" y1="130" x2="340" y2="130" stroke="#64748b" stroke-width="2"/><line x1="60" y1="160" x2="300" y2="160" stroke="#64748b" stroke-width="2"/><circle cx="300" cy="220" r="20" fill="#0284c7" opacity="0.2"/><text x="60" y="230" font-family="sans-serif" font-size="10" font-weight="bold" fill="#0284c7">CLINICAL DIAGNOSIS REPORT</text></svg>`;
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgContent);
};

// Seed Mock Data
export const initImagingLocalStorage = () => {
  if (typeof window === 'undefined') return;

  const imagesKey = 'patient_images_v1';
  const docsKey = 'patient_documents_v1';
  const radiologyKey = 'radiology_records_v1';
  const logsKey = 'security_audit_logs_v1';

  if (!localStorage.getItem(imagesKey)) {
    const mockImages: PatientImage[] = [
      {
        id: 'img-1',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        url: createSvgThumbnail('before'),
        name: 'Pre-op Decay Cavity Tooth #16',
        category: 'Before Treatment',
        notes: 'Deep distal-occlusal decay detected on physical exam. Highly sensitive to cold tests.',
        tooth_no: '16',
        quadrant: 'UR',
        mouth_view: 'Single Tooth',
        treatment_id: 'treat-101',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 15420,
        watermarked: false,
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      },
      {
        id: 'img-2',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        url: createSvgThumbnail('after'),
        name: 'Post-op Zirconia Restoration Tooth #16',
        category: 'After Treatment',
        notes: 'Completed root canal treatment and secure crown placement. Shade A2 selected.',
        tooth_no: '16',
        quadrant: 'UR',
        mouth_view: 'Single Tooth',
        treatment_id: 'treat-101',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 16800,
        watermarked: true,
        created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      },
      {
        id: 'img-3',
        patient_id: 2,
        patient_name: 'Dinesh Karthik',
        url: createSvgThumbnail('before'),
        name: 'Smile View Pre-Aligners',
        category: 'Smile Photo',
        notes: 'Slight anterior crowding in upper and lower arch.',
        mouth_view: 'Entire Mouth',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 14200,
        watermarked: false,
        created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      }
    ];
    localStorage.setItem(imagesKey, JSON.stringify(mockImages));
  }

  if (!localStorage.getItem(docsKey)) {
    const mockDocs: PatientDocument[] = [
      {
        id: 'doc-1',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        url: createSvgThumbnail('consent'),
        name: 'Root Canal Consent Form',
        category: 'Consent Form',
        notes: 'Signed and approved by patient after extensive cost & benefit presentation.',
        treatment_id: 'treat-101',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 42100,
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        created_by: 'receptionist@srichaitanya.com'
      },
      {
        id: 'doc-2',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        url: createSvgThumbnail('invoice'),
        name: 'RCT & Crown Advance Invoice',
        category: 'Invoice',
        notes: 'Paid 15,000 INR advance via UPI GPay.',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 38400,
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        created_by: 'receptionist@srichaitanya.com'
      },
      {
        id: 'doc-3',
        patient_id: 2,
        patient_name: 'Dinesh Karthik',
        url: createSvgThumbnail('prescription'),
        name: 'Antibiotics & Pain Reliever Rx',
        category: 'Prescription',
        notes: 'Amoxicillin 500mg (3 days) + Zerodol-SP (as needed).',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 28900,
        created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      }
    ];
    localStorage.setItem(docsKey, JSON.stringify(mockDocs));
  }

  if (!localStorage.getItem(radiologyKey)) {
    const mockRadiology: RadiologyRecord[] = [
      {
        id: 'rad-1',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        url: createSvgThumbnail('iopa'),
        name: 'Tooth #16 Digital IOPA X-Ray',
        scan_type: 'IOPA',
        notes: 'Apex of distal root shows slight periapical radiolucency. Confirms pulpitis.',
        tooth_no: '16',
        quadrant: 'UR',
        treatment_id: 'treat-101',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 24500,
        watermarked: false,
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      },
      {
        id: 'rad-2',
        patient_id: 2,
        patient_name: 'Dinesh Karthik',
        url: createSvgThumbnail('opg'),
        name: 'OPG Panoramic Scan',
        scan_type: 'OPG',
        notes: 'Impacted lower right third molar visible. Interproximal caries noted on #37.',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 145000,
        watermarked: true,
        created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      },
      {
        id: 'rad-3',
        patient_id: 3,
        patient_name: 'Anjali Devi',
        url: createSvgThumbnail('cbct'),
        name: 'CBCT Upper Maxilla 3D',
        scan_type: 'CBCT',
        notes: 'Determining bone density for implant planning on tooth #11.',
        doctor_name: 'Dr. Durga Bhavani Jupalli',
        file_size: 2540000,
        watermarked: true,
        created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
        created_by: 'doctor@srichaitanya.com'
      }
    ];
    localStorage.setItem(radiologyKey, JSON.stringify(mockRadiology));
  }

  if (!localStorage.getItem(logsKey)) {
    const mockLogs: SecurityAuditLog[] = [
      {
        id: 'log-1',
        action: 'UPLOAD',
        resource_type: 'IMAGE',
        resource_id: 'img-1',
        resource_name: 'Pre-op Decay Cavity Tooth #16',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        performed_by: 'doctor@srichaitanya.com',
        role: 'doctor',
        timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'log-2',
        action: 'VIEW',
        resource_type: 'RADIOLOGY',
        resource_id: 'rad-1',
        resource_name: 'Tooth #16 Digital IOPA X-Ray',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        performed_by: 'doctor@srichaitanya.com',
        role: 'doctor',
        timestamp: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'log-3',
        action: 'DOWNLOAD',
        resource_type: 'DOCUMENT',
        resource_id: 'doc-2',
        resource_name: 'RCT & Crown Advance Invoice',
        patient_id: 1,
        patient_name: 'Satish Kumar',
        performed_by: 'receptionist@srichaitanya.com',
        role: 'receptionist',
        timestamp: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
      }
    ];
    localStorage.setItem(logsKey, JSON.stringify(mockLogs));
  }
};

// Database wrapper helpers
const localGet = (key: string): any[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const localSave = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// EXPORTED CRUD OPERATIONS

// --- IMAGES ---
export const getPatientImages = async (patientId?: number): Promise<PatientImage[]> => {
  initImagingLocalStorage();
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('patient_images').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as PatientImage[];
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase read failed, falling back to LocalStorage:', e);
    }
  }
  const images = localGet('patient_images_v1');
  if (patientId) {
    return images.filter(img => img.patient_id === Number(patientId));
  }
  return images;
};

export const addPatientImage = async (image: Omit<PatientImage, 'id' | 'created_at'>): Promise<PatientImage> => {
  initImagingLocalStorage();
  const newImage: PatientImage = {
    ...image,
    id: `img-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('patient_images').insert([newImage]).select('*');
      if (!error && data?.[0]) {
        await addAuditLog({
          action: 'UPLOAD',
          resource_type: 'IMAGE',
          resource_id: data[0].id,
          resource_name: data[0].name,
          patient_id: data[0].patient_id,
          patient_name: data[0].patient_name || 'Patient',
          performed_by: image.created_by || 'system',
          role: 'doctor'
        });
        return data[0] as PatientImage;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase write failed, writing to LocalStorage:', e);
    }
  }

  const images = localGet('patient_images_v1');
  images.push(newImage);
  localSave('patient_images_v1', images);

  await addAuditLog({
    action: 'UPLOAD',
    resource_type: 'IMAGE',
    resource_id: newImage.id,
    resource_name: newImage.name,
    patient_id: newImage.patient_id,
    patient_name: newImage.patient_name || 'Patient',
    performed_by: image.created_by || 'system',
    role: 'doctor'
  });

  return newImage;
};

export const deletePatientImage = async (id: string, performedBy: string): Promise<boolean> => {
  initImagingLocalStorage();
  const images = localGet('patient_images_v1');
  const target = images.find(img => img.id === id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('patient_images').delete().eq('id', id);
      if (!error) {
        if (target) {
          await addAuditLog({
            action: 'DELETE',
            resource_type: 'IMAGE',
            resource_id: id,
            resource_name: target.name,
            patient_id: target.patient_id,
            patient_name: target.patient_name || 'Patient',
            performed_by: performedBy,
            role: 'admin'
          });
        }
        return true;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase delete failed, applying locally:', e);
    }
  }

  const filtered = images.filter(img => img.id !== id);
  localSave('patient_images_v1', filtered);

  if (target) {
    await addAuditLog({
      action: 'DELETE',
      resource_type: 'IMAGE',
      resource_id: id,
      resource_name: target.name,
      patient_id: target.patient_id,
      patient_name: target.patient_name || 'Patient',
      performed_by: performedBy,
      role: 'admin'
    });
  }
  return true;
};


// --- DOCUMENTS ---
export const getPatientDocuments = async (patientId?: number): Promise<PatientDocument[]> => {
  initImagingLocalStorage();
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('patient_documents').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as PatientDocument[];
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase document read failed:', e);
    }
  }
  const docs = localGet('patient_documents_v1');
  if (patientId) {
    return docs.filter(d => d.patient_id === Number(patientId));
  }
  return docs;
};

export const addPatientDocument = async (doc: Omit<PatientDocument, 'id' | 'created_at'>): Promise<PatientDocument> => {
  initImagingLocalStorage();
  const newDoc: PatientDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('patient_documents').insert([newDoc]).select('*');
      if (!error && data?.[0]) {
        await addAuditLog({
          action: 'UPLOAD',
          resource_type: 'DOCUMENT',
          resource_id: data[0].id,
          resource_name: data[0].name,
          patient_id: data[0].patient_id,
          patient_name: data[0].patient_name || 'Patient',
          performed_by: doc.created_by || 'system',
          role: 'doctor'
        });
        return data[0] as PatientDocument;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase document write failed:', e);
    }
  }

  const docs = localGet('patient_documents_v1');
  docs.push(newDoc);
  localSave('patient_documents_v1', docs);

  await addAuditLog({
    action: 'UPLOAD',
    resource_type: 'DOCUMENT',
    resource_id: newDoc.id,
    resource_name: newDoc.name,
    patient_id: newDoc.patient_id,
    patient_name: newDoc.patient_name || 'Patient',
    performed_by: doc.created_by || 'system',
    role: 'doctor'
  });

  return newDoc;
};

export const deletePatientDocument = async (id: string, performedBy: string): Promise<boolean> => {
  initImagingLocalStorage();
  const docs = localGet('patient_documents_v1');
  const target = docs.find(d => d.id === id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('patient_documents').delete().eq('id', id);
      if (!error) {
        if (target) {
          await addAuditLog({
            action: 'DELETE',
            resource_type: 'DOCUMENT',
            resource_id: id,
            resource_name: target.name,
            patient_id: target.patient_id,
            patient_name: target.patient_name || 'Patient',
            performed_by: performedBy,
            role: 'admin'
          });
        }
        return true;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase doc delete failed:', e);
    }
  }

  const filtered = docs.filter(d => d.id !== id);
  localSave('patient_documents_v1', filtered);

  if (target) {
    await addAuditLog({
      action: 'DELETE',
      resource_type: 'DOCUMENT',
      resource_id: id,
      resource_name: target.name,
      patient_id: target.patient_id,
      patient_name: target.patient_name || 'Patient',
      performed_by: performedBy,
      role: 'admin'
    });
  }
  return true;
};


// --- RADIOLOGY ---
export const getRadiologyRecords = async (patientId?: number): Promise<RadiologyRecord[]> => {
  initImagingLocalStorage();
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('radiology_records').select('*');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as RadiologyRecord[];
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase radiology read failed:', e);
    }
  }
  const rads = localGet('radiology_records_v1');
  if (patientId) {
    return rads.filter(r => r.patient_id === Number(patientId));
  }
  return rads;
};

export const addRadiologyRecord = async (record: Omit<RadiologyRecord, 'id' | 'created_at'>): Promise<RadiologyRecord> => {
  initImagingLocalStorage();
  const newRecord: RadiologyRecord = {
    ...record,
    id: `rad-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('radiology_records').insert([newRecord]).select('*');
      if (!error && data?.[0]) {
        await addAuditLog({
          action: 'UPLOAD',
          resource_type: 'RADIOLOGY',
          resource_id: data[0].id,
          resource_name: data[0].name,
          patient_id: data[0].patient_id,
          patient_name: data[0].patient_name || 'Patient',
          performed_by: record.created_by || 'system',
          role: 'doctor'
        });
        return data[0] as RadiologyRecord;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase radiology write failed:', e);
    }
  }

  const rads = localGet('radiology_records_v1');
  rads.push(newRecord);
  localSave('radiology_records_v1', rads);

  await addAuditLog({
    action: 'UPLOAD',
    resource_type: 'RADIOLOGY',
    resource_id: newRecord.id,
    resource_name: newRecord.name,
    patient_id: newRecord.patient_id,
    patient_name: newRecord.patient_name || 'Patient',
    performed_by: record.created_by || 'system',
    role: 'doctor'
  });

  return newRecord;
};

export const deleteRadiologyRecord = async (id: string, performedBy: string): Promise<boolean> => {
  initImagingLocalStorage();
  const rads = localGet('radiology_records_v1');
  const target = rads.find(r => r.id === id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('radiology_records').delete().eq('id', id);
      if (!error) {
        if (target) {
          await addAuditLog({
            action: 'DELETE',
            resource_type: 'RADIOLOGY',
            resource_id: id,
            resource_name: target.name,
            patient_id: target.patient_id,
            patient_name: target.patient_name || 'Patient',
            performed_by: performedBy,
            role: 'admin'
          });
        }
        return true;
      }
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase radiology delete failed:', e);
    }
  }

  const filtered = rads.filter(r => r.id !== id);
  localSave('radiology_records_v1', filtered);

  if (target) {
    await addAuditLog({
      action: 'DELETE',
      resource_type: 'RADIOLOGY',
      resource_id: id,
      resource_name: target.name,
      patient_id: target.patient_id,
      patient_name: target.patient_name || 'Patient',
      performed_by: performedBy,
      role: 'admin'
    });
  }
  return true;
};


// --- AUDIT LOGS ---
export const getAuditLogs = async (): Promise<SecurityAuditLog[]> => {
  initImagingLocalStorage();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('security_audit_logs').select('*').order('timestamp', { ascending: false });
      if (!error && data) return data as SecurityAuditLog[];
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase audit logs read failed:', e);
    }
  }
  return localGet('security_audit_logs_v1').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addAuditLog = async (log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<SecurityAuditLog> => {
  initImagingLocalStorage();
  const newLog: SecurityAuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('security_audit_logs').insert([newLog]).select('*');
      if (!error && data?.[0]) return data[0] as SecurityAuditLog;
    } catch (e) {
      console.warn('[ImagingDocumentsService] Supabase audit write failed:', e);
    }
  }

  const logs = localGet('security_audit_logs_v1');
  logs.push(newLog);
  localSave('security_audit_logs_v1', logs);
  return newLog;
};


// --- TELEMETRY / STORAGE STATS ---
export const getStorageStats = async (): Promise<StorageStats> => {
  initImagingLocalStorage();
  const images = localGet('patient_images_v1');
  const docs = localGet('patient_documents_v1');
  const rads = localGet('radiology_records_v1');

  let totalBytes = 0;
  images.forEach(img => totalBytes += (img.file_size || 0));
  docs.forEach(doc => totalBytes += (doc.file_size || 0));
  rads.forEach(rad => totalBytes += (rad.file_size || 0));

  return {
    used_bytes: totalBytes,
    images_count: images.length,
    documents_count: docs.length,
    radiology_count: rads.length,
    limit_bytes: 52428800 // 50 MB demo storage limit
  };
};

export const getLargestFiles = async (limit = 5): Promise<any[]> => {
  initImagingLocalStorage();
  const images = localGet('patient_images_v1').map(item => ({ ...item, type: 'Clinical Photo' }));
  const docs = localGet('patient_documents_v1').map(item => ({ ...item, type: 'Document' }));
  const rads = localGet('radiology_records_v1').map(item => ({ ...item, type: 'Radiology Scan' }));

  const allFiles = [...images, ...docs, ...rads];
  return allFiles
    .sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
    .slice(0, limit);
};

export const getRecentlyUploaded = async (limit = 5): Promise<any[]> => {
  initImagingLocalStorage();
  const images = localGet('patient_images_v1').map(item => ({ ...item, type: 'Clinical Photo' }));
  const docs = localGet('patient_documents_v1').map(item => ({ ...item, type: 'Document' }));
  const rads = localGet('radiology_records_v1').map(item => ({ ...item, type: 'Radiology Scan' }));

  const allFiles = [...images, ...docs, ...rads];
  return allFiles
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
};
