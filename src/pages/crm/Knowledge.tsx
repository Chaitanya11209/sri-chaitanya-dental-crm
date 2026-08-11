import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, FileText, CheckSquare, Wrench, GraduationCap, Search, Plus, Eye, 
  History, Check, AlertCircle, Clock, Tag, Trash2, Calendar, User, 
  ArrowLeft, RefreshCw, Sparkles, Filter, Info, Video, HelpCircle, Save, 
  CheckCircle2, Shield, Play, Lock, ExternalLink, ChevronRight, FileDown, CheckSquare2
} from 'lucide-react';
import { useNotification } from '../../components/NotificationProvider';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, getRole, isAdmin } from '../../lib/auth';
import { knowledgeService } from '../../services/knowledgeService';
import { 
  KnowledgeDocument, DocumentStatus, DocumentVersion, DocumentAcknowledgement,
  ReusableChecklist, EquipmentItem, TrainingMaterial, TrainingProgress, EmbeddedChecklist
} from '../../types/knowledge';

const AVAILABLE_CATEGORIES = [
  'Clinical Protocols',
  'Reception SOPs',
  'Dental Assistant SOPs',
  'Sterilization',
  'Infection Control',
  'Implant Protocols',
  'RCT Protocols',
  'Orthodontic Protocols',
  'Radiology Guidelines',
  'Inventory Procedures',
  'Billing Procedures',
  'Emergency Response',
  'HR Policies',
  'Training Material'
];

