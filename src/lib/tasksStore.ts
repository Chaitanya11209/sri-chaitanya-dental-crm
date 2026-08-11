import { supabase, isSupabaseConfigured } from './supabase';

export interface Task {
  id: string;
  task_code: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  patient_id?: string;
  patient_name?: string;
  assigned_by: string;
  assigned_to: string;
  department: 'Clinical' | 'Front Desk' | 'Billing' | 'Lab' | 'Admin';
  due_date: string;
  status: 'New' | 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Archived';
  task_type: string;
  created_at: string;
  completed_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  author_role: string;
  comment_text: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  file_size: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface TaskNotification {
  id: string;
  task_id: string;
  title: string;
  message: string;
  recipient: string; // User email or role or name
  is_read: boolean;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  changed_by: string;
  action: string;
  details: string;
  created_at: string;
}

// Memory / LocalStorage Seed Data
const DEFAULT_TASKS: Task[] = [
  {
    id: 't-101',
    task_code: 'TSK-1001',
    title: 'Verify OPG Radiograph & Pre-op Blood report',
    description: 'Bhavana Rao is scheduled for dental implant. Need to confirm alveolar ridge bone classification from OPG and pre-op blood sugar levels (HbA1c).',
    priority: 'Critical',
    patient_id: '101',
    patient_name: 'Bhavana Rao',
    assigned_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    assigned_to: 'Dr. Durga Bhavani Jupalli',
    department: 'Clinical',
    due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0], // tomorrow
    status: 'In Progress',
    task_type: 'Review Clinical Notes',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 't-102',
    task_code: 'TSK-1002',
    title: 'Post-Op Call: Tissue Biopsy Healing Review',
    description: 'Call Sushma Reddy to review healing after the biopsy of the oral tissue histology. Check if bleeding has fully stopped.',
    priority: 'High',
    patient_id: '1',
    patient_name: 'Sushma Reddy',
    assigned_by: 'Dr. Durga Bhavani Jupalli',
    assigned_to: 'Bhavani',
    department: 'Front Desk',
    due_date: new Date().toISOString().split('T')[0], // today
    status: 'Assigned',
    task_type: 'Call Patient',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 't-103',
    task_code: 'TSK-1003',
    title: 'Collect pending outstanding denture payment',
    description: 'Collect pending billing balance of ₹8,500 from Aditya Sharma for finalized denture crown treatment series.',
    priority: 'Medium',
    patient_id: '2',
    patient_name: 'Aditya Sharma',
    assigned_by: 'Dr. Durga Bhavani Jupalli',
    assigned_to: 'Receptionist Pooja',
    department: 'Billing',
    due_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], // overdue
    status: 'Waiting',
    task_type: 'Collect Payment',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 't-104',
    task_code: 'TSK-1004',
    title: 'Sterilize Implant Surgical Kit & Cabin 2 Prep',
    description: 'Autoclave implant cassettes, prepare dental surgical engine, check irrigation tubing, and stock cold saline.',
    priority: 'High',
    assigned_by: 'Dr. Durga Bhavani Jupalli',
    assigned_to: 'Assistant Kishore',
    department: 'Clinical',
    due_date: new Date().toISOString().split('T')[0], // today
    status: 'In Progress',
    task_type: 'Prepare Treatment Room',
    created_at: new Date(Date.now() - 10000000).toISOString()
  },
  {
    id: 't-105',
    task_code: 'TSK-1005',
    title: 'Lab Delivery Coordination - Zirconia Crown',
    description: 'Contact Chaitanya Dental Labs to confirm delivery of zirconia crown for tooth 14 crown prep case.',
    priority: 'Medium',
    assigned_by: 'Dr. Durga Bhavani Jupalli',
    assigned_to: 'Lab Tech Ravi',
    department: 'Lab',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'New',
    task_type: 'Lab Delivery',
    created_at: new Date(Date.now() - 5000000).toISOString()
  }
];

