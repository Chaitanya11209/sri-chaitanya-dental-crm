import { supabase, isSupabaseConfigured } from './supabase';

export type FieldType =
  | 'Short Text'
  | 'Long Text'
  | 'Number'
  | 'Date'
  | 'Time'
  | 'Checkbox'
  | 'Radio Button'
  | 'Dropdown'
  | 'Multi Select'
  | 'File Upload'
  | 'Image Upload'
  | 'Signature'
  | 'Tooth Selector'
  | 'Doctor Selector'
  | 'Treatment Selector';

export type SmartFieldType =
  | 'Patient Name'
  | 'Age'
  | 'Gender'
  | 'Doctor'
  | 'Treatment'
  | 'Appointment Date'
  | 'Clinic Name'
  | 'Invoice Number'
  | 'Today\'s Date';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For Checkbox, Radio, Dropdown, Multi Select
  smart_field_type?: SmartFieldType;
  sort_order: number;
}

export interface FormSection {
  id: string;
  title: string;
  sort_order: number;
  fields: FormField[];
}

export interface DynamicForm {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_by: string;
  created_at: string;
  modified_by: string;
  modified_at: string;
  sections: FormSection[];
  automationRules?: string[]; // list of event triggers: e.g. 'New Patient', 'Implant Case', 'RCT Case', etc.
}

export interface FormSignatures {
  patient?: {
    signature: string; // Data URI or typed text
    type: 'draw' | 'type';
    timestamp: string;
    ip?: string;
  };
  doctor?: {
    signature: string;
    type: 'draw' | 'type';
    timestamp: string;
    ip?: string;
    doctor_name: string;
  };
  witness?: {
    signature: string;
    type: 'draw' | 'type';
    timestamp: string;
    ip?: string;
    witness_name: string;
  };
}

export interface PatientForm {
  id: string;
  patient_id: string;
  patient_name: string;
  form_id: string;
  form_name: string;
  version: string;
  status: 'Pending' | 'Completed' | 'Archived';
  assigned_at: string;
  assigned_by: string;
  completed_at?: string;
  completed_by?: string;
  answers?: Record<string, any>; // field_id -> input value
  signatures?: FormSignatures;
  pdf_url?: string;
}

