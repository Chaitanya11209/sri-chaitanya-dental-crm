import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, Clock, AlertTriangle, Plus, Search, Filter, ShieldAlert,
  Send, X, RefreshCw, MessageSquare, Paperclip, Bell, ClipboardList,
  User, Check, ChevronRight, Activity, Calendar, FileText, CheckSquare,
  Sparkles, Trash2, ArrowUpRight, CheckSquare as CheckIcon, Info, Users, Briefcase
} from 'lucide-react';
import { tasksStore, Task, TaskComment, TaskAttachment, TaskNotification, TaskHistory } from '../../lib/tasksStore';
import { useNotification } from '../../components/NotificationProvider';
import { getRole, getRolePermissions } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const STAFF_MEMBERS = [
  { name: 'Dr. Durga Bhavani Jupalli', role: 'Doctor' },
  { name: 'Receptionist Pooja', role: 'Receptionist' },
  { name: 'Bhavani', role: 'Receptionist' },
  { name: 'Assistant Kishore', role: 'Assistant' },
  { name: 'Lab Tech Ravi', role: 'Lab Technician' },
  { name: 'Accountant Sharma', role: 'Accountant' }
];

const DEPARTMENTS = ['Clinical', 'Front Desk', 'Billing', 'Lab', 'Admin'] as const;

const TASK_TYPES = [
  'Patient Follow-up', 'Call Patient', 'Collect Payment', 'Prepare Treatment Room',
  'Lab Follow-up', 'Lab Delivery', 'Consent Pending', 'Upload X-rays',
  'Prepare Invoice', 'Review Clinical Notes', 'Inventory Purchase',
  'Equipment Maintenance', 'General Task'
];

