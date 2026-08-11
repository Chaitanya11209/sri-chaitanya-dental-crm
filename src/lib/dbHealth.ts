import { supabase, isSupabaseConfigured } from './supabase';

export type DbHealthStatus = 'CONNECTED' | 'DEGRADED' | 'OFFLINE' | 'AUTH_EXPIRED';

export interface DbHealthState {
  status: DbHealthStatus;
  lastChecked: string;
  message?: string;
  tableStatus?: Record<string, boolean>;
}

type HealthListener = (state: DbHealthState) => void;

let currentState: DbHealthState = {
  status: isSupabaseConfigured ? 'CONNECTED' : 'OFFLINE',
  lastChecked: new Date().toISOString(),
  message: isSupabaseConfigured ? 'Database connected' : 'Supabase credentials missing or invalid'
};

const listeners = new Set<HealthListener>();

export function getDbHealthState(): DbHealthState {
  return currentState;
}

export function subscribeDbHealth(listener: HealthListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentState);
    } catch (err) {
      console.error('[dbHealth] Error in health listener:', err);
    }
  });
}

/**
 * Perform a fast, non-intrusive health ping against the live database.
 */
export async function checkDbHealthNow(): Promise<DbHealthState> {
  const timestamp = new Date().toISOString();

  if (!isSupabaseConfigured) {
    currentState = {
      status: 'OFFLINE',
      lastChecked: timestamp,
      message: 'Supabase configuration environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing or set to placeholder values.'
    };
    notifyListeners();
    return currentState;
  }

  try {
    // Ping primary tables with 3-second timeout guard
    const pingPromise = supabase.from('patients').select('id').limit(1);
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Database request timeout (3000ms exceeded)') }), 3000)
    );

    const { error } = await Promise.race([pingPromise, timeoutPromise]);

    if (error) {
      const errMsg = error.message || String(error);
      if (
        errMsg.toLowerCase().includes('jwt') ||
        errMsg.toLowerCase().includes('token') ||
        errMsg.toLowerCase().includes('401') ||
        errMsg.toLowerCase().includes('unauthorized') ||
        errMsg.toLowerCase().includes('auth')
      ) {
        currentState = {
          status: 'AUTH_EXPIRED',
          lastChecked: timestamp,
          message: 'Database authentication session has expired or is invalid.'
        };
      } else if (
        errMsg.toLowerCase().includes('fetch') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('timeout') ||
        errMsg.toLowerCase().includes('failed to fetch')
      ) {
        currentState = {
          status: 'OFFLINE',
          lastChecked: timestamp,
          message: `Network or database server unreachable: ${errMsg}`
        };
      } else {
        currentState = {
          status: 'DEGRADED',
          lastChecked: timestamp,
          message: `Database query degraded: ${errMsg}`
        };
      }
    } else {
      currentState = {
        status: 'CONNECTED',
        lastChecked: timestamp,
        message: 'Live database online and responsive.'
      };
    }
  } catch (err: any) {
    currentState = {
      status: 'OFFLINE',
      lastChecked: timestamp,
      message: `Database health check exception: ${err?.message || String(err)}`
    };
  }

  notifyListeners();
  return currentState;
}

// Network state listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    checkDbHealthNow();
  });
  window.addEventListener('offline', () => {
    currentState = {
      status: 'OFFLINE',
      lastChecked: new Date().toISOString(),
      message: 'Browser reported offline network status.'
    };
    notifyListeners();
  });
}
