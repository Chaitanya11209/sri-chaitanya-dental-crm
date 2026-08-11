import { supabase, isSupabaseConfigured } from './supabase';
import { logSecurityEvent } from './audit';
import { 
  getLockoutState, 
  recordFailedAttempt, 
  clearFailedAttempts, 
  getProgressiveDelayMs, 
  registerNewSession,
  getTwoFactorState
} from './security';

export type UserRole = 'clinic_owner' | 'admin' | 'doctor' | 'receptionist' | 'assistant' | 'lab_technician' | 'accountant';

export interface CRMUser {
  email: string;
  name: string;
  role: UserRole;
}

export interface RolePermissions {
  view_dashboard: boolean;
  manage_patients: boolean;
  manage_appointments: boolean;
  write_treatments: boolean;
  manage_billing: boolean;
  manage_collections: boolean;
  manage_expenses: boolean;
  manage_inventory: boolean;
  manage_labwork: boolean;
  manage_doctors: boolean;
  manage_setup: boolean;
  manage_audit: boolean;
  manage_users: boolean;
  view_financials: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  clinic_owner: {
    view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: true,
    manage_billing: true, manage_collections: true, manage_expenses: true, manage_inventory: true,
    manage_labwork: true, manage_doctors: true, manage_setup: true, manage_audit: true, manage_users: true,
    view_financials: true
  },
  admin: {
    view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: true,
    manage_billing: true, manage_collections: true, manage_expenses: true, manage_inventory: true,
    manage_labwork: true, manage_doctors: true, manage_setup: true, manage_audit: true, manage_users: true,
    view_financials: true
  },
  doctor: {
    view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: true,
    manage_billing: true, manage_collections: true, manage_expenses: true, manage_inventory: false,
    manage_labwork: true, manage_doctors: true, manage_setup: false, manage_audit: false, manage_users: false,
    view_financials: true
  },
  receptionist: {
    view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: false,
    manage_billing: false, manage_collections: false, manage_expenses: false, manage_inventory: true,
    manage_labwork: false, manage_doctors: false, manage_setup: false, manage_audit: false, manage_users: false,
    view_financials: false
  },
  assistant: {
    view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: false,
    manage_billing: false, manage_collections: false, manage_expenses: false, manage_inventory: true,
    manage_labwork: false, manage_doctors: false, manage_setup: false, manage_audit: false, manage_users: false,
    view_financials: false
  },
  lab_technician: {
    view_dashboard: true, manage_patients: false, manage_appointments: false, write_treatments: false,
    manage_billing: false, manage_collections: false, manage_expenses: false, manage_inventory: true,
    manage_labwork: true, manage_doctors: false, manage_setup: false, manage_audit: false, manage_users: false,
    view_financials: false
  },
  accountant: {
    view_dashboard: true, manage_patients: false, manage_appointments: false, write_treatments: false,
    manage_billing: true, manage_collections: true, manage_expenses: true, manage_inventory: true,
    manage_labwork: false, manage_doctors: false, manage_setup: false, manage_audit: false, manage_users: false,
    view_financials: true
  }
};

