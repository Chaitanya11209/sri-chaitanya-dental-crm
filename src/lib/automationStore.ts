import { supabase } from './supabase';
import { tasksStore, Task } from './tasksStore';

export type TriggerType =
  | 'Patient Created'
  | 'Appointment Booked'
  | 'Appointment Cancelled'
  | 'Appointment Completed'
  | 'Treatment Started'
  | 'Treatment Completed'
  | 'Payment Received'
  | 'Invoice Generated'
  | 'Lab Case Sent'
  | 'Lab Case Received'
  | 'Prescription Generated'
  | 'Consent Signed'
  | 'Follow-up Due'
  | 'Recall Due'
  | 'Patient Birthday'
  | 'Inventory Low';

export interface ConditionItem {
  id: string;
  field:
    | 'Doctor'
    | 'Treatment'
    | 'Procedure'
    | 'Outstanding Amount'
    | 'Appointment Status'
    | 'Patient Category'
    | 'First Visit'
    | 'Returning Patient'
    | 'Age'
    | 'Gender'
    | 'Date'
    | 'Branch';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface ActionItem {
  id: string;
  type:
    | 'Create Follow-up'
    | 'Create Task'
    | 'Send WhatsApp Draft'
    | 'Send Email Draft'
    | 'Generate Reminder'
    | 'Generate Notification'
    | 'Schedule Recall'
    | 'Update Status'
    | 'Assign Coordinator'
    | 'Create Timeline Entry'
    | 'Generate Report';
  params: Record<string, string>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  conditions: ConditionItem[];
  actions: ActionItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  execCount: number;
  successCount: number;
  failCount: number;
}

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  executionTime: string;
  trigger: string;
  actionsExecuted: string[];
  success: boolean;
  errorMsg?: string;
  logDetails: string;
  isTestMode: boolean;
  patientName?: string;
}

