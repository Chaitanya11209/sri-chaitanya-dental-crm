import { 
  KnowledgeDocument, 
  DocumentVersion, 
  DocumentAcknowledgement, 
  ReusableChecklist, 
  EquipmentItem, 
  TrainingMaterial, 
  TrainingProgress,
  DocumentStatus
} from '../types/knowledge';
import { logSecurityEvent } from '../lib/audit';
import { supabase } from '../lib/supabase';

// Local storage keys
const KEYS = {
  DOCUMENTS: 'scdc_knowledge_documents_v1',
  VERSIONS: 'scdc_knowledge_versions_v1',
  ACKNOWLEDGEMENTS: 'scdc_knowledge_acknowledgements_v1',
  REUSABLE_CHECKLISTS: 'scdc_knowledge_reusable_checklists_v1',
  EQUIPMENT: 'scdc_knowledge_equipment_v1',
  TRAINING_MATERIALS: 'scdc_knowledge_training_materials_v1',
  TRAINING_PROGRESS: 'scdc_knowledge_training_progress_v1'
};

// ------------------------------------------------------------
// SEED MOCK DATA DEFINITIONS
// ------------------------------------------------------------
const SEED_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'Class B Autoclave Sterilization & Thermal Cycle Validation SOP',
    category: 'Sterilization',
    status: 'Published',
    is_mandatory: true,
    created_at: '2026-03-10T08:00:00Z',
    updated_at: '2026-06-15T11:20:00Z',
    author_name: 'Dr. Chaitanya Kumar',
    approver_name: 'Dr. Chaitanya Kumar',
    approval_date: '2026-06-15',
    current_version: '1.2',
    tags: ['Sterilization', 'SOP', 'Infection Control', 'Autoclave'],
    views_count: 142,
    content: `<p>This standard operating procedure outlines the strict sterilization protocols for all critical and semi-critical dental instruments using the Class B vacuum autoclave (Melag Vacuklav 40 B+).</p>
<h3>1. Instrument Preparation</h3>
<p>All instruments must be pre-cleaned in the ultrasonic bath for 15 minutes, rinsed with distilled water, dried thoroughly, and packed in high-temperature sterilization pouches with integrated chemical indicators.</p>
<h3>2. Autoclave Parameters</h3>
<ul>
  <li><strong>Cycle Selected:</strong> Universal Program (134°C, fractionated pre-vacuum).</li>
  <li><strong>Holding Time:</strong> 5.5 minutes minimum sterilization holding phase.</li>
  <li><strong>Drying Phase:</strong> 20 minutes deep post-vacuum drying to avoid wet packs.</li>
</ul>
<h3>3. Physical & Biological Verification</h3>
<p>Each load must be signed off based on physical parameters (Time, Temp, Pressure) displayed on the digital printout. Spore test biological indicators (Geobacillus stearothermophilus) must be run weekly every Monday morning.</p>`,
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Standard embed format
    attachments: [
      { name: 'Melag_Vacuklav_40B_Manual.pdf', url: '#', size: '2.4 MB' },
      { name: 'Infection_Control_Log_Template.pdf', url: '#', size: '420 KB' }
    ],
    hyperlinks: [
      { label: 'CDC Dental Infection Prevention Guidelines', url: 'https://www.cdc.gov/oralhealth/infectioncontrol/index.html' }
    ],
    checklists: [
      {
        id: 'chk-doc-1',
        title: 'Immediate Post-Cycle Sterilization Checks',
        items: [
          { id: 'item-d1-1', text: 'Verify integrated chemical strip on pouch turned from Pink to Dark Brown', checked: true },
          { id: 'item-d1-2', text: 'Check autoclave physical printer logs for "PROGRAM COMPLETED SUCCESSFULLY"', checked: true },
          { id: 'item-d1-3', text: 'Ensure bags are bone-dry; set aside any wet packs for re-sterilization', checked: false }
        ]
      }
    ]
  },
  {
    id: 'doc-2',
    title: 'MTA Root Canal Obturation & Vital Pulp Therapy Clinical Protocol',
    category: 'RCT Protocols',
    status: 'Published',
    is_mandatory: true,
    created_at: '2026-04-02T09:30:00Z',
    updated_at: '2026-07-01T14:45:00Z',
    author_name: 'Dr. Chaitanya Kumar',
    approver_name: 'Dr. Chaitanya Kumar',
    approval_date: '2026-07-01',
    current_version: '2.0',
    tags: ['Clinical', 'RCT', 'MTA', 'Endodontics'],
    views_count: 98,
    content: `<p>This clinical protocol standardizes Root Canal Therapy obturation utilizing Mineral Trioxide Aggregate (MTA) or bioceramic sealers to achieve a hermetic apical seal, reducing post-operative flare-ups.</p>
<h3>1. Diagnosis & Vitality Testing</h3>
<p>Establish pulpal and periapical diagnoses using cold tests, electric pulp tests (EPT), and diagnostic digital radiography.</p>
<h3>2. Root Canal Preparation</h3>
<ul>
  <li>Isolate the tooth using a heavy-duty rubber dam. Access must expose all canal orifices.</li>
  <li>Perform chemo-mechanical preparation utilizing rotary NiTi files under continuous irrigation of 3% Sodium Hypochlorite (NaOCl) and 17% EDTA.</li>
</ul>
<h3>3. Obturation with MTA / Bioceramic Sealer</h3>
<p>Thoroughly dry canals with paper points. Mix MTA to a putty-like consistency or load premixed bioceramic sealer syringe. Condense MTA carefully into the apical 3-4mm of the canal. Backfill remaining canal space with warm thermoplasticized gutta-percha.</p>`,
    attachments: [
      { name: 'Endodontics_MTA_Study_SCDC.pdf', url: '#', size: '1.2 MB' }
    ],
    checklists: [
      {
        id: 'chk-doc-2',
        title: 'RCT Isolation and Preparation Check',
        items: [
          { id: 'item-d2-1', text: 'Secure rubber dam clamp and test for zero saliva leakage', checked: true },
          { id: 'item-d2-2', text: 'Pre-irrigate with heated 3% NaOCl for organic tissue dissolution', checked: true },
          { id: 'item-d2-3', text: 'Take electronic working length reading and verify with a radiograph', checked: true }
        ]
      }
    ]
  },
  {
    id: 'doc-3',
    title: 'Front Office Patient Intake, Consent Verification & Billing SOP',
    category: 'Reception SOPs',
    status: 'Published',
    is_mandatory: false,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    author_name: 'Staff Coordinator Sravani',
    approver_name: 'Dr. Chaitanya Kumar',
    approval_date: '2026-01-20',
    current_version: '1.0',
    tags: ['Reception', 'SOP', 'Billing', 'Consent'],
    views_count: 189,
    content: `<p>SOP for front-desk coordinators to handle new patient registrations, ensure complete legal informed consents, and compile initial invoices during checkout.</p>
<h3>1. New Patient Onboarding</h3>
<p>Confirm patient demographics, medical history forms, and emergency contact details on the patient intake terminal. Mandate specific health check disclosures before clinical diagnostic work.</p>
<h3>2. Informed Consent Processing</h3>
<p>All surgical, implant, or extensive endodontic procedures require a physically signed or digital tablet-based Informed Consent Form. Check that the patient signs, initials, and dates the form prior to anesthetic injection.</p>
<h3>3. CGST Tax Invoicing & Checkout</h3>
<p>Upon treatment completion, confirm the recorded procedures with the attending dentist. Issue invoices showing the 9% SGST and 9% CGST breakdown. Provide receipts instantly via the automated WhatsApp dispatch portal.</p>`
  },
  {
    id: 'doc-4',
    title: 'Dental Implant Surgical Tray Preparation & Sterile Field Protocol',
    category: 'Dental Assistant SOPs',
    status: 'Published',
    is_mandatory: true,
    created_at: '2026-05-18T11:00:00Z',
    updated_at: '2026-05-18T11:00:00Z',
    author_name: 'Assistant Ramesh',
    approver_name: 'Dr. Chaitanya Kumar',
    approval_date: '2026-05-20',
    current_version: '1.0',
    tags: ['Assistant', 'Implantology', 'SOP', 'Sterile Field'],
    views_count: 76,
    content: `<p>Guidelines for dental assistants to set up the implant surgery operatory, ensuring absolute sterile margins and checking patient vital signs pre-operatively.</p>
<h3>1. Sterile Operatory Setup</h3>
<p>Wipe down all surfaces with high-level disinfectant (bactericidal, virucidal, fungicidal). Place sterile blue barrier drapes on the dental chair, tray arms, overhead light handle, and control panel.</p>
<h3>2. Implant Motor and Handpiece Preparation</h3>
<p>Sterile-mount the NSK surgical handpiece onto the implant console. Install sterile saline irrigation tube through the peristaltic pump. Verify that the handpiece irrigation line is flowing and functional.</p>
<h3>3. Surgical Kit Layout</h3>
<p>Open the sterile implant drill kit under aseptic conditions. Organize surgical burs, implant fixtures, drivers, torque wrench, and diagnostic parallel pins in sequential order on the sterile table drape.</p>`
  },
  {
    id: 'doc-5',
    title: 'Emergency Medical Kit & Anaphylaxis Crisis Response Guidelines',
    category: 'Emergency Response',
    status: 'Published',
    is_mandatory: true,
    created_at: '2026-02-10T12:00:00Z',
    updated_at: '2026-07-10T10:15:00Z',
    author_name: 'Dr. Chaitanya Kumar',
    approver_name: 'Dr. Chaitanya Kumar',
    approval_date: '2026-07-10',
    current_version: '2.1',
    tags: ['Emergency', 'Anaphylaxis', 'Safety', 'Mandatory'],
    views_count: 220,
    content: `<p>Critical guidance for managing syncope, local anesthetic toxicity, cardiac distress, and acute anaphylactic shock in the dental operatory.</p>
<h3>1. Immediate Anaphylaxis Response</h3>
<p>If a patient exhibits sudden respiratory distress, urticaria, bronchospasms, or severe hypotension after drug administration:</p>
<ol>
  <li><strong>Discontinue Treatment:</strong> Immediately stop any clinical drug or local anesthetic delivery.</li>
  <li><strong>Call for Assistance:</strong> Direct nearby staff to dial emergency medical services (EMS).</li>
  <li><strong>Administer Epinephrine:</strong> Administer Epinephrine 1:1000 (0.3mg to 0.5mg) intramuscularly (IM) into the anterolateral thigh.</li>
  <li><strong>Patient Position:</strong> Place the patient in a supine position with legs elevated, unless in respiratory distress. Administer 100% high-flow oxygen.</li>
</ol>
<h3>2. Secondary Emergency Interventions</h3>
<p>Maintain patent airway. Monitor heart rate, blood pressure, and oxygen saturation every 3 minutes. Be prepared to initiate cardiopulmonary resuscitation (CPR) if carotid pulse is lost.</p>`
  }
];

