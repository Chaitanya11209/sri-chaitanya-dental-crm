import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface AuditPayload {
  action: string;
  details: string;
  targetUserId?: string;
  targetUserName?: string;
  oldValue?: any;
  newValue?: any;
}

// Simple IP cache to prevent repeated API calls
let cachedIp: string | null = null;

async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      if (data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch (err) {
    // Fail silently, fallback to standard local/mock IP
  }
  return '127.0.0.1';
}

function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Server/Unknown';
  const ua = navigator.userAgent;
  let device = 'Unknown Device';
  if (/android/i.test(ua)) {
    device = 'Android Phone';
  } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    device = 'iOS Device';
  } else if (/macintosh|mac os x/i.test(ua)) {
    device = 'Mac';
  } else if (/windows|win32/i.test(ua)) {
    device = 'Windows PC';
  } else if (/linux/i.test(ua)) {
    device = 'Linux PC';
  }
  
  // Extract browser name
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  } else if (ua.includes('Edge')) {
    browser = 'Edge';
  }

  return `${device} (${browser})`;
}

/**
 * Logs a high-security audit event to the Supabase backend (or offline mock).
 */
export async function logSecurityEvent(payload: AuditPayload): Promise<boolean> {
  try {
    const user = getCurrentUser();
    const ip = await getClientIp();
    const device = getDeviceInfo();

    // Format all additional metadata nicely inside the details field
    const extra: string[] = [];
    if (ip && ip !== '127.0.0.1') extra.push(`IP: ${ip}`);
    if (device && device !== 'Server/Unknown') extra.push(`Device: ${device}`);
    if (payload.oldValue) extra.push(`Old: ${JSON.stringify(payload.oldValue)}`);
    if (payload.newValue) extra.push(`New: ${JSON.stringify(payload.newValue)}`);
    
    let finalDetails = payload.details;
    if (extra.length > 0) {
      finalDetails = `${payload.details} [Context: ${extra.join(' | ')}]`;
    }

    // Validate targetUserId as UUID format
    let targetUserId: string | null = payload.targetUserId || null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (targetUserId && !uuidRegex.test(targetUserId)) {
      finalDetails = `${finalDetails} [Target User Email/ID: ${targetUserId}]`;
      targetUserId = null;
    }

    const auditRow = {
      action: payload.action,
      details: finalDetails,
      target_user_id: targetUserId,
      target_user_name: payload.targetUserName || null,
      performed_by_id: null as string | null,
      performed_by_name: user?.name || 'Unauthenticated Session',
      created_at: new Date().toISOString()
    };

    // If supabase session user is available, use their auth ID
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    if (sessionRes?.data?.session?.user?.id) {
      const userId = sessionRes.data.session.user.id;
      if (uuidRegex.test(userId)) {
        auditRow.performed_by_id = userId;
      } else {
        auditRow.details = `${auditRow.details} [Performed By ID: ${userId}]`;
      }
    }

    const { error } = await supabase.from('audit_logs').insert([auditRow]);
    
    // Always persist to local storage as fallback/offline logging history
    try {
      if (typeof window !== 'undefined') {
        const existingLogsStr = localStorage.getItem('scdc_local_audit_logs');
        const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
        const newLocalLog = {
          id: Math.floor(Math.random() * 100000000),
          ...auditRow
        };
        existingLogs.unshift(newLocalLog);
        if (existingLogs.length > 200) {
          existingLogs.length = 200;
        }
        localStorage.setItem('scdc_local_audit_logs', JSON.stringify(existingLogs));
      }
    } catch (e) {
      // Fail silently for non-browser environment
    }

    if (error) {
      // Log as standard warning instead of a high-priority console error to handle unconfigured database gracefully
      console.warn('[Audit Log Status] Offline/unconfigured database event recorded locally:', error.message || error);
    }

    // Also push to local console in development / audit tracking
    const performerRole = user?.role || 'anonymous';
    console.log(`[Enterprise Audit Logging] Action: ${payload.action} | Performer: ${auditRow.performed_by_name} (${performerRole}) | IP: ${ip} | Device: ${device}`);
    return true;
  } catch (err) {
    console.error('[Audit Log Exception]:', err);
    return false;
  }
}