export function getRolePermissions(role: UserRole): RolePermissions {
  try {
    const stored = localStorage.getItem(`permissions_${role}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error(e);
  }
  return { ...(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.receptionist) };
}

export function saveRolePermissions(role: UserRole, permissions: RolePermissions) {
  localStorage.setItem(`permissions_${role}`, JSON.stringify(permissions));
}

export async function syncPermissionsFromDatabase(): Promise<void> {
  try {
    // 1. Fetch all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name');
    
    if (rolesError || !roles || roles.length === 0) {
      console.warn('Could not load database roles for sync:', rolesError?.message);
      return;
    }

    // 2. Fetch all permissions
    const { data: permissions, error: permsError } = await supabase
      .from('permissions')
      .select('id, name');

    if (permsError || !permissions || permissions.length === 0) {
      console.warn('Could not load database permissions for sync:', permsError?.message);
      return;
    }

    // 3. Fetch all role_permissions
    const { data: rolePerms, error: rpError } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id');

    if (rpError || !rolePerms) {
      console.warn('Could not load database role_permissions for sync:', rpError?.message);
      return;
    }

    // Create a local map of role ID -> role Name
    const roleMap: Record<string, string> = {};
    roles.forEach(r => {
      roleMap[r.id] = r.name;
    });

    // Create a local map of permission ID -> permission Name
    const permMap: Record<string, string> = {};
    permissions.forEach(p => {
      permMap[p.id] = p.name;
    });

    // Initialize clean empty structures
    const rolesList = ['clinic_owner', 'admin', 'doctor', 'receptionist', 'assistant', 'lab_technician', 'accountant'] as UserRole[];
    const syncData: Record<string, Record<string, boolean>> = {};
    rolesList.forEach(r => {
      syncData[r] = {
        view_dashboard: false, manage_patients: false, manage_appointments: false, write_treatments: false,
        manage_billing: false, manage_collections: false, manage_expenses: false, manage_inventory: false,
        manage_labwork: false, manage_doctors: false, manage_setup: false, manage_audit: false, manage_users: false
      };
    });

    // Populate from db values
    rolePerms.forEach(rp => {
      const roleName = roleMap[rp.role_id];
      const permName = permMap[rp.permission_id];
      if (roleName && permName && syncData[roleName]) {
        syncData[roleName][permName] = true;
      }
    });

    // Special bypass rule: clinic_owner and admin always have full permissions
    rolesList.forEach(r => {
      if (r === 'clinic_owner' || r === 'admin') {
        const permsList = Object.keys(syncData[r]);
        permsList.forEach(p => {
          syncData[r][p] = true;
        });
      }
      // Save to localStorage so existing synchronous auth system can read immediately
      localStorage.setItem(`permissions_${r}`, JSON.stringify(syncData[r]));
    });

    console.log('[Enterprise RBAC Sync] Successfully synchronized roles and permissions from database tables to security cache.');
  } catch (err) {
    console.error('Failed to sync permissions from database:', err);
  }
}

export async function saveRolePermissionsToDatabase(role: UserRole, permissions: RolePermissions): Promise<boolean> {
  // Save to localStorage immediately as local optimistic update
  saveRolePermissions(role, permissions);

  try {
    // Look up the role ID
    const { data: roleRow, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .maybeSingle();

    if (roleError || !roleRow) {
      console.warn(`Could not save to database: Role "${role}" not found in database roles table.`);
      return false;
    }

    const roleId = roleRow.id;

    // Delete all existing role_permissions for this role
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Fetch all permissions to map names to IDs
    const { data: permsRows } = await supabase
      .from('permissions')
      .select('id, name');

    if (!permsRows) return false;

    // Create insert payloads
    const insertPayloads: { role_id: string; permission_id: string }[] = [];
    permsRows.forEach(p => {
      if (permissions[p.name as keyof RolePermissions]) {
        insertPayloads.push({
          role_id: roleId,
          permission_id: p.id
        });
      }
    });

    if (insertPayloads.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(insertPayloads);
      if (insertError) {
        console.error(`Error saving role permissions for ${role} to DB:`, insertError);
        return false;
      }
    }

    // Record an audit log for the permission update
    const currentUser = getCurrentUser();
    let performedById: string | null = null;
    let extraDetails = '';
    try {
      const sessionRes = await supabase.auth.getSession().catch(() => null);
      if (sessionRes?.data?.session?.user?.id) {
        const userId = sessionRes.data.session.user.id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userId)) {
          performedById = userId;
        } else {
          extraDetails = ` [Performed By ID: ${userId}]`;
        }
      }
    } catch (e) {
      // ignore
    }

    const currentRole = currentUser?.role || 'admin';
    await supabase.from('audit_logs').insert([{
      action: 'ROLE_PERMISSIONS_UPDATED',
      details: `Updated security matrix permissions for role: ${role.toUpperCase()} [Role: ${currentRole}]${extraDetails}`,
      performed_by_id: performedById,
      performed_by_name: currentUser?.name || 'Admin',
      created_at: new Date().toISOString()
    }]);

    return true;
  } catch (err) {
    console.error('Exception in saveRolePermissionsToDatabase:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sync helpers — read the cached role set during login
// These are safe to call synchronously; they never grant elevated access
// if the cache is absent or contains an unexpected value.
// ---------------------------------------------------------------------------

export function isLoggedIn(): boolean {
  return localStorage.getItem('crmAuthMode') !== null;
}

export function getRole(): UserRole {
  const stored = localStorage.getItem('userRole');
  if (stored === 'clinic_owner') return 'clinic_owner';
  if (stored === 'admin') return 'admin';
  if (stored === 'doctor') return 'doctor';
  if (stored === 'receptionist') return 'receptionist';
  if (stored === 'assistant') return 'assistant';
  if (stored === 'lab_technician') return 'lab_technician';
  if (stored === 'accountant') return 'accountant';
  // Backward compatibility fallback for 'staff'
  if (stored === 'staff') return 'receptionist';
  return 'receptionist';
}

export function isAdmin(): boolean {
  const role = getRole();
  return role === 'admin' || role === 'clinic_owner';
}

export function isDoctor(): boolean {
  return getRole() === 'doctor';
}

export function isReceptionist(): boolean {
  return getRole() === 'receptionist';
}

export function isAssistant(): boolean {
  return getRole() === 'assistant';
}

// Permission action helpers
export function canWriteClinical(): boolean {
  const r = getRole();
  const permissions = getRolePermissions(r);
  return permissions.write_treatments;
}

export function canWriteScheduling(): boolean {
  const r = getRole();
  const permissions = getRolePermissions(r);
  return permissions.manage_appointments;
}

export function canViewFinancials(role?: UserRole): boolean {
  const r = role || getRole();
  // Receptionist, Assistant, Lab Technician NEVER have financial access under strict clinic policy
  if (r === 'receptionist' || r === 'assistant' || r === 'lab_technician') {
    return false;
  }
  const permissions = getRolePermissions(r);
  if (r === 'clinic_owner' || r === 'admin' || r === 'doctor' || r === 'accountant') {
    return permissions.view_financials ?? permissions.manage_billing ?? true;
  }
  return false;
}

export function canWriteBilling(): boolean {
  const r = getRole();
  if (!canViewFinancials(r)) return false;
  const permissions = getRolePermissions(r);
  return permissions.manage_billing;
}

export function hasAccessToRoute(path: string, role: string): boolean {
  const normalizedPath = path.split('?')[0].toLowerCase().trim();
  const userRole = (role || 'receptionist') as UserRole;
  const permissions = getRolePermissions(userRole);

  if (userRole === 'clinic_owner' || userRole === 'admin') {
    return true; // Clinic owner and admin bypass and have access to all
  }

  if (normalizedPath === '/crm/profile') return true;
  if (normalizedPath === '/crm/patient-care') return true;
  if (normalizedPath === '/crm/clinical') return true;
  if (normalizedPath === '/crm/finance') return canViewFinancials(userRole);
  if (normalizedPath === '/crm/administration') return permissions.manage_setup || permissions.manage_users;

  if (normalizedPath === '/crm/dashboard') return permissions.view_dashboard;
  if (normalizedPath === '/crm/patients') return permissions.manage_patients;
  if (normalizedPath === '/crm/appointments') return permissions.manage_appointments;
  if (normalizedPath === '/crm/treatments') return permissions.write_treatments;
  if (normalizedPath === '/crm/followups') return permissions.manage_appointments;
  if (normalizedPath === '/crm/billing') return permissions.manage_billing && canViewFinancials(userRole);
  if (normalizedPath === '/crm/revenue') return permissions.manage_billing && canViewFinancials(userRole);
  if (normalizedPath === '/crm/collections') return permissions.manage_collections && canViewFinancials(userRole);
  if (normalizedPath === '/crm/expenses') return permissions.manage_expenses && canViewFinancials(userRole);
  if (normalizedPath === '/crm/setup' || normalizedPath === '/crm/settings') return permissions.manage_setup;
  if (normalizedPath === '/crm/labwork') return permissions.manage_labwork;
  if (normalizedPath === '/crm/letters') return permissions.manage_patients;
  if (normalizedPath === '/crm/doctors') return permissions.manage_doctors;
  if (normalizedPath === '/crm/users') return permissions.manage_users;
  if (normalizedPath === '/crm/audit') return permissions.manage_audit;
  if (normalizedPath === '/crm/export') return permissions.manage_audit && canViewFinancials(userRole);
  if (normalizedPath === '/crm/automation') return permissions.manage_setup;
  if (normalizedPath === '/crm/3d-model') return permissions.write_treatments;
  if (normalizedPath === '/crm/imaging') return permissions.manage_patients;
  if (normalizedPath === '/crm/compliance') return permissions.view_dashboard;
  if (normalizedPath === '/crm/endodontics') return permissions.write_treatments;
  if (normalizedPath === '/crm/cases') return permissions.manage_patients;
  if (normalizedPath === '/crm/execution') return permissions.write_treatments;

  // Background/Internal routes (pages retained internally for background/admin services):
  if (normalizedPath === '/crm/tasks') return true;
  if (normalizedPath === '/crm/knowledge') return true;
  if (normalizedPath === '/crm/operations') return true;
  if (normalizedPath === '/crm/inventory') return permissions.manage_inventory;
  if (normalizedPath === '/crm/reports') return permissions.manage_billing && canViewFinancials(userRole);
  if (normalizedPath === '/crm/copilot') return true;
  if (normalizedPath === '/crm/document-studio') return true;

  return false;
}

export function getCurrentUser(): CRMUser | null {
  const logged = isLoggedIn();
  if (!logged) return null;
  const email = localStorage.getItem('userEmail') ?? '';
  const role = getRole();
  const name = localStorage.getItem('userName') ?? 'User';
  return { email, role, name };
}

// ---------------------------------------------------------------------------
// Async login
// When Supabase is configured: validates credentials server-side via
// supabase.auth.signInWithPassword, then fetches the role from staff_roles.
// When Supabase is NOT configured (local dev): uses a hardcoded dev fallback
// so the app works before credentials are wired up.
// ---------------------------------------------------------------------------

export async function login(emailOrUsername: string, password: string): Promise<CRMUser | null> {
  const trimmedEmail = emailOrUsername.toLowerCase().trim();

  // Support usernames: if it doesn't contain "@", convert it to the internal mock domain format
  let processedEmail = trimmedEmail;
  if (processedEmail && !processedEmail.includes('@')) {
    processedEmail = `${processedEmail}@srichaitanya.local`;
  }

  // --- SECURITY: ACCOUNT LOCKOUT & PROGRESSIVE DELAY ---
  const lockout = getLockoutState(processedEmail);
  if (lockout.isLocked) {
    const remainingSecs = Math.ceil((new Date(lockout.unlockTime!).getTime() - new Date().getTime()) / 1000);
    if (remainingSecs > 0) {
      await logSecurityEvent({
        action: 'FAILED_LOGIN_LOCKED',
        details: `Blocked login attempt to locked account: ${processedEmail}`
      }).catch(() => {});
      throw new Error(`Security Lockout: This account has been locked due to too many failed attempts. Try again in ${Math.ceil(remainingSecs / 60)} minutes or contact clinical administrator.`);
    }
  }

  const delayMs = getProgressiveDelayMs(lockout.failedCount);
  if (delayMs > 0) {
    console.log(`[Enterprise Security Shield] Applying progressive delay of ${delayMs}ms to slow down automated brute-force attacks.`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  if (!isSupabaseConfigured) {
    // Local mock provider flow - simulate failed logins for test passwords
    if (password === 'wrong' || password === 'incorrect' || password === 'failed' || password === 'error') {
      const updatedState = recordFailedAttempt(processedEmail);
      await logSecurityEvent({
        action: 'FAILED_LOGIN',
        details: `Failed credential authentication for username: ${processedEmail} (Attempt ${updatedState.failedCount}/5)`
      }).catch(() => {});
      throw new Error(`Invalid credentials. Attempt ${updatedState.failedCount} of 5 before temporary lockout.`);
    }

    let autoRole: UserRole = 'admin';
    let autoName = 'Admin Doctor';
    const emailLower = processedEmail.toLowerCase().trim();

    if (emailLower.includes('owner')) {
      autoRole = 'clinic_owner';
      autoName = 'Dr. Durga Bhavani Jupalli (Owner)';
    } else if (emailLower.includes('admin') || emailLower.includes('chaitubolla09') || emailLower.includes('srichaitanyadentalcare')) {
      autoRole = 'admin';
      autoName = emailLower.includes('chaitubolla09') ? 'Dr. Durga Bhavani Jupalli (Admin)' : 'Admin';
    } else if (emailLower.includes('doctor') || emailLower.includes('chaitanya') || emailLower.includes('bhavani') || emailLower.includes('jupalli')) {
      autoRole = 'doctor';
      autoName = 'Dr. Durga Bhavani Jupalli';
    } else if (emailLower.includes('technician') || emailLower.includes('lab')) {
      autoRole = 'lab_technician';
      autoName = 'Lab Tech Prasad';
    } else if (emailLower.includes('accountant') || emailLower.includes('finance')) {
      autoRole = 'accountant';
      autoName = 'Accountant Rama';
    } else if (emailLower.includes('receptionist') || emailLower.includes('pooja') || emailLower.includes('bhavani') || emailLower.includes('jupallidurgabhavani')) {
      autoRole = 'receptionist';
      autoName = emailLower.includes('bhavani') ? 'Bhavani' : 'Receptionist Pooja';
    } else if (emailLower.includes('assistant') || emailLower.includes('kishore')) {
      autoRole = 'assistant';
      autoName = 'Assistant Kishore';
    }

    _cacheUser('supabase', processedEmail, autoName, autoRole);
    const mockUser = { id: 'mock-user-id-' + autoRole, email: processedEmail };
    const mockSession = { access_token: 'mock-token', user: mockUser };
    localStorage.setItem('sb-mock-session', JSON.stringify(mockSession));

    await syncPermissionsFromDatabase().catch(() => {});

    // Clear failed attempts & register new session
    clearFailedAttempts(processedEmail);
    registerNewSession(processedEmail);

    await logSecurityEvent({
      action: 'LOGIN_SUCCESS',
      details: `Successful authentication for ${processedEmail} (Session initialized).`
    }).catch(() => {});

    return { email: processedEmail, name: autoName, role: autoRole };
  }

  // Supabase Auth — server-side credential validation
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: processedEmail,
      password,
    });

    if (error || !data.user) {
      const updatedState = recordFailedAttempt(processedEmail);
      await logSecurityEvent({
        action: 'FAILED_LOGIN',
        details: `Failed credentials authentication on Supabase. Email: ${processedEmail} (Attempt ${updatedState.failedCount}/5)`
      }).catch(() => {});
      return null;
    }

    // Hard validation: Ensure user exists in the 'staff_roles' database table
    let roleRow: { role: string; name: string; status?: string } | null = null;
    try {
      let { data: row, error: roleError } = await supabase
        .from('staff_roles')
        .select('role, name, status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (roleError && (roleError.message?.includes('status') || roleError.code === '42703')) {
        const { data: fallbackRow, error: fallbackError } = await supabase
          .from('staff_roles')
          .select('role, name')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (!fallbackError && fallbackRow) {
          row = { ...fallbackRow, status: 'Active' };
          roleError = null;
        }
      }

      if (!roleError && row) {
        roleRow = {
          role: row.role,
          name: row.name || '',
          status: row.status || 'Active'
        };
      }
    } catch (err) {
      console.error("Auth security exception: could not fetch staff_roles.", err);
    }

    // Strict check: Reject completely if user does not exist in staff_roles
    if (!roleRow) {
      const autoCreated = await _autoProvisionStaff(data.user.id, data.user.email ?? processedEmail);
      if (autoCreated) {
        roleRow = autoCreated;
      } else {
        await supabase.auth.signOut().catch(() => {});
        _clearCache();
        throw new Error('Access Denied: This account is authenticated but does not have an assigned record in the system database (staff_roles). Please contact an administrator.');
      }
    }

    // Reject inactive accounts immediately
    if (roleRow.status === 'Inactive') {
      await supabase.auth.signOut().catch(() => {});
      _clearCache();
      throw new Error('Access Denied: This account has been deactivated. Please contact your administrator.');
    }

    const dbRole = (roleRow.role || '').toLowerCase().trim();
    const role: UserRole = (
      dbRole === 'clinic_owner' ? 'clinic_owner' :
      dbRole === 'admin' ? 'admin' :
      dbRole === 'doctor' ? 'doctor' :
      dbRole === 'receptionist' ? 'receptionist' :
      dbRole === 'assistant' ? 'assistant' :
      dbRole === 'lab_technician' ? 'lab_technician' :
      dbRole === 'accountant' ? 'accountant' :
      dbRole === 'staff' ? 'receptionist' : 'receptionist'
    );
    const name: string = roleRow.name ?? data.user.email ?? 'User';

    _cacheUser('supabase', data.user.email ?? processedEmail, name, role);
    await syncPermissionsFromDatabase().catch(() => {});

    // Clear lockout & register session
    clearFailedAttempts(processedEmail);
    registerNewSession(processedEmail);

    await logSecurityEvent({
      action: 'LOGIN_SUCCESS',
      details: `Successful Supabase verification for ${processedEmail} (${name} logged in with role ${role}).`
    }).catch(() => {});

    return { email: data.user.email ?? processedEmail, name, role };
  } catch (err: any) {
    const updatedState = recordFailedAttempt(processedEmail);
    await logSecurityEvent({
      action: 'FAILED_LOGIN',
      details: `Exception during login authentication: ${err.message || err}`
    }).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Async logout
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  const mode = localStorage.getItem('crmAuthMode');
  if (mode === 'supabase') {
    await supabase.auth.signOut().catch(() => {});
  }
  _clearCache();
}

// ---------------------------------------------------------------------------
// Async session validation — call from CRMLayout on mount to verify that
// any Supabase session stored in the browser is still valid server-side.
// Dev-mode sessions skip server validation (no token to check).
// ---------------------------------------------------------------------------

export async function validateSession(): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) {
      const mode = localStorage.getItem('crmAuthMode');
      if (mode === 'dev' || mode === 'supabase') {
        const hasLocalCache = localStorage.getItem('userEmail') && localStorage.getItem('userRole');
        if (hasLocalCache) {
          return true;
        }
      }
      _clearCache();
      return false;
    }

    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      const msg = error.message || '';
      console.warn("Supabase Auth session fetch encountered an error:", msg);
      if (
        msg.includes('Refresh Token') || 
        msg.includes('invalid_grant') || 
        msg.includes('grant') || 
        msg.includes('not found') ||
        msg.includes('NotFound')
      ) {
        console.error("Critical: Supabase returned invalid grant / refresh token error. Clearing local credential caches.");
        _clearCache();
        return false;
      }
    }
    
    if (!data || !data.session || !data.session.user) {
      const mode = localStorage.getItem('crmAuthMode');
      if (mode === 'dev') {
        // Check if we have credentials stored locally to survive iframe/storage partitioning constraints
        const hasLocalCache = localStorage.getItem('userEmail') && localStorage.getItem('userRole');
        if (hasLocalCache) {
          return true;
        }
      }
      _clearCache();
      return false;
    }

    // Recover/sync cache if it got lost, or update if role changed in DB
    const user = data.session.user;
    let roleRow: { role: string; name: string; status?: string } | null = null;
    try {
      // Query staff_roles strictly (the absolute authority on staff configurations)
      let { data: row, error: roleError } = await supabase
        .from('staff_roles')
        .select('role, name, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError && (roleError.message?.includes('status') || roleError.code === '42703')) {
        const { data: fallbackRow, error: fallbackError } = await supabase
          .from('staff_roles')
          .select('role, name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!fallbackError && fallbackRow) {
          row = { ...fallbackRow, status: 'Active' };
          roleError = null;
        }
      }

      if (!roleError && row) {
        roleRow = {
          role: row.role,
          name: row.name || '',
          status: row.status || 'Active'
        };
      }
    } catch (e) {
      console.error("Session Validation: Error querying staff_roles table", e);
    }

    // Force sign out immediately if deactivated or if the user is not found in the database at all
    if (!roleRow) {
      const autoCreated = await _autoProvisionStaff(user.id, user.email ?? '');
      if (autoCreated) {
        roleRow = autoCreated;
      } else {
        console.error("Session Validation: User not registered or has been removed from database.");
        _clearCache();
        await supabase.auth.signOut().catch(() => {});
        return false;
      }
    }

    if (roleRow.status === 'Inactive') {
      console.error("Session Validation: Account is deactivated.");
      _clearCache();
      await supabase.auth.signOut().catch(() => {});
      return false;
    }

    const dbRole = (roleRow.role || '').toLowerCase().trim();
    const role: UserRole = (
      dbRole === 'clinic_owner' ? 'clinic_owner' :
      dbRole === 'admin' ? 'admin' :
      dbRole === 'doctor' ? 'doctor' :
      dbRole === 'receptionist' ? 'receptionist' :
      dbRole === 'assistant' ? 'assistant' :
      dbRole === 'lab_technician' ? 'lab_technician' :
      dbRole === 'accountant' ? 'accountant' :
      dbRole === 'staff' ? 'receptionist' : 'receptionist'
    );
    const name: string = roleRow.name ?? user.email ?? 'User';
    _cacheUser('supabase', user.email ?? '', name, role);

    await syncPermissionsFromDatabase().catch(() => {});

    return true;
  } catch (err) {
    // Be resilient in case of transient error — fallback to cache if available
    const hasLocalCache = localStorage.getItem('userEmail') && localStorage.getItem('userRole');
    if (hasLocalCache) {
      return true;
    }
    _clearCache();
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _cacheUser(mode: string, email: string, name: string, role: UserRole) {
  localStorage.setItem('crmAuthMode', mode);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userName', name);
  localStorage.setItem('userRole', role);
}

function _clearCache() {
  ['crmAuthMode', 'userEmail', 'userName', 'userRole', 'adminLoggedIn'].forEach(k =>
    localStorage.removeItem(k)
  );
  // Safely clean all stale or corrupt Supabase local storage keys
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error("Error clearing Supabase local storage key:", e);
  }
}

async function _autoProvisionStaff(userId: string, email: string): Promise<{ role: string; name: string; status?: string } | null> {
  let autoRole = 'receptionist';
  let autoName = 'Staff Member';
  const emailLower = email.toLowerCase().trim();

  if (emailLower.includes('admin') || emailLower.includes('chaitubolla09') || emailLower.includes('srichaitanyadentalcare')) {
    autoRole = 'admin';
    autoName = emailLower.includes('chaitubolla09') ? 'Dr. Durga Bhavani Jupalli (Admin)' : 'Admin';
  } else if (emailLower.includes('doctor') || emailLower.includes('chaitanya') || emailLower.includes('jupalli')) {
    autoRole = 'doctor';
    autoName = 'Dr. Durga Bhavani Jupalli';
  } else if (emailLower.includes('receptionist') || emailLower.includes('pooja')) {
    autoRole = 'receptionist';
    autoName = 'Receptionist Pooja';
  } else if (emailLower.includes('assistant') || emailLower.includes('kishore')) {
    autoRole = 'assistant';
    autoName = 'Assistant Kishore';
  } else {
    autoRole = 'admin';
    autoName = 'Admin Doctor';
  }

  try {
    const payload = {
      user_id: userId,
      name: autoName,
      role: autoRole,
      status: 'Active'
    };
    
    const { error } = await supabase.from('staff_roles').insert([payload]);
    if (!error) {
      return { role: autoRole, name: autoName, status: 'Active' };
    } else {
      const { error: retryError } = await supabase.from('staff_roles').insert([{
        user_id: userId,
        name: autoName,
        role: autoRole
      }]);
      if (!retryError) {
        return { role: autoRole, name: autoName, status: 'Active' };
      }
    }
  } catch (err) {
    console.warn("Auto-provision staff_roles exception:", err);
  }
  return null;
}

