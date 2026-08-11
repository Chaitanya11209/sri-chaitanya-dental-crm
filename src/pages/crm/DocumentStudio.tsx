import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Trash2, Edit3, Save, ArrowUp, ArrowDown, Check, Eye,
  Settings, Activity, Users, Search, Filter, CheckCircle2, Download,
  Sparkles, Clock, AlertCircle, Copy, CheckSquare, ListPlus, ToggleLeft, ToggleRight, Loader2, ArrowLeft, RefreshCw
} from 'lucide-react';
import {
  formBuilderStore,
  DynamicForm,
  FormSection,
  FormField,
  FieldType,
  SmartFieldType,
  PatientForm,
  FormSignatures
} from '../../lib/formBuilderStore';
import { generateFormPDF } from '../../lib/pdfGenerator';
import { useNotification } from '../../components/NotificationProvider';
import { getRole, isAdmin } from '../../lib/auth';

export default function DocumentStudio() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'submissions' | 'automations'>('dashboard');
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [submissions, setSubmissions] = useState<PatientForm[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Builder state
  const [editingForm, setEditingForm] = useState<DynamicForm | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Published' | 'Draft'>('all');
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'Completed' | 'Pending'>('all');

  // Preview state
  const [previewingForm, setPreviewingForm] = useState<DynamicForm | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<PatientForm | null>(null);
  
  const { notify } = useNotification();
  const userRole = getRole();
  const canManage = isAdmin() || userRole === 'clinic_owner' || userRole === 'admin';

  // Load forms and submissions
  const loadData = async () => {
    setLoading(true);
    try {
      const f = await formBuilderStore.getForms();
      setForms(f);
      const s = await formBuilderStore.getGlobalSubmissions();
      setSubmissions(s);
    } catch (e) {
      notify('error', 'Error Loading Data', 'Could not retrieve dynamic forms records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('forms-store-changed', handleUpdate);
    return () => window.removeEventListener('forms-store-changed', handleUpdate);
  }, []);

  // PDF Generator Trigger
  const handleDownloadPDF = async (sub: PatientForm) => {
    try {
      const allForms = await formBuilderStore.getAllFormsWithArchived();
      const formDef = allForms.find(f => f.id === sub.form_id);
      if (!formDef) {
        notify('error', 'Form Schema Missing', 'Could not find the structural schema of this form.');
        return;
      }
      const doc = await generateFormPDF(sub, formDef);
      doc.save(`${sub.form_name.replace(/\s+/g, '_')}_${sub.patient_name.replace(/\s+/g, '_')}_${sub.id}.pdf`);
      notify('success', 'PDF Generated', 'Document compiled successfully with signatures and security QR code.');
    } catch (e) {
      console.error(e);
      notify('error', 'PDF Error', 'Failed to compile PDF document.');
    }
  };

  // Create new blank form
  const handleInitiateNewForm = () => {
    if (!canManage) {
      notify('warning', 'Access Denied', 'Only administrators can create forms.');
      return;
    }
    const newForm: DynamicForm = {
      id: `f-${Date.now()}`,
      name: 'Untitled Form',
      description: 'Enter a clear description of the document purpose...',
      version: '1.0',
      status: 'Draft',
      created_by: localStorage.getItem('userEmail') || 'Administrator',
      created_at: new Date().toISOString(),
      modified_by: localStorage.getItem('userEmail') || 'Administrator',
      modified_at: new Date().toISOString(),
      automationRules: [],
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          title: 'Personal Information',
          sort_order: 1,
          fields: [
            {
              id: `fld-${Date.now()}-1`,
              type: 'Short Text',
              label: 'Patient Full Name',
              required: true,
              smart_field_type: 'Patient Name',
              sort_order: 1
            }
          ]
        }
      ]
    };
    setEditingForm(newForm);
    setActiveSectionId(newForm.sections[0].id);
    setActiveTab('builder');
  };

  const handleEditForm = (form: DynamicForm) => {
    if (!canManage) {
      notify('warning', 'Access Denied', 'Only administrators can edit forms.');
      return;
    }
    setEditingForm(JSON.parse(JSON.stringify(form))); // deep copy
    setActiveSectionId(form.sections[0]?.id || '');
    setActiveTab('builder');
  };

  const handleDuplicateForm = async (form: DynamicForm) => {
    if (!canManage) {
      notify('warning', 'Access Denied', 'Only administrators can duplicate forms.');
      return;
    }
    const duplicated: DynamicForm = {
      ...JSON.parse(JSON.stringify(form)),
      id: `f-${Date.now()}`,
      name: `${form.name} (Copy)`,
      status: 'Draft',
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    };
    await formBuilderStore.saveForm(duplicated);
    notify('success', 'Form Duplicated', `${form.name} duplicated as Draft.`);
    loadData();
  };

  const handleArchiveForm = async (id: string) => {
    if (!canManage) {
      notify('warning', 'Access Denied', 'Only administrators can archive forms.');
      return;
    }
    if (confirm('Are you sure you want to archive this form? This will remove it from patient assignments.')) {
      await formBuilderStore.archiveForm(id);
      notify('success', 'Form Archived', 'The form status has been set to Archived.');
      loadData();
    }
  };

  const handleSaveFormBuilder = async () => {
    if (!editingForm) return;
    if (!editingForm.name.trim()) {
      notify('error', 'Validation Error', 'Form Name is required.');
      return;
    }
    try {
      await formBuilderStore.saveForm(editingForm);
      notify('success', 'Form Schema Saved', `${editingForm.name} saved successfully.`);
      setActiveTab('dashboard');
      setEditingForm(null);
      loadData();
    } catch (e) {
      notify('error', 'Error Saving', 'Could not save the form schema.');
    }
  };

  // Section Builder Actions
  const handleAddSection = () => {
    if (!editingForm) return;
    const newSec: FormSection = {
      id: `sec-${Date.now()}`,
      title: 'New Section',
      sort_order: editingForm.sections.length + 1,
      fields: []
    };
    const updated = {
      ...editingForm,
      sections: [...editingForm.sections, newSec]
    };
    setEditingForm(updated);
    setActiveSectionId(newSec.id);
  };

  const handleRemoveSection = (secId: string) => {
    if (!editingForm) return;
    if (editingForm.sections.length <= 1) {
      notify('warning', 'Cannot Remove', 'A form must contain at least one section.');
      return;
    }
    const updatedSections = editingForm.sections
      .filter(s => s.id !== secId)
      .map((s, index) => ({ ...s, sort_order: index + 1 }));
    setEditingForm({
      ...editingForm,
      sections: updatedSections
    });
    if (activeSectionId === secId) {
      setActiveSectionId(updatedSections[0].id);
    }
  };

  const handleMoveSection = (secId: string, direction: 'up' | 'down') => {
    if (!editingForm) return;
    const sections = [...editingForm.sections];
    const idx = sections.findIndex(s => s.id === secId);
    if (direction === 'up' && idx > 0) {
      const temp = sections[idx];
      sections[idx] = sections[idx - 1];
      sections[idx - 1] = temp;
    } else if (direction === 'down' && idx < sections.length - 1) {
      const temp = sections[idx];
      sections[idx] = sections[idx + 1];
      sections[idx + 1] = temp;
    }
    const reordered = sections.map((s, index) => ({ ...s, sort_order: index + 1 }));
    setEditingForm({ ...editingForm, sections: reordered });
  };

  // Field Builder Actions
  const handleAddField = (secId: string) => {
    if (!editingForm) return;
    const targetSection = editingForm.sections.find(s => s.id === secId);
    if (!targetSection) return;

    const newField: FormField = {
      id: `fld-${Date.now()}`,
      type: 'Short Text',
      label: 'New Question / Label',
      required: false,
      sort_order: targetSection.fields.length + 1
    };

    const updatedSections = editingForm.sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          fields: [...s.fields, newField]
        };
      }
      return s;
    });

    setEditingForm({ ...editingForm, sections: updatedSections });
  };

  const handleRemoveField = (secId: string, fldId: string) => {
    if (!editingForm) return;
    const updatedSections = editingForm.sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          fields: s.fields.filter(f => f.id !== fldId).map((f, i) => ({ ...f, sort_order: i + 1 }))
        };
      }
      return s;
    });
    setEditingForm({ ...editingForm, sections: updatedSections });
  };

  const handleUpdateField = (secId: string, fldId: string, updates: Partial<FormField>) => {
    if (!editingForm) return;
    const updatedSections = editingForm.sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          fields: s.fields.map(f => (f.id === fldId ? { ...f, ...updates } : f))
        };
      }
      return s;
    });
    setEditingForm({ ...editingForm, sections: updatedSections });
  };

  const handleMoveField = (secId: string, fldId: string, direction: 'up' | 'down') => {
    if (!editingForm) return;
    const updatedSections = editingForm.sections.map(s => {
      if (s.id === secId) {
        const fields = [...s.fields];
        const idx = fields.findIndex(f => f.id === fldId);
        if (direction === 'up' && idx > 0) {
          const temp = fields[idx];
          fields[idx] = fields[idx - 1];
          fields[idx - 1] = temp;
        } else if (direction === 'down' && idx < fields.length - 1) {
          const temp = fields[idx];
          fields[idx] = fields[idx + 1];
          fields[idx + 1] = temp;
        }
        return {
          ...s,
          fields: fields.map((f, i) => ({ ...f, sort_order: i + 1 }))
        };
      }
      return s;
    });
    setEditingForm({ ...editingForm, sections: updatedSections });
  };

  // Toggle Automation rules
  const handleToggleAutomation = async (formId: string, rule: string) => {
    if (!canManage) {
      notify('warning', 'Access Denied', 'Only administrators can change automation rules.');
      return;
    }
    const form = forms.find(f => f.id === formId);
    if (!form) return;

    const currentRules = form.automationRules || [];
    let nextRules = [];
    if (currentRules.includes(rule)) {
      nextRules = currentRules.filter(r => r !== rule);
    } else {
      nextRules = [...currentRules, rule];
    }

    const updated = { ...form, automationRules: nextRules };
    await formBuilderStore.saveForm(updated);
    notify('success', 'Automation Updated', `Auto-assignment rule configured for ${form.name}.`);
    loadData();
  };

  // Filter lists
  const filteredForms = forms.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.patient_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                          s.form_name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                          (s.completed_by && s.completed_by.toLowerCase().includes(subSearchQuery.toLowerCase()));
    const matchesStatus = subStatusFilter === 'all' || s.status === subStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate completion statistics
  const totalAssigned = submissions.length;
  const totalCompleted = submissions.filter(s => s.status === 'Completed').length;
  const totalPending = submissions.filter(s => s.status === 'Pending').length;
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-xs flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <FileText size={20} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Sri Chaitanya Document Studio <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">v3.3</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic EMR clinic forms, interactive drag-and-drop builder, cryptographic QR signatures & auto-triggers.
          </p>
        </div>
        
        {activeTab === 'dashboard' && canManage && (
          <button
            id="btn-create-new-form"
            onClick={handleInitiateNewForm}
            className="mt-3 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Create Custom Form
          </button>
        )}
      </div>

      {/* DASHBOARD STATS MODULE */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-4 flex-shrink-0">
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
              <CheckSquare size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Submissions</p>
              <p className="text-lg font-extrabold text-slate-800">{totalAssigned}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Docs</p>
              <p className="text-lg font-extrabold text-emerald-600">{totalCompleted}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Signature</p>
              <p className="text-lg font-extrabold text-amber-600">{totalPending}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completion Rate</p>
              <p className="text-lg font-extrabold text-teal-700">{completionRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      {editingForm === null && (
        <div className="flex border-b border-slate-200 bg-white px-6 mt-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'dashboard' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Form Templates ({forms.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'submissions' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Digital Documents Registry
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'automations' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Assignment Triggers
          </button>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB 1: FORM TEMPLATE LIST */}
        {activeTab === 'dashboard' && editingForm === null && (
          <div className="space-y-4">
            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search forms by name, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="Published">Published Only</option>
                  <option value="Draft">Drafts Only</option>
                </select>
              </div>
            </div>

            {/* CARDS GRID */}
            {filteredForms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-500">No custom templates matched your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredForms.map((form) => (
                  <div key={form.id} className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          form.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {form.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">v{form.version}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-3">{form.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{form.description}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                        <span>Sections: {form.sections.length}</span>
                        <span>Fields: {form.sections.reduce((acc, s) => acc + s.fields.length, 0)}</span>
                      </div>
                      
                      {form.automationRules && form.automationRules.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {form.automationRules.map(rule => (
                            <span key={rule} className="text-[9px] font-extrabold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100">
                              ⚡ {rule}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex gap-2 justify-end">
                      <button
                        onClick={() => setPreviewingForm(form)}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                        title="Preview template"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleDuplicateForm(form)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 transition cursor-pointer"
                            title="Duplicate Form"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleEditForm(form)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-teal-600 border border-slate-200 transition cursor-pointer"
                            title="Edit Schema"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleArchiveForm(form.id)}
                            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 transition cursor-pointer"
                            title="Archive Form"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIGITAL DOCUMENT REGISTRY */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search submissions by Patient, Form Name, Submitter..."
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</span>
                <select
                  value={subStatusFilter}
                  onChange={(e: any) => setSubStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="all">All Documents</option>
                  <option value="Completed">Completed & Signed</option>
                  <option value="Pending">Pending Signature</option>
                </select>
              </div>
            </div>

            {/* DOCUMENT TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Document / Form</th>
                      <th className="px-6 py-4">Patient Profile</th>
                      <th className="px-6 py-4">Assigned On</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Verification</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                          No digital records matching search criteria found.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-6 py-4">
                            <p className="text-slate-800 font-bold">{sub.form_name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Schema Version: v{sub.version}</p>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">
                            {sub.patient_name}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-500">{new Date(sub.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">By {sub.assigned_by}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {sub.status === 'Completed' ? 'Signed & Locked' : 'Pending Signature'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {sub.status === 'Completed' ? (
                              <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 font-semibold">
                                <span className="text-emerald-600 flex items-center gap-0.5 font-bold"><Check size={10} /> Hashed</span>
                                <span>Signatures: {Object.keys(sub.signatures || {}).length} verified</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-semibold">Verification Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setViewingSubmission(sub)}
                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                View Record
                              </button>
                              
                              {sub.status === 'Completed' && (
                                <button
                                  onClick={() => handleDownloadPDF(sub)}
                                  className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Download size={11} />
                                  PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ASSIGNMENT TRIGGERS */}
        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Workflow Auto-Assignment Rules</h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure clinic forms to be automatically assigned to patient accounts upon specific timeline actions or clinical treatments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { trigger: 'New Patient', desc: 'Fires instantly when a new patient is registered in the EMR.' },
                { trigger: 'Implant Case', desc: 'Fires when a patient is scheduled or designated for endosseous implants.' },
                { trigger: 'RCT Case', desc: 'Fires when an active Root Canal Treatment clinical block is registered.' },
                { trigger: 'Extraction', desc: 'Fires when a tooth extraction procedure is added to the treatment card.' },
                { trigger: 'Orthodontics', desc: 'Fires when starting corrective braces or transparent aligners planning.' },
                { trigger: 'Smile Design', desc: 'Fires when aesthetic cosmetic smile makeover assessments commence.' },
                { trigger: 'Follow-up Visit', desc: 'Fires automatically on post-op follow-up appointment generation.' }
              ].map(({ trigger, desc }) => (
                <div key={trigger} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        {trigger} Action Trigger
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium">{desc}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Automated Forms</p>
                    <div className="space-y-2">
                      {forms.filter(f => f.status === 'Published').map(form => {
                        const isTriggered = (form.automationRules || []).includes(trigger);
                        return (
                          <div key={form.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-700">{form.name}</span>
                            <button
                              onClick={() => handleToggleAutomation(form.id, trigger)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wider transition ${
                                isTriggered ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                              }`}
                            >
                              {isTriggered ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- DYNAMIC FORM BUILDER PANEL --- */}
        {activeTab === 'builder' && editingForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
            
            {/* BUILDER SIDEBAR: PROPERTIES */}
            <div className="w-full md:w-80 border-r border-slate-200 p-5 bg-slate-50/50 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm border-b pb-2">
                  <Settings size={15} />
                  Form Metadata Properties
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Form Name</label>
                  <input
                    type="text"
                    value={editingForm.name}
                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
                    placeholder="E.g., Medical History"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingForm.description}
                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                    placeholder="Enter purpose of the document..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Version</label>
                    <input
                      type="text"
                      value={editingForm.version}
                      onChange={(e) => setEditingForm({ ...editingForm, version: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                    <select
                      value={editingForm.status}
                      onChange={(e: any) => setEditingForm({ ...editingForm, status: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                </div>

                {/* Automation Rules */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Automation Triggers</label>
                  <div className="space-y-1.5 mt-1 bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {['New Patient', 'Implant Case', 'RCT Case', 'Extraction', 'Orthodontics', 'Smile Design', 'Follow-up Visit'].map(trig => {
                      const rules = editingForm.automationRules || [];
                      const isChecked = rules.includes(trig);
                      return (
                        <label key={trig} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const next = isChecked ? rules.filter(r => r !== trig) : [...rules, trig];
                              setEditingForm({ ...editingForm, automationRules: next });
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          {trig}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200 space-y-2">
                <button
                  onClick={handleSaveFormBuilder}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Save Form Template
                </button>
                <button
                  onClick={() => {
                    setEditingForm(null);
                    setActiveTab('dashboard');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel & Exit
                </button>
              </div>
            </div>

            {/* BUILDER WORKSPACE: SECTIONS & FIELDS */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-sm font-bold text-slate-800">Sections & Custom Fields Structure</h2>
                  <button
                    onClick={handleAddSection}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-550/10 hover:bg-teal-550/20 text-teal-700 rounded-lg text-xs font-bold transition cursor-pointer bg-teal-50 border border-teal-100"
                  >
                    <Plus size={12} />
                    Add Form Section
                  </button>
                </div>

                {/* SECTIONS LAYOUT */}
                <div className="space-y-6">
                  {editingForm.sections.map((section, secIdx) => (
                    <div
                      key={section.id}
                      className={`p-5 rounded-2xl border transition ${
                        activeSectionId === section.id ? 'border-teal-400 bg-teal-50/5' : 'border-slate-150 bg-white'
                      }`}
                      onClick={() => setActiveSectionId(section.id)}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-black text-teal-600">S#{section.sort_order}</span>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const updatedSections = editingForm.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                              setEditingForm({ ...editingForm, sections: updatedSections });
                            }}
                            className="bg-transparent border-b border-dashed border-slate-300 text-slate-800 font-bold text-sm focus:outline-none focus:border-teal-500 py-0.5"
                          />
                        </div>
                        
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            disabled={secIdx === 0}
                            onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'up'); }}
                            className="p-1 rounded-md bg-slate-50 hover:bg-slate-200 border text-slate-500 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            disabled={secIdx === editingForm.sections.length - 1}
                            onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'down'); }}
                            className="p-1 rounded-md bg-slate-50 hover:bg-slate-200 border text-slate-500 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ArrowDown size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveSection(section.id); }}
                            className="p-1 rounded-md bg-slate-50 hover:bg-red-50 hover:border-red-200 text-red-500 border transition cursor-pointer"
                            title="Remove Section"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* FIELD ITEMS */}
                      <div className="space-y-4">
                        {section.fields.map((field, fldIdx) => (
                          <div key={field.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-start">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 lg:mt-2.5">
                              <span className="font-bold">F#{field.sort_order}</span>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                              {/* Field Label */}
                              <div className="md:col-span-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Field Label / Question</label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(section.id, field.id, { label: e.target.value })}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-teal-500"
                                />
                              </div>

                              {/* Field Type */}
                              <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Field Type</label>
                                <select
                                  value={field.type}
                                  onChange={(e: any) => handleUpdateField(section.id, field.id, { type: e.target.value })}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                                >
                                  {[
                                    'Short Text', 'Long Text', 'Number', 'Date', 'Time',
                                    'Checkbox', 'Radio Button', 'Dropdown', 'Multi Select',
                                    'File Upload', 'Image Upload', 'Signature', 'Tooth Selector',
                                    'Doctor Selector', 'Treatment Selector'
                                  ].map(typeStr => (
                                    <option key={typeStr} value={typeStr}>{typeStr}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Smart field binding */}
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Smart Autoload</label>
                                <select
                                  value={field.smart_field_type || ''}
                                  onChange={(e) => handleUpdateField(section.id, field.id, { smart_field_type: (e.target.value || undefined) as SmartFieldType })}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                                >
                                  <option value="">None</option>
                                  <option value="Patient Name">Patient Name</option>
                                  <option value="Age">Patient Age</option>
                                  <option value="Gender">Patient Gender</option>
                                  <option value="Doctor">Operating Doctor</option>
                                  <option value="Treatment">Treatment Plan</option>
                                  <option value="Appointment Date">Appointment Date</option>
                                  <option value="Clinic Name">Clinic Name</option>
                                  <option value="Invoice Number">Invoice/Bill No.</option>
                                  <option value="Today's Date">Today's Date</option>
                                </select>
                              </div>

                              {/* Required check */}
                              <div className="md:col-span-2 flex items-center justify-start mt-4">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => handleUpdateField(section.id, field.id, { required: e.target.checked })}
                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  Required
                                </label>
                              </div>

                              {/* Dropdown Options (shows only for selective fields) */}
                              {['Checkbox', 'Radio Button', 'Dropdown', 'Multi Select'].includes(field.type) && (
                                <div className="md:col-span-12">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Choices / Options (comma separated)</label>
                                  <input
                                    type="text"
                                    value={field.options ? field.options.join(', ') : ''}
                                    onChange={(e) => handleUpdateField(section.id, field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                                    placeholder="E.g., Option 1, Option 2, Option 3..."
                                  />
                                </div>
                              )}
                            </div>

                            {/* Field Actions */}
                            <div className="flex lg:flex-col gap-1.5 self-end lg:self-start lg:mt-4">
                              <button
                                disabled={fldIdx === 0}
                                onClick={() => handleMoveField(section.id, field.id, 'up')}
                                className="p-1 rounded bg-white hover:bg-slate-200 border text-slate-500 disabled:opacity-40 transition cursor-pointer"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                disabled={fldIdx === section.fields.length - 1}
                                onClick={() => handleMoveField(section.id, field.id, 'down')}
                                className="p-1 rounded bg-white hover:bg-slate-200 border text-slate-500 disabled:opacity-40 transition cursor-pointer"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                onClick={() => handleRemoveField(section.id, field.id)}
                                className="p-1 rounded bg-white hover:bg-red-50 hover:border-red-150 text-red-500 border transition cursor-pointer"
                                title="Remove Field"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Field Button */}
                      <button
                        onClick={() => handleAddField(section.id)}
                        className="mt-4 flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <ListPlus size={13} />
                        Add Question Field
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- PREVIEW FORM MODAL (MODULE 1 & 2 PREVIEWER) --- */}
      {previewingForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-base font-black text-slate-800">{previewingForm.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Template Preview mode • Version {previewingForm.version}</p>
              </div>
              <button
                onClick={() => setPreviewingForm(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {previewingForm.sections.map((sec) => (
                <div key={sec.id} className="space-y-3">
                  <h4 className="text-sm font-bold text-teal-600 border-b pb-1">{sec.title}</h4>
                  <div className="space-y-3">
                    {sec.fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.type === 'Short Text' && (
                          <input type="text" disabled placeholder={field.placeholder || 'Enter response...'} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                        )}
                        {field.type === 'Long Text' && (
                          <textarea rows={2} disabled placeholder={field.placeholder || 'Enter detailed response...'} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                        )}
                        {field.type === 'Number' && (
                          <input type="number" disabled className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                        )}
                        {field.type === 'Date' && (
                          <input type="date" disabled className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                        )}
                        {field.type === 'Time' && (
                          <input type="time" disabled className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                        )}
                        {['Checkbox', 'Radio Button', 'Dropdown', 'Multi Select'].includes(field.type) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(field.options || ['Sample Choice 1', 'Sample Choice 2']).map(opt => (
                              <span key={opt} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-[10px] rounded-lg text-slate-500 font-bold">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {field.type === 'Tooth Selector' && (
                          <div className="p-3 bg-slate-50 border rounded-lg text-center text-xs text-slate-400 italic font-semibold">
                            🦷 Selected Teeth Grid Widget placeholder
                          </div>
                        )}
                        {field.type === 'Signature' && (
                          <div className="h-16 bg-slate-50 border border-dashed rounded-lg flex items-center justify-center text-[10px] text-slate-400 italic">
                            ✍️ Digital Signature canvas area
                          </div>
                        )}
                        {field.type === 'Doctor Selector' && (
                          <div className="p-2 bg-slate-50 border rounded-lg text-xs text-slate-500">
                            🩺 Selecting Dr. Durga Bhavani Jupalli (Autoloaded)
                          </div>
                        )}
                        {field.type === 'Treatment Selector' && (
                          <div className="p-2 bg-slate-50 border rounded-lg text-xs text-slate-500">
                            🦷 Root Canal Treatment (RCT) / Implant Placement (Autoloaded)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl text-right">
              <button
                onClick={() => setPreviewingForm(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAIL SUBMISSION PREVIEW MODAL --- */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-sm font-black text-slate-800">{viewingSubmission.form_name} Submission</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Patient: {viewingSubmission.patient_name} • Completed On {viewingSubmission.completed_at ? new Date(viewingSubmission.completed_at).toLocaleString() : 'Pending'}</p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Submission Answers Grid */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Responses & Information</p>
                <div className="divide-y divide-slate-100 space-y-2">
                  {Object.entries(viewingSubmission.answers || {}).map(([key, val]) => {
                    let displayVal = '—';
                    if (val !== undefined && val !== null) {
                      if (Array.isArray(val)) {
                        displayVal = val.join(', ');
                      } else if (typeof val === 'boolean') {
                        displayVal = val ? 'Yes' : 'No';
                      } else {
                        displayVal = String(val);
                      }
                    }
                    return (
                      <div key={key} className="pt-2">
                        <p className="text-xs font-bold text-slate-600">{key}</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{displayVal}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Signatures panel */}
              {viewingSubmission.signatures && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clinical Signatures Authenticated</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingSubmission.signatures.patient && (
                      <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-800">Patient Signatory</p>
                        <p className="text-xs font-semibold text-slate-800 mt-1">{viewingSubmission.signatures.patient.signature}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Signed via {viewingSubmission.signatures.patient.type} at {new Date(viewingSubmission.signatures.patient.timestamp).toLocaleDateString()}</p>
                      </div>
                    )}
                    {viewingSubmission.signatures.doctor && (
                      <div className="bg-teal-50/20 p-3 rounded-xl border border-teal-100">
                        <p className="text-[10px] font-bold text-teal-800">Doctor Attestation</p>
                        <p className="text-xs font-semibold text-slate-800 mt-1">{viewingSubmission.signatures.doctor.doctor_name}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Authenticated at {new Date(viewingSubmission.signatures.doctor.timestamp).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-between items-center">
              <button
                onClick={() => handleDownloadPDF(viewingSubmission)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                Download PDF
              </button>
              <button
                onClick={() => setViewingSubmission(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
