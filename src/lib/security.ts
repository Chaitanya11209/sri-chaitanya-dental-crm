import { supabase } from './supabase';
import { logSecurityEvent } from './audit';
import { getCurrentUser, logout } from './auth';

// --- CONFIGURATION CONSTANTS ---
export const DEFAULT_IDLE_TIMEOUT_MINS = 30;
export const MAX_FAILED_ATTEMPTS = 5;
export const EXPIRE_PASSWORDS_DAYS = 90;

export interface ActiveSession {
  id: string;
  email: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  loginTime: string;
  isCurrent: boolean;
  isTrusted: boolean;
}

export interface SecurityStatus {
  lastLoginTime: string;
  lastLoginIp: string;
  failedAttempts: number;
  isLocked: boolean;
  lockoutExpiry?: string;
  isTwoFactorEnabled: boolean;
  twoFactorType?: 'totp' | 'email' | 'none';
  backupCodesCount: number;
  passwordLastChanged: string;
}

// --- UTILITY: DEVICE DETECTION ---
export function detectDevice(): { browser: string; os: string; ip: string; location: string } {
  if (typeof navigator === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', ip: '127.0.0.1', location: 'Unknown' };
  }
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS Device';
  else if (/linux/i.test(ua)) os = 'Linux PC';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS Device';

  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Edge')) browser = 'Microsoft Edge';

  return {
    browser,
    os,
    ip: '103.241.12.85', // Simulated public Indian telecom / Hyderabad IP
    location: 'Hyderabad, Telangana, India'
  };
}

// --- PASSWORD POLICY & SECURITY ---
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numeric digit (0-9).');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (e.g. @, $, !, %, *).');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a new password is not present in the user's password history.
 */
export function isPasswordInHistory(email: string, passwordHash: string): boolean {
  try {
    const historyJson = localStorage.getItem(`pw_history_${email.toLowerCase()}`);
    if (!historyJson) return false;
    const history: string[] = JSON.parse(historyJson);
    return history.includes(passwordHash);
  } catch {
    return false;
  }
}

/**
 * Pushes a password hash to the user's history, maintaining only the last 3 entries.
 */
export function addPasswordToHistory(email: string, passwordHash: string): void {
  try {
    const emailKey = email.toLowerCase();
    const historyJson = localStorage.getItem(`pw_history_${emailKey}`);
    const history: string[] = historyJson ? JSON.parse(historyJson) : [];
    
    // Add to start, filter duplicates, keep last 3
    const newHistory = [passwordHash, ...history.filter(h => h !== passwordHash)].slice(0, 3);
    localStorage.setItem(`pw_history_${emailKey}`, JSON.stringify(newHistory));
    localStorage.setItem(`pw_last_changed_${emailKey}`, new Date().toISOString());
  } catch (err) {
    console.error('Failed to update password history:', err);
  }
}

// --- TWO-FACTOR AUTHENTICATION STATE ---
export interface TwoFactorState {
  enabled: boolean;
  secret: string; // TOTP secret seed
  type: 'totp' | 'email' | 'none';
  backupCodes: string[];
}

export function getTwoFactorState(email: string): TwoFactorState {
  try {
    const emailKey = email.toLowerCase();
    const stored = localStorage.getItem(`2fa_${emailKey}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { enabled: false, secret: '', type: 'none', backupCodes: [] };
}

export function saveTwoFactorState(email: string, state: TwoFactorState): void {
  localStorage.setItem(`2fa_${email.toLowerCase()}`, JSON.stringify(state));
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes.push(code);
  }
  return codes;
}

// --- BRUTE-FORCE LOCKOUT & PROGRESSIVE DELAYS ---
export interface LockoutState {
  failedCount: number;
  isLocked: boolean;
  unlockTime?: string;
  lastAttempt?: string;
}

export function getLockoutState(email: string): LockoutState {
  try {
    const emailKey = email.toLowerCase();
    const stored = localStorage.getItem(`lockout_${emailKey}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.isLocked && parsed.unlockTime) {
        // Check if lockout has expired
        if (new Date().getTime() > new Date(parsed.unlockTime).getTime()) {
          // Expired, reset
          const reset = { failedCount: 0, isLocked: false };
          localStorage.setItem(`lockout_${emailKey}`, JSON.stringify(reset));
          return reset;
        }
      }
      return parsed;
    }
  } catch {}
  return { failedCount: 0, isLocked: false };
}

export function recordFailedAttempt(email: string): LockoutState {
  const emailKey = email.toLowerCase();
  const state = getLockoutState(emailKey);
  state.failedCount += 1;
  state.lastAttempt = new Date().toISOString();

  if (state.failedCount >= MAX_FAILED_ATTEMPTS) {
    state.isLocked = true;
    // Lock for 15 minutes
    state.unlockTime = new Date(new Date().getTime() + 15 * 60 * 1000).toISOString();
    
    // Log security event
    logSecurityEvent({
      action: 'ACCOUNT_LOCKED',
      details: `Account locked due to ${state.failedCount} failed logins: ${emailKey}`,
      newValue: { unlockTime: state.unlockTime }
    }).catch(() => {});
  }

  localStorage.setItem(`lockout_${emailKey}`, JSON.stringify(state));
  return state;
}

