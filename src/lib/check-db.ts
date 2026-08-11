import { supabase, isSupabaseConfigured } from './supabase';

export interface DatabaseCheckResult {
  success: boolean;
  configured: boolean;
  durationMs: number;
  tables: {
    [tableName: string]: {
      success: boolean;
      count: number;
      error?: string;
      data?: any[];
    };
  };
  error?: string;
}

/**
 * Connects to the live Supabase database, checks configuration,
 * queries multiple tables (patients, appointments, treatments, doctors),
 * and returns the exact counts and sample data from each table.
 */
export async function checkDatabaseConnection(): Promise<DatabaseCheckResult> {
  const startTime = performance.now();
  
  // eslint-disable-next-line no-console
  console.log('[Database Connection Checker] Starting comprehensive database check...');

  const result: DatabaseCheckResult = {
    success: false,
    configured: isSupabaseConfigured,
    durationMs: 0,
    tables: {}
  };

  if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[Database Connection Checker] WARNING: Supabase is not configured. Mock client fallback active.');
    
    // Simulate some mock results so there is data to display in offline fallback mode
    result.success = true;
    result.tables = {
      patients: { success: true, count: 0, data: [] },
      appointments: { success: true, count: 0, data: [] },
      treatments: { success: true, count: 0, data: [] },
      doctors: {
        success: true,
        count: 1,
        data: [{ id: 'doc-1', name: 'Dr. Durga Bhavani Jupalli (Mock)', specialization: 'Cosmetic Dental Surgeon', status: 'Active' }]
      }
    };
    result.durationMs = Number((performance.now() - startTime).toFixed(1));
    return result;
  }

  const tablesToCheck = ['patients', 'appointments', 'treatments', 'doctors'];

  try {
    // We execute queries for each table in parallel, catching errors per-table so one missing table doesn't block others
    await Promise.all(
      tablesToCheck.map(async (table) => {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(10); // get first 10 rows to inspect/see the actual data from the database

          if (error) {
            result.tables[table] = {
              success: false,
              count: 0,
              error: error.message
            };
            // eslint-disable-next-line no-console
            console.error(`[Database Connection Checker] Error querying "${table}":`, error);
          } else {
            result.tables[table] = {
              success: true,
              count: count ?? (data ? data.length : 0),
              data: data || []
            };
            // eslint-disable-next-line no-console
            console.log(`[Database Connection Checker] Loaded ${data?.length || 0} rows from table "${table}" (Total count in DB: ${count})`);
          }
        } catch (err: any) {
          result.tables[table] = {
            success: false,
            count: 0,
            error: err?.message || String(err)
          };
          // eslint-disable-next-line no-console
          console.error(`[Database Connection Checker] Exception querying "${table}":`, err);
        }
      })
    );

    result.success = true;
  } catch (err: any) {
    result.success = false;
    result.error = err?.message || String(err);
    // eslint-disable-next-line no-console
    console.error('[Database Connection Checker] Critical error during query execution:', err);
  }

  result.durationMs = Number((performance.now() - startTime).toFixed(1));
  return result;
}
