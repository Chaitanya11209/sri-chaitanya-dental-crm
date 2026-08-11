import { useState, useRef, useEffect } from 'react';
import { 
  User, Award, MapPin, Phone, Mail, Signature, FileKey, 
  ShieldCheck, Save, Clock, Check, X, ShieldAlert, FolderOpen, 
  Trash2, Lock, Smartphone, RefreshCw, Key, Laptop, AlertCircle, 
  Eye, EyeOff, Shield, ShieldQuestion, HelpCircle, AlertTriangle
} from 'lucide-react';
import { getRole, getCurrentUser } from '../../lib/auth';
import { useNotification } from '../../components/NotificationProvider';
import { 
  ActiveSession, 
  getActiveSessions, 
  revokeSession, 
  getIdleTimeoutLimitMinutes, 
  setIdleTimeoutLimitMinutes,
  getTwoFactorState,
  saveTwoFactorState,
  generateBackupCodes,
  validatePasswordStrength,
  isPasswordInHistory,
  addPasswordToHistory,
  adminUnlockAccount,
  LockoutState
} from '../../lib/security';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Profile State
  const [name, setName] = useState('Dr. Jupalli Durga Bhavani');
  const [credentials, setCredentials] = useState('BDS, MDS · Chief Cosmetic Dental Surgeon');
  const [regNo, setRegNo] = useState('APDC-8092');
  const [phone, setPhone] = useState('+91 83175 75165');
  const [email, setEmail] = useState('contact@srichaitanyadental.com');
  const [fees, setFees] = useState('250');
  const [signLabel, setSignLabel] = useState('Dr_Durga_Bhavani_Secured_Sign');
  const [isSaved, setIsSaved] = useState(false);

  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRole = getRole();
  const user = getCurrentUser();
  const isAuthorized = activeRole === 'admin' || activeRole === 'clinic_owner' || activeRole === 'doctor';
  const isClinicOwnerOrAdmin = activeRole === 'clinic_owner' || activeRole === 'admin';

  // Signature states
  const [signatureImage, setSignatureImage] = useState<string | null>(() => {
    return localStorage.getItem('doctor_signature_image');
  });
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Security Tab States
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [idleMins, setIdleMins] = useState<number>(getIdleTimeoutLimitMinutes());
  
  // 2FA States
  const [twoFactor, setTwoFactor] = useState(getTwoFactorState(user?.email || 'contact@srichaitanyadental.com'));
  const [setup2FAMode, setSetup2FAMode] = useState<'none' | 'totp' | 'email'>('none');
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordHistoryList, setPasswordHistoryList] = useState<string[]>([]);

  // Emergency Recovery states
  const [unlockEmailInput, setUnlockEmailInput] = useState('');
  const [lockedAccountsList, setLockedAccountsList] = useState<{email: string; failedCount: number; unlockTime: string}[]>([]);

  // Load Sessions and locked accounts on mount/tab change
  useEffect(() => {
    if (user?.email) {
      setSessions(getActiveSessions(user.email));
    }
    loadLockedAccounts();
    loadPasswordHistory();
  }, [activeTab, user]);

  const loadPasswordHistory = () => {
    if (!user?.email) return;
    try {
      const history = localStorage.getItem(`pw_history_${user.email.toLowerCase()}`);
      if (history) {
        setPasswordHistoryList(JSON.parse(history));
      }
    } catch {}
  };

  const loadLockedAccounts = () => {
    const list: {email: string; failedCount: number; unlockTime: string}[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lockout_')) {
          const email = key.replace('lockout_', '');
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.isLocked) {
            list.push({
              email,
              failedCount: data.failedCount,
              unlockTime: data.unlockTime || ''
            });
          }
        }
      }
      setLockedAccountsList(list);
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        notify('error', 'Invalid File Type', 'Please upload a valid image file (PNG or JPG).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSignatureImage(base64String);
        localStorage.setItem('doctor_signature_image', base64String);
        notify('success', 'Signature Uploaded', 'Doctor signature image uploaded successfully and will reflect on custom printed documents!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    setSignatureImage(null);
    localStorage.removeItem('doctor_signature_image');
    notify('info', 'Signature Removed', 'Doctor signature image removed from internal cache.');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
    alert('Practitioner professional profile successfully updated.');
  };

  const handleIdleTimeoutChange = (mins: number) => {
    setIdleMins(mins);
    setIdleTimeoutLimitMinutes(mins);
    notify('success', 'Idle Timeout Updated', `Automatic session logout set to ${mins} minutes of inactivity.`);
  };

  // 2FA Handlers
  const handleStart2FA = (type: 'totp' | 'email') => {
    setSetup2FAMode(type);
    if (type === 'totp') {
      const generatedSecret = 'SRI-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setTotpSecret(generatedSecret);
    } else {
      notify('info', 'Email Code Simulated', `Simulating OTP transmission to registered email: ${user?.email || email}`);
    }
  };

  const handleVerify2FA = () => {
    if (!verificationCode || verificationCode.trim().length < 4) {
      notify('error', 'Invalid Verification Code', 'Please enter a valid 2FA verification code.');
      return;
    }

    const backup = generateBackupCodes();
    const newState = {
      enabled: true,
      secret: setup2FAMode === 'totp' ? totpSecret : 'EMAIL-VERIFIED',
      type: setup2FAMode,
      backupCodes: backup
    };

    if (user?.email) {
      saveTwoFactorState(user.email, newState);
    }
    setTwoFactor(newState);
    setSetup2FAMode('none');
    setVerificationCode('');
    setShowBackupCodes(true);
    notify('success', 'Two-Factor Authentication Active', `Successfully activated 2FA via ${setup2FAMode.toUpperCase()} for this session user account.`);
  };

  const handleDisable2FA = () => {
    const newState = { enabled: false, secret: '', type: 'none' as const, backupCodes: [] };
    if (user?.email) {
      saveTwoFactorState(user.email, newState);
    }
    setTwoFactor(newState);
    setShowBackupCodes(false);
    notify('info', 'Two-Factor Disabled', 'Two-factor account protection has been deactivated.');
  };

  // Password Handlers
  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) return;

    if (newPassword !== confirmPassword) {
      notify('error', 'Password Mismatch', 'New passwords and confirm password fields do not match.');
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      notify('error', 'Weak Password Policy', validation.errors[0]);
      return;
    }

    // Hash simulation check (simple comparison)
    const mockHash = btoa(newPassword); // Mock hash helper
    if (isPasswordInHistory(user.email, mockHash)) {
      notify('error', 'Password Reuse Blocked', 'Security Policy Error: This password matches one of your last 3 passwords. Please specify a unique password.');
      return;
    }

    addPasswordToHistory(user.email, mockHash);
    notify('success', 'Password Changed Successfully', 'Your account credentials have been securely updated. Old password invalidated.');
    
    // Reset fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    loadPasswordHistory();
  };

  // Emergency Unlock Handlers
  const handleEmergencyUnlock = async (emailToUnlock: string) => {
    const res = await adminUnlockAccount(emailToUnlock);
    if (res) {
      notify('success', 'Account Unlocked', `Successfully removed security lockouts for account: ${emailToUnlock}`);
      loadLockedAccounts();
    } else {
      notify('error', 'Unlock Failure', 'Could not clear account lockout parameters.');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!user?.email) return;
    await revokeSession(user.email, id);
    setSessions(getActiveSessions(user.email));
    notify('success', 'Session Terminated', `Successfully terminated session token: ${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
          <User size={160} />
        </div>
        <div className="relative z-10">
          <span className="bg-white/20 text-white font-mono font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10">
            Enterprise Account Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-2">Staff Profile & Security Hub</h1>
          <p className="text-xs text-white/80 max-w-xl font-medium mt-1">
            Configure clinical credentials, upload e-signature stamps, review active session logs across devices, and manage Two-Factor authentication settings.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-slate-800'
          }`}
        >
          <User size={14} /> Practitioner Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-slate-800'
          }`}
        >
          <Lock size={14} /> Security, Sessions & 2FA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Account Card (Col Span 4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-5 text-center font-sans text-xs self-start">
          <div className="flex flex-col items-center">
            {/* Round Avatar initials */}
            <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-blue-50 text-blue-630 flex items-center justify-center font-black text-2xl">
              JB
            </div>
            <h3 className="font-extrabold text-sm mt-3 text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">{credentials}</p>
            <span className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border border-green-200">
              <ShieldCheck size={11} /> Verified {activeRole.replace('_', ' ')}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-4 text-left space-y-2.5 font-sans">
            <div className="flex items-center gap-2.5 text-gray-700">
              <Phone size={13} className="text-gray-400 shrink-0" />
              <span className="font-semibold">{phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <Mail size={13} className="text-gray-400 shrink-0" />
              <span className="font-semibold truncate">{email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <span className="font-semibold">Beeramguda, Patancheru</span>
            </div>
          </div>

          {/* Consultation details */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-1.5 font-sans">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">System Information</span>
            <p className="text-xs text-slate-900 font-bold">Role: <span className="uppercase text-blue-600 font-black">{activeRole.replace('_', ' ')}</span></p>
            <p className="text-[10px] text-zinc-500">Clinical session access validated via HIPAA-compliant logs.</p>
          </div>
        </div>

        {/* Right Card: Dynamic content based on Tab Selector (Col Span 8) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
          
          {activeTab === 'profile' ? (
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-gray-100 pb-2.5 mb-4">
                Specialist profile details
              </h2>

              <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Practitioner Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-10 border border-gray-200 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Specialization & Credentials</label>
                    <div className="relative">
                      <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={credentials}
                        onChange={(e) => setCredentials(e.target.value)}
                        className="w-full h-10 border border-gray-200 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">State Dental Counsel Reg No.</label>
                    <div className="relative">
                      <FileKey size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value)}
                        className="w-full h-10 border border-gray-200 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Consultation Fee slab (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        className="w-full h-10 border border-gray-200 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-black"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Contact No</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 border border-gray-200 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">Clinical Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 border border-gray-200 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <Signature size={13} className="text-[#8757EA]" /> Digital Prescription Autograph Code
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">E-Signature Label</label>
                    <input
                      type="text"
                      value={signLabel}
                      onChange={(e) => setSignLabel(e.target.value)}
                      className="w-full h-9 border border-gray-150 px-3 rounded-lg font-mono text-[11px] font-bold text-gray-650 bg-slate-50"
                      placeholder="Hash tag for cryptographic signature check..."
                    />
                    <p className="text-[9.5px] text-gray-400 mt-1 font-sans italic">
                      This secure label is embedded automatically inside printable medical certificates & referral letters generated from the system.
                    </p>
                  </div>
                </div>

                {/* Signature Upload segment */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <Signature size={13} className="text-blue-600" /> Authorized Clinical signature stamp
                  </h3>
                  
                  {isAuthorized ? (
                    <div id="sig-upload-active" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-2xl gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Dynamic Signature Upload</h4>
                        <p className="text-[10px] text-slate-505 mt-0.5 font-sans leading-relaxed">Embeds your real hand-drawn signature directly onto printable clinical certificates, letterheads, and R<sub>x</sub> sheets.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        ✍️ Manage Signature
                      </button>
                    </div>
                  ) : (
                    <div id="sig-upload-locked" className="flex items-start gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <ShieldAlert size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">Signature Management Blocked</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-sans">Your current staff role profile is <strong className="uppercase">{activeRole || 'unspecified'}</strong>. Authentic signature uploading, prescription sign-stamps, and print authorizations are restricted strictly to <strong>Doctors</strong> and <strong>Administrators</strong>.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider h-11 px-6 rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaved ? (
                      <>
                        <Check size={14} /> Profile Saved!
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Commit Profile Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6 font-sans text-xs">
              
              {/* --- SECURITY DASHBOARD METRICS --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Clock size={11} className="text-blue-500" /> Current Session ID
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800 break-all">
                    {localStorage.getItem('currentSessionId') || 'None'}
                  </p>
                  <p className="text-[9px] text-slate-500">IP: 103.241.12.85 (Telangana, IN)</p>
                </div>
                
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Smartphone size={11} className="text-purple-500" /> Two-Factor Status
                  </span>
                  <p className={`text-xs font-extrabold uppercase ${twoFactor.enabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {twoFactor.enabled ? `Enabled (${twoFactor.type?.toUpperCase()})` : 'Deactivated'}
                  </p>
                  <p className="text-[9px] text-slate-500">Ensures MFA code on all new browser sessions.</p>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-amber-500" /> Lockout Threshold
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    5 Failed Logins Limit
                  </p>
                  <p className="text-[9px] text-slate-500">Progressive delay + 15m lockout cooldown.</p>
                </div>
              </div>

              {/* --- REMOTE SESSION REVOCATION PANEL --- */}
              <div className="border border-gray-150 rounded-2xl p-4 space-y-3">
                <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Laptop size={13} className="text-indigo-600" /> Multi-Device Active Sessions ({sessions.length})</span>
                  <button 
                    onClick={() => {
                      if (user?.email) setSessions(getActiveSessions(user.email));
                    }} 
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold text-[9.5px]"
                  >
                    <RefreshCw size={11} /> Refresh list
                  </button>
                </h3>
                <p className="text-[10px] text-slate-500">
                  These are the browsers and devices currently holding active authentication tokens for your email account. You can instantly terminate any session remotely.
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessions.map((sess) => (
                    <div 
                      key={sess.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-2 ${
                        sess.isCurrent ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-slate-800 text-[11px]">{sess.browser} on {sess.os}</strong>
                          {sess.isCurrent && (
                            <span className="bg-blue-600 text-white font-mono font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              Current Session
                            </span>
                          )}
                          {sess.isTrusted && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[8px] px-1.5 py-0.5 rounded-md">
                              Trusted IP
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {sess.id} | IP: {sess.ip} | Location: {sess.location}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Login timestamp: {new Date(sess.loginTime).toLocaleString()}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRevoke(sess.id)}
                        className={`shrink-0 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition ${
                          sess.isCurrent 
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' 
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sess.isCurrent ? 'Logout Self' : 'Terminate Device'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- RE-CONFIGURABLE IDLE TIMEOUT WATCHER --- */}
              <div className="border border-gray-150 rounded-2xl p-4 space-y-3">
                <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-600" /> Configurable Security Idle Timeout
                </h3>
                <p className="text-[10px] text-slate-500">
                  Select the inactivity duration after which the CRM will automatically clear local tokens, log out your session, and lock the workspace.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleIdleTimeoutChange(mins)}
                      className={`h-9 px-4 rounded-xl text-[11px] font-bold border transition ${
                        idleMins === mins
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-gray-200'
                      }`}
                    >
                      ⏱️ {mins} Minutes {mins === 30 ? '(Recommended)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* --- TWO-FACTOR AUTHENTICATION CONSOLE --- */}
              <div className="border border-gray-150 rounded-2xl p-4 space-y-4">
                <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-emerald-600" /> Multi-Factor Cooldown Setup (2FA)
                </h3>
                <p className="text-[10px] text-slate-500">
                  Secure your Sri Chaitanya CRM account credentials from compromise. Activating 2FA prompts for a secure mobile verification challenge upon every browser login.
                </p>

                {twoFactor.enabled ? (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <strong className="text-emerald-800 text-[11px] uppercase font-black">2FA Protection is Fully Active</strong>
                    </div>
                    <p className="text-[10px] text-slate-650">
                      Method: <strong className="uppercase">{twoFactor.type} authenticator</strong>. Securely protecting your patient records and financial billing data.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3.5 py-1.5 border border-gray-200 rounded-lg text-[10.5px]"
                      >
                        📁 {showBackupCodes ? 'Hide Backup Codes' : 'View Emergency Backup Codes'}
                      </button>
                      <button
                        onClick={handleDisable2FA}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black px-3.5 py-1.5 rounded-lg text-[10.5px]"
                      >
                        Deactivate 2FA Protection
                      </button>
                    </div>

                    {showBackupCodes && (
                      <div className="p-3 bg-white border border-emerald-100 rounded-lg space-y-2 mt-2">
                        <p className="text-[10px] font-bold text-slate-800">Simulated emergency single-use backup recovery codes:</p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] font-bold text-slate-700">
                          {twoFactor.backupCodes?.map((code, index) => (
                            <span key={index}>Code {index + 1}: {code}</span>
                          )) || generateBackupCodes().slice(0, 10).map((code, idx) => (
                            <span key={idx}>Code {idx + 1}: {code}</span>
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-400 italic">Save these offline. You can use them to bypass locks if you lose access to your primary device.</p>
                      </div>
                    )}
                  </div>
                ) : setup2FAMode === 'none' ? (
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      onClick={() => handleStart2FA('totp')}
                      className="flex-1 p-3 border border-gray-200 hover:border-blue-300 rounded-xl hover:bg-slate-50 text-left transition space-y-1 cursor-pointer"
                    >
                      <strong className="text-slate-800 font-bold block text-xs">📱 Authenticator App (TOTP)</strong>
                      <span className="text-[10px] text-slate-500 block leading-normal">Generate secure validation tokens using Google Authenticator, Duo, or Microsoft Authenticator.</span>
                    </button>
                    <button
                      onClick={() => handleStart2FA('email')}
                      className="flex-1 p-3 border border-gray-200 hover:border-blue-300 rounded-xl hover:bg-slate-50 text-left transition space-y-1 cursor-pointer"
                    >
                      <strong className="text-slate-800 font-bold block text-xs">✉️ Email OTP Challenges</strong>
                      <span className="text-[10px] text-slate-500 block leading-normal">Simulate secure numeric confirmation codes transmitted directly onto your registered workspace email.</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-gray-250 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-800 text-[11.5px] uppercase font-black">Configure 2FA Challenge Verification</strong>
                      <button 
                        onClick={() => setSetup2FAMode('none')}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        Cancel
                      </button>
                    </div>

                    {setup2FAMode === 'totp' ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-550 leading-normal">
                          1. Scan this simulated QR tag setup using your mobile Authenticator App, or specify the manual security key:
                        </p>
                        <div className="flex items-center gap-3 p-3 bg-white border border-gray-150 rounded-lg">
                          {/* Simulated QR block */}
                          <div className="w-14 h-14 bg-slate-850 flex items-center justify-center font-mono font-bold text-[8px] text-slate-300 p-1 border border-slate-700 text-center shrink-0">
                            SRI DENTAL QR CODE MOCK
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-black text-gray-500 block uppercase">Manual Security Seed</span>
                            <code className="text-xs font-mono font-black text-blue-630 block select-all bg-blue-50/50 px-1.5 py-0.5 rounded mt-0.5">
                              {totpSecret}
                            </code>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 bg-amber-50 border border-amber-200 p-2.5 rounded-lg leading-normal">
                        📧 Simulated 2FA token transmission dispatched to workspace email address <strong>{user?.email || email}</strong>. Please confirm below.
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Provide 6-Digit Numeric Verification Key</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 809215"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-36 h-9 border border-gray-300 rounded-lg px-3 text-center font-mono font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleVerify2FA}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-lg text-xs uppercase cursor-pointer"
                        >
                          Verify and Activate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- SECURE PASSWORD CHANGE & POLICY MATRICES --- */}
              <div className="border border-gray-150 rounded-2xl p-4 space-y-4">
                <h3 className="text-[10.5px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Key size={13} className="text-purple-600" /> Enterprise Credential Rotation (Strong Password Policy)
                </h3>
                <p className="text-[10px] text-slate-500">
                  Update your active authentication password. Our HIPAA-compliant security manager enforces strict password strength and prevents reuse of any of your last 3 passwords.
                </p>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Current Password</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-9 border border-gray-200 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">New Password</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-9 border border-gray-200 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Confirm New Password</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-9 border border-gray-200 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        required
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="h-9 px-3 border border-gray-200 hover:bg-slate-50 rounded-lg text-slate-700 font-bold flex items-center gap-1 cursor-pointer w-full justify-center"
                      >
                        {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                        {showPasswords ? 'Hide Secret Keys' : 'Reveal Passwords'}
                      </button>
                    </div>
                  </div>

                  {newPassword && (
                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg space-y-1.5 animate-in slide-in-from-top-2">
                      <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Strength Checker Checklist</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[9.5px]">
                        <li className={`flex items-center gap-1 font-semibold ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{newPassword.length >= 8 ? '✓' : '✗'}</span> Minimum 8 characters long
                        </li>
                        <li className={`flex items-center gap-1 font-semibold ${/[A-Z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{/[A-Z]/.test(newPassword) ? '✓' : '✗'}</span> At least one uppercase letter (A-Z)
                        </li>
                        <li className={`flex items-center gap-1 font-semibold ${/[a-z]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{/[a-z]/.test(newPassword) ? '✓' : '✗'}</span> At least one lowercase letter (a-z)
                        </li>
                        <li className={`flex items-center gap-1 font-semibold ${/[0-9]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{/[0-9]/.test(newPassword) ? '✓' : '✗'}</span> At least one numeric digit (0-9)
                        </li>
                        <li className={`flex items-center gap-1 font-semibold ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '✗'}</span> At least one special symbol
                        </li>
                        <li className={`flex items-center gap-1 font-semibold ${!isPasswordInHistory(user?.email || '', btoa(newPassword)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <span>{!isPasswordInHistory(user?.email || '', btoa(newPassword)) ? '✓' : '✗'}</span> Must not be in password history
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded">
                      <Clock size={11} className="text-slate-400" /> Distinct History Cached hashes count: {passwordHistoryList.length}/3
                    </div>
                    <button
                      type="submit"
                      disabled={!newPassword}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase px-4 h-9 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Save size={13} /> Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* --- EMERGENCY ADMINISTRATIVE UNLOCK CONSOLE (CLINIC OWNER / ADMIN ONLY) --- */}
              {isClinicOwnerOrAdmin && (
                <div className="border border-rose-150 bg-rose-50/10 rounded-2xl p-4 space-y-4">
                  <h3 className="text-[10.5px] font-black uppercase text-rose-800 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-600 animate-pulse" /> Emergency Administrative Unlock Console
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Clinic Owner or Administrator privilege: Search, review, and bypass automated brute-force lockouts for locked clinician accounts. Clearing a lock resets the failure counters immediately.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter clinician registered email or username..."
                      value={unlockEmailInput}
                      onChange={(e) => setUnlockEmailInput(e.target.value)}
                      className="flex-1 h-9 border border-gray-200 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!unlockEmailInput) {
                          notify('error', 'Required Field', 'Please specify the email to unlock.');
                          return;
                        }
                        handleEmergencyUnlock(unlockEmailInput);
                        setUnlockEmailInput('');
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 rounded-lg text-xs uppercase cursor-pointer"
                    >
                      Instant Unlock Account
                    </button>
                  </div>

                  {lockedAccountsList.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 block">Locked Accounts Requiring Assistance ({lockedAccountsList.length})</span>
                      <div className="space-y-1.5">
                        {lockedAccountsList.map((locked) => (
                          <div key={locked.email} className="bg-white border border-rose-100 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-[11px]">{locked.email}</p>
                              <p className="text-[10px] text-rose-600 font-medium">
                                Locked out after {locked.failedCount} failures. Unlock cooldown ends at {new Date(locked.unlockTime).toLocaleTimeString()}.
                              </p>
                            </div>
                            <button
                              onClick={() => handleEmergencyUnlock(locked.email)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg shrink-0 transition"
                            >
                              ✓ Unlock Now
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9.5px] text-slate-400 italic">
                      No staff member accounts are currently locked. System status nominal.
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* ✍️ DOCTOR SIGNATURE POPUP MODAL */}
      {showSignatureModal && isAuthorized && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 space-y-5 text-slate-800">
            {/* Hidden native input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-105 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                ✍️ Doctor Signature
              </h2>
              <button 
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Upload a clear signature image for <strong className="text-slate-800">{name}</strong>. This will appear on printed letters and prescriptions.
            </p>

            {/* Image Preview Box */}
            <div className="border border-slate-200 bg-[#F8FAFC] rounded-2xl p-5 flex flex-col items-center justify-center min-h-[140px] text-center relative group">
              {signatureImage ? (
                <div className="relative w-full flex flex-col items-center">
                  <img 
                    src={signatureImage} 
                    alt="Doctor Signature Preview" 
                    className="max-h-24 max-w-full object-contain mix-blend-multiply transition duration-150"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveSignature}
                    className="absolute -top-3 -right-3 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full border border-rose-100 shadow-xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove signature"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span className="text-[9px] font-bold text-emerald-600 mt-2 block font-mono">✓ Active Prescription Autograph</span>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-bold font-sans">
                  No signature uploaded yet
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <FolderOpen size={14} /> Upload Signature
              </button>
              
              {signatureImage && (
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="w-full h-9 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold text-xs uppercase transition border border-slate-200 rounded-xl cursor-pointer font-sans"
                >
                  Clear Signature
                </button>
              )}
            </div>

            {/* Tip block */}
            <p className="text-[10px] text-slate-500 bg-amber-50/50 border border-amber-100/70 rounded-xl p-3 leading-relaxed font-sans flex items-start gap-1.5">
              <span>💡</span>
              <span>
                <strong>Tip:</strong> Use a white-background signature on a plain sheet of paper, photograph it, and upload. PNG or JPG works best.
              </span>
            </p>

          </div>
        </div>
      )}
    </div>
  );
}