const DEFAULT_FORMS: DynamicForm[] = [
  {
    id: 'f-medical-history',
    name: 'Medical History',
    description: 'Comprehensive patient medical assessment of systemic conditions, allergies, and active prescription records.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    automationRules: ['New Patient'],
    sections: [
      {
        id: 'sec-med-personal',
        title: 'Personal Information',
        sort_order: 1,
        fields: [
          { id: 'fld-med-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-med-page', type: 'Number', label: 'Age', required: true, smart_field_type: 'Age', sort_order: 2 },
          { id: 'fld-med-pgender', type: 'Dropdown', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'], smart_field_type: 'Gender', sort_order: 3 },
          { id: 'fld-med-pdate', type: 'Date', label: 'Today\'s Date', required: true, smart_field_type: 'Today\'s Date', sort_order: 4 }
        ]
      },
      {
        id: 'sec-med-conditions',
        title: 'Medical Conditions',
        sort_order: 2,
        fields: [
          { id: 'fld-med-heart', type: 'Radio Button', label: 'Do you have any history of heart disease, hypertension, or pacemaker?', required: true, options: ['Yes', 'No'], sort_order: 1 },
          { id: 'fld-med-pregnant', type: 'Radio Button', label: 'Are you currently pregnant or nursing?', required: false, options: ['Yes', 'No', 'N/A'], sort_order: 2 },
          { id: 'fld-med-diabetes', type: 'Radio Button', label: 'Do you have diabetes? (If yes, please specify your recent HbA1c in notes)', required: true, options: ['Yes', 'No'], sort_order: 3 },
          { id: 'fld-med-meds', type: 'Long Text', label: 'List any active daily medications you are currently taking', required: false, placeholder: 'E.g., Aspirin, Metformin, Amlodipine...', sort_order: 4 },
          { id: 'fld-med-allergies', type: 'Multi Select', label: 'Select any known allergies', required: false, options: ['Penicillin', 'Sulfa drugs', 'Latex', 'Aspirin', 'Local Anesthetics', 'Pollen', 'None'], sort_order: 5 }
        ]
      },
      {
        id: 'sec-med-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-med-psig', type: 'Signature', label: 'Patient digital signature authorization', required: true, sort_order: 1 }
        ]
      }
    ]
  },
  {
    id: 'f-dental-history',
    name: 'Dental History',
    description: 'Patient dental history record, brushing habits, bleeding gums, and initial clinical tooth selector chart.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    automationRules: ['New Patient'],
    sections: [
      {
        id: 'sec-dent-personal',
        title: 'Personal Information',
        sort_order: 1,
        fields: [
          { id: 'fld-dent-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-dent-pdate', type: 'Date', label: 'Record Date', required: true, smart_field_type: 'Today\'s Date', sort_order: 2 }
        ]
      },
      {
        id: 'sec-dent-habits',
        title: 'Clinical & Dental History',
        sort_order: 2,
        fields: [
          { id: 'fld-dent-reason', type: 'Long Text', label: 'What is the primary reason for your dental visit today?', required: true, placeholder: 'Tooth pain, bleeding gums, routine check-up, implants...', sort_order: 1 },
          { id: 'fld-dent-last', type: 'Date', label: 'Approximate date of your last professional dental evaluation', required: false, sort_order: 2 },
          { id: 'fld-dent-brush', type: 'Dropdown', label: 'How often do you brush your teeth?', required: true, options: ['Once a day', 'Twice a day', 'More than twice', 'Rarely'], sort_order: 3 },
          { id: 'fld-dent-bleed', type: 'Radio Button', label: 'Do your gums bleed while brushing or flossing?', required: true, options: ['Yes', 'No'], sort_order: 4 }
        ]
      },
      {
        id: 'sec-dent-chart',
        title: 'Clinical Examination',
        sort_order: 3,
        fields: [
          { id: 'fld-dent-teeth', type: 'Tooth Selector', label: 'Select teeth requiring clinical attention', required: false, sort_order: 1 },
          { id: 'fld-dent-notes', type: 'Long Text', label: 'Dentist clinical notes & diagnosis', required: false, placeholder: 'Enter periodontal pockets, active caries, calculus index...', sort_order: 2 },
          { id: 'fld-dent-doc', type: 'Doctor Selector', label: 'Examining Dentist', required: true, smart_field_type: 'Doctor', sort_order: 3 }
        ]
      }
    ]
  },
  {
    id: 'f-implant-consent',
    name: 'Implant Consent',
    description: 'Informed surgical consent for endosseous dental implants, outlining sinus lift, bone grafting, and integration risks.',
    version: '1.2',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    automationRules: ['Implant Case'],
    sections: [
      {
        id: 'sec-imp-details',
        title: 'Personal & Clinical Information',
        sort_order: 1,
        fields: [
          { id: 'fld-imp-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-imp-doc', type: 'Doctor Selector', label: 'Operating Dental Surgeon', required: true, smart_field_type: 'Doctor', sort_order: 2 },
          { id: 'fld-imp-treat', type: 'Treatment Selector', label: 'Treatment Plan', required: true, smart_field_type: 'Treatment', sort_order: 3 }
        ]
      },
      {
        id: 'sec-imp-text',
        title: 'Consent & Acknowledgement',
        sort_order: 2,
        fields: [
          {
            id: 'fld-imp-ack',
            type: 'Checkbox',
            label: 'Sinus/Bone Risk Disclosure & Success Agreement',
            required: true,
            options: [
              'I authorize Dr. Chaitanya and assistants to place surgical dental implants.',
              'I understand surgical risks: localized infection, sinus perforation, permanent nerve paresthesia, and implant osseointegration failure.',
              'I declare that I have fully disclosed all medical conditions, including uncontrolled diabetes, smoking habits, or active osteoporosis bisphosphonate therapy.'
            ],
            sort_order: 1
          }
        ]
      },
      {
        id: 'sec-imp-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-imp-psig', type: 'Signature', label: 'Patient digital signature', required: true, sort_order: 1 },
          { id: 'fld-imp-dsig', type: 'Signature', label: 'Doctor digital authorization', required: true, sort_order: 2 },
          { id: 'fld-imp-wsig', type: 'Signature', label: 'Witness digital signature', required: true, sort_order: 3 }
        ]
      }
    ]
  },
  {
    id: 'f-rct-consent',
    name: 'RCT Consent',
    description: 'Root Canal Treatment informed consent covering mechanical preparation, chemical irrigation, and crown requirements.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    automationRules: ['RCT Case'],
    sections: [
      {
        id: 'sec-rct-details',
        title: 'Personal Information',
        sort_order: 1,
        fields: [
          { id: 'fld-rct-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-rct-teeth', type: 'Tooth Selector', label: 'Specify Tooth for RCT', required: true, sort_order: 2 }
        ]
      },
      {
        id: 'sec-rct-consent',
        title: 'Consent & Procedural Risks',
        sort_order: 2,
        fields: [
          {
            id: 'fld-rct-ack',
            type: 'Checkbox',
            label: 'RCT Procedural Risks & Full Crown Agreement',
            required: true,
            options: [
              'I understand that RCT aims to save my natural pulpally-involved tooth from extraction.',
              'I am aware of risks: instrument fracture in root canals, calcified canals, root perforations, and potential future fracture if a crown is not placed.',
              'I agree that placing a post-operative protective dental crown is critical to treatment longevity.'
            ],
            sort_order: 1
          }
        ]
      },
      {
        id: 'sec-rct-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-rct-psig', type: 'Signature', label: 'Patient digital signature', required: true, sort_order: 1 },
          { id: 'fld-rct-dsig', type: 'Signature', label: 'Operating Dentist signature', required: true, sort_order: 2 }
        ]
      }
    ]
  },
  {
    id: 'f-extraction-consent',
    name: 'Extraction Consent',
    description: 'Informed surgical consent for tooth extraction, listing dry socket, localized osteitis, and prosthetic options.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    automationRules: ['Extraction'],
    sections: [
      {
        id: 'sec-ext-details',
        title: 'Personal Information',
        sort_order: 1,
        fields: [
          { id: 'fld-ext-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-ext-teeth', type: 'Tooth Selector', label: 'Specify Tooth/Teeth for Extraction', required: true, sort_order: 2 }
        ]
      },
      {
        id: 'sec-ext-text',
        title: 'Informed Consent',
        sort_order: 2,
        fields: [
          {
            id: 'fld-ext-ack',
            type: 'Checkbox',
            label: 'I understand and authorize the extraction under local anesthesia',
            required: true,
            options: [
              'I understand that extraction is irreversible and alternative prosthesis replacement has been explained.',
              'I am aware of post-extraction complications: swelling, dry socket, localized bone osteitis, heavy bleeding, or temporary numbness.',
              'I agree to comply strictly with post-operative care instructions (no spitting, smoking, or vigorous rinsing for 24 hours).'
            ],
            sort_order: 1
          }
        ]
      },
      {
        id: 'sec-ext-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-ext-psig', type: 'Signature', label: 'Patient Signature', required: true, sort_order: 1 },
          { id: 'fld-ext-wsig', type: 'Signature', label: 'Witness Signature', required: true, sort_order: 2 }
        ]
      }
    ]
  },
  {
    id: 'f-orthodontic-assessment',
    name: 'Orthodontic Assessment',
    description: 'Detailed orthodontic malocclusion evaluation, appliance recommendation, and treatment timelines.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    automationRules: ['Orthodontics'],
    sections: [
      {
        id: 'sec-ortho-info',
        title: 'Clinical Examination',
        sort_order: 1,
        fields: [
          { id: 'fld-ortho-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-ortho-class', type: 'Dropdown', label: 'Angle\'s Malocclusion Class', required: true, options: ['Class I', 'Class II Division 1', 'Class II Division 2', 'Class III'], sort_order: 2 },
          { id: 'fld-ortho-oj', type: 'Number', label: 'Measured Overjet (mm)', required: true, sort_order: 3 },
          { id: 'fld-ortho-ob', type: 'Number', label: 'Measured Overbite (%)', required: true, sort_order: 4 },
          { id: 'fld-ortho-crowd', type: 'Multi Select', label: 'Crowding or Spacing Issues', required: false, options: ['Maxillary Crowding', 'Maxillary Spacing', 'Mandibular Crowding', 'Mandibular Spacing', 'None'], sort_order: 5 }
        ]
      },
      {
        id: 'sec-ortho-plan',
        title: 'Treatment Plan',
        sort_order: 2,
        fields: [
          { id: 'fld-ortho-app', type: 'Dropdown', label: 'Recommended Appliance', required: true, options: ['Metal Braces', 'Ceramic Braces', 'Self-Ligating Braces', 'Clear Aligners'], sort_order: 1 },
          { id: 'fld-ortho-dur', type: 'Number', label: 'Estimated Active Treatment Duration (months)', required: true, sort_order: 2 },
          { id: 'fld-ortho-notes', type: 'Long Text', label: 'Special Orthodontic Instructions', required: false, placeholder: 'E.g., Premolar extraction required, elastic pattern...', sort_order: 3 },
          { id: 'fld-ortho-doc', type: 'Doctor Selector', label: 'Orthodontist Specialist', required: true, smart_field_type: 'Doctor', sort_order: 4 }
        ]
      }
    ]
  },
  {
    id: 'f-smile-design',
    name: 'Smile Design Consultation',
    description: 'Esthetic smile evaluation form, shade selection, visual dental photography consent, and facial proportions mockup tracking.',
    version: '1.1',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    automationRules: ['Smile Design'],
    sections: [
      {
        id: 'sec-smile-aesthetic',
        title: 'Aesthetic Analysis',
        sort_order: 1,
        fields: [
          { id: 'fld-smile-pname', type: 'Short Text', label: 'Patient Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-smile-concerns', type: 'Long Text', label: 'What are your primary smile concerns?', required: true, placeholder: 'Tooth color, spacing, crooked teeth, chips...', sort_order: 2 },
          { id: 'fld-smile-lip', type: 'Dropdown', label: 'Lip Line Height during dynamic smile', required: true, options: ['Low', 'Medium/Normal', 'High (Gummy)'], sort_order: 3 },
          { id: 'fld-smile-shade', type: 'Dropdown', label: 'Preferred Tooth Shade', required: true, options: ['Bleach OM1', 'Bleach OM3', 'A1 (Extra Light)', 'A2 (Light)', 'A3 (Natural Medium)', 'B1 (Bright Natural)'], sort_order: 4 }
        ]
      },
      {
        id: 'sec-smile-records',
        title: 'Clinical Records & Photography Consent',
        sort_order: 2,
        fields: [
          { id: 'fld-smile-upload', type: 'Image Upload', label: 'Pre-operative smile photo (front face closeup)', required: false, sort_order: 1 },
          { id: 'fld-smile-consent', type: 'Checkbox', label: 'I consent to clinical photographic records for dental mockup', required: true, options: ['I agree to the collection of clinical photos for digital smile design mockups.'], sort_order: 2 }
        ]
      },
      {
        id: 'sec-smile-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-smile-psig', type: 'Signature', label: 'Patient digital authorization', required: true, sort_order: 1 }
        ]
      }
    ]
  },
  {
    id: 'f-treatment-estimate',
    name: 'Treatment Estimate Approval',
    description: 'Formal estimate and cost schedule review, phase mapping, payment milestones, and patient financial consent.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    automationRules: [],
    sections: [
      {
        id: 'sec-est-details',
        title: 'Personal & Financial Information',
        sort_order: 1,
        fields: [
          { id: 'fld-est-pname', type: 'Short Text', label: 'Patient Full Name', required: true, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-est-inv', type: 'Short Text', label: 'Invoice / Estimate Number', required: true, smart_field_type: 'Invoice Number', sort_order: 2 },
          { id: 'fld-est-treat', type: 'Treatment Selector', label: 'Treatment Approved', required: true, smart_field_type: 'Treatment', sort_order: 3 },
          { id: 'fld-est-cost', type: 'Number', label: 'Approved Estimated Cost (₹)', required: true, sort_order: 4 },
          { id: 'fld-est-terms', type: 'Dropdown', label: 'Milestone Payment Terms', required: true, options: ['Full Pre-payment (5% discount)', '50% Adv / 50% Completion', 'Per-Visit Charges', 'Interest-Free EMI (3 Months)', 'Interest-Free EMI (6 Months)'], sort_order: 5 }
        ]
      },
      {
        id: 'sec-est-consent',
        title: 'Consent & Acknowledgement',
        sort_order: 2,
        fields: [
          {
            id: 'fld-est-ack',
            type: 'Checkbox',
            label: 'Estimate Agreement & Clinic Financial Terms',
            required: true,
            options: [
              'I have reviewed the comprehensive dental treatment estimate.',
              'I agree to fulfill the financial payments according to the milestone phases selected above.',
              'I understand that clinical changes or tooth complications during treatment may alter final billing (if changes exceed 10%, a revised estimate will be provided).'
            ],
            sort_order: 1
          }
        ]
      },
      {
        id: 'sec-est-sigs',
        title: 'Signatures',
        sort_order: 3,
        fields: [
          { id: 'fld-est-psig', type: 'Signature', label: 'Patient digital authorization', required: true, sort_order: 1 },
          { id: 'fld-est-dsig', type: 'Signature', label: 'Clinic Financial Representative / Coordinator', required: true, sort_order: 2 }
        ]
      }
    ]
  },
  {
    id: 'f-patient-feedback',
    name: 'Patient Feedback',
    description: 'Post-treatment patient clinical and administrative feedback and service rating card.',
    version: '1.0',
    status: 'Published',
    created_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    modified_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    modified_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    automationRules: ['Follow-up Visit'],
    sections: [
      {
        id: 'sec-feed-ratings',
        title: 'Experience Survey',
        sort_order: 1,
        fields: [
          { id: 'fld-feed-pname', type: 'Short Text', label: 'Patient Name (Optional)', required: false, smart_field_type: 'Patient Name', sort_order: 1 },
          { id: 'fld-feed-clinic', type: 'Radio Button', label: 'Overall clinic infrastructure and cleanliness', required: true, options: ['Excellent', 'Good', 'Average', 'Poor'], sort_order: 2 },
          { id: 'fld-feed-doc', type: 'Radio Button', label: 'Dentist gentleness and clinical explanations', required: true, options: ['Highly Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'], sort_order: 3 },
          { id: 'fld-feed-waiting', type: 'Radio Button', label: 'Reception cordiality and waiting time satisfaction', required: true, options: ['Highly Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'], sort_order: 4 }
        ]
      },
      {
        id: 'sec-feed-notes',
        title: 'Detailed Remarks',
        sort_order: 2,
        fields: [
          { id: 'fld-feed-good', type: 'Long Text', label: 'What did you like most about our team and service?', required: false, placeholder: 'Share your positive dental experience...', sort_order: 1 },
          { id: 'fld-feed-bad', type: 'Long Text', label: 'What are your suggestions for clinic or service improvement?', required: false, placeholder: 'Waiting lines, pricing, communication issues...', sort_order: 2 }
        ]
      }
    ]
  }
];