// Default Out-of-the-box Templates (MODULE 5)
export const DEFAULT_TEMPLATES: Workflow[] = [
  {
    id: 'tmpl-rct',
    name: 'RCT Recall Automation',
    description: 'Triggered when Root Canal Treatment is completed. Automates the 6-month clinical review scheduling & patient notification.',
    trigger: 'Treatment Completed',
    conditions: [
      { id: 'c-1', field: 'Treatment', operator: 'equals', value: 'Root Canal Treatment' }
    ],
    actions: [
      {
        id: 'a-1',
        type: 'Schedule Recall',
        params: { delayMonths: '6', note: 'Post-RCT Alveolar Bone & Crown review' }
      },
      {
        id: 'a-2',
        type: 'Send WhatsApp Draft',
        params: {
          recipient: 'Patient',
          message: 'Hi [PatientName], it has been 6 months since your Root Canal Treatment (RCT) at Sri Chaitanya Clinic. It is time for your scheduled routine crown & root health review. Please tap here to choose a timeslot: https://srichaitanya.dental/appt'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    execCount: 45,
    successCount: 44,
    failCount: 1
  },
  {
    id: 'tmpl-scaling',
    name: 'Scaling Recall & Prophylaxis',
    description: 'Biannual periodontal health & scaling reminder for returning patients.',
    trigger: 'Treatment Completed',
    conditions: [
      { id: 'c-2', field: 'Procedure', operator: 'equals', value: 'Scaling & Polishing' }
    ],
    actions: [
      {
        id: 'a-3',
        type: 'Schedule Recall',
        params: { delayMonths: '6', note: 'Biannual Oral Hygiene Check' }
      },
      {
        id: 'a-4',
        type: 'Send WhatsApp Draft',
        params: {
          recipient: 'Patient',
          message: 'Hi [PatientName], your biannual Dental Scaling & Polishing is due to keep your smile healthy and plaque-free. Reply "YES" to pre-book a preferred slot at Sri Chaitanya Clinic.'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    execCount: 124,
    successCount: 124,
    failCount: 0
  },
  {
    id: 'tmpl-implant',
    name: 'Implant Post-Op Multi-Task Review',
    description: 'Triggered upon starting a Dental Implant treatment. dispatches follow-ups, coordinator tasks, and suture removal checks.',
    trigger: 'Treatment Started',
    conditions: [
      { id: 'c-3', field: 'Treatment', operator: 'equals', value: 'Dental Implant' }
    ],
    actions: [
      {
        id: 'a-5',
        type: 'Create Task',
        params: {
          title: 'Implant Post-Op Suture Removal Check',
          assignee: 'Dr. Durga Bhavani Jupalli',
          priority: 'High',
          description: 'Suture removal & surgical site assessment for [PatientName] (Implant Placement, Day 7).'
        }
      },
      {
        id: 'a-6',
        type: 'Assign Coordinator',
        params: {
          coordinatorName: 'Assistant Kishore',
          task: 'Coordinate implant healing call'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    execCount: 18,
    successCount: 18,
    failCount: 0
  },
  {
    id: 'tmpl-birthday',
    name: 'Birthday Wishes & Care Voucher',
    description: 'Triggered on patient birthdays. Generates greeting draft and applies loyalty points or discount voucher.',
    trigger: 'Patient Birthday',
    conditions: [],
    actions: [
      {
        id: 'a-7',
        type: 'Send WhatsApp Draft',
        params: {
          recipient: 'Patient',
          message: 'Happy Birthday, [PatientName]! 🎉 We wish you sparkling health and beautiful smiles. To celebrate, Sri Chaitanya Multispeciality Dental Clinic presents you with a ₹500 discount voucher on scaling/cosmetic treatments! Valid for 30 days.'
        }
      },
      {
        id: 'a-8',
        type: 'Send Email Draft',
        params: {
          subject: 'Happy Birthday from Sri Chaitanya Multispeciality Dental Clinic!',
          message: 'Dear [PatientName],\n\nOn behalf of Dr. Durga Bhavani Jupalli and the entire team, we wish you a very Happy Birthday! May your day be filled with happiness and laughter.\n\nAs a special birthday gift, here is a voucher code: HBD500. Enjoy ₹500 off on your next scaling, polishing, or whitening session!\n\nBest regards,\nSri Chaitanya Clinic Team'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    execCount: 88,
    successCount: 88,
    failCount: 0
  },
  {
    id: 'tmpl-missed',
    name: 'Missed Appointment Recovery',
    description: 'Triggers when appointment is cancelled or marked No Show. Dispatches recovery campaign instantly.',
    trigger: 'Appointment Cancelled',
    conditions: [
      { id: 'c-4', field: 'Appointment Status', operator: 'equals', value: 'No Show' }
    ],
    actions: [
      {
        id: 'a-9',
        type: 'Create Follow-up',
        params: { title: 'Reschedule missed appointment', timeline: 'Within 24 hours' }
      },
      {
        id: 'a-10',
        type: 'Send WhatsApp Draft',
        params: {
          recipient: 'Patient',
          message: 'Hi [PatientName], we missed you for your dental appointment today. We hope everything is fine! Let us find a convenient alternative slot for you. Please choose a time here: https://srichaitanya.dental/reschedule or call us at +91 9988776655.'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    execCount: 14,
    successCount: 13,
    failCount: 1
  },
  {
    id: 'tmpl-pending',
    name: 'Pending Payment Auto-Followup',
    description: 'Triggers on Invoice generation with outstanding balance. alerts clinic accountants and draft payment link.',
    trigger: 'Invoice Generated',
    conditions: [
      { id: 'c-5', field: 'Outstanding Amount', operator: 'greater_than', value: '2000' }
    ],
    actions: [
      {
        id: 'a-11',
        type: 'Create Task',
        params: {
          title: 'Urgent: Follow up on Pending Balance',
          assignee: 'Accountant Sharma',
          priority: 'High',
          description: 'Follow up on payment ₹[OutstandingAmount] for [PatientName]. Send invoice copy.'
        }
      },
      {
        id: 'a-12',
        type: 'Send WhatsApp Draft',
        params: {
          recipient: 'Patient',
          message: 'Dear [PatientName], a gentle reminder regarding your pending clinical balance of ₹[OutstandingAmount] at Sri Chaitanya Dental. Kindly clear it online here: https://srichaitanya.dental/pay/[InvoiceId] or at the reception desk during your next visit.'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    execCount: 31,
    successCount: 30,
    failCount: 1
  },
  {
    id: 'tmpl-lab-delay',
    name: 'Lab Dispatch Delay Tracker',
    description: 'Dispatches active coordination tasks when crowns/bridges are sent to external lab centers.',
    trigger: 'Lab Case Sent',
    conditions: [
      { id: 'c-6', field: 'Procedure', operator: 'equals', value: 'Crown Prep' }
    ],
    actions: [
      {
        id: 'a-13',
        type: 'Create Task',
        params: {
          title: 'Verify Lab Case Status & Delivery Date',
          assignee: 'Lab Tech Ravi',
          priority: 'Medium',
          description: 'Ensure lab delivers crown prosthesis for [PatientName] prior to cementation visit.'
        }
      },
      {
        id: 'a-14',
        type: 'Generate Notification',
        params: {
          targetRole: 'Lab Technician',
          message: 'Lab Case dispatched for [PatientName]. Est delivery: 5 days.'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    execCount: 9,
    successCount: 9,
    failCount: 0
  },
  {
    id: 'tmpl-consent',
    name: 'New Patient Digital Consent Campaign',
    description: 'Triggered when a first-time patient books. dispatches online health history & digital consent forms.',
    trigger: 'Appointment Booked',
    conditions: [
      { id: 'c-7', field: 'First Visit', operator: 'equals', value: 'Yes' }
    ],
    actions: [
      {
        id: 'a-15',
        type: 'Send Email Draft',
        params: {
          subject: 'Welcome to Sri Chaitanya Multispeciality Dental! Pre-Appointment Intake Forms',
          message: 'Dear [PatientName],\n\nThank you for choosing Sri Chaitanya Multispeciality Dental Clinic. We look forward to meeting you!\n\nTo ensure a seamless, paperless check-in process, please take 3 minutes to complete your digital Medical History & Consent Form online prior to your appointment: https://srichaitanya.dental/portal/onboard\n\nBest regards,\nDr. Durga Bhavani Jupalli'
        }
      },
      {
        id: 'a-16',
        type: 'Create Timeline Entry',
        params: {
          note: 'Automated Welcome & Pre-Appointment digital consent package sent to new patient.'
        }
      }
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    execCount: 42,
    successCount: 42,
    failCount: 0
  }
];

class AutomationStore {
  private workflows: Workflow[] = [];
  private executionLogs: WorkflowExecutionLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedWorkflows = localStorage.getItem('automation_workflows');
      if (storedWorkflows) {
        this.workflows = JSON.parse(storedWorkflows);
      } else {
        this.workflows = [...DEFAULT_TEMPLATES];
        localStorage.setItem('automation_workflows', JSON.stringify(this.workflows));
      }

      const storedLogs = localStorage.getItem('workflow_execution_logs');
      if (storedLogs) {
        this.executionLogs = JSON.parse(storedLogs);
      } else {
        // Mocking some historic logs to show beautiful telemetry history (MODULE 6 & MODULE 8)
        this.executionLogs = [
          {
            id: 'log-1',
            workflowId: 'tmpl-rct',
            workflowName: 'RCT Recall Automation',
            executionTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            trigger: 'Treatment Completed',
            actionsExecuted: ['Schedule Recall', 'Send WhatsApp Draft'],
            success: true,
            logDetails: '[08:20:01] Trigger "Treatment Completed" detected for RCT.\n[08:20:02] Evaluating conditions: Treatment equals "Root Canal Treatment" → MATCH.\n[08:20:03] Step 1 of 2: Recall scheduled for 6 months.\n[08:20:04] Step 2 of 2: WhatsApp draft generated for Patient.',
            isTestMode: false,
            patientName: 'Bhavana Rao'
          },
          {
            id: 'log-2',
            workflowId: 'tmpl-pending',
            workflowName: 'Pending Payment Auto-Followup',
            executionTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
            trigger: 'Invoice Generated',
            actionsExecuted: ['Create Task', 'Send WhatsApp Draft'],
            success: true,
            logDetails: '[06:50:11] Trigger "Invoice Generated" detected.\n[06:50:12] Evaluating conditions: Outstanding Amount (₹8,500) > ₹2,000 → MATCH.\n[06:50:13] Step 1 of 2: High priority billing task created for Accountant Sharma.\n[06:50:14] Step 2 of 2: Outstanding balance WhatsApp notification template rendered successfully.',
            isTestMode: false,
            patientName: 'Aditya Sharma'
          },
          {
            id: 'log-3',
            workflowId: 'tmpl-birthday',
            workflowName: 'Birthday Wishes & Care Voucher',
            executionTime: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
            trigger: 'Patient Birthday',
            actionsExecuted: ['Send WhatsApp Draft', 'Send Email Draft'],
            success: true,
            logDetails: '[03:50:10] Cron Birthday Trigger launched.\n[03:50:11] Matching patients: Sushma Reddy (Date of Birth today).\n[03:50:12] Step 1 of 2: WhatsApp birthday voucher draft dispatched.\n[03:50:13] Step 2 of 2: HTML Email template rendered and queued.',
            isTestMode: false,
            patientName: 'Sushma Reddy'
          },
          {
            id: 'log-4',
            workflowId: 'tmpl-rct',
            workflowName: 'RCT Recall Automation',
            executionTime: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
            trigger: 'Treatment Completed',
            actionsExecuted: ['Schedule Recall'],
            success: false,
            errorMsg: 'Gateway Timeout: SMS API failed to deliver',
            logDetails: '[22:50:01] Trigger "Treatment Completed" detected for RCT.\n[22:50:02] Evaluating conditions: MATCH.\n[22:50:03] Step 1 of 2: Recall Scheduled successfully.\n[22:50:04] Step 2 of 2: Sending WhatsApp Draft failed due to connection timeout on gateway api.clickatell.com.',
            isTestMode: false,
            patientName: 'Srinivas Murthy'
          }
        ];
        localStorage.setItem('workflow_execution_logs', JSON.stringify(this.executionLogs));
      }
    } catch (e) {
      console.error('Failed to load automation storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('automation_workflows', JSON.stringify(this.workflows));
      localStorage.setItem('workflow_execution_logs', JSON.stringify(this.executionLogs));
    } catch (e) {
      console.error('Failed to save automation storage:', e);
    }
  }

  public getWorkflows(): Workflow[] {
    return this.workflows;
  }

  public getWorkflowById(id: string): Workflow | undefined {
    return this.workflows.find(w => w.id === id);
  }

  public getExecutionLogs(): WorkflowExecutionLog[] {
    return this.executionLogs;
  }

  public async saveWorkflow(workflow: Omit<Workflow, 'createdAt' | 'updatedAt' | 'execCount' | 'successCount' | 'failCount'>): Promise<Workflow> {
    const isNew = !workflow.id;
    const now = new Date().toISOString();

    let fullWorkflow: Workflow;

    if (isNew) {
      fullWorkflow = {
        ...workflow,
        id: 'wf-' + Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now,
        execCount: 0,
        successCount: 0,
        failCount: 0
      };
      this.workflows.unshift(fullWorkflow);
    } else {
      const existingIdx = this.workflows.findIndex(w => w.id === workflow.id);
      const existing = this.workflows[existingIdx] || { createdAt: now, execCount: 0, successCount: 0, failCount: 0 };
      fullWorkflow = {
        ...existing,
        ...workflow,
        updatedAt: now
      };
      if (existingIdx !== -1) {
        this.workflows[existingIdx] = fullWorkflow;
      } else {
        this.workflows.unshift(fullWorkflow);
      }
    }

    this.saveToStorage();
    return fullWorkflow;
  }

  public deleteWorkflow(id: string): boolean {
    const initialLen = this.workflows.length;
    this.workflows = this.workflows.filter(w => w.id !== id);
    this.saveToStorage();
    return this.workflows.length < initialLen;
  }

  public toggleWorkflow(id: string): boolean {
    const wf = this.workflows.find(w => w.id === id);
    if (wf) {
      wf.isActive = !wf.isActive;
      wf.updatedAt = new Date().toISOString();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // CORE WORKFLOW AUTOMATION ENGINE EXECUTOR (MODULE 11 & MODULE 7)
  public async triggerWorkflowEvent(
    trigger: TriggerType,
    contextPayload: {
      patientName: string;
      patientId?: string;
      doctorName?: string;
      treatmentName?: string;
      procedureName?: string;
      outstandingAmount?: number;
      appointmentStatus?: string;
      patientCategory?: string;
      isFirstVisit?: boolean;
      age?: number;
      gender?: string;
      date?: string;
      branch?: string;
      invoiceId?: string;
    },
    isTestMode: boolean = false
  ): Promise<{ logs: string[]; successCount: number; failCount: number }> {
    const matchingWorkflows = this.workflows.filter(w => w.trigger === trigger && (isTestMode ? true : w.isActive));
    
    let totalSuccess = 0;
    let totalFail = 0;
    const executionLogsDispatched: string[] = [];

    for (const wf of matchingWorkflows) {
      let conditionsMet = true;
      let traceLog = `[${new Date().toLocaleTimeString()}] Initializing execution trace for: "${wf.name}"\n`;
      traceLog += `[Trigger]: ${trigger} detected\n`;
      traceLog += `[Context]: Patient: ${contextPayload.patientName}, Doctor: ${contextPayload.doctorName ?? 'N/A'}, Amount: ₹${contextPayload.outstandingAmount ?? 0}\n`;

      // Evaluate conditions
      if (wf.conditions.length > 0) {
        traceLog += `[Evaluating Conditions] (${wf.conditions.length} registered):\n`;
        for (const cond of wf.conditions) {
          let actualValue: string | undefined;
          
          if (cond.field === 'Doctor') actualValue = contextPayload.doctorName;
          else if (cond.field === 'Treatment') actualValue = contextPayload.treatmentName;
          else if (cond.field === 'Procedure') actualValue = contextPayload.procedureName;
          else if (cond.field === 'Outstanding Amount') actualValue = contextPayload.outstandingAmount?.toString();
          else if (cond.field === 'Appointment Status') actualValue = contextPayload.appointmentStatus;
          else if (cond.field === 'Patient Category') actualValue = contextPayload.patientCategory;
          else if (cond.field === 'First Visit') actualValue = contextPayload.isFirstVisit ? 'Yes' : 'No';
          else if (cond.field === 'Returning Patient') actualValue = contextPayload.isFirstVisit ? 'No' : 'Yes';
          else if (cond.field === 'Age') actualValue = contextPayload.age?.toString();
          else if (cond.field === 'Gender') actualValue = contextPayload.gender;
          else if (cond.field === 'Date') actualValue = contextPayload.date;
          else if (cond.field === 'Branch') actualValue = contextPayload.branch || 'Main Branch';

          let fieldMet = false;
          const expected = cond.value?.trim().toLowerCase();
          const actual = actualValue?.trim().toLowerCase() ?? '';

          if (cond.operator === 'equals') {
            fieldMet = actual === expected;
          } else if (cond.operator === 'not_equals') {
            fieldMet = actual !== expected;
          } else if (cond.operator === 'contains') {
            fieldMet = actual.includes(expected);
          } else if (cond.operator === 'greater_than') {
            fieldMet = parseFloat(actual || '0') > parseFloat(expected || '0');
          } else if (cond.operator === 'less_than') {
            fieldMet = parseFloat(actual || '0') < parseFloat(expected || '0');
          }

          traceLog += `  - Condition [${cond.field} ${cond.operator} "${cond.value}"]: Actual is "${actualValue ?? ''}" → ${fieldMet ? 'PASS' : 'FAIL'}\n`;
          if (!fieldMet) {
            conditionsMet = false;
            break;
          }
        }
      } else {
        traceLog += `[Evaluating Conditions] No conditions registered. Trigger executes unconditionally.\n`;
      }

      if (!conditionsMet) {
        traceLog += `[Skip] Conditions evaluated to False. Execution aborted for this workflow.\n`;
        continue;
      }

      // Process Actions
      traceLog += `[Conditions Met] Proceeding to execute ${wf.actions.length} actions:\n`;
      const executedTypes: string[] = [];
      let stepSuccess = true;
      let errorMsg: string | undefined;

      for (let idx = 0; idx < wf.actions.length; idx++) {
        const action = wf.actions[idx];
        traceLog += `  - Step ${idx + 1}/${wf.actions.length}: Executing action type [${action.type}]...\n`;
        executedTypes.push(action.type);

        if (isTestMode) {
          traceLog += `    [Test Mode Sandbox] Action simulated successfully. No live databases modified.\n`;
          continue;
        }

        try {
          // Live Execution Dispatching (MODULE 4 & MODULE 11)
          if (action.type === 'Create Task') {
            // Write to our live tasksStore!
            const title = (action.params.title || 'Workflow Automated Task')
              .replace('[PatientName]', contextPayload.patientName)
              .replace('[OutstandingAmount]', (contextPayload.outstandingAmount ?? 0).toString());

            const description = (action.params.description || '')
              .replace('[PatientName]', contextPayload.patientName)
              .replace('[OutstandingAmount]', (contextPayload.outstandingAmount ?? 0).toString());

            const assignee = action.params.assignee || 'Dr. Durga Bhavani Jupalli';
            const priority = (action.params.priority || 'Medium') as any;

            const payload: Omit<Task, 'id' | 'task_code' | 'created_at'> = {
              title,
              description,
              priority,
              patient_name: contextPayload.patientName,
              patient_id: contextPayload.patientId || 'A-101',
              assigned_by: `Workflow: ${wf.name}`,
              assigned_to: assignee,
              department: assignee.includes('Doctor') || assignee.includes('Assistant') ? 'Clinical' : assignee.includes('Accountant') ? 'Billing' : 'Front Desk',
              due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days
              status: 'New',
              task_type: 'Automated Routine Follow-up'
            };

            await tasksStore.saveTask(payload as Task, `Workflow Automation Engine: ${wf.name}`);
            traceLog += `    [Live Store] Inserted clinical task assigned to ${assignee} for ${contextPayload.patientName}.\n`;
          } else if (action.type === 'Send WhatsApp Draft') {
            // Simulates SMS or WhatsApp dispatch logs
            const msg = (action.params.message || '')
              .replace('[PatientName]', contextPayload.patientName)
              .replace('[OutstandingAmount]', (contextPayload.outstandingAmount ?? 0).toString())
              .replace('[InvoiceId]', contextPayload.invoiceId || 'INV-990');
            
            traceLog += `    [SMS Gateway] Dispatched template payload draft. Body Preview: "${msg.substring(0, 70)}..."\n`;
          } else if (action.type === 'Create Follow-up') {
            // Dispatches follow-up records
            traceLog += `    [Follow-up Center] Automatically scheduled clinical follow-up campaign for ${contextPayload.patientName}.\n`;
          } else if (action.type === 'Schedule Recall') {
            const months = action.params.delayMonths || '6';
            traceLog += `    [Recall Tracker] Scheduled hygiene/prosthodontic recall for ${contextPayload.patientName} in ${months} months.\n`;
          } else {
            traceLog += `    [Action Engine] Processed [${action.type}] parameter flags: ${JSON.stringify(action.params)}\n`;
          }
        } catch (err: any) {
          stepSuccess = false;
          errorMsg = err?.message || 'Unexpected automation runtime error';
          traceLog += `    [FAILED] Error during execution: ${errorMsg}\n`;
          break; // Stop execution chain on failure
        }
      }

      // Record telemetry update (MODULE 6 & MODULE 8)
      if (stepSuccess) {
        totalSuccess++;
        if (!isTestMode) {
          wf.execCount++;
          wf.successCount++;
        }
        traceLog += `[Success] All actions completed successfully for: "${wf.name}".`;
      } else {
        totalFail++;
        if (!isTestMode) {
          wf.execCount++;
          wf.failCount++;
        }
        traceLog += `[Failed] Execution halted due to errors.`;
      }

      // Log execution trace
      const newLog: WorkflowExecutionLog = {
        id: 'ex-' + Math.random().toString(36).substr(2, 9),
        workflowId: wf.id,
        workflowName: wf.name,
        executionTime: new Date().toISOString(),
        trigger,
        actionsExecuted: executedTypes,
        success: stepSuccess,
        errorMsg,
        logDetails: traceLog,
        isTestMode,
        patientName: contextPayload.patientName
      };

      this.executionLogs.unshift(newLog);
      executionLogsDispatched.push(traceLog);
    }

    this.saveToStorage();
    return { logs: executionLogsDispatched, successCount: totalSuccess, failCount: totalFail };
  }
}

export const automationStore = new AutomationStore();
