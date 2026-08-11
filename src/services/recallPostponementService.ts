import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface RecallPostponementRecord {
  id: string;
  patient_id: string | number;
  patient_code?: string | null;
  outreach_sent_at: string;
  outreach_sent_by: string;
  postponement_period: '6 Months' | '8 Months' | '12 Months' | 'Custom Date' | string;
  next_outreach_date: string; // YYYY-MM-DD
  recall_category: string;
  completed_date?: string; // Date of clinical completion when postponed
  created_at: string;
}

const STORAGE_KEY = 'srichaitanya_recall_postponements';

// In-memory cache synced with Supabase
let inMemoryPostponements: RecallPostponementRecord[] | null = null;

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getISTDateString(d: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Formats YYYY-MM-DD string into readable format e.g. "09-Feb-2027"
 */
export function formatPostponementDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dd = String(d.getDate()).padStart(2, '0');
      const mmm = monthNames[d.getMonth()];
      const yyyy = d.getFullYear();
      return `${dd}-${mmm}-${yyyy}`;
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

/**
 * Calculates next_outreach_date in YYYY-MM-DD IST based on chosen period.
 */
export function calculateNextOutreachDate(
  period: '6 Months' | '8 Months' | '12 Months' | 'Custom Date' | string,
  customDateStr?: string
): string {
  if (period === 'Custom Date' && customDateStr) {
    return customDateStr;
  }

  const baseDate = new Date();
  let addMonths = 6;
  if (period === '8 Months') addMonths = 8;
  if (period === '12 Months') addMonths = 12;

  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + addMonths, baseDate.getDate());
  return getISTDateString(targetDate);
}

/**
 * Reads local storage backup if present
 */
function getLocalStoragePostponements(): RecallPostponementRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[RecallPostponementService] Failed to read from localStorage:', e);
    return [];
  }
}

/**
 * Fetches all recall postponements directly from Supabase (source of truth).
 * Updates in-memory store and updates LocalStorage cache.
 */
export async function fetchRecallPostponementsFromSupabase(): Promise<RecallPostponementRecord[]> {
  let records: RecallPostponementRecord[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('treatment_followups')
        .select('*')
        .eq('task_type', 'Recall Outreach Postponement');

      if (!error && data) {
        records = data
          .map((row: any) => {
            let notesData: any = {};
            if (row.notes) {
              try {
                notesData = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
              } catch (e) {
                // Ignore parse errors
              }
            }

            return {
              id: String(row.id),
              patient_id: row.patient_id,
              patient_code: notesData.patient_code || null,
              outreach_sent_at: notesData.outreach_sent_at || row.created_at || new Date().toISOString(),
              outreach_sent_by: notesData.outreach_sent_by || 'Staff',
              postponement_period: notesData.postponement_period || '6 Months',
              next_outreach_date: row.due_date || notesData.next_outreach_date,
              recall_category: notesData.recall_category || 'Routine Dental Care',
              completed_date: notesData.completed_date,
              created_at: row.created_at || new Date().toISOString()
            } as RecallPostponementRecord;
          })
          .filter((r) => r.patient_id && r.next_outreach_date);
      }
    } catch (e) {
      console.warn('[RecallPostponementService] Error fetching postponements from Supabase:', e);
    }
  }

  // Fallback to local storage if Supabase returned nothing or offline
  if (records.length === 0) {
    const localRecords = getLocalStoragePostponements();
    if (localRecords.length > 0) {
      records = localRecords;
    }
  }

  inMemoryPostponements = records;

  // Persist to localStorage cache
  if (typeof window !== 'undefined' && records.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      // Ignore
    }
  }

  return records;
}

/**
 * Returns current loaded postponements or reads from memory/local storage.
 */
export function getStoredPostponements(): RecallPostponementRecord[] {
  if (inMemoryPostponements !== null) {
    return inMemoryPostponements;
  }
  return getLocalStoragePostponements();
}

/**
 * Saves a new postponement record to memory/localStorage and attempts Supabase persistence.
 */
