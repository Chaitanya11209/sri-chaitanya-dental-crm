import { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, Plus, Trash2, Check, HelpCircle, 
  Building, Calendar, Users, Stethoscope, DollarSign, Package, 
  Clock, ShieldAlert, FileText, Laptop, Zap, Sparkles, Sliders, 
  RotateCcw, ShieldCheck, Activity, ToggleLeft, ToggleRight, ListPlus, Hash
} from 'lucide-react';
import { configService } from '../../services/configService';
import { useNotification } from '../../components/NotificationProvider';
import { getCurrentUser, isAdmin } from '../../lib/auth';
import { 
  MasterConfiguration, LookupValue, NumberingRule, 
  FeatureToggle, ConfigurationHistory 
} from '../../types/config';

export default function Setup() {
  const { notify } = useNotification();
  const user = getCurrentUser();
  const isUserAdmin = isAdmin();
  
  const actorName = user?.name || 'Administrator';
  const actorId = user?.email || 'admin@srichaitanyadental.com';

  // State managers
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('clinic');
  
  // Configuration structures
  const [config, setConfig] = useState<MasterConfiguration | null>(null);
  const [lookups, setLookups] = useState<LookupValue[]>([]);
  const [numberingRules, setNumberingRules] = useState<NumberingRule[]>([]);
  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>([]);
  const [auditHistory, setAuditHistory] = useState<ConfigurationHistory[]>([]);

  // Local lookup editor states
  const [selectedLookupCategory, setSelectedLookupCategory] = useState<string>('chief_complaints');
  const [newLookupValue, setNewLookupValue] = useState<string>('');
  const [editingLookupId, setEditingLookupId] = useState<string | null>(null);
  const [editingLookupValue, setEditingLookupValue] = useState<string>('');

  // Local helper for input arrays
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // ------------------------------------------------------------
  // LIFE CYCLE ACTIONS
  // ------------------------------------------------------------
  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const loadAllConfigurations = async () => {
    setLoading(true);
    try {
      // Ensure defaults are written
      configService.initialize();

      const [cfg, lkps, numRules, toggles, history] = await Promise.all([
        configService.getConfig(),
        configService.getLookups(),
        configService.getNumberingRules(),
        configService.getFeatureToggles(),
        configService.getAuditHistory()
      ]);

      setConfig(cfg);
      setLookups(lkps);
      setNumberingRules(numRules);
      setFeatureToggles(toggles);
      setAuditHistory(history);
    } catch (err) {
      console.error('[SetupMaster] Error preloading configuration parameters:', err);
      notify('error', 'Retrieval Error', 'Failed to compile enterprise master parameters.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (category: keyof MasterConfiguration) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Only designated system Administrators are authorized to commit setup modifications.');
      return;
    }
    if (!config) return;

    setSaving(true);
    try {
      const success = await configService.saveConfig(category, config[category], actorName, actorId);
      if (success) {
        notify('success', 'Parameters Saved', `Master parameters for ${category.toUpperCase()} updated & audit logs updated.`);
        // Reload history
        const updatedHistory = await configService.getAuditHistory();
        setAuditHistory(updatedHistory);
      }
    } catch (err) {
      console.error('[Setup] Category save error:', err);
      notify('error', 'Execution Error', 'Unable to commit configurations update.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // DROPDOWN MANAGER CONTROLS (Module 9)
  // ------------------------------------------------------------
  const handleAddLookup = async () => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Only system Administrators can append new option items.');
      return;
    }
    if (!newLookupValue.trim()) return;

    try {
      const newLookup: LookupValue = {
        id: Math.floor(Math.random() * 100000000).toString(),
        category: selectedLookupCategory,
        value: newLookupValue.trim(),
        is_active: true
      };

      const success = await configService.saveLookup(newLookup, actorName, actorId);
      if (success) {
        setNewLookupValue('');
        notify('success', 'Dropdown Extended', `"${newLookup.value}" successfully registered under ${selectedLookupCategory}.`);
        // Refresh
        const updatedLkps = await configService.getLookups();
        const updatedHist = await configService.getAuditHistory();
        setLookups(updatedLkps);
        setAuditHistory(updatedHist);
      }
    } catch (err) {
      notify('error', 'Lookup Save Failed', 'Failed to store dropdown lookup value.');
    }
  };

  const handleUpdateLookup = async (lookup: LookupValue) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Unauthorized lookup edit.');
      return;
    }
    try {
      const success = await configService.saveLookup(lookup, actorName, actorId);
      if (success) {
        setEditingLookupId(null);
        notify('success', 'Item Restructured', 'Dropdown value re-committed successfully.');
        const updatedLkps = await configService.getLookups();
        const updatedHist = await configService.getAuditHistory();
        setLookups(updatedLkps);
        setAuditHistory(updatedHist);
      }
    } catch (err) {
      notify('error', 'Update Failed', 'Failed to commit edit.');
    }
  };

  const handleDeleteLookup = async (id: string) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Unauthorized lookup delete.');
      return;
    }
    if (!confirm('Permanently purge this item from lookup dropdown lists? This operation is fully audited.')) return;

    try {
      const success = await configService.deleteLookup(id, actorName, actorId);
      if (success) {
        notify('success', 'Item Purged', 'Dropdown selector value purged successfully.');
        const updatedLkps = await configService.getLookups();
        const updatedHist = await configService.getAuditHistory();
        setLookups(updatedLkps);
        setAuditHistory(updatedHist);
      }
    } catch (err) {
      notify('error', 'Deletion Error', 'Failed to delete lookup value.');
    }
  };

  // ------------------------------------------------------------
  // NUMBERING RULES MANAGER CONTROLS (Module 10)
  // ------------------------------------------------------------
  const handleUpdateNumberingRule = async (rule: NumberingRule) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Unauthorized numbering change.');
      return;
    }
    try {
      const success = await configService.saveNumberingRule(rule, actorName, actorId);
      if (success) {
        notify('success', 'Rule Configured', `Reset parameters & prefix formatting for ${rule.entityType} updated.`);
        const updatedRules = await configService.getNumberingRules();
        const updatedHist = await configService.getAuditHistory();
        setNumberingRules(updatedRules);
        setAuditHistory(updatedHist);
      }
    } catch (err) {
      notify('error', 'Rule Save Failed', 'Failed to save numbering formatting rule.');
    }
  };

  // ------------------------------------------------------------
  // FEATURE TOGGLE MATRIX CONTROLS (Module 11)
  // ------------------------------------------------------------
  const handleToggleFeature = async (toggle: FeatureToggle) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Only system Administrators can toggle global features.');
      return;
    }
    try {
      const updatedToggle = { ...toggle, enabled: !toggle.enabled };
      const success = await configService.saveFeatureToggle(updatedToggle, actorName, actorId);
      if (success) {
        notify('info', 'Feature Configuration Altered', `${toggle.label} is now ${updatedToggle.enabled ? 'Enabled' : 'Disabled'}.`);
        const updatedToggles = await configService.getFeatureToggles();
        const updatedHist = await configService.getAuditHistory();
        setFeatureToggles(updatedToggles);
        setAuditHistory(updatedHist);
      }
    } catch (err) {
      notify('error', 'Toggle Error', 'Failed to flip feature flag status.');
    }
  };

  // ------------------------------------------------------------
  // SURGICAL AUDIT ROLLBACK (Module 12 & 15)
  // ------------------------------------------------------------
  const handleRollback = async (historyId: string) => {
    if (!isUserAdmin) {
      notify('error', 'Access Denied', 'Only system Administrators can restore previous configurations.');
      return;
    }
    if (!confirm('Are you sure you want to rollback this change and restore the previous configuration values? This rollback action is also auditable.')) return;

    try {
      const success = await configService.rollbackConfig(historyId, actorName, actorId);
      if (success) {
        notify('success', 'Rollback Succeeded', 'Previous configuration state successfully restored!');
        loadAllConfigurations();
      } else {
        notify('warning', 'Rollback Unsupported', 'Rollback is currently only supported for direct master configuration values, Lookups, or Feature Toggles.');
      }
    } catch (err) {
      console.error('[Rollback] Action failed:', err);
      notify('error', 'Rollback Failed', 'Failed to restore previous parameters.');
    }
  };

  // Format real-time number prefix previews
  const getNumberingPreview = (rule: NumberingRule) => {
    const paddedNum = String(rule.currentNumber).padStart(rule.paddingLength, '0');
    return `${rule.prefix}${paddedNum}${rule.suffix}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw size={28} className="text-teal-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling SCDC rules engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-950 rounded-3xl p-6 text-white border border-teal-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-15">
          <Settings size={220} className="text-teal-500 animate-spin" style={{ animationDuration: '40s' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <span className="bg-teal-500/20 text-teal-300 font-mono font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border border-teal-500/30">
              SCDC Enterprise Suite v3.7
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
              <ShieldCheck size={22} className="text-teal-400" /> Clinic Setup & Rules Engine
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
              Centralized administrative workspace to control numbering sequences, feature toggles, medical tax schedules, informed consent legal policies, and clinical dropdown indexes with real-time audit tracing.
            </p>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 p-3 rounded-2xl flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Operator</span>
            <span className="text-xs text-teal-300 font-black mt-0.5">{actorName}</span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">{actorId}</span>
          </div>
        </div>
      </div>

      {/* SECURITY GUEST NOTIFICATION */}
      {!isUserAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <ShieldAlert size={18} className="text-amber-400 shrink-0" />
          <p>
            ReadOnly Guest Mode: You are logged in with receptionist or clinical assistant permissions. Only system Administrators can commit changes, add drop-down lookups, toggle clinical modules, or perform audit rollbacks.
          </p>
        </div>
      )}

      {/* CENTRALIZED GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIDEBAR NAVIGATION (MODULE 1) */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1">
            System categories
          </p>
          <div className="bg-white rounded-3xl border border-slate-200 p-2.5 shadow-sm space-y-1">
            {[
              { id: 'clinic', label: 'Clinic Information', icon: Building },
              { id: 'appointments', label: 'Appointment Rules', icon: Calendar },
              { id: 'patients', label: 'Patient Demographics', icon: Users },
              { id: 'treatments', label: 'Clinical Treatments', icon: Stethoscope },
              { id: 'billing', label: 'Billing & CGST Tax', icon: DollarSign },
              { id: 'documents', label: 'Templates & Layouts', icon: FileText },
              { id: 'notifications', label: 'Notifications Hub', icon: Zap },
              { id: 'lookups', label: 'Lookup Dropdowns', icon: ListPlus },
              { id: 'numbering', label: 'Numbering Formats', icon: Hash },
              { id: 'toggles', label: 'Feature Toggles', icon: Sliders },
              { id: 'audit', label: 'Audit Logs & Rollback', icon: Clock }
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-extrabold tracking-wide transition-all ${
                    activeCategory === cat.id
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-700/10'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className={activeCategory === cat.id ? 'text-white' : 'text-slate-450'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRIMARY EDITING WORKSPACE */}
        <div className="lg:col-span-9">
          {config && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
              
              {/* STAGE HEADER */}
              <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    {activeCategory === 'clinic' && <Building size={16} className="text-teal-600" />}
                    {activeCategory === 'appointments' && <Calendar size={16} className="text-teal-600" />}
                    {activeCategory === 'patients' && <Users size={16} className="text-teal-600" />}
                    {activeCategory === 'treatments' && <Stethoscope size={16} className="text-teal-600" />}
                    {activeCategory === 'billing' && <DollarSign size={16} className="text-teal-600" />}
                    {activeCategory === 'documents' && <FileText size={16} className="text-teal-600" />}
                    {activeCategory === 'notifications' && <Zap size={16} className="text-teal-600" />}
                    {activeCategory === 'lookups' && <ListPlus size={16} className="text-teal-600" />}
                    {activeCategory === 'numbering' && <Hash size={16} className="text-teal-600" />}
                    {activeCategory === 'toggles' && <Sliders size={16} className="text-teal-600" />}
                    {activeCategory === 'audit' && <Clock size={16} className="text-teal-600" />}
                    {activeCategory.toUpperCase()} Configurations Matrix
                  </h2>
                  <p className="text-xs text-slate-450 mt-1 font-semibold">
                    Customize execution variables, sequences and behaviors. Modifications log into audit logs instantly.
                  </p>
                </div>

                {/* SAVE BUTTON FOR CONFIG CATEGORIES */}
                {['clinic', 'appointments', 'patients', 'treatments', 'billing', 'documents', 'notifications'].includes(activeCategory) && isUserAdmin && (
                  <button
                    onClick={() => handleSaveCategory(activeCategory as keyof MasterConfiguration)}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-5 rounded-xl transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                    {saving ? 'Saving...' : 'Save Config'}
                  </button>
                )}
              </div>

              {/* STAGE CONTAINER */}
              <div className="flex-1 font-sans text-xs text-slate-700 leading-relaxed space-y-6">

                {/* CLINIC SETTINGS CATEGORY */}
                {activeCategory === 'clinic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Clinic Enterprise Name</label>
                      <input
                        type="text"
                        value={config.clinic.clinicName}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, clinicName: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-extrabold focus:bg-white transition-all text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">GST Tax Identification Number</label>
                      <input
                        type="text"
                        value={config.clinic.gstNumber}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, gstNumber: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-extrabold focus:bg-white transition-all text-slate-800"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Corporate HQ Address</label>
                      <textarea
                        rows={2}
                        value={config.clinic.address}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, address: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white transition-all text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Registered Phone Lines</label>
                      <div className="space-y-2">
                        {config.clinic.phoneNumbers.map((phone, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={phone}
                              onChange={(e) => {
                                const list = [...config.clinic.phoneNumbers];
                                list[idx] = e.target.value;
                                setConfig({ ...config, clinic: { ...config.clinic, phoneNumbers: list } });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 outline-none focus:border-teal-500 font-bold focus:bg-white text-slate-800"
                            />
                            {config.clinic.phoneNumbers.length > 1 && (
                              <button
                                onClick={() => {
                                  const list = config.clinic.phoneNumbers.filter((_, i) => i !== idx);
                                  setConfig({ ...config, clinic: { ...config.clinic, phoneNumbers: list } });
                                }}
                                className="p-2 border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add phone line..."
                            value={newPhoneNumber}
                            onChange={(e) => setNewPhoneNumber(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 outline-none focus:border-teal-500 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newPhoneNumber) return;
                              setConfig({
                                ...config,
                                clinic: { ...config.clinic, phoneNumbers: [...config.clinic.phoneNumbers, newPhoneNumber] }
                              });
                              setNewPhoneNumber('');
                            }}
                            className="bg-slate-100 px-3 rounded-xl border border-slate-200 font-black text-slate-700 hover:bg-slate-200 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Administrative Emails</label>
                      <div className="space-y-2">
                        {config.clinic.emails.map((email, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => {
                                const list = [...config.clinic.emails];
                                list[idx] = e.target.value;
                                setConfig({ ...config, clinic: { ...config.clinic, emails: list } });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 outline-none focus:border-teal-500 font-bold focus:bg-white text-slate-800"
                            />
                            {config.clinic.emails.length > 1 && (
                              <button
                                onClick={() => {
                                  const list = config.clinic.emails.filter((_, i) => i !== idx);
                                  setConfig({ ...config, clinic: { ...config.clinic, emails: list } });
                                }}
                                className="p-2 border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="Add email address..."
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 outline-none focus:border-teal-500 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newEmail) return;
                              setConfig({
                                ...config,
                                clinic: { ...config.clinic, emails: [...config.clinic.emails, newEmail] }
                              });
                              setNewEmail('');
                            }}
                            className="bg-slate-100 px-3 rounded-xl border border-slate-200 font-black text-slate-700 hover:bg-slate-200 transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Working Hours Boundary</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={config.clinic.workingHoursStart}
                          onChange={(e) => setConfig({
                            ...config,
                            clinic: { ...config.clinic, workingHoursStart: e.target.value }
                          })}
                          placeholder="e.g. 09:00 AM"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-center text-slate-800"
                        />
                        <input
                          type="text"
                          value={config.clinic.workingHoursEnd}
                          onChange={(e) => setConfig({
                            ...config,
                            clinic: { ...config.clinic, workingHoursEnd: e.target.value }
                          })}
                          placeholder="e.g. 09:00 PM"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-center text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Time Zone & Regional Locale</label>
                      <input
                        type="text"
                        value={config.clinic.timeZone}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, timeZone: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Standard Base Currency</label>
                      <select
                        value={config.clinic.currency}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, currency: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                      >
                        <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                        <option value="USD ($)">USD ($) - US Dollar</option>
                        <option value="EUR (€)">EUR (€) - Euro</option>
                        <option value="GBP (£)">GBP (£) - British Pound</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Language Framework (Future-Ready)</label>
                      <select
                        value={config.clinic.language}
                        onChange={(e) => setConfig({
                          ...config,
                          clinic: { ...config.clinic, language: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                        <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                        <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* APPOINTMENT SETTINGS CATEGORY */}
                {activeCategory === 'appointments' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Default Consultation Duration</label>
                        <select
                          value={config.appointments.slotDuration}
                          onChange={(e) => setConfig({
                            ...config,
                            appointments: { ...config.appointments, slotDuration: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        >
                          <option value={10}>10 Minutes (Express Quick Check)</option>
                          <option value={15}>15 Minutes (Standard Dental Consultation)</option>
                          <option value={30}>30 Minutes (Deep Cleaning / Filling)</option>
                          <option value={45}>45 Minutes (Surgical Extraction)</option>
                          <option value={60}>60 Minutes (Premium Ortho Implant)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Safety Buffer Time (Mins)</label>
                        <input
                          type="number"
                          value={config.appointments.bufferTime}
                          onChange={(e) => setConfig({
                            ...config,
                            appointments: { ...config.appointments, bufferTime: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Max Advance Booking (Days)</label>
                        <input
                          type="number"
                          value={config.appointments.maxAdvanceBookingDays}
                          onChange={(e) => setConfig({
                            ...config,
                            appointments: { ...config.appointments, maxAdvanceBookingDays: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Cancellation Policy Text</label>
                        <textarea
                          rows={3}
                          value={config.appointments.cancellationPolicy}
                          onChange={(e) => setConfig({
                            ...config,
                            appointments: { ...config.appointments, cancellationPolicy: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">No-Show Assessment Rules</label>
                        <textarea
                          rows={3}
                          value={config.appointments.noShowRules}
                          onChange={(e) => setConfig({
                            ...config,
                            appointments: { ...config.appointments, noShowRules: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Workflow Status Categories & Calendars Colors</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {config.appointments.statuses.map((status) => (
                          <div key={status} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800 text-[11px]">{status}</span>
                            <input
                              type="color"
                              value={config.appointments.statusColors[status] || '#cbd5e1'}
                              onChange={(e) => {
                                const colors = { ...config.appointments.statusColors, [status]: e.target.value };
                                setConfig({
                                  ...config,
                                  appointments: { ...config.appointments, statusColors: colors }
                                });
                              }}
                              className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PATIENT SETTINGS CATEGORY */}
                {activeCategory === 'patients' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Manual Patient ID Prefix</label>
                        <input
                          type="text"
                          value={config.patients.idPrefix}
                          onChange={(e) => setConfig({
                            ...config,
                            patients: { ...config.patients, idPrefix: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-extrabold focus:bg-white text-slate-800"
                        />
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="auto_num"
                          checked={config.patients.autoNumbering}
                          onChange={(e) => setConfig({
                            ...config,
                            patients: { ...config.patients, autoNumbering: e.target.checked }
                          })}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="auto_num" className="text-xs font-black text-slate-800 cursor-pointer">Enforce Auto-Numbering Rule</label>
                          <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Automatically assigns increments utilizing SCDC rule sequences.</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Family Group Relationship Ledger Rules</label>
                      <textarea
                        rows={3}
                        value={config.patients.familyGroupRules}
                        onChange={(e) => setConfig({
                          ...config,
                          patients: { ...config.patients, familyGroupRules: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Required Clinical Registration Fields</label>
                        <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl space-y-2">
                          {["Name", "Phone", "Age", "Gender", "Address", "Emergency Contact", "Chief Complaint"].map((field) => {
                            const isChecked = config.patients.requiredFields.includes(field);
                            return (
                              <label key={field} className="flex items-center gap-2.5 font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let fields = [...config.patients.requiredFields];
                                    if (e.target.checked) {
                                      fields.push(field);
                                    } else {
                                      fields = fields.filter(f => f !== field);
                                    }
                                    setConfig({ ...config, patients: { ...config.patients, requiredFields: fields } });
                                  }}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                <span>{field}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="med_req"
                            checked={config.patients.medicalHistoryRequired}
                            onChange={(e) => setConfig({
                              ...config,
                              patients: { ...config.patients, medicalHistoryRequired: e.target.checked }
                            })}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                          <div>
                            <label htmlFor="med_req" className="text-xs font-black text-slate-800 cursor-pointer">Require Detailed Medical History</label>
                            <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Enforces medical histories (Diabetes, Cardiac conditions) prior to surgeries.</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Surgical Duplicate Detection Rules</label>
                          <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-150">
                            {config.patients.duplicateDetectionRules.map((rule, idx) => (
                              <div key={idx} className="flex items-center gap-2 font-bold text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                <span>{rule}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TREATMENTS SETTINGS CATEGORY */}
                {activeCategory === 'treatments' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Standard Treatment Categories</label>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                          {config.treatments.categories.map((cat, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-slate-155 px-3 py-1.5 rounded-xl font-bold text-slate-800">
                              <span>{cat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Default Follow-up Threshold (Days)</label>
                          <input
                            type="number"
                            value={config.treatments.defaultFollowUpDays}
                            onChange={(e) => setConfig({
                              ...config,
                              treatments: { ...config.treatments, defaultFollowUpDays: Number(e.target.value) }
                            })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Frequently Utilized Procedures</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {config.treatments.frequentlyUsed.map((code) => (
                              <span key={code} className="bg-teal-50 border border-teal-150 text-teal-800 font-extrabold px-3 py-1.0 rounded-xl tracking-wide">
                                {code} - {config.treatments.codes[code] || 'Specialty'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BILLING SETTINGS CATEGORY */}
                {activeCategory === 'billing' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">CGST Multiplier Tax (%)</label>
                        <input
                          type="number"
                          value={config.billing.cgstPercent}
                          onChange={(e) => setConfig({
                            ...config,
                            billing: { ...config.billing, cgstPercent: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-black text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">SGST Multiplier Tax (%)</label>
                        <input
                          type="number"
                          value={config.billing.sgstPercent}
                          onChange={(e) => setConfig({
                            ...config,
                            billing: { ...config.billing, sgstPercent: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-black text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Administrative Discount Limit (%)</label>
                        <input
                          type="number"
                          value={config.billing.discountLimitPercent}
                          onChange={(e) => setConfig({
                            ...config,
                            billing: { ...config.billing, discountLimitPercent: Number(e.target.value) }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Rounding Calculations Rules</label>
                        <select
                          value={config.billing.roundingRule}
                          onChange={(e) => setConfig({
                            ...config,
                            billing: { ...config.billing, roundingRule: e.target.value as any }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        >
                          <option value="none">No Rounding (Exact decimals)</option>
                          <option value="nearest-1">Round to Nearest Rupee (₹1)</option>
                          <option value="nearest-5">Round to Nearest Five (₹5)</option>
                          <option value="nearest-10">Round to Nearest Ten (₹10)</option>
                        </select>
                      </div>

                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="allow_adv"
                          checked={config.billing.allowAdvancePayment}
                          onChange={(e) => setConfig({
                            ...config,
                            billing: { ...config.billing, allowAdvancePayment: e.target.checked }
                          })}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="allow_adv" className="text-xs font-black text-slate-800 cursor-pointer">Allow Advance Balances</label>
                          <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Permits recording deposits prior to dental seating.</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Active POS Payment Channels</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {config.billing.paymentMethods.map((m) => (
                          <span key={m} className="bg-slate-100 border border-slate-200 text-slate-700 font-extrabold px-3 py-1.5 rounded-xl text-[10.5px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TEMPLATES & LAYOUTS DOCUMENTS CATEGORY */}
                {activeCategory === 'documents' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Prescription Digital Template (Rx)</label>
                        <textarea
                          rows={6}
                          value={config.documents.prescriptionTemplate}
                          onChange={(e) => setConfig({
                            ...config,
                            documents: { ...config.documents, prescriptionTemplate: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-mono text-[11px] text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tax Invoice Printed Layout Template</label>
                        <textarea
                          rows={6}
                          value={config.documents.invoiceTemplate}
                          onChange={(e) => setConfig({
                            ...config,
                            documents: { ...config.documents, invoiceTemplate: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-mono text-[11px] text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Informed Consent Disclosure Policy Agreement</label>
                      <textarea
                        rows={3}
                        value={config.documents.consentTemplate}
                        onChange={(e) => setConfig({
                          ...config,
                          documents: { ...config.documents, consentTemplate: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-semibold focus:bg-white text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Clinic Letterhead Footer Text</label>
                        <input
                          type="text"
                          value={config.documents.footerText}
                          onChange={(e) => setConfig({
                            ...config,
                            documents: { ...config.documents, footerText: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Anti-Forgery Document Watermark</label>
                        <input
                          type="text"
                          value={config.documents.watermark}
                          onChange={(e) => setConfig({
                            ...config,
                            documents: { ...config.documents, watermark: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS HUB CATEGORY */}
                {activeCategory === 'notifications' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-150">
                        <input
                          type="checkbox"
                          id="not_wa"
                          checked={config.notifications.whatsappEnabled}
                          onChange={(e) => setConfig({
                            ...config,
                            notifications: { ...config.notifications, whatsappEnabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="not_wa" className="text-xs font-black text-slate-800 cursor-pointer">WhatsApp Webhook</label>
                          <span className="text-[9px] text-slate-450 block font-bold">API templates messaging</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-150">
                        <input
                          type="checkbox"
                          id="not_sms"
                          checked={config.notifications.smsEnabled}
                          onChange={(e) => setConfig({
                            ...config,
                            notifications: { ...config.notifications, smsEnabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="not_sms" className="text-xs font-black text-slate-800 cursor-pointer">SMS Telecomm Triggers</label>
                          <span className="text-[9px] text-slate-450 block font-bold">SMS OTP security alert codes</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-150">
                        <input
                          type="checkbox"
                          id="not_eml"
                          checked={config.notifications.emailEnabled}
                          onChange={(e) => setConfig({
                            ...config,
                            notifications: { ...config.notifications, emailEnabled: e.target.checked }
                          })}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label htmlFor="not_eml" className="text-xs font-black text-slate-800 cursor-pointer">Email SMTP Relay</label>
                          <span className="text-[9px] text-slate-450 block font-bold">SCDC statements email feeds</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Active Automated WhatsApp Confirmations Template</label>
                      <textarea
                        rows={3}
                        value={config.notifications.whatsappTemplates.appointment_confirmation || ''}
                        onChange={(e) => {
                          const templates = { ...config.notifications.whatsappTemplates, appointment_confirmation: e.target.value };
                          setConfig({ ...config, notifications: { ...config.notifications, whatsappTemplates: templates } });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* DROPDOWN MANAGER CATEGORY (MODULE 9) */}
                {activeCategory === 'lookups' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Select Active List Categories</label>
                        <select
                          value={selectedLookupCategory}
                          onChange={(e) => setSelectedLookupCategory(e.target.value)}
                          className="bg-white border border-slate-200 text-xs font-black rounded-xl h-10 px-3 outline-none focus:border-teal-500 cursor-pointer text-slate-800"
                        >
                          <option value="chief_complaints">Chief Complaints List</option>
                          <option value="diagnosis">Diagnosis Options</option>
                          <option value="referral_sources">Referral Acquisition Channels</option>
                          <option value="occupations">Demographics Occupations</option>
                          <option value="blood_groups">Biological Blood Groups</option>
                          <option value="cities">Supported Cities List</option>
                          <option value="states">Regional States Options</option>
                        </select>
                      </div>

                      {isUserAdmin && (
                        <div className="flex items-end gap-2">
                          <div className="space-y-1 w-full sm:w-64">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Add Option Entry</label>
                            <input
                              type="text"
                              placeholder="Insert new option..."
                              value={newLookupValue}
                              onChange={(e) => setNewLookupValue(e.target.value)}
                              className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 h-10 outline-none focus:border-teal-500 font-bold text-slate-800"
                            />
                          </div>
                          <button
                            onClick={handleAddLookup}
                            className="bg-teal-600 hover:bg-teal-700 text-white p-3.0 h-10 w-11 rounded-xl transition flex items-center justify-center cursor-pointer hover:shadow"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">LOOKUP VALUE</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">STATUS</th>
                            {isUserAdmin && <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">ACTIONS</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lookups
                            .filter(lk => lk.category === selectedLookupCategory)
                            .map((lk) => (
                              <tr key={lk.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-850">
                                  {editingLookupId === lk.id ? (
                                    <input
                                      type="text"
                                      value={editingLookupValue}
                                      onChange={(e) => setEditingLookupValue(e.target.value)}
                                      className="border border-teal-500 rounded-lg px-2 py-1 outline-none font-bold text-xs text-slate-800 bg-white"
                                    />
                                  ) : (
                                    lk.value
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-800 uppercase">
                                    Active List Option
                                  </span>
                                </td>
                                {isUserAdmin && (
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {editingLookupId === lk.id ? (
                                        <button
                                          onClick={() => handleUpdateLookup({ ...lk, value: editingLookupValue })}
                                          className="p-1.5 border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                                        >
                                          <Check size={12} />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingLookupId(lk.id);
                                            setEditingLookupValue(lk.value);
                                          }}
                                          className="text-[10px] font-black text-teal-600 hover:text-teal-700 hover:underline bg-transparent"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteLookup(lk.id)}
                                        className="p-1.5 border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* NUMBERING RULES CATEGORY (MODULE 10) */}
                {activeCategory === 'numbering' && (
                  <div className="space-y-6">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Control auto-generated prefixes, reset frequencies, and sequence index offsets. Sequences can reset on Daily, Monthly or Yearly periods.
                    </p>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">ENTITY TYPE</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">PREFIX</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">PADDING</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">FREQUENCY</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">NEXT INDEX</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">PREVIEW OUTCOME</th>
                            {isUserAdmin && <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">SAVE</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {numberingRules.map((rule, idx) => (
                            <tr key={rule.id || idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-4 py-3 font-extrabold text-slate-800 capitalize">{rule.entityType.replace('_', ' ')}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={rule.prefix}
                                  disabled={!isUserAdmin}
                                  onChange={(e) => {
                                    const list = [...numberingRules];
                                    list[idx].prefix = e.target.value;
                                    setNumberingRules(list);
                                  }}
                                  className="w-16 border border-slate-200 rounded-lg px-2 py-0.5 font-bold outline-none focus:border-teal-500 text-slate-800 text-center bg-slate-50 focus:bg-white"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={rule.paddingLength}
                                  disabled={!isUserAdmin}
                                  onChange={(e) => {
                                    const list = [...numberingRules];
                                    list[idx].paddingLength = Number(e.target.value);
                                    setNumberingRules(list);
                                  }}
                                  className="w-12 border border-slate-200 rounded-lg px-2 py-0.5 font-bold outline-none focus:border-teal-500 text-slate-800 text-center bg-slate-50 focus:bg-white"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={rule.resetFrequency}
                                  disabled={!isUserAdmin}
                                  onChange={(e) => {
                                    const list = [...numberingRules];
                                    list[idx].resetFrequency = e.target.value as any;
                                    setNumberingRules(list);
                                  }}
                                  className="border border-slate-200 rounded-lg px-2 py-0.5 font-bold outline-none focus:border-teal-500 text-slate-800 bg-slate-50 focus:bg-white text-xs cursor-pointer"
                                >
                                  <option value="never">Never Reset</option>
                                  <option value="daily">Daily Reset</option>
                                  <option value="monthly">Monthly Reset</option>
                                  <option value="yearly">Yearly Reset</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={rule.currentNumber}
                                  disabled={!isUserAdmin}
                                  onChange={(e) => {
                                    const list = [...numberingRules];
                                    list[idx].currentNumber = Number(e.target.value);
                                    setNumberingRules(list);
                                  }}
                                  className="w-16 border border-slate-200 rounded-lg px-2 py-0.5 font-bold outline-none focus:border-teal-500 text-slate-800 text-center bg-slate-50 focus:bg-white"
                                />
                              </td>
                              <td className="px-4 py-3 font-mono text-[10.5px] font-black text-teal-650 bg-teal-50/50">
                                {getNumberingPreview(rule)}
                              </td>
                              {isUserAdmin && (
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleUpdateNumberingRule(rule)}
                                    className="px-2.5 py-1 text-[10px] font-black bg-teal-550 border border-teal-600/30 text-teal-700 rounded-lg hover:bg-teal-100 transition cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* FEATURE TOGGLES MATRIX (MODULE 11) */}
                {activeCategory === 'toggles' && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Enable or disable clinical workflow options instantly. Turning off a block restricts interface views for receptionist and dental assistants automatically.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featureToggles.map((toggle) => (
                        <div key={toggle.id} className="bg-slate-50 border border-slate-150 p-4.5 rounded-2xl flex items-start justify-between gap-4 hover:border-slate-300 hover:bg-slate-100/50 transition">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-slate-850 block">{toggle.label}</label>
                            <span className="text-[10px] text-slate-450 leading-relaxed block font-semibold">
                              {toggle.description}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            disabled={!isUserAdmin}
                            onClick={() => handleToggleFeature(toggle)}
                            className="shrink-0 text-teal-600 focus:outline-none bg-transparent"
                          >
                            {toggle.enabled ? (
                              <ToggleRight size={38} className="text-teal-600 cursor-pointer hover:scale-105 transition" />
                            ) : (
                              <ToggleLeft size={38} className="text-slate-400 cursor-pointer hover:scale-105 transition" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AUDIT LOGS & SURGICAL ROLLBACK (MODULE 12) */}
                {activeCategory === 'audit' && (
                  <div className="space-y-5">
                    <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed">
                      SCDC Security & Compliance Ledger records all configuration changes. Single-click any recorded row to execute surgical rollback.
                    </p>

                    <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">CATEGORY</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">MODIFIED FIELD</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">OLD VALUE</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">NEW VALUE</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">CHANGED BY</th>
                            <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider">CHANGED ON</th>
                            {isUserAdmin && <th className="px-4 py-3.0 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">RESTORE</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[10.5px] font-semibold">
                          {auditHistory.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                No master configuration changes logged in this browser session ledger.
                              </td>
                            </tr>
                          ) : (
                            auditHistory.map((historyItem) => (
                              <tr key={historyItem.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-extrabold text-slate-800 uppercase">{historyItem.category}</td>
                                <td className="px-4 py-3 font-mono text-slate-500 font-bold">{historyItem.fieldName}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate font-mono text-slate-400" title={historyItem.oldValue}>{historyItem.oldValue}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate font-mono text-teal-700" title={historyItem.newValue}>{historyItem.newValue}</td>
                                <td className="px-4 py-3 text-slate-800">{historyItem.changedBy}</td>
                                <td className="px-4 py-3 text-slate-400">{new Date(historyItem.changedOn).toLocaleDateString()} {new Date(historyItem.changedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                {isUserAdmin && (
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleRollback(historyItem.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-all font-black text-[9.5px] uppercase tracking-wide cursor-pointer"
                                      title="Revert change back to old value"
                                    >
                                      <RotateCcw size={10} /> Rollback
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