export function clearFailedAttempts(email: string): void {
  localStorage.removeItem(`lockout_${email.toLowerCase()}`);
}

/**
 * Calculates a progressive delay in milliseconds for the login screen.
 */
export function getProgressiveDelayMs(failedCount: number): number {
  if (failedCount === 0) return 0;
  if (failedCount === 1) return 500;
  if (failedCount === 2) return 2000;
  if (failedCount === 3) return 5000;
  if (failedCount === 4) return 10000;
  return 30000;
}

/**
 * Emergency administrative unlock for locked staff accounts.
 */
export async function adminUnlockAccount(email: string): Promise<boolean> {
  try {
    const emailKey = email.toLowerCase();
    localStorage.removeItem(`lockout_${emailKey}`);
    const adminUser = getCurrentUser();
    
    await logSecurityEvent({
      action: 'ADMIN_UNLOCK_ACCOUNT',
      details: `Clinic Administrator "${adminUser?.name || 'Admin'}" unlocked account: ${emailKey}`
    });
    return true;
  } catch {
    return false;
  }
}

// --- USER SESSION STORE (MULTI-DEVICE & REMOTE REVOCATION) ---
export function getActiveSessions(email: string): ActiveSession[] {
  try {
    const emailKey = email.toLowerCase();
    const stored = localStorage.getItem(`sessions_${emailKey}`);
    const list: ActiveSession[] = stored ? JSON.parse(stored) : [];
    
    // Ensure current session exists in list
    const currentSessionId = localStorage.getItem('currentSessionId');
    const device = detectDevice();
    
    if (currentSessionId) {
      const hasCurrent = list.some(s => s.id === currentSessionId);
      if (!hasCurrent) {
        const current: ActiveSession = {
          id: currentSessionId,
          email: emailKey,
          browser: device.browser,
          os: device.os,
          ip: device.ip,
          location: device.location,
          loginTime: localStorage.getItem('loginTime') || new Date().toISOString(),
          isCurrent: true,
          isTrusted: true
        };
        list.push(current);
        localStorage.setItem(`sessions_${emailKey}`, JSON.stringify(list));
      }
    }
    
    // Mark which one isCurrent
    return list.map(s => ({
      ...s,
      isCurrent: s.id === currentSessionId
    }));
  } catch {
    return [];
  }
}

export function registerNewSession(email: string): string {
  const emailKey = email.toLowerCase();
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
  const loginTime = new Date().toISOString();
  
  localStorage.setItem('currentSessionId', sessionId);
  localStorage.setItem('loginTime', loginTime);

  const device = detectDevice();
  const newSession: ActiveSession = {
    id: sessionId,
    email: emailKey,
    browser: device.browser,
    os: device.os,
    ip: device.ip,
    location: device.location,
    loginTime,
    isCurrent: true,
    isTrusted: true
  };

  const currentSessions = getActiveSessions(emailKey);
  currentSessions.push(newSession);
  localStorage.setItem(`sessions_${emailKey}`, JSON.stringify(currentSessions));

  return sessionId;
}

export async function revokeSession(email: string, sessionId: string): Promise<void> {
  const emailKey = email.toLowerCase();
  const list = getActiveSessions(emailKey);
  const updated = list.filter(s => s.id !== sessionId);
  localStorage.setItem(`sessions_${emailKey}`, JSON.stringify(updated));

  const currentSessionId = localStorage.getItem('currentSessionId');
  if (sessionId === currentSessionId) {
    await logSecurityEvent({
      action: 'SESSION_REVOKED',
      details: `Session revoked by user action: ${sessionId}`
    });
    await logout();
    window.location.reload();
  } else {
    await logSecurityEvent({
      action: 'REMOTE_SESSION_REVOKED',
      details: `Terminated remote session: ${sessionId}`
    });
  }
}

// --- IDLE TIMEOUT WATCHER ---
let idleTimeoutHandler: (() => void) | null = null;
let idleTimer: any = null;

export function getIdleTimeoutLimitMinutes(): number {
  try {
    const stored = localStorage.getItem('security_idle_timeout');
    if (stored) return parseInt(stored, 10);
  } catch {}
  return DEFAULT_IDLE_TIMEOUT_MINS;
}

export function setIdleTimeoutLimitMinutes(mins: number): void {
  localStorage.setItem('security_idle_timeout', mins.toString());
}

export function startIdleTimeoutWatcher(onTimeout: () => void): void {
  idleTimeoutHandler = onTimeout;
  resetIdleTimer();

  const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
  events.forEach(evt => {
    window.addEventListener(evt, resetIdleTimer);
  });
}

export function stopIdleTimeoutWatcher(): void {
  if (idleTimer) clearTimeout(idleTimer);
  const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
  events.forEach(evt => {
    window.removeEventListener(evt, resetIdleTimer);
  });
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  
  const timeoutLimitMinutes = getIdleTimeoutLimitMinutes();
  const ms = timeoutLimitMinutes * 60 * 1000;
  
  idleTimer = setTimeout(() => {
    if (idleTimeoutHandler) {
      console.warn('[Security Shield] Session idle timeout reached. Automatically logging out.');
      idleTimeoutHandler();
    }
  }, ms);
}