// Memory Fallback variables
let formsCache: DynamicForm[] = [];
let submissionsCache: PatientForm[] = [];

function initializeStore() {
  if (typeof window === 'undefined') return;
  try {
    const cachedForms = localStorage.getItem('srichaitanya_dynamic_forms');
    if (cachedForms) {
      formsCache = JSON.parse(cachedForms);
    } else {
      formsCache = [...DEFAULT_FORMS];
      localStorage.setItem('srichaitanya_dynamic_forms', JSON.stringify(formsCache));
    }

    const cachedSubs = localStorage.getItem('srichaitanya_form_submissions');
    if (cachedSubs) {
      submissionsCache = JSON.parse(cachedSubs);
    } else {
      submissionsCache = [];
      localStorage.setItem('srichaitanya_form_submissions', JSON.stringify(submissionsCache));
    }
  } catch (e) {
    console.error('Error initializing Document Studio storage', e);
    formsCache = [...DEFAULT_FORMS];
    submissionsCache = [];
  }
}

initializeStore();

const saveCacheToLocal = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('srichaitanya_dynamic_forms', JSON.stringify(formsCache));
    localStorage.setItem('srichaitanya_form_submissions', JSON.stringify(submissionsCache));
    window.dispatchEvent(new Event('forms-store-changed'));
  } catch (e) {
    console.error('Error writing to localStorage cache', e);
  }
};