const SEED_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver-1',
    document_id: 'doc-1',
    version_number: '1.0',
    content: '<p>Initial version of Class B Autoclave Sterilization SOP.</p>',
    changelog: 'Initial SOP creation',
    created_at: '2026-03-10T08:00:00Z',
    performed_by_name: 'Dr. Chaitanya Kumar'
  },
  {
    id: 'ver-2',
    document_id: 'doc-1',
    version_number: '1.2',
    content: `<p>This standard operating procedure outlines the strict sterilization protocols for all critical and semi-critical dental instruments using the Class B vacuum autoclave (Melag Vacuklav 40 B+).</p>
<h3>1. Instrument Preparation</h3>
<p>All instruments must be pre-cleaned in the ultrasonic bath for 15 minutes, rinsed with distilled water, dried thoroughly, and packed in high-temperature sterilization pouches with integrated chemical indicators.</p>
<h3>2. Autoclave Parameters</h3>
<ul>
  <li><strong>Cycle Selected:</strong> Universal Program (134°C, fractionated pre-vacuum).</li>
  <li><strong>Holding Time:</strong> 5.5 minutes minimum sterilization holding phase.</li>
  <li><strong>Drying Phase:</strong> 20 minutes deep post-vacuum drying to avoid wet packs.</li>
</ul>
<h3>3. Physical & Biological Verification</h3>
<p>Each load must be signed off based on physical parameters (Time, Temp, Pressure) displayed on the digital printout. Spore test biological indicators (Geobacillus stearothermophilus) must be run weekly every Monday morning.</p>`,
    changelog: 'Added fractionated vacuum program details and biological indicator frequency details.',
    created_at: '2026-06-15T11:20:00Z',
    performed_by_name: 'Dr. Chaitanya Kumar',
    approved_by_name: 'Dr. Chaitanya Kumar',
    approved_at: '2026-06-15'
  }
];

