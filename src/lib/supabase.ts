import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl =
  env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';

const isPlaceholder = (url: string, key: string) => {
  const u = (url || '').toLowerCase();
  const k = (key || '').toLowerCase();
  return (
    u.includes('xxxxxxxxxxxxxxxxxxxx') ||
    u.includes('your-') ||
    u.includes('placeholder') ||
    k.includes('xxxxxxxxxxxxxxxxxxxx') ||
    k.includes('your-') ||
    k.includes('placeholder')
  );
};

const hasCreds = Boolean(supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl, supabaseAnonKey));

if (!hasCreds && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing or Placeholder VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — entering offline fallback mock mode for local testing.',
  );
}

function createMockSupabaseClient(): any {
  const mockChannel = {
    on: () => mockChannel,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
      return { unsubscribe: () => {} };
    }
  };

  const createProxy = (table?: string): any => {
    const handler: ProxyHandler<any> = {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve: any) => {
            let responseData: any = [];

            if (table === 'staff_roles' || table === 'users') {
              const hasMockSession = typeof window !== 'undefined' && localStorage.getItem('sb-mock-session');
              let email = 'admin@example.com';
              if (hasMockSession) {
                try {
                  const parsed = JSON.parse(hasMockSession);
                  email = parsed.user?.email || email;
                } catch {}
              } else if (typeof window !== 'undefined') {
                email = localStorage.getItem('userEmail') || email;
              }

              let autoRole = 'admin';
              let autoName = 'Admin Doctor';
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
              }

              if (table === 'users') {
                responseData = { role: autoRole, email: email, name: autoName };
              } else {
                responseData = { role: autoRole, name: autoName, status: 'Active' };
              }
            } else if (table === 'roles') {
              responseData = [
                { id: 'r1', name: 'clinic_owner', description: 'Clinic Owner' },
                { id: 'r2', name: 'admin', description: 'Administrator' },
                { id: 'r3', name: 'doctor', description: 'Doctor' },
                { id: 'r4', name: 'receptionist', description: 'Receptionist' },
                { id: 'r5', name: 'assistant', description: 'Assistant' },
                { id: 'r6', name: 'lab_technician', description: 'Lab Technician' },
                { id: 'r7', name: 'accountant', description: 'Accountant' }
              ];
            } else if (table === 'permissions') {
              responseData = [
                { id: 'p1', name: 'view_dashboard', description: 'View Dashboard' },
                { id: 'p2', name: 'manage_patients', description: 'Manage Patients' },
                { id: 'p3', name: 'manage_appointments', description: 'Manage Appointments' },
                { id: 'p4', name: 'write_treatments', description: 'Write Treatments' },
                { id: 'p5', name: 'manage_billing', description: 'Manage Billing' },
                { id: 'p6', name: 'manage_collections', description: 'Manage Collections' },
                { id: 'p7', name: 'manage_expenses', description: 'Manage Expenses' },
                { id: 'p8', name: 'manage_inventory', description: 'Manage Inventory' },
                { id: 'p9', name: 'manage_labwork', description: 'Manage Labwork' },
                { id: 'p10', name: 'manage_doctors', description: 'Manage Doctors' },
                { id: 'p11', name: 'manage_setup', description: 'Manage Setup' },
                { id: 'p12', name: 'manage_audit', description: 'Manage Audit' },
                { id: 'p13', name: 'manage_users', description: 'Manage Users' }
              ];
            } else if (table === 'role_permissions') {
              const rolesList = ['clinic_owner', 'admin', 'doctor', 'receptionist', 'assistant', 'lab_technician', 'accountant'];
              const permsList = ['view_dashboard', 'manage_patients', 'manage_appointments', 'write_treatments', 'manage_billing', 'manage_collections', 'manage_expenses', 'manage_inventory', 'manage_labwork', 'manage_doctors', 'manage_setup', 'manage_audit', 'manage_users'];
              
              const defaults: Record<string, Record<string, boolean>> = {
                clinic_owner: permsList.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
                admin: permsList.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
                doctor: { view_dashboard: true, manage_patients: true, manage_appointments: true, write_treatments: true, manage_labwork: true, manage_doctors: true },
                receptionist: { view_dashboard: true, manage_patients: true, manage_appointments: true, manage_billing: true, manage_collections: true, manage_inventory: true },
                assistant: { view_dashboard: true, manage_patients: true, manage_appointments: true, manage_inventory: true },
                lab_technician: { view_dashboard: true, manage_inventory: true, manage_labwork: true },
                accountant: { view_dashboard: true, manage_billing: true, manage_collections: true, manage_expenses: true, manage_inventory: true }
              };

              responseData = [];
              rolesList.forEach((r, rIdx) => {
                let currentPerms = defaults[r] || {};
                try {
                  const stored = localStorage.getItem(`permissions_${r}`);
                  if (stored) currentPerms = JSON.parse(stored);
                } catch {}

                permsList.forEach((p, pIdx) => {
                  if (currentPerms[p]) {
                    responseData.push({
                      role_id: `r${rIdx + 1}`,
                      permission_id: `p${pIdx + 1}`,
                      role_name: r,
                      permission_name: p
                    });
                  }
                });
              });
            } else if (table === 'user_roles') {
              responseData = [];
            } else if (table === 'doctors') {
              responseData = [
                { id: 'doc-1', name: 'Dr. Durga Bhavani Jupalli', specialization: 'BDS, Cosmetic Dental Surgeon', status: 'Active' }
              ];
            } else if (table === 'patients') {
              responseData = [];
            } else if (table === 'appointments') {
              responseData = [];
            } else if (table === 'treatments') {
              responseData = [];
            } else if (table === 'bills') {
              responseData = [];
            }

            return Promise.resolve({ data: responseData, error: null, count: Array.isArray(responseData) ? responseData.length : 1 }).then(resolve);
          };
        }
        if (prop === 'catch') {
          return (resolve: any) => Promise.resolve({ data: [], error: null }).catch(resolve);
        }
        if (prop === 'auth') {
          return {
            getSession: () => {
              const hasMockSession = typeof window !== 'undefined' && localStorage.getItem('sb-mock-session');
              if (hasMockSession) {
                try {
                  const parsed = JSON.parse(hasMockSession);
                  return Promise.resolve({ data: { session: parsed }, error: null });
                } catch {
                  return Promise.resolve({ data: { session: null }, error: null });
                }
              }
              return Promise.resolve({ data: { session: null }, error: null });
            },
            getUser: () => {
              const hasMockSession = typeof window !== 'undefined' && localStorage.getItem('sb-mock-session');
              if (hasMockSession) {
                try {
                  const parsed = JSON.parse(hasMockSession);
                  return Promise.resolve({ data: { user: parsed.user }, error: null });
                } catch {
                  return Promise.resolve({ data: { user: null }, error: null });
                }
              }
              return Promise.resolve({ data: { user: null }, error: null });
            },
            onAuthStateChange: (cb: any) => {
              return { data: { subscription: { unsubscribe: () => {} } } };
            },
            signInWithPassword: ({ email }: { email: string }) => {
              const mockUser = { 
                id: 'mock-user-id-' + (email ? email.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'admin'), 
                email: email || 'admin@example.com' 
              };
              const mockSession = {
                access_token: 'mock-token',
                user: mockUser
              };
              if (typeof window !== 'undefined') {
                localStorage.setItem('sb-mock-session', JSON.stringify(mockSession));
              }
              return Promise.resolve({ 
                data: { 
                  user: mockUser, 
                  session: mockSession 
                }, 
                error: null 
              });
            },
            signUp: () => Promise.resolve({ data: {}, error: null }),
            signOut: () => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('sb-mock-session');
              }
              return Promise.resolve({ error: null });
            },
            resetPasswordForEmail: () => Promise.resolve({ error: null }),
            updateUser: () => Promise.resolve({ error: null }),
          };
        }
        if (prop === 'channel') {
          return () => mockChannel;
        }
        if (prop === 'removeChannel') {
          return () => {};
        }
        if (prop === 'from') {
          return (tableName: string) => {
            return createProxy(tableName);
          };
        }

        // For any other chained property, return a function that returns the proxy itself
        return (...args: any[]) => {
          return createProxy(table);
        };
      }
    };
    return new Proxy({}, handler);
  };

  return createProxy();
}

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await window.fetch(input, init);
  } catch (err: any) {
    console.warn("[supabase safeFetch] Intercepted fetch error:", err);
    const errBody = JSON.stringify({
      error: "network_error",
      error_description: err.message || "Failed to fetch: Network or Server unreachable",
      message: err.message || "Failed to fetch: Network or Server unreachable"
    });
    return new Response(errBody, {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

let supabaseInstance: SupabaseClient;
let signupClientInstance: SupabaseClient;

if (hasCreds) {
  try {
    // Validate URL format before calling createClient to avoid crash if URL is invalid
    new URL(supabaseUrl);
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: safeFetch,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '[Supabase Connection Investigator] ERROR: Failed to initialize main Supabase client.',
      error
    );
    supabaseInstance = createMockSupabaseClient() as unknown as SupabaseClient;
  }

  try {
    signupClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: safeFetch,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '[Supabase Connection Investigator] ERROR: Failed to initialize signup Supabase client. Your project might not be correctly configured or the environment variables might be invalid.',
      error
    );
    signupClientInstance = createMockSupabaseClient() as unknown as SupabaseClient;
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('[Supabase Connection Investigator] Using offline fallback mock mode because valid credentials were not found or are placeholder values.');
  supabaseInstance = createMockSupabaseClient() as unknown as SupabaseClient;
  signupClientInstance = createMockSupabaseClient() as unknown as SupabaseClient;
}

// Use a placeholder client proxy when credentials are missing to prevent runtime network errors.
export const supabase: SupabaseClient = supabaseInstance;

export const isSupabaseConfigured = hasCreds;

// Setup a secondary client that does not persist session metadata in localStorage.
// This allows a logged-in Admin to sign-up/register a new Staff member
// without overriding the Admin's own active session credentials in standard storage.
export const signupClient: SupabaseClient = signupClientInstance;