export default function Knowledge() {
  const { notify } = useNotification();
  const user = getCurrentUser();
  const currentRole = getRole() || 'staff';
  const isUserAdmin = isAdmin() || currentRole === 'clinic_owner' || currentRole === 'doctor';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'checklists' | 'equipment' | 'training'>('dashboard');

  // Loading States
  const [loading, setLoading] = useState(true);

  // Core Data State
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [reusableChecklists, setReusableChecklists] = useState<ReusableChecklist[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<TrainingMaterial[]>([]);
  const [trainingProgressList, setTrainingProgressList] = useState<TrainingProgress[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<DocumentAcknowledgement[]>([]);

  // Advanced Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedMandatory, setSelectedMandatory] = useState<string>('All');

  // Document Editing/Creating State
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docVersions, setDocVersions] = useState<DocumentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Form states for creating/editing document
  const [docForm, setDocForm] = useState<{
    title: string;
    category: string;
    status: DocumentStatus;
    is_mandatory: boolean;
    content: string;
    tags: string;
    video_url: string;
    newTagInput: string;
    tempTags: string[];
    changelog: string;
    checklists: { title: string; items: string[] }[];
  }>({
    title: '',
    category: 'Clinical Protocols',
    status: 'Draft',
    is_mandatory: false,
    content: '',
    tags: '',
    video_url: '',
    newTagInput: '',
    tempTags: [],
    changelog: 'Initial version',
    checklists: []
  });

  // Reusable checklist execution state
  const [activeChecklist, setActiveChecklist] = useState<ReusableChecklist | null>(null);
  const [checklistNotes, setChecklistNotes] = useState('');

  // Equipment custom trigger state
  const [calibratingItem, setCalibratingItem] = useState<EquipmentItem | null>(null);
  const [calibrationTech, setCalibrationTech] = useState('');
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [eqForm, setEqForm] = useState<Partial<EquipmentItem>>({
    name: '',
    serial_number: '',
    category: 'Sterilizer',
    maintenance_instructions: '',
    calibration_schedule: 'Every 6 Months',
    warranty_expiry: '',
    vendor_name: '',
    vendor_contact: ''
  });

  // Training Assessment states
  const [activeQuiz, setActiveQuiz] = useState<TrainingMaterial | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Initialize service & fetch initial state
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        knowledgeService.initialize();
        const docs = await knowledgeService.getDocuments();
        const checklists = await knowledgeService.getReusableChecklists();
        const equipment = await knowledgeService.getEquipment();
        const training = await knowledgeService.getTrainingMaterials();
        const acks = await knowledgeService.getAcknowledgements();
        
        setDocuments(docs);
        setReusableChecklists(checklists);
        setEquipmentList(equipment);
        setTrainingMaterials(training);
        setAcknowledgements(acks);

        if (user) {
          const progress = await knowledgeService.getTrainingProgress(user.email);
          setTrainingProgressList(progress);
        }
      } catch (err) {
        console.error('Failed to load clinical knowledge repository:', err);
        notify('error', 'Retrieval Failure', 'Could not sync Knowledge Base files.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync state helpers
  const refreshDocuments = async () => {
    const docs = await knowledgeService.getDocuments();
    setDocuments(docs);
    const acks = await knowledgeService.getAcknowledgements();
    setAcknowledgements(acks);
  };

  const handleSelectDoc = async (doc: KnowledgeDocument) => {
    setSelectedDoc(doc);
    setIsEditingDoc(false);
    setIsCreatingDoc(false);
    setShowVersionHistory(false);
    
    // Log view count increment asynchronously
    knowledgeService.recordDocumentView(doc.id);
    
    // Fetch version logs
    const versions = await knowledgeService.getDocumentVersions(doc.id);
    setDocVersions(versions);
  };

  const handleAcknowledgeDoc = async (docId: string, comments?: string) => {
    if (!user) return;
    try {
      const ack = await knowledgeService.acknowledgeDocument(
        docId,
        user.email,
        user.name || 'User',
        currentRole,
        comments
      );
      notify('success', 'Document Acknowledged', 'You have officially logged your verification of this clinical document.');
      
      // Update UI state
      setAcknowledgements(prev => [...prev, ack]);
      
      // Update local doc list if views/status updated
      await refreshDocuments();
      if (selectedDoc && selectedDoc.id === docId) {
        const freshDocs = await knowledgeService.getDocuments();
        const matching = freshDocs.find(d => d.id === docId);
        if (matching) setSelectedDoc(matching);
      }
    } catch (err) {
      notify('error', 'Acknowledgement Failed', 'Could not record clinical sign-off.');
    }
  };

  // Workflow Approval transition triggers
  const handleUpdateStatus = async (doc: KnowledgeDocument, newStatus: DocumentStatus) => {
    if (!isUserAdmin) {
      notify('error', 'Unauthorized Access', 'Only clinic administrators or doctors can alter protocol states.');
      return;
    }
    try {
      const updatedDoc = {
        ...doc,
        status: newStatus,
        approver_name: newStatus === 'Approved' || newStatus === 'Published' ? user?.name : doc.approver_name,
        approval_date: newStatus === 'Approved' || newStatus === 'Published' ? new Date().toISOString().slice(0, 10) : doc.approval_date
      };
      await knowledgeService.saveDocument(updatedDoc, user?.name || 'Admin', false);
      notify('success', 'Status Updated', `Document "${doc.title}" status changed to ${newStatus}.`);
      
      await refreshDocuments();
      setSelectedDoc(updatedDoc);
    } catch (err) {
      notify('error', 'Status Sync Failed', 'Unable to execute protocol status transition.');
    }
  };

  const handleRollbackVersion = async (docId: string, versionObj: DocumentVersion) => {
    if (!isUserAdmin) {
      notify('error', 'Access Restricted', 'Administrator authorization is required for rollback execution.');
      return;
    }
    const confirm = window.confirm(`Are you sure you want to rollback this document to version ${versionObj.version_number}?`);
    if (!confirm) return;

    try {
      const rolledDoc = await knowledgeService.rollbackDocumentVersion(docId, versionObj, user?.name || 'Administrator');
      notify('success', 'Rollback Succeeded', `Protocol state rolled back to version ${rolledDoc.current_version}.`);
      
      await refreshDocuments();
      setSelectedDoc(rolledDoc);
      const versions = await knowledgeService.getDocumentVersions(docId);
      setDocVersions(versions);
      setShowVersionHistory(false);
    } catch (err) {
      notify('error', 'Rollback Failed', 'Could not execute target rollback operation.');
    }
  };

  // Document Editor logic
  const handleStartCreateDoc = () => {
    setDocForm({
      title: '',
      category: 'Clinical Protocols',
      status: 'Draft',
      is_mandatory: false,
      content: '',
      tags: '',
      video_url: '',
      newTagInput: '',
      tempTags: [],
      changelog: 'Initial version',
      checklists: []
    });
    setIsCreatingDoc(true);
    setIsEditingDoc(false);
    setSelectedDoc(null);
  };

  const handleStartEditDoc = (doc: KnowledgeDocument) => {
    setDocForm({
      title: doc.title,
      category: doc.category,
      status: doc.status,
      is_mandatory: doc.is_mandatory,
      content: doc.content,
      tags: doc.tags.join(', '),
      video_url: doc.video_url || '',
      newTagInput: '',
      tempTags: doc.tags,
      changelog: '',
      checklists: doc.checklists ? doc.checklists.map(c => ({ title: c.title, items: c.items.map(it => it.text) })) : []
    });
    setIsEditingDoc(true);
    setIsCreatingDoc(false);
  };

  const handleAddTag = () => {
    const tag = docForm.newTagInput.trim();
    if (tag && !docForm.tempTags.includes(tag)) {
      setDocForm(prev => ({
        ...prev,
        tempTags: [...prev.tempTags, tag],
        newTagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDocForm(prev => ({
      ...prev,
      tempTags: prev.tempTags.filter(t => t !== tag)
    }));
  };

  const handleAddFormChecklist = () => {
    setDocForm(prev => ({
      ...prev,
      checklists: [...prev.checklists, { title: 'Required Steps Checklist', items: [''] }]
    }));
  };

  const handleUpdateChecklistItem = (chkIdx: number, itemIdx: number, val: string) => {
    setDocForm(prev => {
      const updated = [...prev.checklists];
      updated[chkIdx].items[itemIdx] = val;
      return { ...prev, checklists: updated };
    });
  };

  const handleAddChecklistItem = (chkIdx: number) => {
    setDocForm(prev => {
      const updated = [...prev.checklists];
      updated[chkIdx].items.push('');
      return { ...prev, checklists: updated };
    });
  };

  const handleSaveDocForm = async () => {
    if (!docForm.title.trim()) {
      notify('error', 'Title Required', 'Please enter a protocol title.');
      return;
    }
    if (!docForm.content.trim()) {
      notify('error', 'Content Required', 'Please enter some clinical text or guidelines.');
      return;
    }

    try {
      const cleanChecklists: EmbeddedChecklist[] = docForm.checklists
        .filter(c => c.title.trim() !== '')
        .map((c, idx) => ({
          id: `chk-form-${idx}-${Date.now()}`,
          title: c.title,
          items: c.items.filter(it => it.trim() !== '').map((it, i) => ({
            id: `chk-item-${idx}-${i}-${Date.now()}`,
            text: it,
            checked: false
          }))
        }));

      if (isCreatingDoc) {
        const newDoc: KnowledgeDocument = {
          id: '', // Service handles assignment
          title: docForm.title,
          category: docForm.category,
          status: docForm.status,
          is_mandatory: docForm.is_mandatory,
          created_at: '',
          updated_at: '',
          author_name: user?.name || 'Administrator',
          current_version: '1.0',
          tags: docForm.tempTags,
          views_count: 0,
          content: docForm.content,
          video_url: docForm.video_url || undefined,
          checklists: cleanChecklists.length > 0 ? cleanChecklists : undefined
        };
        const created = await knowledgeService.saveDocument(newDoc, user?.name || 'Admin', true);
        notify('success', 'Protocol Created', 'Your drafted SOP is added to the system under version 1.0.');
        setSelectedDoc(created);
        setIsCreatingDoc(false);
      } else if (isEditingDoc && selectedDoc) {
        // Edit flow creates a new minor version if published or updates the draft
        const isCurrentlyPublished = selectedDoc.status === 'Published';
        const nextVer = isCurrentlyPublished 
          ? `${(parseFloat(selectedDoc.current_version) + 0.1).toFixed(1)}` 
          : selectedDoc.current_version;

        const updatedDoc: KnowledgeDocument = {
          ...selectedDoc,
          title: docForm.title,
          category: docForm.category,
          status: docForm.status,
          is_mandatory: docForm.is_mandatory,
          content: docForm.content,
          tags: docForm.tempTags,
          current_version: nextVer,
          video_url: docForm.video_url || undefined,
          checklists: cleanChecklists.length > 0 ? cleanChecklists : undefined
        };

        await knowledgeService.saveDocument(updatedDoc, user?.name || 'Admin', false);

        if (isCurrentlyPublished) {
          // Log version record
          await knowledgeService.createDocumentVersion({
            document_id: selectedDoc.id,
            version_number: nextVer,
            content: docForm.content,
            changelog: docForm.changelog || 'Routine content updates.',
            performed_by_name: user?.name || 'Staff'
          });
        }

        notify('success', 'Changes Saved', `Clinical protocol "${docForm.title}" has been updated.`);
        setSelectedDoc(updatedDoc);
        setIsEditingDoc(false);
      }

      await refreshDocuments();
    } catch (err) {
      console.error(err);
      notify('error', 'Save Bypassed', 'Failed to commit protocol form elements.');
    }
  };

  // Checklist execution engine
  const handleToggleChecklistItem = (chkId: string, itemId: string) => {
    setReusableChecklists(prev => {
      return prev.map(c => {
        if (c.id === chkId) {
          return {
            ...c,
            items: c.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it)
          };
        }
        return c;
      });
    });

    if (activeChecklist && activeChecklist.id === chkId) {
      setActiveChecklist(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it)
        };
      });
    }
  };

  const handleCompleteChecklist = async (chkId: string) => {
    const listObj = reusableChecklists.find(c => c.id === chkId);
    if (!listObj) return;

    try {
      const performer = user?.name || 'Dental Staff';
      const updated = await knowledgeService.recordChecklistCompletion(chkId, performer, checklistNotes);
      notify('success', 'Checklist Logged', `Sterile compliance signed off for "${listObj.title}".`);
      
      setReusableChecklists(prev => prev.map(c => c.id === chkId ? updated : c));
      setActiveChecklist(null);
      setChecklistNotes('');
    } catch (err) {
      notify('error', 'Sign-off Failed', 'Unable to archive checklist sign-off.');
    }
  };

  // Calibration and Equipment log logic
  const handleTriggerCalibration = async (eqId: string) => {
    const eq = equipmentList.find(e => e.id === eqId);
    if (!eq) return;
    setCalibratingItem(eq);
    setCalibrationTech('');
  };

  const handleSaveCalibration = async () => {
    if (!calibratingItem) return;
    if (!calibrationTech.trim()) {
      notify('error', 'Name Required', 'Please input the certifying technician or vendor name.');
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      // Math for next calibration date
      const interval = calibratingItem.calibration_schedule || 'Every 6 Months';
      const addMonths = interval.toLowerCase().includes('3') ? 3 : interval.toLowerCase().includes('12') ? 12 : 6;
      
      const nextDateObj = new Date();
      nextDateObj.setMonth(nextDateObj.getMonth() + addMonths);
      const nextDate = nextDateObj.toISOString().slice(0, 10);

      const updated = await knowledgeService.recordCalibration(
        calibratingItem.id,
        calibrationTech,
        today,
        nextDate
      );

      notify('success', 'Calibration Verified', `${calibratingItem.name} calibration scheduled successfully.`);
      setEquipmentList(prev => prev.map(e => e.id === calibratingItem.id ? updated : e));
      setCalibratingItem(null);
    } catch (err) {
      notify('error', 'Validation Failed', 'Could not record clinical calibration cycle.');
    }
  };

  const handleSaveEquipmentForm = async () => {
    if (!eqForm.name?.trim()) {
      notify('error', 'Name Required', 'Please enter a device or equipment name.');
      return;
    }
    try {
      const cleanForm: EquipmentItem = {
        id: eqForm.id || '',
        name: eqForm.name,
        serial_number: eqForm.serial_number || `SCDC-${Date.now().toString().slice(-6)}`,
        category: eqForm.category || 'General',
        maintenance_instructions: eqForm.maintenance_instructions,
        calibration_schedule: eqForm.calibration_schedule,
        last_calibration_date: eqForm.last_calibration_date,
        next_calibration_date: eqForm.next_calibration_date,
        warranty_expiry: eqForm.warranty_expiry,
        vendor_name: eqForm.vendor_name || 'Generic Vendor',
        vendor_contact: eqForm.vendor_contact || 'N/A'
      };

      const saved = await knowledgeService.saveEquipmentItem(cleanForm);
      notify('success', 'Equipment Saved', `Asset catalog updated with: ${cleanForm.name}.`);
      
      if (eqForm.id) {
        setEquipmentList(prev => prev.map(e => e.id === eqForm.id ? saved : e));
      } else {
        setEquipmentList(prev => [...prev, saved]);
      }
      setShowEquipmentForm(false);
      setEqForm({
        name: '',
        serial_number: '',
        category: 'Sterilizer',
        maintenance_instructions: '',
        calibration_schedule: 'Every 6 Months',
        warranty_expiry: '',
        vendor_name: '',
        vendor_contact: ''
      });
    } catch (err) {
      notify('error', 'Catalog Failed', 'Could not save equipment details.');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to retire and delete this equipment asset?');
    if (!confirm) return;
    try {
      await knowledgeService.deleteEquipmentItem(id);
      notify('info', 'Asset Retired', 'Equipment retired and removed from active registry logs.');
      setEquipmentList(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      notify('error', 'Retirement Bypassed', 'Failed to remove equipment.');
    }
  };

  // Training assessments logic
  const handleStartQuiz = (quiz: TrainingMaterial) => {
    setActiveQuiz(quiz);
    setQuizAnswers({});
    setQuizScore(null);
    setQuizSubmitted(false);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !activeQuiz.assessment_questions) return;

    let correctCount = 0;
    const total = activeQuiz.assessment_questions.length;

    activeQuiz.assessment_questions.forEach((q, idx) => {
      if (quizAnswers[q.id] === q.correct_option_index) {
        correctCount++;
      }
    });

    const scorePct = Math.round((correctCount / total) * 100);
    setQuizScore(scorePct);
    setQuizSubmitted(true);

    if (user) {
      const progress = await knowledgeService.submitAssessmentScore(
        activeQuiz.id,
        user.email,
        user.name || 'Staff User',
        scorePct
      );
      // Reload progress state
      const updatedProg = await knowledgeService.getTrainingProgress(user.email);
      setTrainingProgressList(updatedProg);

      if (scorePct >= 70) {
        notify('success', 'Assessment Certified', `Passed with ${scorePct}% score! Certification updated.`);
      } else {
        notify('warning', 'Retake Recommended', `Scored ${scorePct}%. Practice limits require 70% to certify.`);
      }
    }
  };

  const handleMarkCourseCompleted = async (courseId: string) => {
    if (!user) return;
    try {
      const record = await knowledgeService.markTrainingCompleted(courseId, user.email, user.name || 'Staff User');
      const updatedProg = await knowledgeService.getTrainingProgress(user.email);
      setTrainingProgressList(updatedProg);
      notify('success', 'Training Completed', 'Course completed and marked on your learning history transcript.');
    } catch (err) {
      notify('error', 'Execution Failed', 'Failed to update training log.');
    }
  };

  // Calculate stats for Dashboard
  const stats = {
    totalDocs: documents.length,
    protocols: documents.filter(d => d.category.includes('Protocol')).length,
    sops: documents.filter(d => d.category.includes('SOP') || d.category.includes('Infection') || d.category.includes('Sterilization')).length,
    equipmentCount: equipmentList.length,
    emergencies: documents.filter(d => d.category === 'Emergency Response').length,
    mandatoryUnread: user ? documents.filter(d => {
      if (!d.is_mandatory || d.status !== 'Published') return false;
      const isAcked = acknowledgements.some(ack => ack.document_id === d.id && ack.user_id === user.email);
      return !isAcked;
    }).length : 0,
    mostViewed: [...documents].sort((a, b) => b.views_count - a.views_count).slice(0, 3),
    recentUpdates: [...documents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 3)
  };

  // Advanced search query logic
  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase().trim();
    const matchesKeyword = query === '' || 
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query) ||
      doc.author_name.toLowerCase().includes(query) ||
      doc.tags.some(t => t.toLowerCase().includes(query));

    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    
    // Dept logic: receptionist -> Reception SOPs, doctor/admin -> clinical etc.
    let matchesDept = true;
    if (selectedDepartment !== 'All') {
      if (selectedDepartment === 'Receptionist') {
        matchesDept = doc.category.includes('Reception') || doc.category.includes('Billing');
      } else if (selectedDepartment === 'Assistant') {
        matchesDept = doc.category.includes('Assistant') || doc.category.includes('Sterilization') || doc.category.includes('Infection');
      } else if (selectedDepartment === 'Doctors') {
        matchesDept = doc.category.includes('Protocol') || doc.category.includes('Radiology');
      }
    }

    const matchesStatus = selectedStatus === 'All' || doc.status === selectedStatus;
    const matchesMandatory = selectedMandatory === 'All' || 
      (selectedMandatory === 'Mandatory' && doc.is_mandatory) ||
      (selectedMandatory === 'Routine' && !doc.is_mandatory);

    return matchesKeyword && matchesCategory && matchesDept && matchesStatus && matchesMandatory;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="text-[#0F6E6E] animate-spin" size={28} />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          SCDC Operations Hub syncing...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      
      {/* HEADER HERO AREA */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-500/20 shadow-xl relative overflow-hidden select-none">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <BookOpen size={240} className="text-[#14B8A6] animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <span className="bg-emerald-500/20 text-emerald-300 font-mono font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/30">
              Clinical Quality & Training
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2 font-sans">
              <BookOpen size={22} className="text-[#14B8A6]" /> Clinical Knowledge & SOP Center
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
              Maintain standardized sterilization protocols, clinical dental charts, operational guidelines, calibration schedules, and staff training assessments to preserve institutional excellence.
            </p>
          </div>
          <button 
            onClick={handleStartCreateDoc}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#0F6E6E] hover:bg-[#0D5F5F] text-white text-xs font-bold shadow-md transition cursor-pointer border-0 shrink-0"
          >
            <Plus size={14} />
            <span>Draft SOP / Protocol</span>
          </button>
        </div>
      </div>

      {/* TABS SELECTOR (ARCHETYPAL MATHEMATICAL RATIOS, SPACIOUS TAB ROW) */}
      <div className="flex flex-wrap gap-2.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-3xs max-w-max select-none">
        {[
          { id: 'dashboard', label: 'Operations Dashboard', icon: Sparkles },
          { id: 'documents', label: 'SOPs & Documents', icon: FileText },
          { id: 'checklists', label: 'Reusable Checklists', icon: CheckSquare2 },
          { id: 'equipment', label: 'Equipment & Calibration', icon: Wrench },
          { id: 'training', label: 'Training Center', icon: GraduationCap }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedDoc(null);
                setIsEditingDoc(false);
                setIsCreatingDoc(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wide cursor-pointer transition border-0 ${
                isActive 
                  ? 'bg-[#0F6E6E] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.id === 'documents' && stats.mandatoryUnread > 0 && (
                <span className="ml-1 bg-red-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                  {stats.mandatoryUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD TAB CONTAINER */}
      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* STATISTICS METRIC GRID - MATHEMATICALLY SPACED AND NO 'HERO SLOP' STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SOP Registry</p>
                <h3 className="text-2xl font-black text-slate-800 font-mono mt-2">{stats.totalDocs}</h3>
              </div>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-4">Verified active SOPs</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-[#0F6E6E] uppercase tracking-widest">Clinical Protocols</p>
                <h3 className="text-2xl font-black text-slate-800 font-mono mt-2">{stats.protocols}</h3>
              </div>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-4">MTA, RCT & Implantology</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Hygiene & Sterilization</p>
                <h3 className="text-2xl font-black text-slate-800 font-mono mt-2">{stats.sops}</h3>
              </div>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-4">Infection Control Standards</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Calibration Queue</p>
                <h3 className="text-2xl font-black text-slate-800 font-mono mt-2">{stats.equipmentCount}</h3>
              </div>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-4">Calibrated medical assets</p>
            </div>

            <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-red-100 flex flex-col justify-between shadow-3xs">
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Unread Mandatory SOPs</p>
                <h3 className="text-2xl font-black text-red-700 font-mono mt-2">{stats.mandatoryUnread}</h3>
              </div>
              <p className="text-[10px] text-red-500 font-black uppercase mt-4 animate-pulse">Signature Required</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT AREA: RECENTS AND QUICK VIEWS */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-[#0F6E6E]" /> Recently Updated SOP Documents
                  </h3>
                  <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">SCDC Records</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {stats.recentUpdates.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => { setActiveTab('documents'); handleSelectDoc(doc); }}
                      className="py-3.5 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition cursor-pointer"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-extrabold text-slate-800 truncate">{doc.title}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="font-bold text-[#0F6E6E]">{doc.category}</span>
                          <span>•</span>
                          <span>Rev v{doc.current_version}</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                        {new Date(doc.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* UNREAD MANDATORY WARNING BLOCK */}
              {stats.mandatoryUnread > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 shadow-3xs">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5 animate-bounce" size={20} />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-red-900 uppercase tracking-wide">Mandatory Regulatory Compliance Pending</h4>
                    <p className="text-xs text-red-700 leading-relaxed">
                      You have {stats.mandatoryUnread} regulatory clinical SOP(s) that require physical read acknowledgement and electronic sign-off. Please complete the mandatory reviews to align with Indian Dental Council protocols.
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('documents');
                        setSelectedMandatory('Mandatory');
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-red-900 hover:underline border-0 bg-transparent cursor-pointer p-0"
                    >
                      <span>Review Pending Actions</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT AREA: MOST POPULAR AND TRAINING SYNC */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Eye size={14} className="text-[#0F6E6E]" /> High Frequency Reference SOPs
                  </h3>
                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-[#0F6E6E] px-2 py-0.5 rounded-full">Top Referenced</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {stats.mostViewed.map(doc => (
                    <div 
                      key={doc.id}
                      onClick={() => { setActiveTab('documents'); handleSelectDoc(doc); }}
                      className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.category}</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 font-mono">
                        {doc.views_count} views
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC COMPLIANCE BLOCK */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-6 shadow-3xs space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[#0F6E6E]" />
                  <h4 className="text-xs font-black text-[#0F6E6E] uppercase tracking-wider">Clinical Compliance Audit</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every document revision, publication, equipment calibration cycle, and sterile operatory checklist completed is cryptographically cataloged in SCDC's main audit trail.
                </p>
                <div className="flex justify-between items-center text-[10px] text-[#0F6E6E] font-bold">
                  <span>Audit Sync Mode: Realtime</span>
                  <span className="font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">SECURE</span>
                </div>
              </div>

            </div>

          </div>

        </motion.div>
      )}

      {/* DOCUMENTS HUB TAB CONTAINER */}
      {activeTab === 'documents' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT SIDEBAR: FILTERS AND DOCUMENT SELECTION */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* ADVANCED SEARCH COMPONENT (MODULE 7) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SOP title, keyword, author..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 h-10 outline-none focus:border-[#0F6E6E] font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Category SOP Group</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="All">All SOP Groups</option>
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Mandatory</label>
                    <select
                      value={selectedMandatory}
                      onChange={(e) => setSelectedMandatory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2 h-9 outline-none focus:border-[#0F6E6E] font-extrabold text-slate-750 text-[11px]"
                    >
                      <option value="All">All SOPs</option>
                      <option value="Mandatory">Mandatory</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider">SOP Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-2 h-9 outline-none focus:border-[#0F6E6E] font-extrabold text-slate-750 text-[11px]"
                    >
                      <option value="All">All States</option>
                      <option value="Draft">Draft</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Access Department</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-9 outline-none focus:border-[#0F6E6E] font-bold text-slate-850"
                  >
                    <option value="All">All Staff Roles</option>
                    <option value="Doctors">Doctors & Dentists Only</option>
                    <option value="Receptionist">Front Office Reception</option>
                    <option value="Assistant">Clinical Dental Assistants</option>
                  </select>
                </div>
              </div>

              {/* DOCUMENT SELECT LIST */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-3xs space-y-1.5 max-h-[480px] overflow-y-auto">
                <div className="flex justify-between items-center px-2 py-1 select-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SOP Records</span>
                  <span className="text-[10px] font-black text-[#0F6E6E] bg-teal-50 px-2 py-0.5 rounded-full font-mono">
                    {filteredDocuments.length} found
                  </span>
                </div>

                {filteredDocuments.map(doc => {
                  const isMandatory = doc.is_mandatory;
                  const isSelected = selectedDoc?.id === doc.id;
                  const isRead = user ? acknowledgements.some(ack => ack.document_id === doc.id && ack.user_id === user.email) : true;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                        isSelected 
                          ? 'bg-[#0F6E6E] text-white border-[#0F6E6E]' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {doc.title}
                          </p>
                          {isMandatory && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              MANDATORY
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[9px] mt-2">
                          <span className={`font-black uppercase ${isSelected ? 'text-teal-200' : 'text-[#0F6E6E]'}`}>
                            {doc.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {!isRead && doc.status === 'Published' && (
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" title="Awaiting Sign-off" />
                            )}
                            <span className={`font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                              Rev v{doc.current_version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredDocuments.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <Info size={20} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold">No protocol entries matches filters</p>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT WORKSPACE: DETAILS VIEW, EDITOR, CREATOR */}
            <div className="lg:col-span-8">
              
              {/* EDITING / CREATING CONTAINER */}
              {(isEditingDoc || isCreatingDoc) ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-6">
                  
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 select-none">
                    <div>
                      <h3 className="text-xs font-black uppercase text-[#0F6E6E] tracking-wider">
                        {isCreatingDoc ? 'Draft New Clinical SOP' : 'Edit Existing Protocol Revision'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">SCDC AUTHORING WORKSPACE</p>
                    </div>
                    <button 
                      onClick={() => { setIsEditingDoc(false); setIsCreatingDoc(false); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                    >
                      <ArrowLeft size={12} />
                      <span>Cancel</span>
                    </button>
                  </div>

                  {/* FORM FIELDS */}
                  <div className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">SOP Title</label>
                      <input
                        type="text"
                        value={docForm.title}
                        onChange={(e) => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Autoclave High Temperature Dry Heat Calibration SOP"
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-semibold text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Clinical Category</label>
                        <select
                          value={docForm.category}
                          onChange={(e) => setDocForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-bold text-slate-700 cursor-pointer"
                        >
                          {AVAILABLE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Approval Workflow State</label>
                        <select
                          value={docForm.status}
                          disabled={!isUserAdmin}
                          onChange={(e) => setDocForm(prev => ({ ...prev, status: e.target.value as DocumentStatus }))}
                          className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Under Review">Under Review</option>
                          {isUserAdmin && <option value="Approved">Approved</option>}
                          {isUserAdmin && <option value="Published">Published</option>}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Mandatory Document</label>
                        <button
                          type="button"
                          onClick={() => setDocForm(prev => ({ ...prev, is_mandatory: !prev.is_mandatory }))}
                          className={`mt-2 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0F6E6E] focus:ring-offset-2 ${docForm.is_mandatory ? 'bg-[#0F6E6E]' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${docForm.is_mandatory ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Document Body (Rich HTML Supported)</label>
                      <textarea
                        value={docForm.content}
                        onChange={(e) => setDocForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Write standard operating protocols. You can use standard HTML formatting tags like <p>, <h3>, <ul>, and <li>."
                        rows={12}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-none focus:border-[#0F6E6E] font-medium leading-relaxed font-sans text-slate-800"
                      />
                    </div>

                    {/* INTERACTIVE VIDEO EMBED URL */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Embedded Training Video URL (Optional)</label>
                      <input
                        type="text"
                        value={docForm.video_url}
                        onChange={(e) => setDocForm(prev => ({ ...prev, video_url: e.target.value }))}
                        placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ"
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-semibold text-slate-800 font-mono"
                      />
                    </div>

                    {/* DYNAMIC CHECKLIST EMBED ENGINE (MODULE 3) */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <CheckSquare size={13} className="text-[#0F6E6E]" /> Embed Compliance Checklists
                        </span>
                        <button
                          type="button"
                          onClick={handleAddFormChecklist}
                          className="text-[10px] font-black text-[#0F6E6E] hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          + Add Checklist Section
                        </button>
                      </div>

                      {docForm.checklists.map((chk, chkIdx) => (
                        <div key={chkIdx} className="bg-white border border-slate-150 p-3.5 rounded-xl space-y-3">
                          <input
                            type="text"
                            value={chk.title}
                            onChange={(e) => {
                              setDocForm(prev => {
                                const updated = [...prev.checklists];
                                updated[chkIdx].title = e.target.value;
                                return { ...prev, checklists: updated };
                              });
                            }}
                            placeholder="Checklist Title (e.g. Daily Sanitation Checks)"
                            className="w-full text-xs font-extrabold border-b border-slate-200 outline-none focus:border-[#0F6E6E] pb-1"
                          />

                          <div className="space-y-2">
                            {chk.items.map((item, itemIdx) => (
                              <input
                                key={itemIdx}
                                type="text"
                                value={item}
                                onChange={(e) => handleUpdateChecklistItem(chkIdx, itemIdx, e.target.value)}
                                placeholder={`Item #${itemIdx + 1}`}
                                className="w-full bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-semibold px-2.5 h-8 outline-none"
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddChecklistItem(chkIdx)}
                              className="text-[10px] font-bold text-slate-450 hover:text-[#0F6E6E] mt-1 bg-transparent border-0 cursor-pointer"
                            >
                              + Add Item Row
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* TAGS HANDLING */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Search Keywords / Meta Tags</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {docForm.tempTags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 bg-teal-50 border border-teal-100 text-[#0F6E6E] text-[10px] font-black px-2.5 py-1 rounded-full select-none">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-[#0F6E6E] hover:text-red-500 bg-transparent border-0 cursor-pointer p-0 shrink-0 font-bold ml-1"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          value={docForm.newTagInput}
                          onChange={(e) => setDocForm(prev => ({ ...prev, newTagInput: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                          placeholder="e.g. Endodontics"
                          className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-9 outline-none focus:border-[#0F6E6E] font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="bg-[#0F6E6E] hover:bg-[#0D5F5F] text-white rounded-xl px-3 text-xs font-bold transition cursor-pointer border-0 shrink-0"
                        >
                          Add Tag
                        </button>
                      </div>
                    </div>

                    {/* REVISION HISTORY CHANGELOG BLOCK */}
                    {!isCreatingDoc && selectedDoc && selectedDoc.status === 'Published' && (
                      <div className="space-y-1.5 bg-yellow-50 p-4 border border-yellow-100 rounded-xl">
                        <label className="text-[10px] font-black uppercase text-yellow-800 tracking-wider flex items-center gap-1.5">
                          <History size={13} /> Mandatory Revision Changelog
                        </label>
                        <p className="text-[11px] text-yellow-750">
                          Since this SOP is currently **Published**, your modification will create a minor version increment (v{parseFloat(selectedDoc.current_version).toFixed(1)} → {(parseFloat(selectedDoc.current_version) + 0.1).toFixed(1)}). Briefly log the clinical changes made.
                        </p>
                        <input
                          type="text"
                          value={docForm.changelog}
                          onChange={(e) => setDocForm(prev => ({ ...prev, changelog: e.target.value }))}
                          placeholder="e.g. Modified vacuum parameters and biological incubator requirements"
                          className="w-full bg-white border border-yellow-200 text-xs rounded-lg px-2.5 h-8.5 outline-none font-semibold text-slate-800 mt-2"
                        />
                      </div>
                    )}

                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={() => { setIsEditingDoc(false); setIsCreatingDoc(false); }}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDocForm}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0F6E6E] hover:bg-[#0D5F5F] text-white text-xs font-bold shadow-xs transition cursor-pointer border-0"
                    >
                      <Save size={13} />
                      <span>Save SOP</span>
                    </button>
                  </div>

                </div>
              ) : selectedDoc ? (
                // SOP DETAILED VIEW PAGE
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-6">
                  
                  {/* DOCUMENT METADATA PANEL */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-150 select-none">
                    <div className="space-y-2">
                      <span className="bg-[#EBF7F7] text-[#0F6E6E] font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-teal-100">
                        {selectedDoc.category}
                      </span>
                      <h2 className="text-sm font-black text-slate-850 font-sans leading-tight">
                        {selectedDoc.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={11} /> Author: <strong>{selectedDoc.author_name}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> Updated: <strong>{new Date(selectedDoc.updated_at).toLocaleDateString('en-IN')}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono">Rev: <strong>v{selectedDoc.current_version}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0 self-end md:self-center">
                      <button 
                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-0 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        <History size={13} />
                        <span>Revisions ({docVersions.length})</span>
                      </button>

                      {isUserAdmin && (
                        <button 
                          onClick={() => handleStartEditDoc(selectedDoc)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#0F6E6E]/10 hover:bg-[#0F6E6E]/20 text-[#0F6E6E] text-[11px] border-0 font-bold transition cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* REVISION HISTORY ACCORDION DRAWER (MODULE 4) */}
                  <AnimatePresence>
                    {showVersionHistory && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 overflow-hidden space-y-4"
                      >
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Document Revision logs & Version rollbacks</h4>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto">
                          {docVersions.map((v, idx) => (
                            <div key={v.id} className="bg-white p-3 rounded-xl border border-slate-150 flex justify-between items-center">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-slate-800">v{v.version_number}</span>
                                  <span className="text-[9px] font-bold text-slate-400">by {v.performed_by_name}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-normal truncate italic">
                                  "{v.changelog || 'No notes logged'}"
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {isUserAdmin && selectedDoc.current_version !== v.version_number && (
                                  <button
                                    onClick={() => handleRollbackVersion(selectedDoc.id, v)}
                                    className="text-[9px] font-black text-[#0F6E6E] hover:bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg bg-transparent cursor-pointer"
                                  >
                                    Rollback State
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* APPROVAL WORKFLOW BANNER (MODULE 5) */}
                  {isUserAdmin && (
                    <div className="bg-[#EBF7F7] border border-teal-100 rounded-2xl p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-[#0F6E6E] tracking-widest">WORKFLOW APPROVAL HUB</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-700">Current State:</span>
                          <span className="bg-[#0F6E6E] text-white font-black text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                            {selectedDoc.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {['Draft', 'Under Review', 'Approved', 'Published'].map((st) => {
                          if (st === selectedDoc.status) return null;
                          return (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(selectedDoc, st as DocumentStatus)}
                              className="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Set {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* RICH DOCUMENT CONTENT WORKSPACE */}
                  <div className="prose prose-sm max-w-none prose-teal text-slate-750 font-medium leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: selectedDoc.content }} />
                  </div>

                  {/* EMBEDDED CHECKLISTS SECTIONS */}
                  {selectedDoc.checklists && selectedDoc.checklists.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5 select-none">
                        <CheckSquare size={14} className="text-[#0F6E6E]" /> Required Compliance Steps
                      </h4>
                      <div className="space-y-4">
                        {selectedDoc.checklists.map((chk) => (
                          <div key={chk.id} className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider select-none">{chk.title}</p>
                            <div className="space-y-2">
                              {chk.items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    readOnly
                                    className="mt-0.5 rounded border-slate-300 text-[#0F6E6E] focus:ring-[#0F6E6E]"
                                  />
                                  <span className="text-slate-600 font-semibold">{item.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EMBEDDED TRAINING VIDEOS PLAYER */}
                  {selectedDoc.video_url && (
                    <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5 select-none">
                        <Video size={14} className="text-red-500" /> Embedded Training Video Reference
                      </h4>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border">
                        <iframe
                          src={selectedDoc.video_url}
                          title="SCDC Training Guide Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
                  )}

                  {/* STAFF ACKNOWLEDGEMENT SIGN OFF PANEL (MODULE 6) */}
                  {selectedDoc.status === 'Published' && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between select-none">
                        <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-[#0F6E6E]" /> Operational Read Sign-off & Acknowledgement
                        </h4>
                        <span className="text-[9px] font-black uppercase bg-[#EBF7F7] text-[#0F6E6E] px-2.5 py-0.5 rounded-full">
                          Compliance
                        </span>
                      </div>

                      {user && acknowledgements.some(ack => ack.document_id === selectedDoc.id && ack.user_id === user.email) ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-xs font-extrabold select-none">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                          <div>
                            <p>You have signed off on this SOP on {new Date(acknowledgements.find(a => a.document_id === selectedDoc.id && a.user_id === user.email)!.acknowledged_at).toLocaleDateString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit' })}.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 leading-normal">
                            I verify that I have thoroughly read, understood, and agreed to adhere to this standardized operating clinical procedure. My confirmation logs my IP, device signature, and date for security audit trails.
                          </p>
                          <div className="flex gap-2 max-w-lg">
                            <input
                              type="text"
                              placeholder="Add optional signature comment..."
                              id="ack-comments"
                              className="flex-1 bg-white border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-semibold text-slate-800"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('ack-comments') as HTMLInputElement;
                                handleAcknowledgeDoc(selectedDoc.id, input?.value || '');
                              }}
                              className="bg-[#0F6E6E] hover:bg-[#0D5F5F] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl border-0 shadow-xs cursor-pointer transition"
                            >
                              Sign Off Protocol
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SUMMARY ACK STATUS LIST */}
                      <div className="pt-4 border-t border-slate-150 space-y-2.5">
                        <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider select-none">Clinic Staff Sign-off Logs</h5>
                        <div className="flex flex-wrap gap-2 select-none">
                          {acknowledgements.filter(a => a.document_id === selectedDoc.id).map(ack => (
                            <span key={ack.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-650 text-[10px] font-black px-2.5 py-1 rounded-xl" title={ack.comments}>
                              <User size={10} className="text-slate-400" />
                              <span>{ack.user_name} ({ack.user_role})</span>
                              <CheckCircle2 size={11} className="text-emerald-500 ml-1" />
                            </span>
                          ))}
                          {acknowledgements.filter(a => a.document_id === selectedDoc.id).length === 0 && (
                            <span className="text-[10px] text-slate-400 italic">No acknowledgements signed yet.</span>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center select-none py-20">
                  <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-sm font-black text-slate-650 uppercase tracking-widest">SOP Reader Engine</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-2 font-semibold">
                    Select any standard operating protocol or clinical guidelines from the left sidebar to read, audit history, rollback revisions, and submit regulatory compliance signatures.
                  </p>
                </div>
              )}

            </div>

          </div>

        </motion.div>
      )}

      {/* REUSABLE OPERATIONAL CHECKLISTS (MODULE 8) */}
      {activeTab === 'checklists' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT SELECTOR LIST */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 select-none">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={15} className="text-[#0F6E6E]" /> Reusable Compliance Checklists
                  </h3>
                  <p className="text-[11px] text-slate-450 font-bold uppercase mt-0.5">SCDC Operatory Standards</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select and execute high frequency diagnostic setup verification audits. Completed lists are logged historically with clinician signatures.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-3xs space-y-2 max-h-[450px] overflow-y-auto">
                {reusableChecklists.map((chk) => (
                  <div
                    key={chk.id}
                    onClick={() => {
                      setActiveChecklist(chk);
                      setChecklistNotes('');
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition select-none ${
                      activeChecklist?.id === chk.id 
                        ? 'bg-[#0F6E6E] text-white border-[#0F6E6E]' 
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold truncate">{chk.title}</p>
                      <p className={`text-[10px] uppercase font-black ${activeChecklist?.id === chk.id ? 'text-teal-200' : 'text-[#0F6E6E]'}`}>
                        {chk.category}
                      </p>
                      
                      {chk.last_completed_at && (
                        <div className={`flex items-center gap-1 text-[9px] pt-1.5 mt-1 border-t ${
                          activeChecklist?.id === chk.id ? 'border-teal-700 text-teal-200' : 'border-slate-100 text-slate-400'
                        }`}>
                          <Clock size={10} />
                          <span>Last: {new Date(chk.last_completed_at).toLocaleDateString('en-IN')} by {chk.last_completed_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT CHECKLIST EXECUTION PANEL */}
            <div className="lg:col-span-7">
              
              {activeChecklist ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-6">
                  
                  <div className="flex justify-between items-center pb-4 border-b border-slate-150 select-none">
                    <div>
                      <span className="bg-[#EBF7F7] text-[#0F6E6E] font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-teal-100">
                        {activeChecklist.category}
                      </span>
                      <h3 className="text-xs font-black text-slate-850 mt-2 uppercase tracking-wide">
                        {activeChecklist.title} Execution Run
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveChecklist(null)}
                      className="text-xs text-slate-450 hover:text-slate-600 font-extrabold border-0 bg-transparent cursor-pointer"
                    >
                      Close Run
                    </button>
                  </div>

                  {activeChecklist.description && (
                    <p className="text-xs text-slate-500 italic select-none">{activeChecklist.description}</p>
                  )}

                  {/* CHECKLIST ITEMS LIST */}
                  <div className="space-y-2.5">
                    {activeChecklist.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistItem(activeChecklist.id, item.id)}
                        className={`p-3.5 rounded-xl border-2 flex items-center gap-3.5 cursor-pointer select-none transition ${
                          item.checked 
                            ? 'bg-emerald-50/55 border-emerald-400/60 text-emerald-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border ${
                          item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {item.checked && <Check size={11} className="stroke-[3]" />}
                        </div>
                        <span className="text-xs font-extrabold leading-tight">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* NOTES AND SIGN-OFF */}
                  <div className="space-y-4 pt-4 border-t border-slate-150">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider select-none">Execution Audit Notes</label>
                      <input
                        type="text"
                        value={checklistNotes}
                        onChange={(e) => setChecklistNotes(e.target.value)}
                        placeholder="e.g. All autoclave water reservoirs flushed, sterile pressure validated."
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-[#0F6E6E] font-semibold text-slate-850"
                      />
                    </div>

                    <button
                      onClick={() => handleCompleteChecklist(activeChecklist.id)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border-0 shadow-xs transition cursor-pointer"
                    >
                      Sign Off & Complete compliance log
                    </button>
                  </div>

                  {/* RECENT HISTORICAL TRANSCRIPTS (MODULE 8) */}
                  {activeChecklist.completion_history && activeChecklist.completion_history.length > 0 && (
                    <div className="pt-5 border-t border-slate-150 space-y-3 select-none">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Historical sign-off logs</h4>
                      <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                        {activeChecklist.completion_history.map((hist, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-xl border text-[11px] space-y-1 font-semibold text-slate-550">
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>By: <strong>{hist.by_name}</strong></span>
                              <span className="font-mono">{new Date(hist.date).toLocaleString('en-IN', { hour12: true, dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            {hist.notes && <p className="italic text-slate-650 font-bold">"{hist.notes}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center select-none py-20">
                  <CheckSquare size={36} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-sm font-black text-slate-650 uppercase tracking-widest">Active Checklist Engine</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-2 font-semibold">
                    Select any standard dental operatory checklist from the left sidebar to perform checks, sign off clinical safety, and preserve digital compliance transcripts.
                  </p>
                </div>
              )}

            </div>

          </div>

        </motion.div>
      )}

      {/* EQUIPMENT LIBRARY TAB (MODULE 9) */}
      {activeTab === 'equipment' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="flex justify-between items-center select-none">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench size={16} className="text-[#0F6E6E]" /> Clinic Equipment & Calibration Registry
              </h3>
              <p className="text-xs text-slate-450 font-bold mt-1 uppercase">Preventive Calibration & Vendor Ledger</p>
            </div>
            <button
              onClick={() => {
                setEqForm({
                  name: '',
                  serial_number: '',
                  category: 'Sterilizer',
                  maintenance_instructions: '',
                  calibration_schedule: 'Every 6 Months',
                  warranty_expiry: '',
                  vendor_name: '',
                  vendor_contact: ''
                });
                setShowEquipmentForm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F6E6E] text-white hover:bg-[#0D5F5F] text-xs font-bold border-0 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Catalog Equipment</span>
            </button>
          </div>

          {/* CATALOG FORM POPUP DRAWER */}
          {showEquipmentForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
              <h4 className="text-xs font-black uppercase text-[#0F6E6E] tracking-wider select-none">
                {eqForm.id ? 'Edit Equipment Asset' : 'Catalog New Clinical Asset'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Asset Name</label>
                  <input
                    type="text"
                    value={eqForm.name}
                    onChange={(e) => setEqForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. KaVo OP 3D Pro Panoramic"
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-semibold px-2.5 h-8 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={eqForm.serial_number}
                    onChange={(e) => setEqForm(prev => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="e.g. KV-OP3D-99213"
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-semibold px-2.5 h-8 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Classification</label>
                  <select
                    value={eqForm.category}
                    onChange={(e) => setEqForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 h-8 outline-none"
                  >
                    <option value="Sterilizer">Autoclave & Sterilizer</option>
                    <option value="X-Ray / CBCT">X-Ray / Diagnostic CBCT</option>
                    <option value="Handpiece">High-speed Turbines / Motors</option>
                    <option value="Chair">Dental Unit Patient Chairs</option>
                    <option value="General">General Clinic Equipment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Calibration Interval</label>
                  <select
                    value={eqForm.calibration_schedule}
                    onChange={(e) => setEqForm(prev => ({ ...prev, calibration_schedule: e.target.value }))}
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 h-8 outline-none"
                  >
                    <option value="Every 3 Months">Every 3 Months</option>
                    <option value="Every 6 Months">Every 6 Months</option>
                    <option value="Every 12 Months">Every 12 Months</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Maintenance Instructions</label>
                  <input
                    type="text"
                    value={eqForm.maintenance_instructions}
                    onChange={(e) => setEqForm(prev => ({ ...prev, maintenance_instructions: e.target.value }))}
                    placeholder="Wipe down turbine daily with standard surgical spirits."
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-semibold px-2.5 h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Support Vendor Name</label>
                  <input
                    type="text"
                    value={eqForm.vendor_name}
                    onChange={(e) => setEqForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                    placeholder="e.g. Sirona South Asia Support"
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-semibold px-2.5 h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450">Vendor Contact Phone</label>
                  <input
                    type="text"
                    value={eqForm.vendor_contact}
                    onChange={(e) => setEqForm(prev => ({ ...prev, vendor_contact: e.target.value }))}
                    placeholder="e.g. +91 80 4125 3901"
                    className="w-full bg-white border border-slate-250 rounded-lg text-xs font-semibold px-2.5 h-8"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEquipmentForm(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEquipmentForm}
                  className="bg-[#0F6E6E] text-white hover:bg-[#0D5F5F] px-4.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border-0"
                >
                  Save Asset
                </button>
              </div>
            </div>
          )}

          {/* CALIBRATION OVERLAY TRIGGER MODAL */}
          {calibratingItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-3xs space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider select-none">Certify Clinical Device Calibration</h4>
                <p className="text-[11px] text-amber-700 font-bold mt-1">DEVICE: {calibratingItem.name} (S/N: {calibratingItem.serial_number})</p>
              </div>
              
              <div className="flex gap-4 flex-wrap items-end max-w-xl">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Calibration Technician / Entity Name</label>
                  <input
                    type="text"
                    value={calibrationTech}
                    onChange={(e) => setCalibrationTech(e.target.value)}
                    placeholder="e.g. Dr. Chaitanya / Melag Inspector Sahu"
                    className="w-full bg-white border border-amber-200 text-xs rounded-lg px-2.5 h-8.5 outline-none font-semibold text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalibratingItem(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-amber-200 text-xs font-black text-amber-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCalibration}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-1.5 rounded-lg cursor-pointer border-0"
                  >
                    Log Calibration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EQUIPMENT CARDS REGISTRY MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {equipmentList.map((eq) => {
              const isWarrantyExpired = eq.warranty_expiry ? new Date(eq.warranty_expiry) < new Date() : false;
              const isCalibrationOverdue = eq.next_calibration_date ? new Date(eq.next_calibration_date) < new Date() : false;

              return (
                <div key={eq.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2 select-none">
                      <span className="bg-[#EBF7F7] text-[#0F6E6E] font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-teal-100">
                        {eq.category}
                      </span>
                      {isCalibrationOverdue ? (
                        <span className="bg-red-50 text-red-600 border border-red-100 font-black text-[8px] uppercase tracking-wide px-2 py-0.5 rounded-full animate-pulse">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[8px] uppercase tracking-wide px-2 py-0.5 rounded-full">
                          CALIBRATED
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-800 leading-tight">{eq.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">S/N: {eq.serial_number}</p>
                    </div>

                    {eq.maintenance_instructions && (
                      <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border">
                        <span className="font-black uppercase text-[9px] text-slate-400 block mb-1">Maintenance SOP</span>
                        {eq.maintenance_instructions}
                      </div>
                    )}

                    <div className="text-[11px] space-y-1 select-none">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calibration Cycle:</span>
                        <span className="font-bold text-slate-700">{eq.calibration_schedule}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Calibrated:</span>
                        <span className="font-semibold text-slate-700 font-mono">{eq.last_calibration_date || 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calibration Renewal:</span>
                        <span className={`font-black font-mono ${isCalibrationOverdue ? 'text-red-500' : 'text-slate-700'}`}>
                          {eq.next_calibration_date || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Warranty Ends:</span>
                        <span className={`font-semibold font-mono ${isWarrantyExpired ? 'text-red-400' : 'text-slate-700'}`}>
                          {eq.warranty_expiry || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] border-t border-slate-100 pt-3 select-none">
                      <span className="font-black uppercase text-[9px] text-slate-400 block mb-1">Support Vendor</span>
                      <p className="font-bold text-slate-750">{eq.vendor_name}</p>
                      <p className="font-mono text-slate-500">{eq.vendor_contact}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-3.5 border-t border-slate-100">
                    <button
                      onClick={() => handleTriggerCalibration(eq.id)}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 text-[11px] font-black cursor-pointer border-0 transition"
                    >
                      Log Calibration
                    </button>
                    <button
                      onClick={() => {
                        setEqForm(eq);
                        setShowEquipmentForm(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black cursor-pointer border-0 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEquipment(eq.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[11px] font-black cursor-pointer border-0 transition"
                    >
                      Retire
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </motion.div>
      )}

      {/* TRAINING CENTER TAB (MODULE 10) */}
      {activeTab === 'training' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT AREA: MATERIALS LIST */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-2 select-none">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-[#0F6E6E]" /> SCDC Staff Training Center
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Stream operational tutorials, review diagnostic sensor manuals, and complete certifications to ensure the highest standards of dental clinical practice.
                </p>
              </div>

              {/* TRAINING COURSES CONTAINER */}
              <div className="space-y-4">
                {trainingMaterials.map((tr) => {
                  const isCompleted = trainingProgressList.some(p => p.material_id === tr.id && p.status === 'Completed');
                  const record = trainingProgressList.find(p => p.material_id === tr.id && p.status === 'Completed');

                  return (
                    <div key={tr.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center select-none">
                          <span className="bg-[#EBF7F7] text-[#0F6E6E] font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-teal-100">
                            {tr.type} • {tr.category}
                          </span>
                          {isCompleted ? (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                              CERTIFIED {record?.score ? `(${record.score}%)` : ''}
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-600 border border-amber-100 font-black text-[9px] uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                              PENDING
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 leading-tight">{tr.title}</h4>
                          {tr.description && <p className="text-xs text-slate-500 leading-normal">{tr.description}</p>}
                        </div>

                        {tr.duration && (
                          <span className="text-[10px] font-black text-slate-400 font-mono block select-none">
                            Duration / Study: {tr.duration}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-slate-100">
                        {tr.type === 'Video' && tr.url && (
                          <a
                            href={tr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-lg bg-[#0F6E6E] hover:bg-[#0D5F5F] text-white text-xs font-bold transition text-center border-0 flex items-center justify-center gap-1"
                          >
                            <Play size={12} className="stroke-[3]" />
                            <span>Watch Tutorial Video</span>
                          </a>
                        )}

                        {tr.type === 'PDF' && (
                          <button
                            onClick={() => handleMarkCourseCompleted(tr.id)}
                            className="flex-1 py-2 rounded-lg bg-[#0F6E6E] text-white hover:bg-[#0D5F5F] text-xs font-bold transition border-0 cursor-pointer"
                          >
                            Read & Certify Manual
                          </button>
                        )}

                        {tr.type === 'Assessment' && tr.assessment_questions && (
                          <button
                            onClick={() => handleStartQuiz(tr)}
                            className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition border-0 cursor-pointer"
                          >
                            Take Certification Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* RIGHT AREA: ACTIVE ASSESSMENTS / QUIZ RUN */}
            <div className="lg:col-span-5">
              
              {activeQuiz && activeQuiz.assessment_questions ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-6">
                  
                  <div className="flex justify-between items-center pb-4 border-b border-slate-150 select-none">
                    <div>
                      <span className="bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-amber-100">
                        CLINICAL ASSESSMENT
                      </span>
                      <h3 className="text-xs font-black text-slate-850 mt-2 uppercase tracking-wide">
                        {activeQuiz.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold border-0 bg-transparent cursor-pointer animate-pulse"
                    >
                      Exit Quiz
                    </button>
                  </div>

                  {/* QUIZ INTERACTIVE RUN (MODULE 10) */}
                  <div className="space-y-5">
                    {activeQuiz.assessment_questions.map((q, qIdx) => (
                      <div key={q.id} className="space-y-2.5">
                        <p className="text-xs font-extrabold text-slate-800 leading-normal">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = quizAnswers[q.id] === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() => {
                                  setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }));
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left text-[11px] font-semibold transition ${
                                  isSelected 
                                    ? 'bg-amber-50 border-amber-400 text-amber-900 font-black' 
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SUBMISSION & EVALUATION PANEL */}
                  <div className="space-y-4 pt-4 border-t border-slate-150">
                    {quizSubmitted && quizScore !== null ? (
                      <div className={`p-4 rounded-xl border select-none ${
                        quizScore >= 70 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                          : 'bg-red-50 border-red-100 text-red-800'
                      }`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className={quizScore >= 70 ? 'text-emerald-500' : 'text-red-500'} />
                          <h4 className="text-xs font-black uppercase tracking-wide">
                            {quizScore >= 70 ? 'Certification Granted' : 'Certification Failed'}
                          </h4>
                        </div>
                        <p className="text-xs font-bold mt-2 leading-relaxed">
                          You scored <strong>{quizScore}%</strong> on the assessment. (Clinical requirements requires 70% or above to certify).
                        </p>
                        {quizScore < 70 && (
                          <button
                            onClick={() => {
                              setQuizSubmitted(false);
                              setQuizScore(null);
                              setQuizAnswers({});
                            }}
                            className="mt-3 bg-red-600 text-white hover:bg-red-700 font-black text-xs px-4 py-1.5 rounded-lg border-0 cursor-pointer"
                          >
                            Retake Assessment
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleSubmitQuiz}
                        className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl border-0 shadow-xs transition cursor-pointer"
                      >
                        Submit Answers for Evaluation
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center select-none py-20">
                  <GraduationCap size={36} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-sm font-black text-slate-650 uppercase tracking-widest">Active Academy Engine</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-2 font-semibold">
                    Select any assessment quiz or certification manual from the left panel to execute quiz trials, calibrate torque specs, and track certified clinical credentials.
                  </p>
                </div>
              )}

            </div>

          </div>

        </motion.div>
      )}

    </div>
  );
}