export async function addRecallPostponement(
  record: Omit<RecallPostponementRecord, 'id' | 'created_at'>
): Promise<RecallPostponementRecord> {
  if (!record.patient_id && !record.patient_code) {
    throw new Error('Invalid patient identity. Cannot save postponement.');
  }

  const patientIdVal = record.patient_id || record.patient_code || 'unknown';
  const parsedNumericId = Number(record.patient_id);
  const isNumericId = !isNaN(parsedNumericId) && parsedNumericId > 0;

  const newRecord: RecallPostponementRecord = {
    ...record,
    patient_id: patientIdVal,
    id: 'postpone-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString()
  };

  // 1. Attempt Save to Supabase treatment_followups if configured and patient_id is numeric
  if (isSupabaseConfigured && isNumericId) {
    try {
      const payload = {
        patient_id: parsedNumericId,
        task_type: 'Recall Outreach Postponement',
        due_date: record.next_outreach_date,
        status: 'Pending',
        notes: JSON.stringify({
          patient_code: record.patient_code || null,
          outreach_sent_at: record.outreach_sent_at,
          outreach_sent_by: record.outreach_sent_by,
          postponement_period: record.postponement_period,
          next_outreach_date: record.next_outreach_date,
          recall_category: record.recall_category,
          completed_date: record.completed_date
        })
      };

      const { error, data } = await supabase.from('treatment_followups').insert([payload]).select();

      if (!error && data && data[0]) {
        newRecord.id = String(data[0].id);
      } else if (error) {
        console.warn('[RecallPostponementService] Supabase insert warning (falling back to local cache):', error);
      }
    } catch (e) {
      console.warn('[RecallPostponementService] Supabase postponement exception (falling back to local cache):', e);
    }
  }

  // 2. Update memory store and LocalStorage cache (guaranteed persistence)
  const currentList = inMemoryPostponements || getLocalStoragePostponements();
  const updatedList = [
    newRecord,
    ...currentList.filter(
      item =>
        !(
          (String(item.patient_id) === String(record.patient_id) ||
            (item.patient_code && record.patient_code && item.patient_code === record.patient_code)) &&
          (item.recall_category === record.recall_category ||
            item.recall_category?.toLowerCase() === record.recall_category?.toLowerCase())
        )
    )
  ];

  inMemoryPostponements = updatedList;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('[RecallPostponementService] LocalStorage save error:', e);
    }
  }

  return newRecord;
}

/**
 * Checks if a patient has an active postponement for a given recall category.
 *
 * Rules:
 * 1. Matches patient identity strictly via patient_id.
 * 2. Matches recall category.
 * 3. CLINICAL EVENT OVERRIDE: If currentCompletedDate > postponement's completed_date,
 *    a new clinical event was completed AFTER the postponement was set.
 *    The clinical completion takes priority, rendering the postponement inactive (returns null).
 * 4. TODAY >= NEXT_OUTREACH_DATE: Postponement has expired, patient becomes eligible again (returns null).
 */
export function getActivePostponement(
  patientId: string | number | null | undefined,
  recallCategory: string,
  currentCompletedDate?: string,
  patientCode?: string | null
): RecallPostponementRecord | null {
  if (!patientId && !patientCode) return null;

  const postponements = getStoredPostponements();
  const todayStr = getISTDateString();

  const matched = postponements.find(
    p =>
      ((patientId && String(p.patient_id) === String(patientId)) ||
        (patientCode && p.patient_code && p.patient_code === patientCode)) &&
      (p.recall_category === recallCategory ||
        p.recall_category?.toLowerCase() === recallCategory?.toLowerCase())
  );

  if (!matched) return null;

  // Rule 3: Clinical Event Override
  // If the patient completed a new treatment after the postponement was recorded, clinical event takes priority!
  if (currentCompletedDate && matched.completed_date) {
    if (currentCompletedDate > matched.completed_date) {
      // Newer clinical event completed! Disregard old postponement.
      return null;
    }
  }

  // Rule 4: Check if postponement date is still in the future
  if (todayStr < matched.next_outreach_date) {
    return matched; // Active postponement
  }

  // today >= next_outreach_date -> Expired, patient is due for recall again
  return null;
}
