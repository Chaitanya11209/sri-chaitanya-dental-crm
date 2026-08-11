export type DocumentStatus = 'Draft' | 'Under Review' | 'Approved' | 'Published' | 'Archived';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: string;
  content: string;
  changelog: string;
  created_at: string;
  performed_by_id?: string;
  performed_by_name: string;
  approved_by_id?: string;
  approved_by_name?: string;
  approved_at?: string;
}

export interface DocumentAcknowledgement {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  acknowledged_at: string;
  comments?: string;
}

export interface EmbeddedChecklist {
  id: string;
  title: string;
  items: {
    id: string;
    text: string;
    checked: boolean;
  }[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  status: DocumentStatus;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
  author_id?: string;
  author_name: string;
  approver_id?: string;
  approver_name?: string;
  approval_date?: string;
  current_version: string;
  tags: string[];
  views_count: number;
  
  // Content details
  content: string; // Rich Text
  image_urls?: string[];
  video_url?: string;
  attachments?: { name: string; url: string; size?: string }[];
  hyperlinks?: { label: string; url: string }[];
  checklists?: EmbeddedChecklist[];
}

export interface ReusableChecklist {
  id: string;
  title: string;
  category: string; // e.g. 'Operatory Opening', 'Sterilization Cycle'
  description?: string;
  items: {
    id: string;
    text: string;
    checked: boolean;
  }[];
  last_completed_at?: string;
  last_completed_by?: string;
  completion_history?: {
    date: string;
    by_name: string;
    notes?: string;
  }[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  serial_number: string;
  category: string; // e.g. 'Chair', 'Autoclave', 'X-Ray Sensor'
  manual_url?: string;
  maintenance_instructions?: string;
  calibration_schedule?: string; // cron or string e.g. 'Every 3 Months'
  last_calibration_date?: string;
  next_calibration_date?: string;
  warranty_expiry?: string;
  vendor_name: string;
  vendor_contact: string;
}

export interface TrainingMaterial {
  id: string;
  title: string;
  type: 'Video' | 'PDF' | 'Presentation' | 'Assessment';
  category: string;
  url: string;
  description?: string;
  duration?: string; // e.g. '15 mins'
  assessment_questions?: {
    id: string;
    question: string;
    options: string[];
    correct_option_index: number;
  }[];
}

export interface TrainingProgress {
  id: string;
  material_id: string;
  user_id: string;
  user_name: string;
  completed_at?: string;
  score?: number; // for assessment
  status: 'In Progress' | 'Completed';
}
