export const getLocalTodayDateString = (d: Date = new Date()): string => {
  try {
    // Force Asia/Kolkata timezone for clinic local date (en-CA formats as YYYY-MM-DD)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const getApptDate = (a: any): string => {
  if (!a) return '';
  const val = typeof a === 'string' ? a : (a.next_visit || a.appointment_date || a.date || a.scheduled_date || (a.created_at ? a.created_at.split('T')[0] : ''));
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  return String(val).trim();
};