export default function TasksPage() {
  const { notify } = useNotification();
  const currentRole = getRole();
  const currentUserEmail = localStorage.getItem('userEmail') || '';
  
  // Try to find matching user name from staff list or email
  const currentUserName = useMemo(() => {
    const emailLower = currentUserEmail.toLowerCase();
    if (emailLower.includes('chaitanya') || emailLower.includes('chaitubolla09') || emailLower.includes('bhavani')) return 'Dr. Durga Bhavani Jupalli';
    if (emailLower.includes('pooja')) return 'Receptionist Pooja';
    if (emailLower.includes('kishore')) return 'Assistant Kishore';
    return 'Dr. Durga Bhavani Jupalli'; // default/fallback
  }, [currentUserEmail]);

  // List of patients from DB if connected, or static list
  const [patientsList, setPatientsList] = useState<{ id: string; name: string }[]>([
    { id: '101', name: 'Bhavana Rao' },
    { id: '102', name: 'Sushma Reddy' },
    { id: '103', name: 'Aditya Sharma' },
    { id: '104', name: 'Suresh Kumar' },
    { id: '105', name: 'Vijay Kumar' }
  ]);

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [myFilterSub, setMyFilterSub] = useState<'today' | 'overdue' | 'upcoming' | 'priority' | 'completed'>('today');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');

  // Detail Modal / Sidebar
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [attachingFile, setAttachingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New Task Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as Task['priority'],
    patient_id: '',
    assigned_to: 'Receptionist Pooja',
    department: 'Front Desk' as Task['department'],
    due_date: new Date().toISOString().split('T')[0],
    task_type: 'General Task'
  });

  // Notifications
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);

  // Load patients from database if possible
  useEffect(() => {
    async function loadPatients() {
      try {
        const { data, error } = await supabase.from('patients').select('id, name').limit(100);
        if (!error && data && data.length > 0) {
          setPatientsList(data.map(p => ({ id: p.id.toString(), name: p.name })));
        }
      } catch (e) {
        console.warn('Patients fetch failed, falling back to cached static list.');
      }
    }
    loadPatients();
  }, []);

  // Fetch tasks and notifications
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const allTasks = await tasksStore.getTasks();
        setTasks(allTasks);

        const allNotifications = await tasksStore.getNotifications(currentUserName);
        setNotifications(allNotifications);
      } catch (e) {
        notify('error', 'Sync Failed', 'Could not refresh task list.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Listen for global task changes
    const handleChanges = () => {
      tasksStore.getTasks().then(setTasks);
      tasksStore.getNotifications(currentUserName).then(setNotifications);
    };

    window.addEventListener('tasks-changed', handleChanges);
    return () => {
      window.removeEventListener('tasks-changed', handleChanges);
    };
  }, [refreshTrigger, currentUserName]);

  // Load comments, history, attachments for selected task
  useEffect(() => {
    if (!selectedTask) return;
    async function loadTaskDetails() {
      const c = await tasksStore.getComments(selectedTask.id);
      const a = await tasksStore.getAttachments(selectedTask.id);
      const h = await tasksStore.getHistory(selectedTask.id);
      setComments(c);
      setAttachments(a);
      setHistory(h);
    }
    loadTaskDetails();
  }, [selectedTask]);

  // Computed Telemetry Metrics (Module 10)
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.due_date === todayStr);
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Archived');
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Archived' && t.due_date < todayStr);
    const highPriorityTasks = tasks.filter(t => (t.priority === 'High' || t.priority === 'Critical') && t.status !== 'Completed');

    return {
      today: todayTasks.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
      highPriority: highPriorityTasks.length
    };
  }, [tasks]);

  // Filter tasks based on query and filters
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = [...tasks];

    // Search query (Patient, Task title/code, priority, status)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.task_code.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.patient_name && t.patient_name.toLowerCase().includes(q)) ||
        t.assigned_to.toLowerCase().includes(q) ||
        t.assigned_by.toLowerCase().includes(q)
      );
    }

    // Role-based main tabs ("My Tasks" vs "All Tasks")
    if (activeTab === 'my') {
      list = list.filter(t => t.assigned_to.toLowerCase() === currentUserName.toLowerCase());
      
      // Sub-filter for My Tasks
      if (myFilterSub === 'today') {
        list = list.filter(t => t.due_date === todayStr && t.status !== 'Completed');
      } else if (myFilterSub === 'overdue') {
        list = list.filter(t => t.due_date < todayStr && t.status !== 'Completed' && t.status !== 'Archived');
      } else if (myFilterSub === 'upcoming') {
        list = list.filter(t => t.due_date > todayStr && t.status !== 'Completed');
      } else if (myFilterSub === 'priority') {
        list = list.filter(t => (t.priority === 'High' || t.priority === 'Critical') && t.status !== 'Completed');
      } else if (myFilterSub === 'completed') {
        list = list.filter(t => t.status === 'Completed');
      }
    } else {
      // All Tasks manual filters
      if (deptFilter !== 'All') list = list.filter(t => t.department === deptFilter);
      if (priorityFilter !== 'All') list = list.filter(t => t.priority === priorityFilter);
      if (statusFilter !== 'All') list = list.filter(t => t.status === statusFilter);
      if (staffFilter !== 'All') list = list.filter(t => t.assigned_to === staffFilter);
    }

    return list;
  }, [tasks, searchQuery, activeTab, myFilterSub, deptFilter, priorityFilter, statusFilter, staffFilter, currentUserName]);

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    try {
      const newComment = await tasksStore.addComment({
        task_id: selectedTask.id,
        author_name: currentUserName,
        author_role: currentRole || 'staff',
        comment_text: newCommentText.trim()
      });

      setComments(prev => [...prev, newComment]);
      setNewCommentText('');
      
      // Refresh timeline history
      const h = await tasksStore.getHistory(selectedTask.id);
      setHistory(h);

      notify('success', 'Comment Appended', 'Your message has been posted to this task thread.');
    } catch (e) {
      notify('error', 'Error', 'Could not post comment.');
    }
  };

  // Mock upload attachments
  const handleAttachMockFile = async (fileName: string, fileType: string, sizeLabel: string) => {
    if (!selectedTask) return;
    setAttachingFile(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 25;
      });
    }, 150);

    setTimeout(async () => {
      try {
        const newAtt = await tasksStore.addAttachment({
          task_id: selectedTask.id,
          file_name: fileName,
          file_type: fileType,
          file_size: sizeLabel,
          file_url: '#',
          uploaded_by: currentUserName
        });

        setAttachments(prev => [...prev, newAtt]);
        
        // Refresh history
        const h = await tasksStore.getHistory(selectedTask.id);
        setHistory(h);

        notify('success', 'File Attached', `"${fileName}" successfully pinned to clinical task.`);
      } catch (err) {
        notify('error', 'Attachment Failed', 'Could not save file.');
      } finally {
        setAttachingFile(false);
        setUploadProgress(0);
      }
    }, 700);
  };

  // Drag and drop simulator
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleAttachMockFile('Drag_Dropped_Radiograph.png', 'image/png', '1.8 MB');
  };

  // Update status transitions
  const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    try {
      const updated = { ...taskToUpdate, status: newStatus };
      await tasksStore.saveTask(updated, currentUserName);
      
      // Update local state smoothly
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated);
      }
      notify('success', 'Task Updated', `Task status set to ${newStatus}.`);
    } catch (e) {
      notify('error', 'Error', 'Could not update status.');
    }
  };

  // Submit New Task Form
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) {
      notify('warning', 'Missing Fields', 'Please fill in the task title.');
      return;
    }

    try {
      const linkedPatient = patientsList.find(p => p.id === newTaskData.patient_id);
      
      const payload: Omit<Task, 'id' | 'task_code' | 'created_at'> = {
        title: newTaskData.title.trim(),
        description: newTaskData.description.trim(),
        priority: newTaskData.priority,
        patient_id: newTaskData.patient_id || undefined,
        patient_name: linkedPatient ? linkedPatient.name : undefined,
        assigned_by: currentUserName,
        assigned_to: newTaskData.assigned_to,
        department: newTaskData.department,
        due_date: newTaskData.due_date,
        status: 'New',
        task_type: newTaskData.task_type
      };

      await tasksStore.saveTask(payload as Task, currentUserName);
      setShowCreateModal(false);
      setRefreshTrigger(p => p + 1);

      // Reset
      setNewTaskData({
        title: '',
        description: '',
        priority: 'Medium',
        patient_id: '',
        assigned_to: 'Receptionist Pooja',
        department: 'Front Desk',
        due_date: new Date().toISOString().split('T')[0],
        task_type: 'General Task'
      });

      notify('success', 'Task Dispatched', `New task assigned to ${newTaskData.assigned_to}.`);
    } catch (err) {
      notify('error', 'Dispatch Failed', 'Failed to save task.');
    }
  };

  // Simulate System Automations (Module 14 / Sandbox)
  const triggerSimulation = async (type: Parameters<typeof tasksStore.createAutomaticTask>[0], mockPatient: string, patientId: string) => {
    try {
      notify('info', 'Triggering Automation', `Processing mock webhook event for "${type}"...`);
      await tasksStore.createAutomaticTask(type, mockPatient, patientId);
      setRefreshTrigger(p => p + 1);
      notify('success', 'Automation Successful', `Auto-created task and dispatched notification to staff!`);
    } catch (e) {
      notify('error', 'Simulation Failed', 'Automation engine encountered a fault.');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await tasksStore.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-teal-100 dark:bg-teal-950/55 text-teal-850 dark:text-teal-400 rounded-md border border-teal-200/50 dark:border-teal-900/40">
            v3.1 Collaboration Hub
          </span>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-teal-600 dark:text-teal-500" size={24} />
            Task & Team Collaboration Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Real-time workflows, clinical dispatch, and patient-linked task timeline tracing for Sri Chaitanya staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="Refresh Tasks"
          >
            <RefreshCw size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#0F6E6E] hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus size={14} /> Dispatch Task
          </button>
        </div>
      </div>

      {/* Module 10: Task Dashboard Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Due Today</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.today}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Completed</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Pending</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Overdue</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.overdue}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">High / Critical</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{stats.highPriority}</p>
          </div>
        </div>

      </div>

      {/* Main Grid: Left Filters, Middle Task list, Right Notifications & Simulation */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Filter Panel */}
        <div className="xl:col-span-3 space-y-5">
          
          {/* Quick Tab Select */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Scope Selection</h3>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <button
                onClick={() => { setActiveTab('my'); setSelectedTask(null); }}
                className={`py-2 text-xs font-black rounded-lg transition-all ${
                  activeTab === 'my'
                    ? 'bg-[#0F6E6E] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                My Tasks
              </button>
              <button
                onClick={() => { setActiveTab('all'); setSelectedTask(null); }}
                className={`py-2 text-xs font-black rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#0F6E6E] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Tasks
              </button>
            </div>

            {/* Sub Filter for My Tasks (Module 5) */}
            {activeTab === 'my' && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] uppercase font-black text-slate-400">Workspace Filters</p>
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'today', label: "Today's Tasks", count: tasks.filter(t => t.assigned_to === currentUserName && t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'Completed').length },
                    { id: 'overdue', label: 'Overdue Tasks', count: tasks.filter(t => t.assigned_to === currentUserName && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'Completed').length, danger: true },
                    { id: 'upcoming', label: 'Upcoming Tasks', count: tasks.filter(t => t.assigned_to === currentUserName && t.due_date > new Date().toISOString().split('T')[0] && t.status !== 'Completed').length },
                    { id: 'priority', label: 'Priority Tasks', count: tasks.filter(t => t.assigned_to === currentUserName && (t.priority === 'High' || t.priority === 'Critical') && t.status !== 'Completed').length },
                    { id: 'completed', label: 'Completed Tasks', count: tasks.filter(t => t.assigned_to === currentUserName && t.status === 'Completed').length }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setMyFilterSub(sub.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex justify-between items-center transition ${
                        myFilterSub === sub.id
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-[#0F6E6E] dark:text-teal-400 font-extrabold border-l-4 border-[#0F6E6E]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className={sub.danger && sub.count > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''}>
                        {sub.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        myFilterSub === sub.id 
                          ? 'bg-[#0F6E6E] text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {sub.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Department Wise and Staff Filters for All Tasks */}
            {activeTab === 'all' && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Department</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl font-semibold"
                  >
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Staff Member</label>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl font-semibold"
                  >
                    <option value="All">All Staff</option>
                    {STAFF_MEMBERS.map(s => <option key={s.name} value={s.name}>{s.name} ({s.role})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg font-semibold"
                    >
                      <option value="All">All</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg font-semibold"
                    >
                      <option value="All">All</option>
                      <option value="New">New</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Module 14 / Sandbox: Simulation & Automation Center */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800/30 p-4.5 rounded-2xl shadow-md text-white space-y-4">
            <div className="flex items-center gap-1.5 border-b border-indigo-800/40 pb-2">
              <Sparkles size={16} className="text-amber-400 animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">ERP Automation Sandbox</h3>
            </div>
            
            <p className="text-[10.5px] text-slate-300 leading-relaxed font-semibold">
              Simulate enterprise system hooks and watch tasks dynamically populate and dispatch in real-time.
            </p>

            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Lab Case Sent Hook', type: 'Lab Case Sent', patient: 'Vijay Kumar', id: '105' },
                { label: 'Treatment Plan Approved', type: 'Treatment Plan Accepted', patient: 'Bhavana Rao', id: '101' },
                { label: 'Unpaid Bill Reminder', type: 'Payment Pending', patient: 'Aditya Sharma', id: '103' },
                { label: 'Missed Appointment Hook', type: 'Patient Missed Appointment', patient: 'Sushma Reddy', id: '102' }
              ].map(sim => (
                <button
                  key={sim.label}
                  onClick={() => triggerSimulation(sim.type as any, sim.patient, sim.id)}
                  className="w-full py-1.5 px-3 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/50 text-left text-[10.5px] font-bold rounded-lg transition-all flex items-center justify-between group active:scale-98"
                >
                  <span className="group-hover:text-indigo-200">{sim.label}</span>
                  <ArrowUpRight size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-indigo-400" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: Tasks Queue List & Detail View */}
        <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Tasks List Queue */}
          <div className={`${selectedTask ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4 transition-all duration-300`}>
            
            {/* Search Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm flex items-center gap-3">
              <Search size={18} className="text-slate-400 ml-1" />
              <input
                type="text"
                placeholder="Search by code, patient name, title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-xs font-semibold placeholder-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border rounded-2xl">
                <RefreshCw className="animate-spin text-teal-600 mx-auto mb-2" size={24} />
                <p className="text-xs text-slate-400 font-bold">Synchronizing CRM Collaboration Bus...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border rounded-2xl border-dashed border-slate-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 mx-auto rounded-xl mb-3">
                  <ClipboardList size={20} />
                </div>
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">No matching tasks found</h4>
                <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  There are no active clinical or front desk tasks matching your selected filters. Create or simulate one to start collaborating.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {filteredTasks.map((task) => {
                  const isOverdue = task.status !== 'Completed' && task.status !== 'Archived' && task.due_date < new Date().toISOString().split('T')[0];
                  const priorityColors = {
                    Low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700',
                    Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
                    High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
                    Critical: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                  };

                  const statusColors = {
                    New: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-350',
                    Assigned: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-350',
                    'In Progress': 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-350',
                    Waiting: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-350',
                    Completed: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-350',
                    Archived: 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                  };

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow transition cursor-pointer select-none text-xs relative ${
                        selectedTask?.id === task.id
                          ? 'border-[#0F6E6E] ring-2 ring-teal-500/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Priority strip */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl ${
                        task.priority === 'Critical' ? 'bg-red-500' :
                        task.priority === 'High' ? 'bg-amber-500' :
                        task.priority === 'Medium' ? 'bg-blue-500' : 'bg-slate-300'
                      }`} />

                      <div className="pl-2 space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                              {task.task_code} • {task.task_type}
                            </span>
                            <h4 className="font-extrabold text-slate-800 dark:text-white leading-snug hover:text-[#0F6E6E]">
                              {task.title}
                            </h4>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase border ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                          
                          {/* Left: Assignees */}
                          <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                            <User size={12} className="text-slate-400" />
                            <span>{task.assigned_to}</span>
                            <span className="text-slate-350 dark:text-slate-600">•</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{task.department}</span>
                          </div>

                          {/* Right: Due Date & Status */}
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${statusColors[task.status]}`}>
                              {task.status}
                            </span>

                            <span className={`text-[10px] font-extrabold flex items-center gap-1 ${
                              isOverdue ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-400'
                            }`}>
                              <Clock size={11} />
                              {isOverdue ? 'Overdue' : task.due_date}
                            </span>
                          </div>

                        </div>

                        {/* Linked Patient Info */}
                        {task.patient_name && (
                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl flex justify-between items-center text-[10px] text-slate-400 border border-slate-100 dark:border-slate-800">
                            <span className="font-bold flex items-center gap-1">
                              <Users size={11} className="text-teal-600 dark:text-teal-500" />
                              Patient: <span className="text-slate-700 dark:text-slate-200">{task.patient_name}</span>
                            </span>
                            <span className="text-[8.5px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 px-1 rounded">Linked ID: {task.patient_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Task Detailed Drawer View */}
          {selectedTask && (
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-5 space-y-5 h-full max-h-[750px] overflow-y-auto relative">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X size={14} />
              </button>

              {/* Header */}
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">{selectedTask.task_code}</span>
                  <span className="text-slate-350">•</span>
                  <span className="text-[10px] font-black uppercase text-[#0F6E6E]">{selectedTask.task_type}</span>
                </div>
                
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                  {selectedTask.title}
                </h3>
              </div>

              {/* Status workflow transitions (Module 3) */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Collaboration Status Stage</p>
                
                <div className="flex flex-wrap gap-1">
                  {(['New', 'Assigned', 'In Progress', 'Waiting', 'Completed', 'Archived'] as Task['status'][]).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedTask.id, st)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                        selectedTask.status === st
                          ? 'bg-[#0F6E6E] text-white border-[#0F6E6E] font-black'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-[9px] uppercase text-slate-400 font-black">Assigned To</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedTask.assigned_to}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-slate-400 font-black">Department</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedTask.department}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-slate-400 font-black">Due Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedTask.due_date}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-slate-400 font-black">Dispatched By</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedTask.assigned_by}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl">
                <p className="text-[9px] uppercase text-slate-400 font-black">Task Description</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedTask.description}
                </p>
              </div>

              {/* Module 8: Attachments Section */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Attachments ({attachments.length})</span>
                  <span className="text-[8.5px] font-black text-[#0F6E6E] uppercase">Drag & Drop Supported</span>
                </h4>

                {/* Drag Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center space-y-2 hover:border-teal-500 transition cursor-pointer"
                >
                  <Paperclip size={18} className="mx-auto text-slate-400 animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-bold">
                    Drag files here, or attach standard dental files:
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-1">
                    <button
                      onClick={() => handleAttachMockFile('Upper_Molar_OPG.png', 'image/png', '2.1 MB')}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[9.5px] border rounded font-black text-slate-500 cursor-pointer"
                    >
                      + Radiograph OPG
                    </button>
                    <button
                      onClick={() => handleAttachMockFile('Prosthetic_Zirconia_Order.pdf', 'application/pdf', '480 KB')}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[9.5px] border rounded font-black text-slate-500 cursor-pointer"
                    >
                      + Lab Prescription PDF
                    </button>
                    <button
                      onClick={() => handleAttachMockFile('Implants_Invoice_Signed.pdf', 'application/pdf', '320 KB')}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[9.5px] border rounded font-black text-slate-500 cursor-pointer"
                    >
                      + Signed Consent
                    </button>
                  </div>
                </div>

                {attachingFile && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-[#0F6E6E]">Uploading file...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-[#0F6E6E] h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <div key={att.id} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200">{att.file_name}</p>
                            <p className="text-[9.5px] text-slate-400 font-bold">{att.file_size} • Attached by {att.uploaded_by}</p>
                          </div>
                        </div>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); notify('info', 'File Opened', `Simulating file preview for ${att.file_name}`); }}
                          className="text-[#0F6E6E] dark:text-teal-400 hover:underline font-bold text-[10.5px]"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Module 7: Comments Section */}
              <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Internal Discussion Thread ({comments.length})
                </h4>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type clinical instruction or receptionist update..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-[#0F6E6E] text-white rounded-xl hover:bg-teal-700 transition active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                </form>

                {comments.length > 0 && (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {comments.map(c => (
                      <div key={c.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-[#0F6E6E] dark:text-teal-400 font-extrabold">{c.author_name} ({c.author_role.toUpperCase()})</span>
                          <span className="text-slate-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          {c.comment_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Module 13: History Timeline */}
              <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audit Log & Timeline</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {history.map(h => (
                    <div key={h.id} className="flex gap-2 text-[10.5px]">
                      <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mt-1.5 self-start" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{h.action} by {h.changed_by}</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal font-semibold">{h.details} • {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* RIGHT FLANK / FLOATING BAR: Notifications Inbox */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-200 tracking-wider flex items-center gap-1.5 text-indigo-600">
              <Bell size={14} className="text-indigo-600 animate-bounce" />
              Dynamic Task Notifications Inbox ({notifications.filter(n => !n.is_read).length} unread)
            </h3>
            <span className="text-[10px] font-extrabold text-slate-400">Target User: {currentUserName}</span>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-bold">
              No task alerts or push updates dispatched to your account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {notifications.slice(0, 6).map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border text-xs flex justify-between gap-3 ${
                    notif.is_read
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900 text-slate-500'
                      : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 ring-1 ring-indigo-100 dark:ring-indigo-900/40'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`font-extrabold text-[11px] ${notif.is_read ? 'text-slate-600' : 'text-indigo-950 dark:text-indigo-400'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[10px] leading-relaxed font-semibold text-slate-400 dark:text-slate-500">
                      {notif.message}
                    </p>
                    <span className="text-[9px] block text-slate-350">{new Date(notif.created_at).toLocaleDateString()}</span>
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      className="p-1 h-fit self-start bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 transition"
                      title="Mark as Read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE TASK DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-100 tracking-wider flex items-center gap-1.5">
                  <ClipboardList size={14} className="text-teal-600" />
                  Dispatch New Collaboration Task
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 rounded-full transition"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs font-semibold">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Task Title</label>
                    <input
                      type="text"
                      placeholder="Enter a descriptive title..."
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-semibold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Detailed Description</label>
                    <textarea
                      placeholder="Add specific instructions, tooth numbers, or follow-up notes..."
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl font-medium"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Task Category / Type</label>
                    <select
                      value={newTaskData.task_type}
                      onChange={(e) => setNewTaskData({ ...newTaskData, task_type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl"
                    >
                      {TASK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Priority Level</label>
                    <select
                      value={newTaskData.priority}
                      onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Assignee</label>
                    <select
                      value={newTaskData.assigned_to}
                      onChange={(e) => {
                        const matchingStaff = STAFF_MEMBERS.find(s => s.name === e.target.value);
                        let matchingDept: Task['department'] = 'Front Desk';
                        if (matchingStaff) {
                          if (matchingStaff.role === 'Doctor') matchingDept = 'Clinical';
                          else if (matchingStaff.role === 'Assistant') matchingDept = 'Clinical';
                          else if (matchingStaff.role === 'Lab Technician') matchingDept = 'Lab';
                          else if (matchingStaff.role === 'Accountant') matchingDept = 'Billing';
                        }
                        setNewTaskData({
                          ...newTaskData,
                          assigned_to: e.target.value,
                          department: matchingDept
                        });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl"
                    >
                      {STAFF_MEMBERS.map(staff => (
                        <option key={staff.name} value={staff.name}>{staff.name} ({staff.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTaskData.due_date}
                      onChange={(e) => setNewTaskData({ ...newTaskData, due_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2 rounded-xl"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Link Patient Case File (Optional)</label>
                    <select
                      value={newTaskData.patient_id}
                      onChange={(e) => setNewTaskData({ ...newTaskData, patient_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border p-2.5 rounded-xl"
                    >
                      <option value="">No patient linked (General Office Task)</option>
                      {patientsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0F6E6E] hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition"
                >
                  Dispatch to Team Member
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