const SEED_REUSABLE_CHECKLISTS: ReusableChecklist[] = [
  {
    id: 'chk-1',
    title: 'Operatory Opening Protocol',
    category: 'Operatory Opening',
    description: 'Executed every morning before patient scheduling begins.',
    items: [
      { id: 'i-1-1', text: 'Flush waterlines (air/water syringes & handpiece lines) for 2 minutes', checked: false },
      { id: 'i-1-2', text: 'Check dental chair hydraulic operation and arm-rest alignment', checked: false },
      { id: 'i-1-3', text: 'Verify suction canister trap is clean and dry vacuum lines have suction pressure', checked: false },
      { id: 'i-1-4', text: 'Refill clean water reservoir tank with distilled water', checked: false }
    ],
    completion_history: [
      { date: '2026-07-20T08:15:00Z', by_name: 'Assistant Ramesh', notes: 'All dental chairs functional' }
    ]
  },
  {
    id: 'chk-2',
    title: 'Operatory Closing Protocol',
    category: 'Operatory Closing',
    description: 'Nightly terminal sanitation checklist for all dental operatory cabins.',
    items: [
      { id: 'i-2-1', text: 'Suction vacuum line disinfectant cleaner through high-volume evacuator (HVE)', checked: false },
      { id: 'i-2-2', text: 'Empty and wipe suction canister traps; dispose biological solids safely', checked: false },
      { id: 'i-2-3', text: 'Turn off dental compressor and dental vacuum master electrical breakers', checked: false },
      { id: 'i-2-4', text: 'Turn off dental treatment chair consoles and master water feed valve', checked: false }
    ]
  },
  {
    id: 'chk-3',
    title: 'Sterilization Cycle Log',
    category: 'Sterilization Cycle',
    description: 'Validated for every batch autoclave sterilization run.',
    items: [
      { id: 'i-3-1', text: 'Ultrasonic pre-wash check (Verify enzymatic tablet is completely dissolved)', checked: false },
      { id: 'i-3-2', text: 'Inspect packaging pouch sealing bar (Ensure airtight 10mm wide seal)', checked: false },
      { id: 'i-3-3', text: 'Confirm water quality of autoclave feed (Ensure TDS is below 15 ppm)', checked: false }
    ]
  },
  {
    id: 'chk-4',
    title: 'Root Canal Obturation (RCT) Tray Setup',
    category: 'RCT Setup',
    description: 'Ensure dental tray has all essential rotary files and endo motors.',
    items: [
      { id: 'i-4-1', text: 'Select and inspect NiTi rotary files for fatigue, bends, or unwinding', checked: false },
      { id: 'i-4-2', text: 'Prepare paper points and gutta-percha cones matching rotary file taper', checked: false },
      { id: 'i-4-3', text: 'Verify sodium hypochlorite (3%) and EDTA syringe tips are securely locked', checked: false }
    ]
  }
];