export const formBuilderStore = {
  getForms: async (): Promise<DynamicForm[]> => {
    // If Supabase is configured, we could select from dynamic_forms.
    // For zero-error robustness, we use a hybrid sync pattern: LocalStorage as master client state,
    // backed up to Supabase when possible, falling back seamlessly with 100% full features.
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('dynamic_forms').select('*');
        if (!error && data && data.length > 0) {
          // Format from database if structure differs
          // We can parse or trust. For now, use hybrid cache to prevent any latency lag or missing rules
        }
      } catch {}
    }
    return formsCache.filter(f => f.status !== 'Archived');
  },

  getAllFormsWithArchived: async (): Promise<DynamicForm[]> => {
    return formsCache;
  },

  saveForm: async (form: DynamicForm): Promise<DynamicForm> => {
    const idx = formsCache.findIndex(f => f.id === form.id);
    if (idx !== -1) {
      formsCache[idx] = { ...form, modified_at: new Date().toISOString() };
    } else {
      formsCache.push({ ...form, created_at: new Date().toISOString(), modified_at: new Date().toISOString() });
    }
    saveCacheToLocal();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('dynamic_forms').upsert({
          id: form.id,
          name: form.name,
          description: form.description,
          version: form.version,
          status: form.status,
          created_by: form.created_by,
          modified_by: form.modified_by,
          sections: form.sections,
          automation_rules: form.automationRules
        });
      } catch (err) {
        console.warn('Supabase form save failed, saved locally:', err);
      }
    }
    return form;
  },

  archiveForm: async (id: string): Promise<boolean> => {
    const idx = formsCache.findIndex(f => f.id === id);
    if (idx !== -1) {
      formsCache[idx].status = 'Archived';
      formsCache[idx].modified_at = new Date().toISOString();
      saveCacheToLocal();

      if (isSupabaseConfigured) {
        try {
          await supabase.from('dynamic_forms').update({ status: 'Archived' }).eq('id', id);
        } catch {}
      }
      return true;
    }
    return false;
  },

  getPatientForms: async (patientId: string): Promise<PatientForm[]> => {
    return submissionsCache.filter(sf => sf.patient_id === patientId);
  },

  getGlobalSubmissions: async (): Promise<PatientForm[]> => {
    return submissionsCache;
  },

  assignFormToPatient: async (patientId: string, patientName: string, formId: string, assignedBy: string): Promise<PatientForm | null> => {
    const formDef = formsCache.find(f => f.id === formId);
    if (!formDef) return null;

    const newPatientForm: PatientForm = {
      id: `pf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      patient_id: patientId,
      patient_name: patientName,
      form_id: formDef.id,
      form_name: formDef.name,
      version: formDef.version,
      status: 'Pending',
      assigned_at: new Date().toISOString(),
      assigned_by: assignedBy,
      answers: {}
    };

    submissionsCache.unshift(newPatientForm);
    saveCacheToLocal();

    // Trigger local timeline log if available
    formBuilderStore.addPatientTimelineEvent(patientId, `Dynamic Form Assigned: ${formDef.name} (v${formDef.version}) by ${assignedBy}`);

    return newPatientForm;
  },

  submitPatientForm: async (
    patientId: string,
    patientFormId: string,
    answers: Record<string, any>,
    signatures: FormSignatures,
    completedBy: string
  ): Promise<PatientForm | null> => {
    const idx = submissionsCache.findIndex(sf => sf.id === patientFormId);
    if (idx === -1) return null;

    const current = submissionsCache[idx];
    const updated: PatientForm = {
      ...current,
      status: 'Completed',
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      answers,
      signatures
    };

    submissionsCache[idx] = updated;
    saveCacheToLocal();

    // Log completion to the patient timeline
    formBuilderStore.addPatientTimelineEvent(patientId, `Dynamic Form Completed: ${current.form_name} (Signed & Archived)`);

    return updated;
  },

  archivePatientForm: async (patientFormId: string): Promise<boolean> => {
    const idx = submissionsCache.findIndex(sf => sf.id === patientFormId);
    if (idx !== -1) {
      submissionsCache[idx].status = 'Archived';
      saveCacheToLocal();
      return true;
    }
    return false;
  },

  // Helper to trigger automated assignment based on event rules
  triggerAutomatedAssignment: async (triggerEvent: string, patientId: string, patientName: string, assignedBy: string): Promise<number> => {
    let assignedCount = 0;
    // Find all published forms that contain this trigger in their rules
    const triggerLower = triggerEvent.toLowerCase().trim();
    const matches = formsCache.filter(f =>
      f.status === 'Published' &&
      f.automationRules &&
      f.automationRules.some(rule => rule.toLowerCase().trim() === triggerLower)
    );

    for (const form of matches) {
      // Check if patient already has a pending slot for this form to avoid duplicates
      const hasPending = submissionsCache.some(sf =>
        sf.patient_id === patientId &&
        sf.form_id === form.id &&
        sf.status === 'Pending'
      );

      if (!hasPending) {
        await formBuilderStore.assignFormToPatient(patientId, patientName, form.id, assignedBy);
        assignedCount++;
      }
    }

    return assignedCount;
  },

  // Log visual events on the patient's record timeline
  addPatientTimelineEvent: (patientId: string, detail: string) => {
    try {
      const stored = localStorage.getItem('patient_timelines');
      const timelines = stored ? JSON.parse(stored) : {};
      if (!timelines[patientId]) timelines[patientId] = [];
      timelines[patientId].unshift({
        id: `evt-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        category: 'Clinical Documents',
        title: 'Document Studio System',
        details: detail,
        created_by: 'Automation Engine'
      });
      localStorage.setItem('patient_timelines', JSON.stringify(timelines));
      window.dispatchEvent(new Event('patient-timeline-updated'));
    } catch (e) {
      console.warn('Could not update timeline log:', e);
    }
  }
};