const DEFAULT_COMMENTS: TaskComment[] = [
  {
    id: 'c-1',
    task_id: 't-101',
    author_name: 'Dr. Durga Bhavani Jupalli',
    author_role: 'doctor',
    comment_text: 'I reviewed the CBCT. Bone density is perfect (D2) and width is 6.5mm. Ready for implant.',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'c-2',
    task_id: 't-103',
    author_name: 'Receptionist Pooja',
    author_role: 'receptionist',
    comment_text: 'Patient requested to split the payment into two installments. He will pay the first ₹4,000 tomorrow.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

const DEFAULT_HISTORY: TaskHistory[] = [
  {
    id: 'h-1',
    task_id: 't-101',
    changed_by: 'Dr. Durga Bhavani Jupalli (Admin)',
    action: 'Created',
    details: 'Initial clinical task assigned for OPG verification.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// Helper to check if tables exist and can be loaded.
// If tables do not exist, this will fail and we seamlessly fall back to localStorage.
let useLocalOnly = !isSupabaseConfigured;

function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
  }
  return defaultValue;
}

function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Dispatch global event for live reactive syncing across tabs/components
    window.dispatchEvent(new Event('tasks-changed'));
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
}

// Sync helper
export const tasksStore = {
  getTasks: async (): Promise<Task[]> => {
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as Task[];
        console.warn('Supabase tasks fetch error, falling back to local storage:', error?.message);
      } catch (e) {
        console.warn('Supabase tasks query failed, using offline cache');
      }
    }
    return getLocalStorage<Task[]>('crm_tasks_list', DEFAULT_TASKS);
  },

  saveTask: async (task: Task, changedBy: string): Promise<Task> => {
    // Generate code if missing
    if (!task.task_code) {
      const all = await tasksStore.getTasks();
      const nextNum = all.length > 0 ? Math.max(...all.map(t => parseInt(t.task_code.replace('TSK-', '')) || 1000)) + 1 : 1001;
      task.task_code = `TSK-${nextNum}`;
    }

    const isNew = !task.id;
    if (isNew) {
      task.id = `t-${Date.now()}`;
      task.created_at = new Date().toISOString();
    }

    if (task.status === 'Completed' && !task.completed_at) {
      task.completed_at = new Date().toISOString();
    }

    // Save history entry
    const historyDetail = isNew 
      ? `Task created and assigned to ${task.assigned_to}.`
      : `Task details modified. Status: ${task.status}.`;
    
    await tasksStore.addHistory({
      id: `h-${Date.now()}`,
      task_id: task.id,
      changed_by: changedBy,
      action: isNew ? 'Created' : 'Status Changed',
      details: historyDetail,
      created_at: new Date().toISOString()
    });

    // Create Notification
    await tasksStore.createNotification({
      id: `n-${Date.now()}`,
      task_id: task.id,
      title: isNew ? 'New Task Assigned' : 'Task Updated',
      message: isNew ? `You have been assigned task "${task.title}": ${task.description}` : `Task "${task.title}" status updated to ${task.status}`,
      recipient: task.assigned_to,
      is_read: false,
      created_at: new Date().toISOString()
    });

    // Handle Supabase save
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .upsert([task])
          .select();
        if (!error && data && data.length > 0) {
          window.dispatchEvent(new Event('tasks-changed'));
          return data[0] as Task;
        }
        console.warn('Supabase tasks upsert error, falling back to local storage:', error?.message);
      } catch (e) {
        console.warn('Supabase tasks save failed, using local fallback');
      }
    }

    const localTasks = getLocalStorage<Task[]>('crm_tasks_list', DEFAULT_TASKS);
    let updatedTasks: Task[] = [];
    if (isNew) {
      updatedTasks = [task, ...localTasks];
    } else {
      updatedTasks = localTasks.map(t => t.id === task.id ? task : t);
    }
    setLocalStorage('crm_tasks_list', updatedTasks);
    return task;
  },

  deleteTask: async (id: string): Promise<boolean> => {
    if (!useLocalOnly) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) {
          window.dispatchEvent(new Event('tasks-changed'));
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteTask failed');
      }
    }
    const localTasks = getLocalStorage<Task[]>('crm_tasks_list', DEFAULT_TASKS);
    const filtered = localTasks.filter(t => t.id !== id);
    setLocalStorage('crm_tasks_list', filtered);
    return true;
  },

  getComments: async (taskId: string): Promise<TaskComment[]> => {
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });
        if (!error && data) return data as TaskComment[];
      } catch (e) {
        console.warn('Supabase getComments failed');
      }
    }
    const localComments = getLocalStorage<TaskComment[]>('crm_task_comments', DEFAULT_COMMENTS);
    return localComments.filter(c => c.task_id === taskId);
  },

  addComment: async (comment: Omit<TaskComment, 'id' | 'created_at'>): Promise<TaskComment> => {
    const newComment: TaskComment = {
      ...comment,
      id: `c-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    // Save history
    await tasksStore.addHistory({
      id: `h-${Date.now()}`,
      task_id: comment.task_id,
      changed_by: comment.author_name,
      action: 'Comment Added',
      details: `Comment: "${comment.comment_text.substring(0, 35)}..."`,
      created_at: new Date().toISOString()
    });

    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .insert([newComment])
          .select();
        if (!error && data && data.length > 0) {
          window.dispatchEvent(new Event('tasks-changed'));
          return data[0] as TaskComment;
        }
      } catch (e) {
        console.warn('Supabase addComment failed');
      }
    }

    const localComments = getLocalStorage<TaskComment[]>('crm_task_comments', DEFAULT_COMMENTS);
    const updated = [...localComments, newComment];
    setLocalStorage('crm_task_comments', updated);
    return newComment;
  },

  getAttachments: async (taskId: string): Promise<TaskAttachment[]> => {
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });
        if (!error && data) return data as TaskAttachment[];
      } catch (e) {
        console.warn('Supabase getAttachments failed');
      }
    }
    const localAttachments = getLocalStorage<TaskAttachment[]>('crm_task_attachments', []);
    return localAttachments.filter(a => a.task_id === taskId);
  },

  addAttachment: async (attachment: Omit<TaskAttachment, 'id' | 'created_at'>): Promise<TaskAttachment> => {
    const newAttachment: TaskAttachment = {
      ...attachment,
      id: `att-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    // Save history
    await tasksStore.addHistory({
      id: `h-${Date.now()}`,
      task_id: attachment.task_id,
      changed_by: attachment.uploaded_by,
      action: 'Attachment Uploaded',
      details: `File "${attachment.file_name}" attached to task.`,
      created_at: new Date().toISOString()
    });

    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .insert([newAttachment])
          .select();
        if (!error && data && data.length > 0) {
          window.dispatchEvent(new Event('tasks-changed'));
          return data[0] as TaskAttachment;
        }
      } catch (e) {
        console.warn('Supabase addAttachment failed');
      }
    }

    const localAttachments = getLocalStorage<TaskAttachment[]>('crm_task_attachments', []);
    const updated = [...localAttachments, newAttachment];
    setLocalStorage('crm_task_attachments', updated);
    return newAttachment;
  },

  getHistory: async (taskId: string): Promise<TaskHistory[]> => {
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
        if (!error && data) return data as TaskHistory[];
      } catch (e) {
        console.warn('Supabase getHistory failed');
      }
    }
    const localHistory = getLocalStorage<TaskHistory[]>('crm_task_history', DEFAULT_HISTORY);
    return localHistory.filter(h => h.task_id === taskId).sort((a,b) => b.created_at.localeCompare(a.created_at));
  },

  addHistory: async (history: TaskHistory): Promise<void> => {
    if (!useLocalOnly) {
      try {
        await supabase.from('task_history').insert([history]);
      } catch (e) {
        console.warn('Supabase addHistory failed');
      }
    }
    const localHistory = getLocalStorage<TaskHistory[]>('crm_task_history', DEFAULT_HISTORY);
    setLocalStorage('crm_task_history', [history, ...localHistory]);
  },

  getNotifications: async (recipient: string): Promise<TaskNotification[]> => {
    if (!useLocalOnly) {
      try {
        const { data, error } = await supabase
          .from('task_notifications')
          .select('*')
          .eq('recipient', recipient)
          .order('created_at', { ascending: false });
        if (!error && data) return data as TaskNotification[];
      } catch (e) {
        console.warn('Supabase getNotifications failed');
      }
    }
    const localNotifications = getLocalStorage<TaskNotification[]>('crm_task_notifications', []);
    return localNotifications.filter(n => n.recipient.toLowerCase().includes(recipient.toLowerCase()) || recipient.toLowerCase().includes(n.recipient.toLowerCase()));
  },

  createNotification: async (notification: TaskNotification): Promise<void> => {
    if (!useLocalOnly) {
      try {
        await supabase.from('task_notifications').insert([notification]);
      } catch (e) {
        console.warn('Supabase createNotification failed');
      }
    }
    const localNotifications = getLocalStorage<TaskNotification[]>('crm_task_notifications', []);
    setLocalStorage('crm_task_notifications', [notification, ...localNotifications]);
  },

  markNotificationRead: async (id: string): Promise<void> => {
    if (!useLocalOnly) {
      try {
        await supabase.from('task_notifications').update({ is_read: true }).eq('id', id);
      } catch (e) {
        console.warn('Supabase markNotificationRead failed');
      }
    }
    const localNotifications = getLocalStorage<TaskNotification[]>('crm_task_notifications', []);
    const updated = localNotifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    setLocalStorage('crm_task_notifications', updated);
  },

  // Module 6: Automatic Task Engine
  createAutomaticTask: async (
    type: 'Lab Case Sent' | 'Payment Pending' | 'Treatment Plan Accepted' | 'Consent Missing' | 'Recall Due' | 'Implant Review Due' | 'RCT Review Due' | 'Patient Missed Appointment',
    patientName: string,
    patientId?: string,
    customDetails?: string
  ): Promise<Task> => {
    let title = '';
    let description = '';
    let priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    let assigned_to = 'Receptionist Pooja';
    let department: Task['department'] = 'Front Desk';
    let task_type = 'General Task';

    switch (type) {
      case 'Lab Case Sent':
        title = `Lab Case Follow-up: ${patientName}`;
        description = customDetails || `A lab request has been set to In Process for ${patientName}. Monitor Chaitanya Labs delivery schedule and verify prosthetic fit on arrival.`;
        priority = 'Medium';
        assigned_to = 'Assistant Kishore';
        department = 'Lab';
        task_type = 'Lab Follow-up';
        break;
      case 'Payment Pending':
        title = `Outstanding Balance Collection: ${patientName}`;
        description = customDetails || `Billing transaction for ${patientName} remains unpaid. Contact patient to collect payment and finalize invoice.`;
        priority = 'High';
        assigned_to = 'Bhavani';
        department = 'Billing';
        task_type = 'Collect Payment';
        break;
      case 'Treatment Plan Accepted':
        title = `Coordinate appointments for approved plan: ${patientName}`;
        description = customDetails || `Patient ${patientName} accepted their dental treatment plan. Schedule upcoming clinical steps and verify surgical stocks.`;
        priority = 'High';
        assigned_to = 'Receptionist Pooja';
        department = 'Front Desk';
        task_type = 'Patient Follow-up';
        break;
      case 'Consent Missing':
        title = `Acquire Informed Clinical Consent: ${patientName}`;
        description = customDetails || `Surgical/Endodontic procedure planned but signed informed clinical consent is missing. Secure signature before chair entry.`;
        priority = 'Critical';
        assigned_to = 'Assistant Kishore';
        department = 'Clinical';
        task_type = 'Consent Pending';
        break;
      case 'Recall Due':
        title = `Schedule bi-annual preventive recall: ${patientName}`;
        description = customDetails || `Patient ${patientName} is due for their 6-month hygiene recall & scaling session. Call to lock a weekend slot.`;
        priority = 'Low';
        assigned_to = 'Receptionist Pooja';
        department = 'Front Desk';
        task_type = 'Recall Due';
        break;
      case 'Implant Review Due':
        title = `Post-op Dental Implant review: ${patientName}`;
        description = customDetails || `Scheduled implant evaluation due for ${patientName}. Verify osteointegration and torque values.`;
        priority = 'High';
        assigned_to = 'Dr. Durga Bhavani Jupalli';
        department = 'Clinical';
        task_type = 'Implant Review Due';
        break;
      case 'RCT Review Due':
        title = `Post-op Root Canal check & crown planning: ${patientName}`;
        description = customDetails || `Follow-up evaluation on treated tooth root morphology and temporary obturation dressing for ${patientName}.`;
        priority = 'High';
        assigned_to = 'Dr. Durga Bhavani Jupalli';
        department = 'Clinical';
        task_type = 'RCT Review Due';
        break;
      case 'Patient Missed Appointment':
        title = `Missed Slot Follow-up & Rescheduling: ${patientName}`;
        description = customDetails || `Patient missed their scheduled appointment slot today. Call to inspect issue and reschedule immediately.`;
        priority = 'High';
        assigned_to = 'Bhavani';
        department = 'Front Desk';
        task_type = 'Call Patient';
        break;
    }

    const newTask: Task = {
      id: `t-${Date.now()}`,
      task_code: '', // Will be generated in saveTask
      title,
      description,
      priority,
      patient_id: patientId,
      patient_name: patientName,
      assigned_by: 'Automation Engine',
      assigned_to,
      department,
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
      status: 'New',
      task_type,
      created_at: new Date().toISOString()
    };

    return await tasksStore.saveTask(newTask, 'Automation Engine');
  }
};