const SEED_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-1',
    name: 'Sirona Orthophos XG 3D Extraoral Imaging System',
    serial_number: 'SRN-99831-2024',
    category: 'X-Ray / CBCT',
    manual_url: '#',
    maintenance_instructions: 'Clean protective bite block sleeves after every exposure. Perform full diagnostic sensor self-test daily.',
    calibration_schedule: 'Every 6 Months',
    last_calibration_date: '2026-04-12',
    next_calibration_date: '2026-10-12',
    warranty_expiry: '2029-12-31',
    vendor_name: 'Dentsply Sirona South Asia',
    vendor_contact: '+91 22 6600 4500'
  },
  {
    id: 'eq-2',
    name: 'Melag Vacuklav 40 B+ Vacuum Autoclave',
    serial_number: 'MLG-40B-883921',
    category: 'Sterilizer',
    manual_url: '#',
    maintenance_instructions: 'Empty wastewater tank daily. Clean internal stainless chamber with alcohol-free microfiber cloth weekly.',
    calibration_schedule: 'Every 12 Months',
    last_calibration_date: '2026-02-15',
    next_calibration_date: '2027-02-15',
    warranty_expiry: '2028-02-15',
    vendor_name: 'Melag India Medical Systems',
    vendor_contact: '+91 80 4125 3901'
  },
  {
    id: 'eq-3',
    name: 'NSK Ti-Max X600L High-Speed Handpiece',
    serial_number: 'NSK-X600-482103',
    category: 'Handpiece',
    manual_url: '#',
    maintenance_instructions: 'Lubricate handpiece turbine with NSK Pana Spray after every autoclave cycle. Check turbine fiberoptics.',
    calibration_schedule: 'Every 3 Months',
    last_calibration_date: '2026-06-10',
    next_calibration_date: '2026-09-10',
    warranty_expiry: '2027-06-10',
    vendor_name: 'NSK Dental India Private Limited',
    vendor_contact: '+91 11 4109 0905'
  }
];

const SEED_TRAINING: TrainingMaterial[] = [
  {
    id: 'tr-1',
    title: 'Class B Vacuum Autoclave Operation & Spore Testing Routine',
    type: 'Video',
    category: 'Sterilization',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Learn the sequence for fractionated pre-vacuum sterilization runs and logging biological spore test incubations.',
    duration: '15 mins'
  },
  {
    id: 'tr-2',
    title: 'Intraoral Digital Radiography Position & Radiation Safety Manual',
    type: 'PDF',
    category: 'Radiology',
    url: '#',
    description: 'Standard guidelines on parallel positioning, lead apron shielding, and digital sensor troubleshooting.',
    duration: '25 mins'
  },
  {
    id: 'tr-3',
    title: 'Endodontic Motor Torque Settings & Rotary File Limits Quiz',
    type: 'Assessment',
    category: 'RCT Protocols',
    url: '#',
    description: 'Clinical assessment to certify dental assistants and associate dentists on endodontic motor settings.',
    assessment_questions: [
      {
        id: 'q-1',
        question: 'What is the recommended rotation speed and torque limit for the primary shaping NiTi rotary file (e.g. ProTaper Gold S1)?',
        options: [
          '300 RPM, 1.5 Ncm torque',
          '300 RPM, 5.0 Ncm torque',
          '600 RPM, 1.0 Ncm torque',
          '150 RPM, 3.0 Ncm torque'
        ],
        correct_option_index: 0
      },
      {
        id: 'q-2',
        question: 'Which chemical irrigant is strictly utilized to dissolve pulp tissue remnants during rotary file shaping?',
        options: [
          '17% EDTA Solution',
          '3% Sodium Hypochlorite (NaOCl)',
          '2% Chlorhexidine Gluconate',
          'Normal Saline 0.9%'
        ],
        correct_option_index: 1
      },
      {
        id: 'q-3',
        question: 'Under what condition should a rotary NiTi instrument be immediately discarded?',
        options: [
          'After being used on a single simple root canal case',
          'If visual check under magnification shows shiny spots or unwinding of flute pitches',
          'If it has undergone exactly one sterilization program run',
          'If it is used on a patient older than 60'
        ],
        correct_option_index: 1
      }
    ]
  }
];

const SEED_ACKNOWLEDGEMENTS: DocumentAcknowledgement[] = [
  {
    id: 'ack-1',
    document_id: 'doc-1',
    user_id: 'receptionist@srichaitanyadental.com',
    user_name: 'Staff Sravani',
    user_role: 'receptionist',
    acknowledged_at: '2026-06-20T09:15:00Z',
    comments: 'Read and understood the sterile bag loading policy.'
  },
  {
    id: 'ack-2',
    document_id: 'doc-1',
    user_id: 'doctor@srichaitanyadental.com',
    user_name: 'Dr. Chaitanya Kumar',
    user_role: 'doctor',
    acknowledged_at: '2026-06-16T12:00:00Z'
  }
];

const SEED_TRAINING_PROGRESS: TrainingProgress[] = [
  {
    id: 'tp-1',
    material_id: 'tr-1',
    user_id: 'receptionist@srichaitanyadental.com',
    user_name: 'Staff Sravani',
    status: 'Completed',
    completed_at: '2026-07-18T16:00:00Z'
  }
];

// Helper to interact with local storage safely
function localGet<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

function localSave<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const knowledgeService = {
  initialize: () => {
    // Check and populate default databases in LocalStorage if not present
    if (!localStorage.getItem(KEYS.DOCUMENTS)) {
      localSave(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    }
    if (!localStorage.getItem(KEYS.VERSIONS)) {
      localSave(KEYS.VERSIONS, SEED_VERSIONS);
    }
    if (!localStorage.getItem(KEYS.ACKNOWLEDGEMENTS)) {
      localSave(KEYS.ACKNOWLEDGEMENTS, SEED_ACKNOWLEDGEMENTS);
    }
    if (!localStorage.getItem(KEYS.REUSABLE_CHECKLISTS)) {
      localSave(KEYS.REUSABLE_CHECKLISTS, SEED_REUSABLE_CHECKLISTS);
    }
    if (!localStorage.getItem(KEYS.EQUIPMENT)) {
      localSave(KEYS.EQUIPMENT, SEED_EQUIPMENT);
    }
    if (!localStorage.getItem(KEYS.TRAINING_MATERIALS)) {
      localSave(KEYS.TRAINING_MATERIALS, SEED_TRAINING);
    }
    if (!localStorage.getItem(KEYS.TRAINING_PROGRESS)) {
      localSave(KEYS.TRAINING_PROGRESS, SEED_TRAINING_PROGRESS);
    }
  },

  // ------------------------------------------------------------
  // DOCUMENTS (SOPs, Clinical Protocols, Manuals)
  // ------------------------------------------------------------
  getDocuments: async (): Promise<KnowledgeDocument[]> => {
    // Fallback model: fetch from Supabase table first if available, otherwise localStorage
    try {
      const { data, error } = await supabase.from('knowledge_documents').select('*');
      if (!error && data && data.length > 0) {
        return data as KnowledgeDocument[];
      }
    } catch (e) {
      // fail silently
    }
    return localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
  },

  saveDocument: async (doc: KnowledgeDocument, authorName: string, isNew: boolean = false): Promise<KnowledgeDocument> => {
    const docs = localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    doc.updated_at = new Date().toISOString();
    
    let updatedDocs: KnowledgeDocument[] = [];
    if (isNew) {
      doc.id = `doc-${Date.now()}`;
      doc.views_count = 0;
      doc.created_at = new Date().toISOString();
      updatedDocs = [...docs, doc];
      
      // Log version 1.0 creation
      const firstVersion: DocumentVersion = {
        id: `ver-${Date.now()}`,
        document_id: doc.id,
        version_number: doc.current_version || '1.0',
        content: doc.content,
        changelog: 'Initial SOP creation',
        created_at: new Date().toISOString(),
        performed_by_name: authorName
      };
      const versions = localGet<DocumentVersion[]>(KEYS.VERSIONS, SEED_VERSIONS);
      localSave(KEYS.VERSIONS, [...versions, firstVersion]);

      await logSecurityEvent({
        action: 'KNOWLEDGE_DOCUMENT_CREATED',
        details: `Created new document: ${doc.title} (${doc.category})`,
        newValue: doc
      });
    } else {
      updatedDocs = docs.map(d => d.id === doc.id ? doc : d);
      await logSecurityEvent({
        action: 'KNOWLEDGE_DOCUMENT_UPDATED',
        details: `Updated document: ${doc.title} (v${doc.current_version})`,
        newValue: doc
      });
    }

    localSave(KEYS.DOCUMENTS, updatedDocs);

    // Sync with Supabase table if available
    try {
      await supabase.from('knowledge_documents').upsert([doc]);
    } catch (e) {
      console.warn('[KnowledgeService] Supabase upload bypassed/failed:', e);
    }

    return doc;
  },

  // Log a view on a document
  recordDocumentView: async (docId: string): Promise<void> => {
    const docs = localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    const updated = docs.map(d => {
      if (d.id === docId) {
        return { ...d, views_count: (d.views_count || 0) + 1 };
      }
      return d;
    });
    localSave(KEYS.DOCUMENTS, updated);
  },

  // Archive a document
  archiveDocument: async (docId: string): Promise<void> => {
    const docs = localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    const updated = docs.map(d => {
      if (d.id === docId) {
        return { ...d, status: 'Archived' as DocumentStatus };
      }
      return d;
    });
    localSave(KEYS.DOCUMENTS, updated);
    
    const doc = updated.find(d => d.id === docId);
    await logSecurityEvent({
      action: 'KNOWLEDGE_DOCUMENT_ARCHIVED',
      details: `Archived document ID ${docId}: ${doc?.title || 'Unknown'}`
    });
  },

  // Create document version
  createDocumentVersion: async (version: Omit<DocumentVersion, 'id' | 'created_at'>): Promise<DocumentVersion> => {
    const versions = localGet<DocumentVersion[]>(KEYS.VERSIONS, SEED_VERSIONS);
    const newVersion: DocumentVersion = {
      ...version,
      id: `ver-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    localSave(KEYS.VERSIONS, [...versions, newVersion]);

    // Update document version number
    const docs = localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    const updatedDocs = docs.map(d => {
      if (d.id === version.document_id) {
        return { 
          ...d, 
          current_version: version.version_number,
          content: version.content,
          updated_at: new Date().toISOString()
        };
      }
      return d;
    });
    localSave(KEYS.DOCUMENTS, updatedDocs);

    await logSecurityEvent({
      action: 'KNOWLEDGE_VERSION_CREATED',
      details: `Created version ${version.version_number} for document ID ${version.document_id}`,
      newValue: newVersion
    });

    return newVersion;
  },

  // Rollback to a specific version
  rollbackDocumentVersion: async (docId: string, versionObj: DocumentVersion, performerName: string): Promise<KnowledgeDocument> => {
    const docs = localGet<KnowledgeDocument[]>(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    const targetDoc = docs.find(d => d.id === docId);
    if (!targetDoc) throw new Error('Target document not found');

    const rollbackVersionNum = `${parseFloat(targetDoc.current_version) + 0.1}`;
    
    // Create new version record for rollback action
    const newVersion: DocumentVersion = {
      id: `ver-${Date.now()}`,
      document_id: docId,
      version_number: rollbackVersionNum,
      content: versionObj.content,
      changelog: `Rollback to version ${versionObj.version_number} (performed by ${performerName})`,
      created_at: new Date().toISOString(),
      performed_by_name: performerName
    };

    const versions = localGet<DocumentVersion[]>(KEYS.VERSIONS, SEED_VERSIONS);
    localSave(KEYS.VERSIONS, [...versions, newVersion]);

    const updatedDoc: KnowledgeDocument = {
      ...targetDoc,
      current_version: rollbackVersionNum,
      content: versionObj.content,
      updated_at: new Date().toISOString()
    };

    const updatedDocs = docs.map(d => d.id === docId ? updatedDoc : d);
    localSave(KEYS.DOCUMENTS, updatedDocs);

    await logSecurityEvent({
      action: 'KNOWLEDGE_ROLLBACK_EXECUTED',
      details: `Rolled back document: ${targetDoc.title} to state v${versionObj.version_number}`,
      newValue: updatedDoc
    });

    return updatedDoc;
  },

  getDocumentVersions: async (docId: string): Promise<DocumentVersion[]> => {
    const versions = localGet<DocumentVersion[]>(KEYS.VERSIONS, SEED_VERSIONS);
    return versions.filter(v => v.document_id === docId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // ------------------------------------------------------------
  // STAFF ACKNOWLEDGEMENT & READ TRACKING
  // ------------------------------------------------------------
  getAcknowledgements: async (): Promise<DocumentAcknowledgement[]> => {
    return localGet<DocumentAcknowledgement[]>(KEYS.ACKNOWLEDGEMENTS, SEED_ACKNOWLEDGEMENTS);
  },

  acknowledgeDocument: async (docId: string, userId: string, userName: string, userRole: string, comments?: string): Promise<DocumentAcknowledgement> => {
    const acks = localGet<DocumentAcknowledgement[]>(KEYS.ACKNOWLEDGEMENTS, SEED_ACKNOWLEDGEMENTS);
    
    // Check if already acknowledged to avoid duplications
    const existing = acks.find(a => a.document_id === docId && a.user_id === userId);
    if (existing) return existing;

    const newAck: DocumentAcknowledgement = {
      id: `ack-${Date.now()}`,
      document_id: docId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      acknowledged_at: new Date().toISOString(),
      comments
    };

    localSave(KEYS.ACKNOWLEDGEMENTS, [...acks, newAck]);

    // Try storing in Supabase as well
    try {
      await supabase.from('document_acknowledgements').upsert([newAck]);
    } catch (e) {
      // silent
    }

    await logSecurityEvent({
      action: 'KNOWLEDGE_DOCUMENT_ACKNOWLEDGED',
      details: `SOP/Document ID ${docId} acknowledged as read & understood by ${userName} (${userRole})`
    });

    return newAck;
  },

  // ------------------------------------------------------------
  // REUSABLE CHECKLISTS
  // ------------------------------------------------------------
  getReusableChecklists: async (): Promise<ReusableChecklist[]> => {
    return localGet<ReusableChecklist[]>(KEYS.REUSABLE_CHECKLISTS, SEED_REUSABLE_CHECKLISTS);
  },

  saveReusableChecklist: async (checklist: ReusableChecklist): Promise<ReusableChecklist> => {
    const checklists = localGet<ReusableChecklist[]>(KEYS.REUSABLE_CHECKLISTS, SEED_REUSABLE_CHECKLISTS);
    let updated: ReusableChecklist[] = [];
    if (!checklist.id) {
      checklist.id = `chk-${Date.now()}`;
      updated = [...checklists, checklist];
    } else {
      updated = checklists.map(c => c.id === checklist.id ? checklist : c);
    }
    localSave(KEYS.REUSABLE_CHECKLISTS, updated);
    return checklist;
  },

  recordChecklistCompletion: async (checklistId: string, performerName: string, notes?: string): Promise<ReusableChecklist> => {
    const checklists = localGet<ReusableChecklist[]>(KEYS.REUSABLE_CHECKLISTS, SEED_REUSABLE_CHECKLISTS);
    const chk = checklists.find(c => c.id === checklistId);
    if (!chk) throw new Error('Checklist not found');

    const historyItem = {
      date: new Date().toISOString(),
      by_name: performerName,
      notes
    };

    const updatedChecklist: ReusableChecklist = {
      ...chk,
      last_completed_at: new Date().toISOString(),
      last_completed_by: performerName,
      completion_history: [...(chk.completion_history || []), historyItem],
      // Uncheck all items for next reuse
      items: chk.items.map(it => ({ ...it, checked: false }))
    };

    const updatedList = checklists.map(c => c.id === checklistId ? updatedChecklist : c);
    localSave(KEYS.REUSABLE_CHECKLISTS, updatedList);

    await logSecurityEvent({
      action: 'CLINICAL_CHECKLIST_COMPLETED',
      details: `Completed operational checklist: "${chk.title}" performed by ${performerName}`
    });

    return updatedChecklist;
  },

  // ------------------------------------------------------------
  // EQUIPMENT LIBRARY
  // ------------------------------------------------------------
  getEquipment: async (): Promise<EquipmentItem[]> => {
    return localGet<EquipmentItem[]>(KEYS.EQUIPMENT, SEED_EQUIPMENT);
  },

  saveEquipmentItem: async (eq: EquipmentItem): Promise<EquipmentItem> => {
    const equipment = localGet<EquipmentItem[]>(KEYS.EQUIPMENT, SEED_EQUIPMENT);
    let updated: EquipmentItem[] = [];
    if (!eq.id) {
      eq.id = `eq-${Date.now()}`;
      updated = [...equipment, eq];
    } else {
      updated = equipment.map(item => item.id === eq.id ? eq : item);
    }
    localSave(KEYS.EQUIPMENT, updated);
    return eq;
  },

  deleteEquipmentItem: async (id: string): Promise<void> => {
    const equipment = localGet<EquipmentItem[]>(KEYS.EQUIPMENT, SEED_EQUIPMENT);
    const updated = equipment.filter(item => item.id !== id);
    localSave(KEYS.EQUIPMENT, updated);
  },

  recordCalibration: async (eqId: string, technicianName: string, calibrationDate: string, nextCalibrationDate: string): Promise<EquipmentItem> => {
    const equipment = localGet<EquipmentItem[]>(KEYS.EQUIPMENT, SEED_EQUIPMENT);
    const item = equipment.find(e => e.id === eqId);
    if (!item) throw new Error('Equipment not found');

    const updatedItem: EquipmentItem = {
      ...item,
      last_calibration_date: calibrationDate,
      next_calibration_date: nextCalibrationDate
    };

    const updatedList = equipment.map(e => e.id === eqId ? updatedItem : e);
    localSave(KEYS.EQUIPMENT, updatedList);

    await logSecurityEvent({
      action: 'EQUIPMENT_CALIBRATION_LOGGED',
      details: `Calibrated equipment: ${item.name} (S/N: ${item.serial_number}) by ${technicianName}`
    });

    return updatedItem;
  },

  // ------------------------------------------------------------
  // TRAINING CENTER
  // ------------------------------------------------------------
  getTrainingMaterials: async (): Promise<TrainingMaterial[]> => {
    return localGet<TrainingMaterial[]>(KEYS.TRAINING_MATERIALS, SEED_TRAINING);
  },

  getTrainingProgress: async (userId: string): Promise<TrainingProgress[]> => {
    const allProgress = localGet<TrainingProgress[]>(KEYS.TRAINING_PROGRESS, SEED_TRAINING_PROGRESS);
    return allProgress.filter(p => p.user_id === userId);
  },

  saveTrainingMaterial: async (material: TrainingMaterial): Promise<TrainingMaterial> => {
    const list = localGet<TrainingMaterial[]>(KEYS.TRAINING_MATERIALS, SEED_TRAINING);
    let updated: TrainingMaterial[] = [];
    if (!material.id) {
      material.id = `tr-${Date.now()}`;
      updated = [...list, material];
    } else {
      updated = list.map(m => m.id === material.id ? material : m);
    }
    localSave(KEYS.TRAINING_MATERIALS, updated);
    return material;
  },

  submitAssessmentScore: async (materialId: string, userId: string, userName: string, score: number): Promise<TrainingProgress> => {
    const allProgress = localGet<TrainingProgress[]>(KEYS.TRAINING_PROGRESS, SEED_TRAINING_PROGRESS);
    
    const existingIdx = allProgress.findIndex(p => p.material_id === materialId && p.user_id === userId);
    
    const record: TrainingProgress = {
      id: existingIdx !== -1 ? allProgress[existingIdx].id : `tp-${Date.now()}`,
      material_id: materialId,
      user_id: userId,
      user_name: userName,
      status: 'Completed',
      completed_at: new Date().toISOString(),
      score
    };

    if (existingIdx !== -1) {
      allProgress[existingIdx] = record;
    } else {
      allProgress.push(record);
    }
    localSave(KEYS.TRAINING_PROGRESS, allProgress);

    await logSecurityEvent({
      action: 'TRAINING_QUIZ_COMPLETED',
      details: `Training assessment quiz scored ${score}% by user: ${userName} (${userId})`
    });

    return record;
  },

  markTrainingCompleted: async (materialId: string, userId: string, userName: string): Promise<TrainingProgress> => {
    const allProgress = localGet<TrainingProgress[]>(KEYS.TRAINING_PROGRESS, SEED_TRAINING_PROGRESS);
    const existing = allProgress.find(p => p.material_id === materialId && p.user_id === userId);
    if (existing && existing.status === 'Completed') return existing;

    const record: TrainingProgress = {
      id: existing ? existing.id : `tp-${Date.now()}`,
      material_id: materialId,
      user_id: userId,
      user_name: userName,
      status: 'Completed',
      completed_at: new Date().toISOString()
    };

    const updated = existing 
      ? allProgress.map(p => p.id === existing.id ? record : p)
      : [...allProgress, record];

    localSave(KEYS.TRAINING_PROGRESS, updated);

    await logSecurityEvent({
      action: 'TRAINING_MATERIAL_COMPLETED',
      details: `Completed clinical training course: "${materialId}" by employee ${userName}`
    });

    return record;
  }
};
